import crypto from "node:crypto";
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { briefs } from "./catalog.js";
import { loadConfig } from "./config.js";
import { briefRequestSchema, contactRequestSchema } from "./schema.js";
import {
  archiveDeadLetter,
  enforceRateLimit,
  enqueueCrm,
  getSecret,
  piiHash,
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

export async function briefRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  if (request.method === "OPTIONS") return response(204, "", corsHeaders(request));
  if (request.method !== "POST") return response(405, "Method not allowed", corsHeaders(request));
  const body = await parseRequest(request);
  if (!body) return response(400, "Please submit a valid request.", corsHeaders(request));
  const parsed = briefRequestSchema.safeParse(body);
  if (!parsed.success) {
    const corporateEmailRejected = parsed.error.issues.some((issue) => issue.path[0] === "email" && issue.message === "corporate_email_required");
    return response(400, corporateEmailRejected ? "Please use your company email address. Gmail, Yahoo, Hotmail, and Outlook.com accounts are not eligible for this brief." : "Please complete every required qualification field.", corsHeaders(request));
  }
  const input = parsed.data;
  const remoteIp = request.headers.get("x-azure-clientip") ?? "unknown";
  if (!(await antiAbuse(input["cf-turnstile-response"], remoteIp, input.email, context))) return response(429, "Please try again later.", corsHeaders(request));

  const brief = briefs[input.report];
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const ledgerPath = `requests/${createdAt.slice(0, 7)}/${id}.json`;
  const record: LedgerRecord = {
    id,
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
    delivery: { status: "pending" },
    crm: { status: "queued", attempts: 0 },
  };
  await writeLedger(ledgerPath, record);
  try {
    const [link, unsubscribeToken] = await Promise.all([signedBriefUrl(brief), createUnsubscribeToken(id, ledgerPath)]);
    const config = loadConfig();
    const messageId = await sendBriefEmail(input.email, input.name, brief, link, `https://${config.BRIEF_HOST}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`);
    record.delivery = { status: "sent", sentAt: new Date().toISOString(), providerMessageId: messageId };
    await writeLedger(ledgerPath, record);
  } catch (error) {
    const failureCode = safeFailureCode(error);
    record.delivery = { status: "failed", failureCode };
    await writeLedger(ledgerPath, record);
    context.error("Brief delivery failed", { requestId: id, failureCode });
    return response(503, "We saved the request but could not send the field guide yet.", corsHeaders(request));
  }
  const crmEvent: CrmEvent = { schemaVersion: "1.0", eventType: "hardmagic.brief.requested", requestId: id, ledgerPath, occurredAt: createdAt };
  try {
    await enqueueCrm(crmEvent);
  } catch (error) {
    context.error("CRM enqueue failed", { requestId: id, failureCode: safeFailureCode(error) });
  }
  return response(303, "", { ...corsHeaders(request), Location: `${loadConfig().PUBLIC_SITE_URL}${brief.thankYouPath}` });
}

export async function contactRequest(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
  if (request.method === "OPTIONS") return response(204, "", corsHeaders(request));
  if (request.method !== "POST") return response(405, "Method not allowed", corsHeaders(request));
  const body = await parseRequest(request);
  if (!body) return response(400, "Please submit a valid request.", corsHeaders(request));
  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) return response(400, "Please complete every required intake field.", corsHeaders(request));
  const input = parsed.data;
  const remoteIp = request.headers.get("x-azure-clientip") ?? "unknown";
  if (!(await antiAbuse(input["cf-turnstile-response"], remoteIp, input.email, context))) return response(429, "Please try again later.", corsHeaders(request));
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const ledgerPath = `requests/${createdAt.slice(0, 7)}/${id}.json`;
  const record: LedgerRecord = {
    id,
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
    qualification: {
      mandate: input.mandate,
      decisionHorizon: input.decision_horizon,
      preferredNextStep: input.preferred_next_step,
    },
    delivery: { status: "pending" },
    crm: { status: "queued", attempts: 0 },
  };
  await writeLedger(ledgerPath, record);
  try {
    const messageId = await sendConsultationEmails(record);
    record.delivery = { status: "sent", sentAt: new Date().toISOString(), providerMessageId: messageId };
    await writeLedger(ledgerPath, record);
  } catch (error) {
    const failureCode = safeFailureCode(error);
    record.delivery = { status: "failed", failureCode };
    await writeLedger(ledgerPath, record);
    context.error("Consultation delivery failed", { requestId: id, failureCode });
    return response(503, "We saved the request but could not route it yet.", corsHeaders(request));
  }
  const crmEvent: CrmEvent = { schemaVersion: "1.0", eventType: "hardmagic.consultation.requested", requestId: id, ledgerPath, occurredAt: createdAt };
  try {
    await enqueueCrm(crmEvent);
  } catch (error) {
    context.error("CRM enqueue failed", { requestId: id, failureCode: safeFailureCode(error) });
  }
  return response(303, "", { ...corsHeaders(request), Location: `${loadConfig().PUBLIC_SITE_URL}/contact/thanks/` });
}

export async function unsubscribe(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const edge = validateEdgeRequest(request);
  if (edge) return edge;
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
  current.record.consent.requestedResource = true;
  current.record.qualification.suppressionStatus = "opted-out";
  await writeLedger(tokenData.ledgerPath, current.record, current.etag);
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
    current.record.crm = { status: "failed", attempts: current.record.crm.attempts + 1, lastAttemptAt: new Date().toISOString(), failureCode: "retry-exhausted" };
    await writeLedger(event.ledgerPath, current.record, current.etag);
  }
  await archiveDeadLetter(event, "retry-exhausted");
  context.error("CRM projection exhausted retries", { requestId: event.requestId });
}

export function validateEdgeRequest(request: Pick<HttpRequest, "headers" | "url">): HttpResponseInit | null {
  let config;
  try { config = loadConfig(); } catch { return response(503, "Service is not configured"); }
  const frontDoorId = request.headers.get("x-azure-fdid")?.toLowerCase();
  const forwardedHost = (request.headers.get("x-forwarded-host") ?? new URL(request.url).host).split(",")[0]?.trim().toLowerCase();
  if (frontDoorId !== config.EXPECTED_FRONT_DOOR_ID.toLowerCase() || forwardedHost !== config.BRIEF_HOST) return response(404, "Not found", { "cache-control": "no-store" });
  const origin = request.headers.get("origin");
  if (origin && !config.ALLOWED_ORIGINS.includes(origin)) return response(403, "Origin not allowed", { "cache-control": "no-store" });
  return null;
}

function parseCrmEvent(message: unknown): CrmEvent | null {
  try {
    let value = message;
    if (typeof message === "string") {
      try { value = JSON.parse(message); }
      catch { value = JSON.parse(Buffer.from(message, "base64").toString("utf8")); }
    }
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<CrmEvent>;
    if (candidate.schemaVersion !== "1.0" || !candidate.requestId || !candidate.ledgerPath || !candidate.eventType) return null;
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

async function parseRequest(request: HttpRequest): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return null;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return await request.json() as Record<string, unknown>;
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return null;
    return Object.fromEntries(new URLSearchParams(text));
  } catch { return null; }
}

async function createUnsubscribeToken(id: string, ledgerPath: string): Promise<string> {
  const config = loadConfig();
  const payload = Buffer.from(JSON.stringify({ id, ledgerPath, exp: Date.now() + 400 * 86_400_000 }), "utf8").toString("base64url");
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
    if (!value.id || !value.ledgerPath || !value.exp || value.exp < Date.now() || !/^requests\/\d{4}-\d{2}\/[0-9a-f-]+\.json$/.test(value.ledgerPath)) return null;
    return { id: value.id, ledgerPath: value.ledgerPath };
  } catch { return null; }
}

function sanitizeSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
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
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...(origin && config.ALLOWED_ORIGINS.includes(origin) ? { "access-control-allow-origin": origin, vary: "Origin", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } : {}),
  };
}

function response(status: number, body: string, headers: Record<string, string> = {}): HttpResponseInit {
  return { status, body, headers };
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
