import crypto from "node:crypto";
import type { AbortSignalLike } from "@azure/abort-controller";
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
import { loadConfig, requireCanonicalGuid } from "./config.js";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;
const RATE_LIMIT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1_000;
const RATE_LIMIT_LEASE_SECONDS = 60;
const RATE_LIMIT_LEASE_MAX_ATTEMPTS = 4;
const RATE_LIMIT_LEASE_RETRY_BASE_MS = 50;
const RATE_LIMIT_LEASE_RETRY_JITTER_MS = 50;
const RATE_LIMIT_LEASE_RETRY_MAX_MS = 250;
const EMAIL_POLL_TIMEOUT_MS = 45_000;
const EMAIL_RECONCILIATION_TIMEOUT_MS = 5_000;
const EMAIL_RECONCILIATION_POLL_INTERVAL_MS = 250;
const CRM_ENQUEUE_MAX_ATTEMPTS = 3;
const CRM_ENQUEUE_RETRY_BASE_MS = 100;
const CRM_ENQUEUE_RETRY_MAX_MS = 500;
const CRM_ENQUEUE_TRANSPORT_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNABORTED", "REQUEST_SEND_ERROR"]);

export interface RateLimitCounter {
  timestamps: number[];
}

export interface RateLimitDecision {
  allowed: boolean;
  counter: RateLimitCounter;
}

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
  delivery: { status: "pending" | "sent" | "failed" | "unknown"; sentAt?: string; providerMessageId?: string; operationIds?: string[]; failureCode?: string };
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
let crmQueue: QueueClient | undefined;
let crmQueueUrl: string | undefined;
let crmQueueInitializationClient: QueueClientLike | undefined;
let crmQueueInitialization: Promise<void> | undefined;
const secretCache = new Map<string, string>();

export interface QueueClientLike {
  createIfNotExists(): Promise<unknown>;
}

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

function isStorageNotFound(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && (("statusCode" in error && error.statusCode === 404) || ("code" in error && error.code === "BlobNotFound"));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ledgerGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse only the durable ledger shape consumed by the handlers. A malformed
 * blob is treated as unavailable so callers fail closed (replay returns a
 * safe reservation error, unsubscribe returns 404, and CRM retry is retried)
 * instead of dereferencing attacker-controlled JSON.
 */
export function parseLedgerRecord(value: unknown): LedgerRecord | null {
  if (!isObject(value)) return null;
  const consent = value.consent;
  const delivery = value.delivery;
  const crm = value.crm;
  const qualification = value.qualification;
  const report = value.report;
  if (
    typeof value.id !== "string" || !ledgerGuidPattern.test(value.id)
    || typeof value.requestFingerprint !== "string" || !/^[0-9a-f]{64}$/i.test(value.requestFingerprint)
    || (value.kind !== "brief-request" && value.kind !== "consultation-request")
    || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))
    || typeof value.email !== "string" || typeof value.name !== "string"
    || typeof value.organization !== "string" || typeof value.role !== "string"
    || typeof value.intakeCategory !== "string" || typeof value.sourceUrl !== "string"
    || typeof value.sourceCampaign !== "string"
    || !isObject(consent) || consent.requestedResource !== true || typeof consent.broaderMarketing !== "boolean" || typeof consent.capturedAt !== "string"
    || (value.suppressionStatus !== "active" && value.suppressionStatus !== "opted-out")
    || !isObject(qualification) || !Object.values(qualification).every((item) => typeof item === "string")
    || (report !== undefined && (!isObject(report) || typeof report.slug !== "string" || typeof report.title !== "string"))
    || !isObject(delivery) || (delivery.status !== "pending" && delivery.status !== "sent" && delivery.status !== "failed" && delivery.status !== "unknown")
    || (delivery.sentAt !== undefined && typeof delivery.sentAt !== "string")
    || (delivery.providerMessageId !== undefined && typeof delivery.providerMessageId !== "string")
    || (delivery.operationIds !== undefined && (!Array.isArray(delivery.operationIds) || !delivery.operationIds.every((operationId) => typeof operationId === "string" && operationId.length > 0 && operationId.length <= 256)))
    || (delivery.failureCode !== undefined && typeof delivery.failureCode !== "string")
    || !isObject(crm) || (crm.status !== "queued" && crm.status !== "synced" && crm.status !== "failed")
    || typeof crm.attempts !== "number" || !Number.isInteger(crm.attempts) || crm.attempts < 0
    || (crm.lastAttemptAt !== undefined && typeof crm.lastAttemptAt !== "string")
    || (crm.failureCode !== undefined && typeof crm.failureCode !== "string")
  ) return null;
  return value as unknown as LedgerRecord;
}

export function crmEventMatchesLedger(event: Pick<CrmEvent, "requestId">, record: Pick<LedgerRecord, "id">): boolean {
  return event.requestId === record.id;
}

export interface DataverseContactMatch {
  contactid: string;
  _owningbusinessunit_value: string;
}

export function selectDataverseContact(value: unknown): DataverseContactMatch | null {
  if (!Array.isArray(value)) throw new Error("dataverse_contact_query_invalid");
  if (value.length > 1) throw new Error("dataverse_contact_ambiguous");
  const contact = value[0];
  if (contact === undefined) return null;
  if (
    !isObject(contact)
    || typeof contact.contactid !== "string"
    || contact.contactid.length === 0
    || typeof contact._owningbusinessunit_value !== "string"
    || contact._owningbusinessunit_value.length === 0
  ) {
    throw new Error("dataverse_contact_query_invalid");
  }
  return {
    contactid: requireCanonicalGuid(contact.contactid, "contact"),
    _owningbusinessunit_value: requireCanonicalGuid(contact._owningbusinessunit_value, "contact_business_unit"),
  };
}

export function parseDataverseContactIdHeader(value: string | null): string {
  const rawContactId = value?.match(/\(([^)]+)\)/)?.[1];
  if (!rawContactId) throw new Error("dataverse_contact_id_missing");
  return requireCanonicalGuid(rawContactId, "contact");
}

export function parseDataverseCreatedContact(value: string | null, payload: unknown): DataverseContactMatch {
  const headerContactId = parseDataverseContactIdHeader(value);
  const contact = selectDataverseContact(isObject(payload) ? [payload] : []);
  if (!contact || contact.contactid !== headerContactId) throw new Error("dataverse_contact_response_invalid");
  return contact;
}

export async function readLedger(path: string): Promise<{ record: LedgerRecord; etag: string } | null> {
  const blob = ledgerContainer().getBlockBlobClient(path);
  let download;
  try {
    // Download is the existence check. Keeping this as one request avoids a
    // check-then-download race when a ledger is replaced or removed between
    // the two operations.
    download = await blob.download();
  } catch (error) {
    if (isStorageNotFound(error)) return null;
    throw error;
  }
  const body = await streamToString(download.readableStreamBody);
  if (!download.etag) return null;
  try {
    const record = parseLedgerRecord(JSON.parse(body) as unknown);
    return record ? { record, etag: download.etag } : null;
  } catch {
    return null;
  }
}

type LedgerSnapshot = { record: LedgerRecord; etag: string };
type LedgerReader = (path: string) => Promise<LedgerSnapshot | null>;
type LedgerWriter = (path: string, record: LedgerRecord, ifMatch?: string) => Promise<string>;

export function mergeCrmFailureRecord(
  record: LedgerRecord,
  minimumAttempts: number,
  failureCode: string,
  lastAttemptAt: string,
): LedgerRecord {
  if (record.crm.status === "synced") return record;
  return {
    ...record,
    crm: {
      status: "failed",
      attempts: Math.max(record.crm.attempts, minimumAttempts),
      lastAttemptAt,
      failureCode,
    },
  };
}

export function mergeCrmSyncedRecord(
  record: LedgerRecord,
  minimumAttempts: number,
  lastAttemptAt: string,
): LedgerRecord {
  return {
    ...record,
    crm: {
      status: "synced",
      attempts: Math.max(record.crm.attempts, minimumAttempts),
      lastAttemptAt,
    },
  };
}

export async function persistCrmFailureState(
  ledgerPath: string,
  record: LedgerRecord,
  ledgerEtag: string,
  minimumAttempts: number,
  failureCode: string,
  context?: InvocationContext,
  requestId = record.id,
  read: LedgerReader = readLedger,
  write: LedgerWriter = writeLedger,
): Promise<boolean> {
  if (record.crm.status === "synced") return true;
  const lastAttemptAt = new Date().toISOString();
  const nextRecord = mergeCrmFailureRecord(record, minimumAttempts, failureCode, lastAttemptAt);
  try {
    await write(ledgerPath, nextRecord, ledgerEtag);
    return true;
  } catch (writeError) {
    try {
      const readback = await read(ledgerPath);
      if (!readback || readback.record.id !== record.id) throw new Error("ledger_readback_invalid");
      if (readback.record.crm.status === "synced") return true;
      const mergedRecord = mergeCrmFailureRecord(
        readback.record,
        Math.max(nextRecord.crm.attempts, minimumAttempts),
        failureCode,
        lastAttemptAt,
      );
      await write(ledgerPath, mergedRecord, readback.etag);
      return true;
    } catch (retryError) {
      context?.error("CRM failure state could not be persisted", {
        requestId,
        failureCode,
        writeFailureCode: safeFailureCode(writeError),
        retryFailureCode: safeFailureCode(retryError),
      });
      return false;
    }
  }
}

export async function persistCrmSyncedState(
  ledgerPath: string,
  record: LedgerRecord,
  ledgerEtag: string,
  context?: InvocationContext,
  requestId = record.id,
  read: LedgerReader = readLedger,
  write: LedgerWriter = writeLedger,
): Promise<void> {
  const lastAttemptAt = record.crm.lastAttemptAt ?? new Date().toISOString();
  const nextRecord = mergeCrmSyncedRecord(record, record.crm.attempts, lastAttemptAt);
  try {
    await write(ledgerPath, nextRecord, ledgerEtag);
    return;
  } catch (writeError) {
    try {
      const readback = await read(ledgerPath);
      if (!readback || readback.record.id !== record.id) throw new Error("ledger_readback_invalid");
      // Another worker may have committed the same CRM projection after this
      // worker's read. Preserve that newer state and all of its other fields.
      if (readback.record.crm.status === "synced") return;
      const mergedRecord = mergeCrmSyncedRecord(
        readback.record,
        Math.max(nextRecord.crm.attempts, readback.record.crm.attempts),
        lastAttemptAt,
      );
      await write(ledgerPath, mergedRecord, readback.etag);
    } catch (retryError) {
      context?.error("CRM synced state could not be persisted", {
        requestId,
        writeFailureCode: safeFailureCode(writeError),
        retryFailureCode: safeFailureCode(retryError),
      });
      // The Dataverse side effect already completed. Propagate the bounded
      // ledger failure so the queue can retry reconciliation without sending
      // another email or silently losing the CRM completion marker.
      throw retryError;
    }
  }
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

/**
 * Queue creation is idempotent but still incurs a storage transaction. Cache
 * its initialization promise for the warm Function worker, while clearing a
 * rejected promise so a later invocation can recover from a transient error.
 */
export function ensureCrmQueueInitialized(queue: QueueClientLike): Promise<void> {
  if (crmQueueInitializationClient !== queue) {
    crmQueueInitializationClient = queue;
    crmQueueInitialization = undefined;
  }
  if (!crmQueueInitialization) {
    const clientForInitialization = queue;
    crmQueueInitialization = queue.createIfNotExists().then(
      () => undefined,
      (error: unknown) => {
        if (crmQueueInitializationClient === clientForInitialization) {
          crmQueueInitializationClient = undefined;
          crmQueueInitialization = undefined;
        }
        throw error;
      },
    );
  }
  return crmQueueInitialization;
}

export interface EmailPollerLike<TResult> {
  poll?: (options?: { abortSignal?: AbortSignalLike }) => Promise<void>;
  pollUntilDone(options?: { abortSignal?: AbortSignalLike }): Promise<TResult>;
  isDone?: () => boolean;
  getResult?: () => TResult | undefined;
  getOperationState?: () => unknown;
}

export class EmailDeliveryAmbiguousError extends Error {
  readonly operationId: string | undefined;
  readonly operationIds: readonly string[];

  constructor(operationId?: string, operationIds: readonly string[] = operationId ? [operationId] : []) {
    super("acs_delivery_status_unknown");
    this.name = "EmailDeliveryAmbiguousError";
    this.operationIds = [...new Set([...operationIds, ...(operationId ? [operationId] : [])])];
    this.operationId = operationId ?? this.operationIds[0];
  }
}

function pollerOperationId<TResult>(poller: EmailPollerLike<TResult>): string | undefined {
  const result = poller.getResult?.();
  return isObject(result) && typeof result.id === "string" && result.id.trim().length > 0 ? result.id : undefined;
}

function isDefinitiveEmailTerminal<TResult>(poller: EmailPollerLike<TResult>): boolean {
  const result = poller.getResult?.();
  if (isObject(result) && typeof result.status === "string" && ["Succeeded", "Failed", "Canceled", "succeeded", "failed", "canceled"].includes(result.status)) {
    return true;
  }
  const state = poller.getOperationState?.();
  if (!isObject(state)) return false;
  if (typeof state.status !== "string") return false;
  if (["Succeeded", "Canceled", "succeeded", "canceled"].includes(state.status)) return true;
  // core-lro also marks a poller failed when a polling HTTP request throws.
  // That local error is not a definitive remote terminal result unless the
  // provider response was captured as the operation result.
  return ["Failed", "failed"].includes(state.status) && state.result !== undefined;
}

function ambiguousEmailError<TResult>(
  poller: EmailPollerLike<TResult>,
  fallbackOperationId?: string,
  fallbackOperationIds: readonly string[] = [],
): EmailDeliveryAmbiguousError {
  const providerOperationId = pollerOperationId(poller);
  return new EmailDeliveryAmbiguousError(providerOperationId ?? fallbackOperationId, [
    ...fallbackOperationIds,
    ...(fallbackOperationId ? [fallbackOperationId] : []),
    ...(providerOperationId ? [providerOperationId] : []),
  ]);
}

async function reconcileEmailPoll<TResult>(
  poller: EmailPollerLike<TResult>,
  createTimeout: (milliseconds: number) => AbortSignalLike,
): Promise<TResult | undefined> {
  if (!poller.poll || !poller.isDone || !poller.getResult) return undefined;
  const abortSignal = createTimeout(EMAIL_RECONCILIATION_TIMEOUT_MS);
  try {
    while (!poller.isDone()) {
      await poller.poll({ abortSignal });
      if (!poller.isDone()) await new Promise<void>((resolve) => setTimeout(resolve, EMAIL_RECONCILIATION_POLL_INTERVAL_MS));
    }
    return isDefinitiveEmailTerminal(poller) ? poller.getResult() : undefined;
  } catch (error) {
    if (!abortSignal.aborted) throw error;
    return undefined;
  }
}

export function pollEmailUntilDone<TResult>(
  poller: EmailPollerLike<TResult>,
  createTimeout: (milliseconds: number) => AbortSignalLike = (milliseconds) => AbortSignal.timeout(milliseconds),
  fallbackOperationId?: string,
  fallbackOperationIds: readonly string[] = [],
): Promise<TResult> {
  const abortSignal = createTimeout(EMAIL_POLL_TIMEOUT_MS);
  return poller.pollUntilDone({ abortSignal }).catch((error: unknown) => {
    if (isDefinitiveEmailTerminal(poller)) throw error;
    return reconcileEmailPoll(poller, createTimeout)
      .then((result) => {
        if (result !== undefined) return result;
        if (isDefinitiveEmailTerminal(poller)) throw error;
        throw ambiguousEmailError(poller, fallbackOperationId, fallbackOperationIds);
      })
      .catch((reconciliationError: unknown) => {
        if (isDefinitiveEmailTerminal(poller)) throw reconciliationError;
        throw ambiguousEmailError(poller, fallbackOperationId, fallbackOperationIds);
      });
  });
}

export function crmEnqueueRetryDelay(attempt: number): number {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= CRM_ENQUEUE_MAX_ATTEMPTS) {
    throw new Error("crm_enqueue_retry_attempt_invalid");
  }
  return Math.min(CRM_ENQUEUE_RETRY_MAX_MS, CRM_ENQUEUE_RETRY_BASE_MS * (2 ** attempt));
}

function isRetryableCrmEnqueueError(error: unknown): boolean {
  if (!isObject(error)) return false;
  const statusCode = typeof error.statusCode === "number" ? error.statusCode : undefined;
  // Queue messages are safe to retry through the bounded window because CRM
  // projection uses the request alternate key and the Contact lock. Other
  // client errors are definitive and must not burn attempts.
  if (statusCode !== undefined) return statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
  let candidate: unknown = error;
  for (let depth = 0; depth < 3 && isObject(candidate); depth += 1) {
    const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : undefined;
    const name = typeof candidate.name === "string" ? candidate.name : undefined;
    if ((code !== undefined && CRM_ENQUEUE_TRANSPORT_CODES.has(code)) || name === "AbortError") return true;
    candidate = candidate.cause;
  }
  return false;
}

export async function retryCrmEnqueue<T>(operation: () => Promise<T>, sleep: (delayMs: number) => Promise<void> = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs))): Promise<T> {
  for (let attempt = 0; attempt < CRM_ENQUEUE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableCrmEnqueueError(error) || attempt === CRM_ENQUEUE_MAX_ATTEMPTS - 1) throw error;
      await sleep(crmEnqueueRetryDelay(attempt));
    }
  }
  throw new Error("crm_enqueue_retry_unreachable");
}

async function markCrmEnqueueFailure(event: CrmEvent, error: unknown, attempts: number): Promise<void> {
  try {
    const current = await readLedger(event.ledgerPath);
    if (!current || !crmEventMatchesLedger(event, current.record) || current.record.crm.status === "synced") return;
    await persistCrmFailureState(
      event.ledgerPath,
      current.record,
      current.etag,
      attempts,
      safeFailureCode(error),
    );
  } catch {
    // Preserve the original enqueue failure. The queue/dead-letter path owns
    // subsequent recovery if the failure state itself cannot be persisted.
  }
}

export async function enqueueCrm(event: CrmEvent): Promise<void> {
  const config = loadConfig();
  const queueUrl = `https://${config.BRIEF_STORAGE_ACCOUNT_NAME}.queue.core.windows.net/${config.CRM_RETRY_QUEUE_NAME}`;
  if (!crmQueue || crmQueueUrl !== queueUrl) {
    crmQueue = new QueueClient(queueUrl, credential);
    crmQueueUrl = queueUrl;
    crmQueueInitializationClient = undefined;
    crmQueueInitialization = undefined;
  }
  const queue = crmQueue;
  let attempts = 0;
  try {
    await retryCrmEnqueue(async () => {
      attempts += 1;
      await ensureCrmQueueInitialized(queue);
      await queue.sendMessage(Buffer.from(JSON.stringify(event), "utf8").toString("base64"));
    });
  } catch (error) {
    await markCrmEnqueueFailure(event, error, attempts);
    throw error;
  }
}

export function deadLetterArchivePath(event: CrmEvent, errorCode: string, _archivedAt = new Date()): string {
  // Partition by the event's immutable occurrence date, not by the wall clock
  // of the retry. A poison message crossing UTC midnight must resolve to the
  // same blob path on every delivery.
  const occurredAt = Date.parse(event.occurredAt);
  const day = Number.isNaN(occurredAt) ? "unknown" : new Date(occurredAt).toISOString().slice(0, 10);
  const suffix = crypto.createHash("sha256").update(JSON.stringify([event, errorCode])).digest("hex");
  return `crm/${day}/${event.requestId.toLowerCase()}-${suffix}.json`;
}

export async function archiveDeadLetter(event: CrmEvent, errorCode: string): Promise<void> {
  const { config, blobService: service } = clients();
  const container = service.getContainerClient(config.DEADLETTER_CONTAINER_NAME);
  const path = deadLetterArchivePath(event, errorCode);
  const body = JSON.stringify({ event, errorCode, archivedAt: new Date().toISOString() });
  try {
    await container.getBlockBlobClient(path).upload(body, Buffer.byteLength(body), {
      blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
      conditions: { ifNoneMatch: "*" },
    });
  } catch (error) {
    // The path is deterministic for one poison event and error class. A
    // precondition failure therefore means another retry already archived it;
    // do not turn an idempotent replay into another poison failure.
    if (!isPreconditionFailed(error)) throw error;
  }
}

type EmailOperationPurpose = "brief" | "consultation-receipt" | "consultation-route";

/**
 * Keep ACS operation IDs stable for one logical delivery. If a poll times out,
 * the same operation can be reconciled without issuing a second send request.
 */
export function emailOperationId(requestId: string, purpose: EmailOperationPurpose): string {
  if (!ledgerGuidPattern.test(requestId)) throw new Error("email_operation_request_id_invalid");
  const hex = crypto.createHash("sha256").update(`${requestId.toLowerCase()}:${purpose}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  const variant = Number.parseInt(hex[16] ?? "0", 16);
  hex[16] = ((variant & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

/**
 * A beginSend response without a poller can still mean ACS accepted the
 * request. Keep definitive client errors as failures, but surface
 * network/server ambiguity with the stable operation handle so callers never
 * submit a second logical send.
 */
export function normalizeEmailBeginSendError(error: unknown, operationId: string, operationIds: readonly string[] = [operationId]): unknown {
  if (error instanceof EmailDeliveryAmbiguousError) return error;
  const statusCode = isObject(error) && typeof error.statusCode === "number" ? error.statusCode : undefined;
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) return error;
  return new EmailDeliveryAmbiguousError(operationId, operationIds);
}

/**
 * Once the receipt leg has returned a poller, the consultation is a single
 * logical delivery. Any later leg error, including a definitive provider
 * response, must retain both handles and remain non-replayable: the receipt
 * may already have been accepted even when routing was rejected.
 */
export function aggregateConsultationEmailError(error: unknown, operationIds: readonly string[]): EmailDeliveryAmbiguousError {
  const existing = error instanceof EmailDeliveryAmbiguousError ? error : undefined;
  const primaryOperationId = existing?.operationId ?? operationIds[1] ?? operationIds[0];
  return new EmailDeliveryAmbiguousError(primaryOperationId, [
    ...operationIds,
    ...(existing?.operationIds ?? []),
  ]);
}

interface SucceededEmailResult {
  status: "Succeeded";
  id: string;
}

function isSucceededEmailResult(value: unknown): value is SucceededEmailResult {
  return isObject(value)
    && value.status === "Succeeded"
    && typeof value.id === "string"
    && value.id.trim().length > 0;
}

/**
 * A successful ACS state without a provider ID cannot be safely replayed: the
 * provider may have accepted the message, but the ledger would have no handle
 * for reconciliation. Definitive failed/canceled states remain retryable.
 */
export function requireSucceededEmailProviderId(value: unknown, operationId: string): string {
  if (isSucceededEmailResult(value)) return value.id;
  if (isObject(value) && typeof value.status === "string" && ["Failed", "Canceled", "failed", "canceled"].includes(value.status)) {
    throw new Error(`acs_send_${value.status}`);
  }
  throw new EmailDeliveryAmbiguousError(operationId);
}

export function allConsultationEmailsSucceeded(
  outcomes: readonly PromiseSettledResult<unknown>[],
): boolean {
  return outcomes.length === 2 && outcomes.every((outcome) => (
    outcome.status === "fulfilled" && isSucceededEmailResult(outcome.value)
  ));
}

type EmailMessageLike = Parameters<EmailClient["beginSend"]>[0];

export async function beginEmailSend(
  sender: EmailClient,
  message: EmailMessageLike,
  operationId: string,
  operationIds: readonly string[] = [operationId],
  createTimeout: (milliseconds: number) => AbortSignalLike = (milliseconds) => AbortSignal.timeout(milliseconds),
) {
  const abortSignal = createTimeout(EMAIL_POLL_TIMEOUT_MS);
  try {
    return await sender.beginSend(message, { operationId, abortSignal });
  } catch (error) {
    throw normalizeEmailBeginSendError(error, operationId, operationIds);
  }
}

export async function sendBriefEmail(to: string, name: string, brief: BriefDefinition, link: string, unsubscribeUrl: string, requestId: string): Promise<string> {
  const { config, emailClient: sender } = clients();
  const from = await getSecret(config.ACS_SENDER_ADDRESS_SECRET_NAME);
  const content = renderBriefEmail(name, brief, link, unsubscribeUrl);
  const operationId = emailOperationId(requestId, "brief");
  const poller = await beginEmailSend(sender, {
    senderAddress: from,
    recipients: { to: [{ address: to }] },
    replyTo: [{ address: config.REPLY_TO }],
    content: { subject: `${brief.title} — your HardMagic field guide`, html: content.html, plainText: content.plain },
  }, operationId);
  const result = await pollEmailUntilDone(poller, undefined, operationId);
  return requireSucceededEmailProviderId(result, operationId);
}

export async function sendConsultationEmails(record: LedgerRecord): Promise<string> {
  const { config, emailClient: sender } = clients();
  const from = await getSecret(config.ACS_SENDER_ADDRESS_SECRET_NAME);
  const publicReceipt = renderConsultationReceipt(record);
  const internal = renderInternalIntake(record);
  const receiptOperationId = emailOperationId(record.id, "consultation-receipt");
  const routeOperationId = emailOperationId(record.id, "consultation-route");
  const consultationOperationIds = [receiptOperationId, routeOperationId] as const;
  const receiptPoller = await beginEmailSend(sender, {
    senderAddress: from,
    recipients: { to: [{ address: record.email }] },
    replyTo: [{ address: config.REPLY_TO }],
    content: { subject: "HardMagic received your brief", html: publicReceipt.html, plainText: publicReceipt.plain },
  }, receiptOperationId, consultationOperationIds);
  let routePoller;
  try {
    routePoller = await beginEmailSend(sender, {
      senderAddress: from,
      recipients: { to: [{ address: config.CONTACT_EMAIL }] },
      replyTo: [{ address: record.email }],
      content: { subject: `Qualified intake: ${record.intakeCategory} · ${record.organization}`, html: internal.html, plainText: internal.plain },
    }, routeOperationId, consultationOperationIds);
  } catch (error) {
    throw aggregateConsultationEmailError(error, consultationOperationIds);
  }
  const outcomes = await Promise.allSettled([
    pollEmailUntilDone(receiptPoller, undefined, receiptOperationId, consultationOperationIds),
    pollEmailUntilDone(routePoller, undefined, routeOperationId, consultationOperationIds),
  ]);
  if (!allConsultationEmailsSucceeded(outcomes)) {
    const rejection = outcomes.find((outcome) => outcome.status === "rejected");
    throw aggregateConsultationEmailError(rejection?.status === "rejected" ? rejection.reason : undefined, consultationOperationIds);
  }
  const [receiptOutcome, routeOutcome] = outcomes;
  if (receiptOutcome.status !== "fulfilled" || routeOutcome.status !== "fulfilled") {
    throw aggregateConsultationEmailError(undefined, consultationOperationIds);
  }
  const receiptId = requireSucceededEmailProviderId(receiptOutcome.value, receiptOperationId);
  const routeId = requireSucceededEmailProviderId(routeOutcome.value, routeOperationId);
  return `${receiptId}:${routeId}`;
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

/**
 * Return only valid timestamps in the current rolling window.
 *
 * The counter is intentionally represented as a short list rather than a
 * caller-identifying value. The caller supplies a one-way scope hash and the
 * blob path below contains that hash only.
 */
export function pruneRateLimitTimestamps(value: unknown, now: number): number[] {
  if (!Number.isFinite(now)) throw new Error("rate_limit_clock_invalid");
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("rate_limit_state_invalid");
  return value.filter((timestamp): timestamp is number => (
    typeof timestamp === "number"
    && Number.isFinite(timestamp)
    && now - timestamp < RATE_LIMIT_WINDOW_MS
    // A small amount of future skew is valid when another Function instance
    // has a clock ahead of this one. Retain it conservatively so the event is
    // not under-counted; far-future values are treated as invalid state.
    && now - timestamp >= -RATE_LIMIT_MAX_FUTURE_SKEW_MS
  ));
}

/**
 * Apply one request to a rolling counter without any storage side effects.
 * Keeping this decision pure makes the boundary conditions testable without
 * connecting to Azure Blob Storage.
 */
export function advanceRateLimitCounter(value: unknown, now: number, limit: number): RateLimitDecision {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("rate_limit_limit_invalid");
  const timestampsValue = value && typeof value === "object" && !Array.isArray(value) && "timestamps" in value
    ? value.timestamps
    : value;
  const timestamps = pruneRateLimitTimestamps(timestampsValue, now);
  // A healthy counter never exceeds the configured limit. If a legacy or
  // externally-corrupted blob does, retain only the newest limit entries and
  // continue denying until that bounded state rolls out of the window.
  const bounded = timestamps.length > limit ? timestamps.slice(-limit) : timestamps;
  if (timestamps.length >= limit) return { allowed: false, counter: { timestamps: bounded } };
  return { allowed: true, counter: { timestamps: [...bounded, now] } };
}

export function rateLimitCounterPath(scopeHash: string): string {
  if (!/^[a-f0-9]{64}$/i.test(scopeHash)) throw new Error("rate_limit_scope_invalid");
  return `rate/${scopeHash}.json`;
}

/**
 * Return a bounded, deterministic backoff window with caller-provided jitter
 * for lease contention. The optional value keeps retry timing testable without
 * replacing the process-wide random source used in production.
 */
export function rateLimitLeaseRetryDelay(attempt: number, randomValue = Math.random()): number {
  if (!Number.isInteger(attempt) || attempt < 0) throw new Error("rate_limit_retry_attempt_invalid");
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) throw new Error("rate_limit_retry_jitter_invalid");
  const backoff = Math.min(RATE_LIMIT_LEASE_RETRY_MAX_MS, RATE_LIMIT_LEASE_RETRY_BASE_MS * (2 ** attempt));
  return backoff + Math.floor(randomValue * RATE_LIMIT_LEASE_RETRY_JITTER_MS);
}

function isStorageConflict(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "statusCode" in error
    && (error.statusCode === 409 || error.statusCode === 412);
}

async function withRateLimitBlobLease<T>(
  blob: ReturnType<ContainerClient["getBlockBlobClient"]>,
  callback: (leaseId: string) => Promise<T>,
): Promise<T | null> {
  const leaseClient = blob.getBlobLeaseClient();
  let leaseId: string | undefined;
  for (let attempt = 0; attempt < RATE_LIMIT_LEASE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const lease = await leaseClient.acquireLease(RATE_LIMIT_LEASE_SECONDS);
      leaseId = lease.leaseId;
      if (!leaseId) throw new Error("rate_limit_lease_missing");
      break;
    } catch (error) {
      // A competing invocation owns the short lease. Give it a bounded,
      // jittered opportunity to finish before failing closed.
      if (!isStorageConflict(error)) throw error;
      if (attempt === RATE_LIMIT_LEASE_MAX_ATTEMPTS - 1) return null;
      await new Promise<void>((resolve) => setTimeout(resolve, rateLimitLeaseRetryDelay(attempt)));
    }
  }

  if (!leaseId) throw new Error("rate_limit_lease_missing");

  try {
    return await callback(leaseId);
  } finally {
    // Releasing is best effort: an expired lease is already safe, and a
    // release failure must not mask the request's decision or storage error.
    await leaseClient.releaseLease().catch(() => undefined);
  }
}

/**
 * Serialize account-scoped Contact lookup/create operations across warm
 * workers. Dataverse has no uniqueness contract for the Account + email
 * lookup, so two workers that both observe an empty result could otherwise
 * create duplicate Contacts. The lock blob contains only a one-way scope
 * hash, and contention fails closed so the queue can retry without creating a
 * duplicate.
 */
export function dataverseContactLockPath(accountId: string, email: string): string {
  const safeAccountId = requireCanonicalGuid(accountId, "account");
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 320) throw new Error("dataverse_contact_email_invalid");
  return `locks/contact/${piiHash(`${safeAccountId}:${normalizedEmail}`)}.lock`;
}

export async function withDataverseContactLock<T>(
  accountId: string,
  email: string,
  callback: () => Promise<T>,
): Promise<T> {
  const blob = ledgerContainer().getBlockBlobClient(dataverseContactLockPath(accountId, email));
  const body = JSON.stringify({ version: 1 });
  try {
    await blob.upload(body, Buffer.byteLength(body), {
      blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
      conditions: { ifNoneMatch: "*" },
    });
  } catch (error) {
    if (!isStorageConflict(error)) throw error;
  }
  const result = await withRateLimitBlobLease(blob, () => callback());
  if (result === null) throw new Error("dataverse_contact_lock_unavailable");
  return result;
}

/**
 * Resolve a Contact only while holding the caller-provided distributed lock.
 * Rechecking inside the lock is the idempotency boundary: the second worker
 * sees the Contact created by the first and never issues a second POST.
 */
export async function resolveDataverseContact(
  lookup: () => Promise<DataverseContactMatch | null>,
  create: () => Promise<DataverseContactMatch>,
  withLock: <T>(callback: () => Promise<T>) => Promise<T>,
): Promise<DataverseContactMatch> {
  return withLock(async () => {
    const existing = await lookup();
    return existing ?? create();
  });
}

async function readRateLimitCounter(
  blob: ReturnType<ContainerClient["getBlockBlobClient"]>,
  leaseId: string,
): Promise<unknown> {
  const body = await blob.downloadToBuffer(undefined, undefined, { conditions: { leaseId } });
  return JSON.parse(body.toString("utf8")) as unknown;
}

async function writeRateLimitCounter(
  blob: ReturnType<ContainerClient["getBlockBlobClient"]>,
  counter: RateLimitCounter,
  leaseId: string,
): Promise<void> {
  const body = JSON.stringify(counter);
  await blob.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
    conditions: { leaseId },
  });
}

export async function enforceRateLimit(scopeHash: string): Promise<boolean> {
  const config = loadConfig();
  const path = rateLimitCounterPath(scopeHash);
  const blob = ledgerContainer().getBlockBlobClient(path);
  const emptyCounter = JSON.stringify({ timestamps: [] });

  // A lease can only be acquired on an existing blob. Concurrent creators
  // race safely via If-None-Match, then all contenders use the same counter.
  try {
    await blob.upload(emptyCounter, Buffer.byteLength(emptyCounter), {
      blobHTTPHeaders: { blobContentType: "application/json; charset=utf-8", blobCacheControl: "no-store" },
      conditions: { ifNoneMatch: "*" },
    });
  } catch (error) {
    if (!isStorageConflict(error)) throw error;
  }

  const now = Date.now();
  const result = await withRateLimitBlobLease(blob, async (leaseId) => {
    const current = await readRateLimitCounter(blob, leaseId);
    if (!current || typeof current !== "object" || !("timestamps" in current) || !Array.isArray(current.timestamps)) {
      throw new Error("rate_limit_state_invalid");
    }
    const currentTimestamps = current.timestamps;
    const decision = advanceRateLimitCounter(currentTimestamps, now, config.RATE_LIMIT_PER_HOUR);
    // Persist the pruned list even when the request is denied, keeping the
    // counter bounded to the rolling window and configured limit.
    await writeRateLimitCounter(blob, decision.counter, leaseId);
    return decision.allowed;
  });

  // Lease contention fails closed. antiAbuse maps this false result to the
  // existing 429 response without exposing storage details or PII.
  return result ?? false;
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
  if (!crmEventMatchesLedger(event, record)) throw new Error("crm_request_id_mismatch");
  const [accountIdSecret, businessUnitIdSecret, ownerTeamIdSecret] = await Promise.all([
    getSecret(config.DATAVERSE_ACCOUNT_ID_SECRET_NAME),
    getSecret(config.DATAVERSE_BUSINESS_UNIT_ID_SECRET_NAME),
    getSecret(config.DATAVERSE_OWNER_TEAM_ID_SECRET_NAME),
  ]);
  const accountId = requireCanonicalGuid(accountIdSecret, "account");
  const businessUnitId = requireCanonicalGuid(businessUnitIdSecret, "business_unit");
  const ownerTeamId = requireCanonicalGuid(ownerTeamIdSecret, "owner_team");
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
    await persistCrmSyncedState(event.ledgerPath, record, current.etag, context, record.id);
    context.info("Dataverse suppression completed", { requestId: record.id });
    return;
  }
  const contactQuery = buildAccountScopedContactQuery(record.email, accountId);
  const contact = await resolveDataverseContact(
    async () => {
      const lookupResponse = await fetch(config.DATAVERSE_URL + contactQuery, { headers, signal: AbortSignal.timeout(10_000) });
      if (!lookupResponse.ok) throw new Error(`dataverse_contact_query_${lookupResponse.status}`);
      const payload = await lookupResponse.json() as unknown;
      return selectDataverseContact(isObject(payload) ? payload.value : undefined);
    },
    async () => {
      const [firstName, ...lastParts] = record.name.split(/\s+/);
      const createResponse = await fetch(`${config.DATAVERSE_URL}/api/data/v9.2/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          firstname: firstName,
          lastname: lastParts.join(" ") || "Unknown",
          emailaddress1: record.email,
          company: record.organization,
          "parentcustomerid_account@odata.bind": `/accounts(${accountId})`,
          // Dataverse exposes the polymorphic owner navigation as `ownerid`.
          // `ownerid_team` is not a valid navigation property on this table.
          "ownerid@odata.bind": `/teams(${ownerTeamId})`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!createResponse.ok) throw new Error(`dataverse_contact_create_${createResponse.status}`);
      const contactId = parseDataverseContactIdHeader(createResponse.headers.get("odata-entityid"));
      const readResponse = await fetch(`${config.DATAVERSE_URL}/api/data/v9.2/contacts(${contactId})?$select=contactid,_owningbusinessunit_value`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (!readResponse.ok) throw new Error(`dataverse_contact_read_${readResponse.status}`);
      return parseDataverseCreatedContact(createResponse.headers.get("odata-entityid"), await readResponse.json() as unknown);
    },
    (operation) => withDataverseContactLock(accountId, record.email, operation),
  );
  if (contact._owningbusinessunit_value.toLowerCase() !== businessUnitId) {
    throw new Error("dataverse_contact_boundary_violation");
  }
  const contactId = contact.contactid;
  const engagement = buildDataverseEngagement(record, contactId, ownerTeamId);
  const response = await fetch(engagementUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify(engagement),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`dataverse_engagement_upsert_${response.status}`);
  record.crm = { status: "synced", attempts: record.crm.attempts + 1, lastAttemptAt: new Date().toISOString() };
  await persistCrmSyncedState(event.ledgerPath, record, current.etag, context, record.id);
  context.info("Dataverse projection completed", { requestId: record.id, kind: record.kind });
}

export function buildDataverseEngagement(record: LedgerRecord, contactId: string, ownerTeamId: string): Record<string, string | boolean> {
  const safeContactId = requireCanonicalGuid(contactId, "contact");
  const safeOwnerTeamId = requireCanonicalGuid(ownerTeamId, "owner_team");
  return {
    hm_requestid: record.id,
    hm_name: record.report?.title ?? `Consultation · ${record.intakeCategory}`,
    hm_requesttype: record.kind,
    hm_briefkey: record.report?.slug ?? "consultation",
    hm_brieftitle: record.report?.title ?? "",
    hm_emailhash: piiHash(record.email),
    hm_organization: record.organization,
    hm_role: record.role,
    hm_industry: record.qualification.industry ?? "",
    hm_organizationsize: record.qualification.organizationSize ?? "",
    hm_decisionstage: record.qualification.decisionStage ?? "",
    hm_primarychallenge: record.qualification.primaryChallenge ?? record.qualification.mandate ?? "",
    hm_decisionhorizon: record.qualification.decisionHorizon ?? "",
    hm_preferrednextstep: record.qualification.preferredNextStep ?? "",
    hm_interest: record.intakeCategory,
    hm_sourcecampaign: record.sourceCampaign,
    hm_consentscope: record.consent.broaderMarketing ? "requested-resource; marketing" : "requested-resource",
    hm_marketingconsent: record.consent.broaderMarketing,
    hm_context: record.qualification.context ?? "",
    hm_deliverystatus: record.delivery.status,
    hm_suppressionstatus: record.suppressionStatus ?? "active",
    // These navigation names are case-sensitive in the live Dataverse CSDL.
    "hm_Contact@odata.bind": `/contacts(${safeContactId})`,
    "ownerid@odata.bind": `/teams(${safeOwnerTeamId})`,
  };
}

export function buildAccountScopedContactQuery(email: string, accountId: string): string {
  const safeAccountId = requireCanonicalGuid(accountId, "account");
  const emailLiteral = email.trim().toLowerCase().replaceAll("'", "''");
  const params = new URLSearchParams({
    "$top": "2",
    "$select": "contactid,_parentcustomerid_value,_owningbusinessunit_value",
    "$filter": `emailaddress1 eq '${emailLiteral}' and _parentcustomerid_value eq ${safeAccountId}`,
  });
  return `/api/data/v9.2/contacts?${params.toString()}`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
