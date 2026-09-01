import crypto from "node:crypto";
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { briefs } from "./catalog.js";
import { loadConfig } from "./config.js";
import { briefRequestSchema, contactRequestSchema } from "./schema.js";
import {
  archiveDeadLetter,
  createLedger,
  crmEventMatchesLedger,
  EmailDeliveryAmbiguousError,
  emailOperationId,
  enforceRateLimit,
  enqueueCrm,
  getSecret,
  piiHash,
  persistCrmFailureState,
  readLedger,
  safeFailureCode,
  sendBriefEmail,
  sendConsultationEmails,
  signedBriefUrl,
  syncDataverse,
  verifyTurnstile,
  writeLedger,
  type CrmEvent,
  type LedgerRecord,
} from "./platform.js";

const MAX_BODY_BYTES = 24_000;
const CONTACT_THANK_YOU_PATH = "/contact/thanks/";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "content-security-policy": "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'",
  "permissions-policy": "accelerometer=(), camera=(), clipboard-read=(), clipboard-write=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), usb=(), xr-spatial-tracking=(), autoplay=(self \"https://www.youtube-nocookie.com\"), fullscreen=(self \"https://www.youtube-nocookie.com\"), picture-in-picture=(self \"https://www.youtube-nocookie.com\")",
  "x-frame-options": "DENY",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-permitted-cross-domain-policies": "none",
});

type FunnelInput = Record<string, string | undefined>;
type LedgerSnapshot = { record: LedgerRecord; etag: string };
type LedgerReader = (path: string) => Promise<LedgerSnapshot | null>;
type LedgerWriter = (path: string, record: LedgerRecord, ifMatch?: string) => Promise<string>;

function mergeOperationIds(existing: readonly string[] | undefined, additional: readonly string[] | undefined): string[] | undefined {
  const merged = [...new Set([...(existing ?? []), ...(additional ?? [])])];
  return merged.length > 0 ? merged : undefined;
}

export function mergeDeliveryFailureRecord(
  latest: LedgerRecord,
  failureDelivery: LedgerRecord["delivery"],
): LedgerRecord {
  const operationIds = mergeOperationIds(latest.delivery.operationIds, failureDelivery.operationIds);
  return {
    ...latest,
    delivery: {
      ...latest.delivery,
      ...failureDelivery,
      ...(operationIds ? { operationIds } : {}),
    },
  };
}

export function mergeDeliverySuccessRecord(
  latest: LedgerRecord,
  sentDelivery: LedgerRecord["delivery"],
): LedgerRecord {
  const { failureCode: _failureCode, ...latestDelivery } = latest.delivery;
  const operationIds = mergeOperationIds(latest.delivery.operationIds, sentDelivery.operationIds);
  return {
    ...latest,
    delivery: {
      ...latestDelivery,
      status: "sent",
      ...(sentDelivery.sentAt !== undefined ? { sentAt: sentDelivery.sentAt } : {}),
      ...(sentDelivery.providerMessageId !== undefined ? { providerMessageId: sentDelivery.providerMessageId } : {}),
      ...(operationIds ? { operationIds } : {}),
    },
  };
}

export function applyUnsubscribeState(record: LedgerRecord): LedgerRecord {
  return {
    ...record,
    consent: { ...record.consent, broaderMarketing: false },
    suppressionStatus: "opted-out",
  };
}

export function buildDeliveryFailureState(
  current: LedgerRecord["delivery"],
  error: unknown,
  confirmedProviderMessageId?: string,
): LedgerRecord["delivery"] {
  const ambiguousError = error instanceof EmailDeliveryAmbiguousError ? error : undefined;
  const operationIds = mergeOperationIds(current.operationIds, ambiguousError?.operationIds);
  const providerMessageId = confirmedProviderMessageId ?? ambiguousError?.operationId;
  if (ambiguousError || confirmedProviderMessageId !== undefined) {
    return {
      status: "unknown",
      failureCode: "delivery-status-unknown",
      ...(providerMessageId !== undefined ? { providerMessageId } : {}),
      ...(operationIds ? { operationIds } : {}),
    };
  }
  return {
    status: "failed",
    failureCode: safeFailureCode(error),
    ...(operationIds ? { operationIds } : {}),
  };
}

export async function persistDeliveryFailureState(
  ledgerPath: string,
  record: LedgerRecord,
  ledgerEtag: string,
  context: InvocationContext,
  requestId: string,
  failureCode: string,
  read: LedgerReader = readLedger,
  write: LedgerWriter = writeLedger,
): Promise<boolean> {
  try {
    await write(ledgerPath, record, ledgerEtag);
    return true;
  } catch (writeError) {
    // A lost response can mean the first conditional write committed. Read
    // once before a bounded retry so we never overwrite a newer sent/unknown
    // state with stale data and never submit ACS again. Only the delivery
    // failure is merged; consent, suppression, CRM, and all other fields come
    // from the readback snapshot.
    try {
      const readback = await read(ledgerPath);
      if (!readback || readback.record.id !== record.id) return false;
      if (readback.record.delivery.status === "sent" || readback.record.delivery.status === "unknown") return true;
      const mergedRecord = mergeDeliveryFailureRecord(readback.record, record.delivery);
      await write(ledgerPath, mergedRecord, readback.etag);
      return true;
    } catch (retryError) {
      context.error("Delivery failure state could not be persisted", {
        requestId,
        failureCode,
        writeFailureCode: safeFailureCode(writeError),
        retryFailureCode: safeFailureCode(retryError),
      });
      return false;
    }
  }
}

export async function persistDeliverySuccessState(
  ledgerPath: string,
  record: LedgerRecord,
  ledgerEtag: string,
  context: InvocationContext,
  requestId: string,
  read: LedgerReader = readLedger,
  write: LedgerWriter = writeLedger,
): Promise<boolean> {
  try {
    await write(ledgerPath, record, ledgerEtag);
    return true;
  } catch (writeError) {
    // The send is confirmed, but the first conditional write may have raced
    // with CRM, suppression, or another worker. Re-read once and merge only
    // the delivery fields owned by this successful send.
    try {
      const readback = await read(ledgerPath);
      if (!readback || readback.record.id !== record.id) return false;
      if (readback.record.delivery.status === "sent") return true;
      const mergedRecord = mergeDeliverySuccessRecord(readback.record, record.delivery);
      await write(ledgerPath, mergedRecord, readback.etag);
      return true;
    } catch (retryError) {
      context.error("Delivery success state could not be persisted", {
        requestId,
        writeFailureCode: safeFailureCode(writeError),
        retryFailureCode: safeFailureCode(retryError),
      });
      return false;
    }
  }
}

export async function persistUnsubscribeState(
  ledgerPath: string,
  record: LedgerRecord,
  ledgerEtag: string,
  context: InvocationContext,
  requestId: string,
  read: LedgerReader = readLedger,
  write: LedgerWriter = writeLedger,
): Promise<boolean> {
  const suppressedRecord = applyUnsubscribeState(record);
  try {
    await write(ledgerPath, suppressedRecord, ledgerEtag);
    return true;
  } catch (writeError) {
    // A CRM worker or another unsubscribe can legitimately advance the blob
    // ETag between read and write. Re-read once and apply only suppression to
    // that current record so newer delivery/CRM/consent fields survive.
    try {
      const readback = await read(ledgerPath);
      if (!readback || readback.record.id !== record.id) return false;
      await write(ledgerPath, applyUnsubscribeState(readback.record), readback.etag);
      return true;
    } catch (retryError) {
      context.error("Unsubscribe state could not be persisted", {
        requestId,
        writeFailureCode: safeFailureCode(writeError),
        retryFailureCode: safeFailureCode(retryError),
      });
      return false;
    }
  }
}

export type ExistingRequestDecision = "conflict" | "complete" | "in-flight" | "failed" | "ambiguous";

export function ledgerPathForRequest(requestId: string): string {
  return `requests/${requestId}.json`;
}

export function isSafeLedgerPath(path: string): boolean {
  return /^requests\/(?:[0-9a-f-]{36}|[0-9]{4}-[0-9]{2}\/[0-9a-f-]{36})\.json$/i.test(path);
}

export function requestFingerprint(kind: LedgerRecord["kind"], input: FunnelInput): string {
  const fields = Object.entries(input)
    .filter(([key]) => key !== "request_id" && key !== "cf-turnstile-response")
    .sort(([left], [right]) => left.localeCompare(right));
  return crypto.createHash("sha256").update(JSON.stringify([kind, fields])).digest("hex");
}

export function classifyExistingRequest(record: Pick<LedgerRecord, "requestFingerprint" | "delivery">, fingerprint: string): ExistingRequestDecision {
  if (record.requestFingerprint !== fingerprint) return "conflict";
  if (record.delivery.status === "sent") return "complete";
  if (record.delivery.status === "failed") return "failed";
  if (record.delivery.status === "unknown") return "ambiguous";
  if (record.delivery.operationIds && record.delivery.operationIds.length > 0) return "ambiguous";
  return "in-flight";
}

export function isAllowedThankYouPath(path: string): boolean {
  return path === CONTACT_THANK_YOU_PATH || Object.values(briefs).some((brief) => brief.thankYouPath === path);
}

function thankYouLocation(path: string): string | null {
  if (!isAllowedThankYouPath(path)) return null;
  return `${loadConfig().PUBLIC_SITE_URL}${path}`;
}

export function replayResponse(
  request: Pick<HttpRequest, "headers">,
  record: Pick<LedgerRecord, "id" | "requestFingerprint" | "delivery">,
  fingerprint: string,
  thankYouPath: string,
): HttpResponseInit {
  const headers = { ...corsHeaders(request), "x-correlation-id": record.id };
  switch (classifyExistingRequest(record, fingerprint)) {
    case "conflict":
      return response(409, "This request ID is already associated with another submission.", headers);
    case "complete": {
      const location = thankYouLocation(thankYouPath);
      return location
        ? response(303, "", { ...headers, Location: location })
        : response(500, "The request completed, but its confirmation route is not configured.", headers);
    }
    case "failed":
      return response(503, "We saved this request but could not complete delivery yet.", headers);
    case "ambiguous":
      return response(503, "Delivery status is being reconciled. Please do not resubmit this request.", headers);
    case "in-flight":
      return response(202, "Your request is already being processed. Please wait before trying again.", headers);
  }
}

async function claimLedger(
  request: Pick<HttpRequest, "headers">,
  record: LedgerRecord,
  fingerprint: string,
  thankYouPath: string,
  ledgerPath: string,
): Promise<{ etag: string } | HttpResponseInit> {
  const etag = await createLedger(ledgerPath, record);
  if (etag !== null) return { etag };
  const existing = await readLedger(ledgerPath);
  if (existing) return replayResponse(request, existing.record, fingerprint, thankYouPath);
  return response(503, "We could not reserve this request safely. Please try again.", { ...corsHeaders(request), "x-correlation-id": record.id });
}

export async function briefRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  // Azure Functions drops custom response headers from empty 204 responses at
  // the Front Door boundary. Keep the body empty but use 200 so preflights
  // retain the complete security-header contract.
  if (request.method === "OPTIONS") return response(200, "", corsHeaders(request));
  if (request.method !== "POST") return response(405, "Method not allowed", corsHeaders(request));
  if (!supportedRequestContentType(request)) return response(415, "Unsupported media type.", corsHeaders(request));
  const body = await parseRequest(request);
  if (!body) return response(400, "Please submit a valid request.", corsHeaders(request));
  const parsed = briefRequestSchema.safeParse(body);
  if (!parsed.success) {
    const corporateEmailRejected = parsed.error.issues.some((issue) => issue.path[0] === "email" && issue.message === "corporate_email_required");
    return response(400, corporateEmailRejected ? "Please use your company email address. Gmail, Yahoo, Hotmail, and Outlook.com accounts are not eligible for this brief." : "Please complete every required qualification field.", corsHeaders(request));
  }
  const input = parsed.data;
  const id = input.request_id ?? crypto.randomUUID();
  const fingerprint = requestFingerprint("brief-request", input);
  const ledgerPath = ledgerPathForRequest(id);
  const brief = briefs[input.report];
  const location = thankYouLocation(brief.thankYouPath);
  if (!location) return response(500, "The request confirmation route is not configured.", { ...corsHeaders(request), "x-correlation-id": id });
  if (input.request_id) {
    const existing = await readLedger(ledgerPath);
    if (existing) return replayResponse(request, existing.record, fingerprint, brief.thankYouPath);
  }
  const remoteIp = request.headers.get("x-azure-clientip") ?? "unknown";
  if (!(await antiAbuse(input["cf-turnstile-response"], remoteIp, input.email, context))) return response(429, "Please try again later.", { ...corsHeaders(request), "x-correlation-id": id, "retry-after": "60" });

  const createdAt = new Date().toISOString();
  const record: LedgerRecord = {
    id,
    requestFingerprint: fingerprint,
    kind: "brief-request",
    createdAt,
    email: input.email,
    name: input.name,
    organization: input.organization,
    role: input.role,
    intakeCategory: input.intake_category,
    sourceUrl: sanitizeSourceUrl(input.source_url),
    sourceCampaign: input.source_campaign,
    consent: { requestedResource: true, broaderMarketing: input.marketing_consent === "yes", capturedAt: createdAt },
    suppressionStatus: "active",
    qualification: {
      industry: input.industry,
      organizationSize: input.organization_size,
      decisionStage: input.decision_stage,
      decisionHorizon: input.decision_horizon,
      primaryChallenge: input.primary_challenge,
      preferredNextStep: input.preferred_next_step,
      context: input.context,
    },
    report: { slug: brief.slug, title: brief.title },
    delivery: { status: "pending", operationIds: [emailOperationId(id, "brief")] },
    crm: { status: "queued", attempts: 0 },
  };
  const claimed = await claimLedger(request, record, fingerprint, brief.thankYouPath, ledgerPath);
  if (!("etag" in claimed)) return claimed;
  let ledgerEtag = claimed.etag;
  let confirmedMessageId: string | undefined;
  try {
    const [link, unsubscribeToken] = await Promise.all([signedBriefUrl(brief), createUnsubscribeToken(id, ledgerPath)]);
    const config = loadConfig();
    const messageId = await sendBriefEmail(input.email, input.name, brief, link, `https://${config.BRIEF_HOST}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`, id);
    confirmedMessageId = messageId;
    record.delivery = {
      status: "sent",
      sentAt: new Date().toISOString(),
      providerMessageId: messageId,
      ...(record.delivery.operationIds ? { operationIds: [...record.delivery.operationIds] } : {}),
    };
    if (!(await persistDeliverySuccessState(ledgerPath, record, ledgerEtag, context, id))) {
      throw new Error("delivery_success_state_persist_failed");
    }
  } catch (error) {
    const deliveryFailure = buildDeliveryFailureState(record.delivery, error, confirmedMessageId);
    const deliveryAmbiguous = deliveryFailure.status === "unknown";
    const failureCode = deliveryFailure.failureCode ?? safeFailureCode(error);
    record.delivery = deliveryFailure;
    await persistDeliveryFailureState(ledgerPath, record, ledgerEtag, context, id, failureCode);
    context.error(deliveryAmbiguous ? "Brief delivery status is unknown" : "Brief delivery failed", { requestId: id, failureCode });
    return response(
      503,
      deliveryAmbiguous ? "We accepted this request, but delivery status could not be confirmed. Please do not resubmit." : "We saved the request but could not send the field guide yet.",
      { ...corsHeaders(request), "x-correlation-id": id, ...(deliveryAmbiguous ? {} : { "retry-after": "300" }) },
    );
  }
  const crmEvent: CrmEvent = { schemaVersion: "1.0", eventType: "hardmagic.brief.requested", requestId: id, ledgerPath, occurredAt: createdAt };
  try {
    await enqueueCrm(crmEvent);
  } catch (error) {
    context.error("CRM enqueue failed", { requestId: id, failureCode: safeFailureCode(error) });
  }
  return response(303, "", { ...corsHeaders(request), "x-correlation-id": id, Location: location });
}

export async function contactRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  if (request.method === "OPTIONS") return response(200, "", corsHeaders(request));
  if (request.method !== "POST") return response(405, "Method not allowed", corsHeaders(request));
  if (!supportedRequestContentType(request)) return response(415, "Unsupported media type.", corsHeaders(request));
  const body = await parseRequest(request);
  if (!body) return response(400, "Please submit a valid request.", corsHeaders(request));
  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) return response(400, "Please complete every required intake field.", corsHeaders(request));
  const input = parsed.data;
  const id = input.request_id ?? crypto.randomUUID();
  const fingerprint = requestFingerprint("consultation-request", input);
  const ledgerPath = ledgerPathForRequest(id);
  const location = thankYouLocation(CONTACT_THANK_YOU_PATH);
  if (!location) return response(500, "The request confirmation route is not configured.", { ...corsHeaders(request), "x-correlation-id": id });
  if (input.request_id) {
    const existing = await readLedger(ledgerPath);
    if (existing) return replayResponse(request, existing.record, fingerprint, CONTACT_THANK_YOU_PATH);
  }
  const remoteIp = request.headers.get("x-azure-clientip") ?? "unknown";
  if (!(await antiAbuse(input["cf-turnstile-response"], remoteIp, input.email, context))) return response(429, "Please try again later.", { ...corsHeaders(request), "x-correlation-id": id, "retry-after": "60" });
  const createdAt = new Date().toISOString();
  const record: LedgerRecord = {
    id,
    requestFingerprint: fingerprint,
    kind: "consultation-request",
    createdAt,
    email: input.email,
    name: input.name,
    organization: input.organization,
    role: input.role,
    intakeCategory: input.intake_category,
    sourceUrl: sanitizeSourceUrl(input.source_url),
    sourceCampaign: input.source_campaign,
    consent: { requestedResource: true, broaderMarketing: input.marketing_consent === "yes", capturedAt: createdAt },
    suppressionStatus: "active",
    qualification: {
      mandate: input.mandate,
      decisionHorizon: input.decision_horizon,
      preferredNextStep: input.preferred_next_step,
    },
    delivery: {
      status: "pending",
      operationIds: [
        emailOperationId(id, "consultation-receipt"),
        emailOperationId(id, "consultation-route"),
      ],
    },
    crm: { status: "queued", attempts: 0 },
  };
  const claimed = await claimLedger(request, record, fingerprint, CONTACT_THANK_YOU_PATH, ledgerPath);
  if (!("etag" in claimed)) return claimed;
  let ledgerEtag = claimed.etag;
  let confirmedMessageId: string | undefined;
  try {
    const messageId = await sendConsultationEmails(record);
    confirmedMessageId = messageId;
    record.delivery = {
      status: "sent",
      sentAt: new Date().toISOString(),
      providerMessageId: messageId,
      ...(record.delivery.operationIds ? { operationIds: [...record.delivery.operationIds] } : {}),
    };
    if (!(await persistDeliverySuccessState(ledgerPath, record, ledgerEtag, context, id))) {
      throw new Error("delivery_success_state_persist_failed");
    }
  } catch (error) {
    const deliveryFailure = buildDeliveryFailureState(record.delivery, error, confirmedMessageId);
    const deliveryAmbiguous = deliveryFailure.status === "unknown";
    const failureCode = deliveryFailure.failureCode ?? safeFailureCode(error);
    record.delivery = deliveryFailure;
    await persistDeliveryFailureState(ledgerPath, record, ledgerEtag, context, id, failureCode);
    context.error(deliveryAmbiguous ? "Consultation delivery status is unknown" : "Consultation delivery failed", { requestId: id, failureCode });
    return response(
      503,
      deliveryAmbiguous ? "We accepted this request, but delivery status could not be confirmed. Please do not resubmit." : "We saved the request but could not route it yet.",
      { ...corsHeaders(request), "x-correlation-id": id, ...(deliveryAmbiguous ? {} : { "retry-after": "300" }) },
    );
  }
  const crmEvent: CrmEvent = { schemaVersion: "1.0", eventType: "hardmagic.consultation.requested", requestId: id, ledgerPath, occurredAt: createdAt };
  try {
    await enqueueCrm(crmEvent);
  } catch (error) {
    context.error("CRM enqueue failed", { requestId: id, failureCode: safeFailureCode(error) });
  }
  return response(303, "", { ...corsHeaders(request), "x-correlation-id": id, Location: location });
}

export async function unsubscribe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  if (request.method === "OPTIONS") return response(200, "", corsHeaders(request));
  if (request.method === "POST" && !supportedRequestContentType(request)) return response(415, "Unsupported media type.", corsHeaders(request));
  let token = new URL(request.url).searchParams.get("token") ?? "";
  if (request.method === "POST" && !token) {
    const body = await parseRequest(request);
    token = typeof body?.token === "string" ? body.token : "";
  }
  const tokenData = await verifyUnsubscribeToken(token);
  if (!tokenData) return response(404, "This link is invalid or expired.", corsHeaders(request));
  if (request.method === "GET") {
    const action = `https://${loadConfig().BRIEF_HOST}/api/unsubscribe`;
    return response(200, `<main style="font:16px system-ui;max-width:42rem;margin:4rem auto;padding:0 1rem"><h1>Stop this brief sequence?</h1><p>Confirm once. Broader marketing consent, if any, is managed separately.</p><form method="post" action="${action}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Stop report follow-ups</button></form></main>`, { ...corsHeaders(request), "content-type": "text/html; charset=utf-8" });
  }
  if (request.method !== "POST") return response(405, "Method not allowed", corsHeaders(request));
  const current = await readLedger(tokenData.ledgerPath);
  if (!current || current.record.id !== tokenData.id) return response(404, "This link is invalid or expired.", corsHeaders(request));
  // Suppression revokes broader follow-up consent without rewriting the
  // original, purpose-limited resource-consent record.
  if (!(await persistUnsubscribeState(tokenData.ledgerPath, current.record, current.etag, context, current.record.id))) {
    return response(503, "We could not update your preferences safely. Please try again.", { ...corsHeaders(request), "x-correlation-id": current.record.id, "retry-after": "60" });
  }
  try {
    await enqueueCrm({ schemaVersion: "1.0", eventType: "hardmagic.engagement.suppressed", requestId: current.record.id, ledgerPath: tokenData.ledgerPath, occurredAt: new Date().toISOString() });
  } catch (error) {
    context.error("Suppression CRM enqueue failed", { requestId: current.record.id, failureCode: safeFailureCode(error) });
  }
  return response(200, "<main style=\"font:16px system-ui;max-width:42rem;margin:4rem auto;padding:0 1rem\"><h1>You are unsubscribed.</h1><p>No more report-specific follow-ups will be sent for this request.</p></main>", { ...corsHeaders(request), "content-type": "text/html; charset=utf-8" });
}

export async function health(request: HttpRequest): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  try {
    const config = loadConfig();
    return response(200, JSON.stringify({ ok: true, configured: true, service: "hardmagic-brief-lock", crmEntity: config.DATAVERSE_ENTITY_LOGICAL_NAME }), { "content-type": "application/json", "cache-control": "no-store" });
  } catch {
    return response(503, JSON.stringify({ ok: false, configured: false, service: "hardmagic-brief-lock" }), { "content-type": "application/json", "cache-control": "no-store" });
  }
}

export async function crmRetry(message: unknown, context: InvocationContext): Promise<void> {
  const event = parseCrmEvent(message);
  if (!event) throw new Error("crm_event_invalid");
  await syncDataverse(event, context);
}

export async function crmDeadLetter(message: unknown, context: InvocationContext): Promise<void> {
  const event = parseCrmEvent(message);
  if (!event) {
    context.error("Discarded invalid CRM poison message");
    return;
  }
  const current = await readLedger(event.ledgerPath);
  if (current) {
    if (!crmEventMatchesLedger(event, current.record)) {
      context.error("CRM poison message does not match its ledger record", { requestId: event.requestId });
      await archiveDeadLetter(event, "request-id-mismatch");
      return;
    }
    await persistCrmFailureState(
      event.ledgerPath,
      current.record,
      current.etag,
      current.record.crm.attempts + 1,
      "retry-exhausted",
      context,
      event.requestId,
    );
  }
  await archiveDeadLetter(event, "retry-exhausted");
  context.error("CRM projection exhausted retries", { requestId: event.requestId });
}

export function validateEdgeRequest(request: Pick<HttpRequest, "headers" | "url">): HttpResponseInit | null {
  let config;
  try { config = loadConfig(); } catch { return response(503, "Service is not configured"); }
  const frontDoorId = request.headers.get("x-azure-fdid")?.trim().toLowerCase();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  if (frontDoorId !== config.EXPECTED_FRONT_DOOR_ID.toLowerCase() || forwardedHost !== config.BRIEF_HOST) return response(404, "Not found", { "cache-control": "no-store" });
  const origin = request.headers.get("origin");
  if (origin && !config.ALLOWED_ORIGINS.includes(origin)) return response(403, "Origin not allowed", { "cache-control": "no-store" });
  return null;
}

export function parseCrmEvent(message: unknown): CrmEvent | null {
  try {
    let value = message;
    if (typeof message === "string") {
      try { value = JSON.parse(message); }
      catch { value = JSON.parse(Buffer.from(message, "base64").toString("utf8")); }
    }
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<CrmEvent>;
    if (
      candidate.schemaVersion !== "1.0" ||
      !candidate.requestId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate.requestId) ||
      !candidate.ledgerPath ||
      !isSafeLedgerPath(candidate.ledgerPath) ||
      !candidate.eventType ||
      !["hardmagic.brief.requested", "hardmagic.consultation.requested", "hardmagic.engagement.suppressed"].includes(candidate.eventType) ||
      !candidate.occurredAt ||
      Number.isNaN(Date.parse(candidate.occurredAt))
    ) return null;
    return candidate as CrmEvent;
  } catch { return null; }
}

async function antiAbuse(turnstileToken: string, remoteIp: string, email: string, context: InvocationContext): Promise<boolean> {
  try {
    if (!(await verifyTurnstile(turnstileToken, remoteIp))) return false;
    const ipScope = piiHash(`ip:${remoteIp}`);
    const emailScope = piiHash(`email:${email}`);
    return (await enforceRateLimit(ipScope)) && (await enforceRateLimit(emailScope));
  } catch (error) {
    context.error("Anti-abuse dependency failed", { failureCode: safeFailureCode(error) });
    return false;
  }
}

export function supportedRequestContentType(request: Pick<HttpRequest, "headers">): "application/json" | "application/x-www-form-urlencoded" | null {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return mediaType === "application/json" || mediaType === "application/x-www-form-urlencoded" ? mediaType : null;
}

export async function parseRequest(request: Pick<HttpRequest, "headers" | "text">): Promise<Record<string, unknown> | null> {
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? 0 : Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_BODY_BYTES) return null;
  try {
    const contentType = supportedRequestContentType(request);
    if (!contentType) return null;
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return null;
    if (contentType === "application/json") {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    }
    return Object.fromEntries(new URLSearchParams(text));
  } catch { return null; }
}

async function createUnsubscribeToken(id: string, ledgerPath: string): Promise<string> {
  const config = loadConfig();
  const payload = Buffer.from(JSON.stringify({ id, ledgerPath, exp: Date.now() + 395 * 86_400_000 }), "utf8").toString("base64url");
  const key = await getSecret(config.UNSUBSCRIBE_TOKEN_SECRET_NAME);
  return `${payload}.${crypto.createHmac("sha256", key).update(payload).digest("base64url")}`;
}

async function verifyUnsubscribeToken(token: string): Promise<{ id: string; ledgerPath: string } | null> {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const key = await getSecret(loadConfig().UNSUBSCRIBE_TOKEN_SECRET_NAME);
    const expected = crypto.createHmac("sha256", key).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: string; ledgerPath?: string; exp?: number };
    if (!value.id || !value.ledgerPath || !value.exp || value.exp < Date.now() || !isSafeLedgerPath(value.ledgerPath)) return null;
    return { id: value.id, ledgerPath: value.ledgerPath };
  } catch { return null; }
}

export function sanitizeSourceUrl(value: string): string {
  try {
    const config = loadConfig();
    const url = new URL(value);
    const allowedOrigins = config.ALLOWED_ORIGINS.map((origin) => new URL(origin).origin);
    if (url.protocol !== "https:" || !allowedOrigins.includes(url.origin)) return "";
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().slice(0, 500);
  } catch { return ""; }
}

function corsHeaders(request: Pick<HttpRequest, "headers">): Record<string, string> {
  let config;
  try { config = loadConfig(); } catch { return { "cache-control": "no-store" }; }
  const origin = request.headers.get("origin");
  return {
    "cache-control": "no-store",
    ...(origin && config.ALLOWED_ORIGINS.includes(origin) ? { "access-control-allow-origin": origin, vary: "Origin", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } : {}),
  };
}

function response(status: number, body: string, headers: Record<string, string> = {}): HttpResponseInit {
  return {
    status,
    body,
    headers: {
      ...SECURITY_HEADERS,
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      ...headers,
    },
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

app.http("briefRequest", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "brief-request", handler: briefRequest });
app.http("contactRequest", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "contact-request", handler: contactRequest });
app.http("unsubscribe", { methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "unsubscribe", handler: unsubscribe });
app.http("health", { methods: ["GET"], authLevel: "anonymous", route: "health", handler: health });
app.storageQueue("crmRetry", { queueName: "crm-retry", connection: "AzureWebJobsStorage", handler: crmRetry });
app.storageQueue("crmDeadLetter", { queueName: "crm-retry-poison", connection: "AzureWebJobsStorage", handler: crmDeadLetter });
