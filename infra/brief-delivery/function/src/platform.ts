import crypto from "node:crypto";
import { EmailClient } from "@azure/communication-email";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  generateBlobSASQueryParameters,
  type ContainerClient,
} from "@azure/storage-blob";
import { QueueClient } from "@azure/storage-queue";
import type { InvocationContext } from "@azure/functions";
import type { BriefDefinition } from "./catalog.js";
import { loadConfig } from "./config.js";

export interface LedgerRecord {
  id: string;
  requestFingerprint: string;
  kind: "brief-request" | "consultation-request";
  createdAt: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  intakeCategory: string;
  sourceUrl: string;
  sourceCampaign: string;
  consent: {
    requestedResource: true;
    broaderMarketing: boolean;
    capturedAt: string;
  };
  suppressionStatus: "active" | "opted-out";
  qualification: Record<string, string>;
  report?: { slug: string; title: string };
  delivery: { status: "pending" | "sent" | "failed"; sentAt?: string; providerMessageId?: string; failureCode?: string };
  crm: { status: "queued" | "synced" | "failed"; attempts: number; lastAttemptAt?: string; failureCode?: string };
}

export interface CrmEvent {
  schemaVersion: "1.0";
  eventType: "hardmagic.brief.requested" | "hardmagic.consultation.requested" | "hardmagic.engagement.suppressed";
  requestId: string;
  ledgerPath: string;
  occurredAt: string;
}

const credential = new DefaultAzureCredential();
let blobService: BlobServiceClient | undefined;
let secretClient: SecretClient | undefined;
let emailClient: EmailClient | undefined;
const secretCache = new Map<string, string>();

function clients() {
  const config = loadConfig();
  blobService ??= new BlobServiceClient(`https://${config.BRIEF_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, credential);
  secretClient ??= new SecretClient(config.KEY_VAULT_URI, credential);
  emailClient ??= new EmailClient(config.ACS_ENDPOINT, credential);
  return { config, blobService, secretClient, emailClient };
}

export function safeFailureCode(error: unknown): string {
  if (error instanceof Error) return crypto.createHash("sha256").update(error.name + ":" + error.message.split(":")[0]).digest("hex").slice(0, 12);
  return "unknown";
}

export function piiHash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function getSecret(name: string): Promise<string> {
  const cached = secretCache.get(name);
  if (cached) return cached;
  const { secretClient: vault } = clients();
  const value = (await vault.getSecret(name)).value;
  if (!value) throw new Error(`secret_empty:${name}`);
  secretCache.set(name, value);
  return value;
}

export function ledgerContainer(): ContainerClient {
  const { config, blobService: service } = clients();
  return service.getContainerClient(config.LEDGER_CONTAINER_NAME);
}

export async function writeLedger(path: string, record: LedgerRecord, ifMatch?: string): Promise<string> {
  const blob = ledgerContainer().getBlockBlobClient(path);
  const body = JSON.stringify(record);
  const result = await blob.upload(body, Buffer.byteLength(body), ledgerUploadOptions(ifMatch));
  return result.etag ?? "";
}

export async function createLedger(path: string, record: LedgerRecord): Promise<string | null> {
  const blob = ledgerContainer().getBlockBlobClient(path);
  const body = JSON.stringify(record);
  try {
    const result = await blob.upload(body, Buffer.byteLength(body), ledgerUploadOptions(undefined, true));
    return result.etag ?? "";
  } catch (error) {
    if (isPreconditionFailed(error)) return null;
    throw error;
  }
}

function ledgerUploadOptions(ifMatch?: string, ifNoneMatch = false) {
  return {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
    ...(ifMatch || ifNoneMatch ? { conditions: { ...(ifMatch ? { ifMatch } : {}), ...(ifNoneMatch ? { ifNoneMatch: "*" } : {}) } } : {}),
  };
}

function isPreconditionFailed(error: unknown): boolean {
  return typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 412;
}

export async function readLedger(path: string): Promise<{ record: LedgerRecord; etag: string } | null> {
  const blob = ledgerContainer().getBlockBlobClient(path);
  if (!(await blob.exists())) return null;
  const download = await blob.download();
  const body = await streamToString(download.readableStreamBody);
  return { record: JSON.parse(body) as LedgerRecord, etag: download.etag ?? "" };
}

async function streamToString(stream: NodeJS.ReadableStream | undefined): Promise<string> {
  if (!stream) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export async function signedBriefUrl(brief: BriefDefinition): Promise<string> {
  const { config, blobService: service } = clients();
  const startsOn = new Date(Date.now() - 5 * 60_000);
  const expiresOn = new Date(Date.now() + config.SAS_HOURS * 3_600_000);
  const delegationKey = await service.getUserDelegationKey(startsOn, expiresOn);
  const sas = generateBlobSASQueryParameters({
    containerName: config.BRIEF_CONTAINER_NAME,
    blobName: brief.blobName,
    permissions: BlobSASPermissions.parse("r"),
    startsOn,
    expiresOn,
    protocol: SASProtocol.Https,
    contentType: "application/pdf",
    contentDisposition: `attachment; filename="${brief.blobName}"`,
  }, delegationKey, config.BRIEF_STORAGE_ACCOUNT_NAME).toString();
  return `https://${config.BRIEF_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${config.BRIEF_CONTAINER_NAME}/${brief.blobName}?${sas}`;
}

export async function enqueueCrm(event: CrmEvent): Promise<void> {
  const config = loadConfig();
  const queue = new QueueClient(`https://${config.BRIEF_STORAGE_ACCOUNT_NAME}.queue.core.windows.net/${config.CRM_RETRY_QUEUE_NAME}`, credential);
  await queue.createIfNotExists();
  await queue.sendMessage(Buffer.from(JSON.stringify(event), "utf8").toString("base64"));
}

export async function archiveDeadLetter(event: CrmEvent, errorCode: string): Promise<void> {
  const { config, blobService: service } = clients();
  const container = service.getContainerClient(config.DEADLETTER_CONTAINER_NAME);
  const path = `crm/${new Date().toISOString().slice(0, 10)}/${event.requestId}.json`;
  const body = JSON.stringify({ event, errorCode, archivedAt: new Date().toISOString() });
  await container.getBlockBlobClient(path).upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
    conditions: { ifNoneMatch: "*" },
  });
}

export async function sendBriefEmail(to: string, name: string, brief: BriefDefinition, link: string, unsubscribeUrl: string): Promise<string> {
  const { config, emailClient: sender } = clients();
  const from = await getSecret(config.ACS_SENDER_ADDRESS_SECRET_NAME);
  const content = renderBriefEmail(name, brief, link, unsubscribeUrl);
  const poller = await sender.beginSend({
    senderAddress: from,
    recipients: { to: [{ address: to }] },
    replyTo: [{ address: config.REPLY_TO }],
    content: { subject: `${brief.title} — your HardMagic field guide`, html: content.html, plainText: content.plain },
  });
  const result = await poller.pollUntilDone();
  if (result.status !== "Succeeded") throw new Error(`acs_send_${result.status}`);
  return result.id;
}

export async function sendConsultationEmails(record: LedgerRecord): Promise<string> {
  const { config, emailClient: sender } = clients();
  const from = await getSecret(config.ACS_SENDER_ADDRESS_SECRET_NAME);
  const publicReceipt = renderConsultationReceipt(record);
  const internal = renderInternalIntake(record);
  const receiptPoller = await sender.beginSend({
    senderAddress: from,
    recipients: { to: [{ address: record.email }] },
    replyTo: [{ address: config.REPLY_TO }],
    content: { subject: "HardMagic received your brief", html: publicReceipt.html, plainText: publicReceipt.plain },
  });
  const routePoller = await sender.beginSend({
    senderAddress: from,
    recipients: { to: [{ address: config.CONTACT_EMAIL }] },
    replyTo: [{ address: record.email }],
    content: { subject: `Qualified intake: ${record.intakeCategory} · ${record.organization}`, html: internal.html, plainText: internal.plain },
  });
  const [receipt, route] = await Promise.all([receiptPoller.pollUntilDone(), routePoller.pollUntilDone()]);
  if (receipt.status !== "Succeeded" || route.status !== "Succeeded") throw new Error("acs_consultation_send_failed");
  return `${receipt.id}:${route.id}`;
}

export function renderBriefEmail(name: string, brief: BriefDefinition, link: string, unsubscribeUrl: string): { html: string; plain: string } {
  const config = loadConfig();
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(brief.title);
  const safeLink = escapeHtml(link);
  const safeUnsubscribe = escapeHtml(unsubscribeUrl);
  const html = `<!doctype html><html><head><meta name="color-scheme" content="light dark"><meta name="viewport" content="width=device-width"><style>@media(prefers-color-scheme:dark){.card{background:#111!important;color:#f6f2e8!important}}</style></head><body style="margin:0;background:#ece8df;font-family:Arial,sans-serif;color:#151515"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" class="card" width="640" style="max-width:640px;background:#fff"><tr><td style="padding:32px"><p style="letter-spacing:.18em;text-transform:uppercase">HardMagic Corporation</p><h1 style="font-size:32px;line-height:1.1">${safeTitle}</h1><p>Hello ${safeName},</p><p>Your field guide is ready. The private link expires in ${config.SAS_HOURS} hours.</p><p><a href="${safeLink}" style="display:inline-block;background:#ea4b2a;color:#fff;padding:14px 20px;text-decoration:none">Open the PDF field guide</a></p><p>Reply to this message if you want to turn the material into an operating plan.</p><hr><p style="font-size:13px"><a href="${escapeHtml(config.CONTACT_URL)}">Talk with HardMagic</a> · <a href="mailto:${escapeHtml(config.CONTACT_EMAIL)}">${escapeHtml(config.CONTACT_EMAIL)}</a></p><p style="font-size:12px"><a href="${safeUnsubscribe}">Stop report-specific follow-ups</a></p></td></tr></table></td></tr></table></body></html>`;
  const plain = `HardMagic Corporation\n\n${brief.title}\n\nHello ${name},\n\nYour private field guide link expires in ${config.SAS_HOURS} hours:\n${link}\n\nTalk with HardMagic: ${config.CONTACT_URL}\n${config.CONTACT_EMAIL}\n\nStop report-specific follow-ups: ${unsubscribeUrl}`;
  return { html, plain };
}

export function renderConsultationReceipt(record: LedgerRecord): { html: string; plain: string } {
  const config = loadConfig();
  const html = `<main style="font:16px Arial,sans-serif;max-width:640px;margin:auto;padding:32px"><p style="letter-spacing:.18em;text-transform:uppercase">HardMagic Corporation</p><h1>We received your brief.</h1><p>Hello ${escapeHtml(record.name)},</p><p>Your ${escapeHtml(record.intakeCategory.replaceAll("-", " "))} request is now in our private intake queue. A human will review the mandate and respond from ${escapeHtml(config.REPLY_TO)}.</p><p><a href="${escapeHtml(config.CONTACT_URL)}">HardMagic capabilities</a></p></main>`;
  return { html, plain: `HardMagic received your ${record.intakeCategory} request. A human will respond from ${config.REPLY_TO}.` };
}

export function renderInternalIntake(record: LedgerRecord): { html: string; plain: string } {
  const summary = `${record.name} · ${record.role} · ${record.organization}\nCategory: ${record.intakeCategory}\nRequest: ${record.qualification.mandate ?? record.qualification.primaryChallenge ?? ""}\nDecision horizon: ${record.qualification.decisionHorizon ?? ""}\nRequest ID: ${record.id}`;
  return { html: `<pre style="font:15px/1.5 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(summary)}</pre>`, plain: summary };
}

export async function enforceRateLimit(scopeHash: string): Promise<boolean> {
  const config = loadConfig();
  const prefix = `rate/${new Date().toISOString().slice(0, 13).replaceAll(":", "-")}/${scopeHash}/`;
  let count = 0;
  for await (const _ of ledgerContainer().listBlobsFlat({ prefix })) {
    count += 1;
    if (count >= config.RATE_LIMIT_PER_HOUR) return false;
  }
  const marker = ledgerContainer().getBlockBlobClient(`${prefix}${crypto.randomUUID()}`);
  await marker.upload("", 0, { conditions: { ifNoneMatch: "*" } });
  return true;
}

export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const config = loadConfig();
  if (!config.TURNSTILE_REQUIRED) return true;
  if (!token) return false;
  const secret = await getSecret(config.TURNSTILE_SECRET_NAME);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; hostname?: string };
  const allowedHosts = config.ALLOWED_ORIGINS.map((origin) => new URL(origin).hostname);
  return result.success === true && Boolean(result.hostname) && allowedHosts.includes(result.hostname!);
}

export async function syncDataverse(event: CrmEvent, context: InvocationContext): Promise<void> {
  const config = loadConfig();
  const current = await readLedger(event.ledgerPath);
  if (!current) throw new Error("ledger_not_found");
  const record = current.record;
  const [accountId, businessUnitId, ownerTeamId] = await Promise.all([
    getSecret(config.DATAVERSE_ACCOUNT_ID_SECRET_NAME),
    getSecret(config.DATAVERSE_BUSINESS_UNIT_ID_SECRET_NAME),
    getSecret(config.DATAVERSE_OWNER_TEAM_ID_SECRET_NAME),
  ]);
  const token = await credential.getToken(`${config.DATAVERSE_URL}/.default`);
  if (!token?.token) throw new Error("dataverse_token_unavailable");
  const headers = { Authorization: `Bearer ${token.token}`, Accept: "application/json", "Content-Type": "application/json", "OData-Version": "4.0" };
  const requestLiteral = record.id.replaceAll("'", "''");
  const engagementUrl = `${config.DATAVERSE_URL}/api/data/v9.2/${config.DATAVERSE_ENTITY_SET}(${config.DATAVERSE_REQUEST_ID_COLUMN}='${requestLiteral}')`;
  if (event.eventType === "hardmagic.engagement.suppressed") {
    const suppression = await fetch(engagementUrl, {
      method: "PATCH",
      headers: { ...headers, "If-Match": "*" },
      body: JSON.stringify({ hm_suppressionstatus: "opted-out" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!suppression.ok) throw new Error(`dataverse_suppression_update_${suppression.status}`);
    record.crm = { status: "synced", attempts: record.crm.attempts + 1, lastAttemptAt: new Date().toISOString() };
    await writeLedger(event.ledgerPath, record, current.etag);
    context.info("Dataverse suppression completed", { requestId: record.id });
    return;
  }
  const contactQuery = buildAccountScopedContactQuery(record.email, accountId);
  let response = await fetch(config.DATAVERSE_URL + contactQuery, { headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`dataverse_contact_query_${response.status}`);
  const contacts = await response.json() as { value?: Array<{ contactid: string; _owningbusinessunit_value: string }> };
  let contactId = contacts.value?.[0]?.contactid;
  if (contacts.value?.some((contact) => contact._owningbusinessunit_value.toLowerCase() !== businessUnitId.toLowerCase())) {
    throw new Error("dataverse_contact_boundary_violation");
  }
  if (!contactId) {
    const [firstName, ...lastParts] = record.name.split(/\s+/);
    response = await fetch(`${config.DATAVERSE_URL}/api/data/v9.2/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        firstname: firstName,
        lastname: lastParts.join(" ") || "Unknown",
        emailaddress1: record.email,
        company: record.organization,
        "parentcustomerid_account@odata.bind": `/accounts(${accountId})`,
        "ownerid_team@odata.bind": `/teams(${ownerTeamId})`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`dataverse_contact_create_${response.status}`);
    contactId = response.headers.get("odata-entityid")?.match(/\(([^)]+)\)/)?.[1];
    if (!contactId) throw new Error("dataverse_contact_id_missing");
  }
  const engagement = buildDataverseEngagement(record, contactId, ownerTeamId);
  response = await fetch(engagementUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify(engagement),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`dataverse_engagement_upsert_${response.status}`);
  record.crm = { status: "synced", attempts: record.crm.attempts + 1, lastAttemptAt: new Date().toISOString() };
  await writeLedger(event.ledgerPath, record, current.etag);
  context.info("Dataverse projection completed", { requestId: record.id, kind: record.kind });
}

export function buildDataverseEngagement(record: LedgerRecord, contactId: string, ownerTeamId: string): Record<string, string> {
  return {
    hm_requestid: record.id,
    hm_name: record.report?.title ?? `Consultation · ${record.intakeCategory}`,
    hm_reportkey: record.report?.slug ?? "consultation",
    hm_emailhash: piiHash(record.email),
    hm_organization: record.organization,
    hm_role: record.role,
    hm_primarychallenge: record.qualification.primaryChallenge ?? record.qualification.mandate ?? "",
    hm_decisionhorizon: record.qualification.decisionHorizon ?? "",
    hm_preferrednextstep: record.qualification.preferredNextStep ?? "",
    hm_intakecategory: record.intakeCategory,
    hm_sourcesummary: record.sourceCampaign,
    hm_consentstatus: record.consent.broaderMarketing ? "requested-resource; marketing" : "requested-resource",
    hm_deliverystatus: record.delivery.status,
    hm_suppressionstatus: record.suppressionStatus ?? "active",
    "hm_contact@odata.bind": `/contacts(${contactId})`,
    "ownerid_team@odata.bind": `/teams(${ownerTeamId})`,
  };
}

export function buildAccountScopedContactQuery(email: string, accountId: string): string {
  const emailLiteral = email.trim().toLowerCase().replaceAll("'", "''");
  const params = new URLSearchParams({
    "$select": "contactid,_parentcustomerid_value,_owningbusinessunit_value",
    "$filter": `emailaddress1 eq '${emailLiteral}' and _parentcustomerid_value eq ${accountId}`,
  });
  return `/api/data/v9.2/contacts?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
