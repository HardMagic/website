import assert from "node:assert/strict";
import test from "node:test";
import { isCanonicalGuid, requireCanonicalGuid, resetConfigForTests } from "../src/config.js";
import {
  aggregateConsultationEmailError,
  allConsultationEmailsSucceeded,
  buildAccountScopedContactQuery,
  buildDataverseEngagement,
  beginEmailSend,
  crmEventMatchesLedger,
  crmEnqueueRetryDelay,
  dataverseContactLockPath,
  deadLetterArchivePath,
  EmailDeliveryAmbiguousError,
  emailOperationId,
  ensureCrmQueueInitialized,
  mergeCrmFailureRecord,
  mergeCrmSyncedRecord,
  normalizeEmailBeginSendError,
  parseDataverseContactIdHeader,
  parseDataverseCreatedContact,
  parseLedgerRecord,
  pollEmailUntilDone,
  persistCrmFailureState,
  persistCrmSyncedState,
  requireSucceededEmailProviderId,
  resolveDataverseContact,
  retryCrmEnqueue,
  selectDataverseContact,
  type CrmEvent,
  type LedgerRecord,
} from "../src/platform.js";

Object.assign(process.env, {
  AZURE_CLIENT_ID: "11111111-1111-4111-8111-111111111111",
  BRIEF_STORAGE_ACCOUNT_NAME: "sthmbriefexample",
  COMPANY_DOMAIN: "hardmagic.com",
  BRIEF_HOST: "briefs.hardmagic.com",
  PUBLIC_SITE_URL: "https://hardmagic.com",
  CONTACT_URL: "https://hardmagic.com/contact/",
  CONTACT_EMAIL: "hello@hardmagic.com",
  REPLY_TO: "hello@hardmagic.com",
  ALLOWED_ORIGINS: "https://hardmagic.com,https://www.hardmagic.com",
  EXPECTED_FRONT_DOOR_ID: "22222222-2222-4222-8222-222222222222",
  KEY_VAULT_URI: "https://kv-hm-brief-example.vault.azure.net",
  ACS_ENDPOINT: "https://acs-hm-example.communication.azure.com",
  ACS_SENDER_ADDRESS_SECRET_NAME: "acs-sender-address",
  TURNSTILE_SECRET_NAME: "turnstile-secret",
  UNSUBSCRIBE_TOKEN_SECRET_NAME: "unsubscribe-token-key",
  DATAVERSE_ACCOUNT_ID_SECRET_NAME: "dataverse-account-id",
  DATAVERSE_BUSINESS_UNIT_ID_SECRET_NAME: "dataverse-business-unit-id",
  DATAVERSE_OWNER_TEAM_ID_SECRET_NAME: "dataverse-owner-team-id",
  DATAVERSE_URL: "https://dream.crm.dynamics.com",
  DATAVERSE_ENTITY_SET: "hm_briefengagements",
  DATAVERSE_ENTITY_LOGICAL_NAME: "hm_briefengagement",
  DATAVERSE_REQUEST_ID_COLUMN: "hm_requestid",
  TURNSTILE_REQUIRED: "true",
  SAS_HOURS: "48",
  RATE_LIMIT_PER_HOUR: "5",
});

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const teamId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const event: CrmEvent = {
  schemaVersion: "1.0",
  eventType: "hardmagic.brief.requested",
  requestId,
  ledgerPath: `requests/${requestId}.json`,
  occurredAt: "2026-08-20T00:00:00.000Z",
};
const ledger: LedgerRecord = {
  id: requestId,
  requestFingerprint: "a".repeat(64),
  kind: "brief-request",
  createdAt: "2026-08-20T00:00:00.000Z",
  email: "reader@example.com",
  name: "Ada Lovelace",
  organization: "Analytical Engines",
  role: "Creative Director",
  intakeCategory: "genai",
  sourceUrl: "https://hardmagic.com/briefs/generative-media-operating-system/",
  sourceCampaign: "technical-brief-library",
  consent: { requestedResource: true, broaderMarketing: false, capturedAt: "2026-08-20T00:00:00.000Z" },
  suppressionStatus: "active",
  qualification: { primaryChallenge: "Build a governed operation" },
  report: { slug: "generative-media-operating-system", title: "Generative Media Operating System" },
  delivery: { status: "sent", sentAt: "2026-08-20T00:00:01.000Z", providerMessageId: "message-id" },
  crm: { status: "queued", attempts: 0 },
};
const {
  briefRequest,
  applyUnsubscribeState,
  buildDeliveryFailureState,
  classifyExistingRequest,
  contactRequest,
  mergeDeliveryFailureRecord,
  mergeDeliverySuccessRecord,
  parseRequest,
  persistDeliveryFailureState,
  persistDeliverySuccessState,
  persistUnsubscribeState,
  replayResponse,
  supportedRequestContentType,
} = await import("../src/index.js");

test("Dataverse identifiers accept case-insensitive canonical GUIDs and normalize before OData use", () => {
  assert.equal(isCanonicalGuid(accountId), true);
  assert.equal(requireCanonicalGuid(accountId, "account"), accountId);
  const upperCase = "BF43CE99-7F96-F111-8075-7CED8D6F5115";
  assert.equal(isCanonicalGuid(upperCase), true);
  assert.equal(requireCanonicalGuid(upperCase, "account"), "bf43ce99-7f96-f111-8075-7ced8d6f5115");
  for (const value of [
    "{bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb}",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' or 1 eq 1",
    "bbbbbbbbbbbb4bbbb8bbbbbbbbbbbbbbb",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbz",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb-extra",
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb",
  ]) {
    assert.equal(isCanonicalGuid(value), false, value);
    assert.throws(() => requireCanonicalGuid(value, "account"), /dataverse_account_guid_invalid/);
  }

  assert.throws(() => buildAccountScopedContactQuery("reader@example.com", "not-a-guid"), /dataverse_account_guid_invalid/);
  assert.throws(() => buildDataverseEngagement(ledger, "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "not-a-guid"), /dataverse_owner_team_guid_invalid/);
  assert.throws(() => buildDataverseEngagement(ledger, "not-a-guid", teamId), /dataverse_contact_guid_invalid/);
  const uppercaseContactId = "DDDDDDDD-DDDD-4DDD-8DDD-DDDDDDDDDDDD";
  assert.equal(parseDataverseContactIdHeader(`https://dream.crm.dynamics.com/api/data/v9.2/contacts(${uppercaseContactId})`), uppercaseContactId.toLowerCase());
  assert.throws(() => parseDataverseContactIdHeader("https://dream.crm.dynamics.com/api/data/v9.2/contacts(not-a-guid)"), /dataverse_contact_guid_invalid/);
  assert.throws(() => parseDataverseContactIdHeader(null), /dataverse_contact_id_missing/);
  assert.deepEqual(parseDataverseCreatedContact(
    `https://dream.crm.dynamics.com/api/data/v9.2/contacts(${uppercaseContactId})`,
    { contactid: uppercaseContactId, _owningbusinessunit_value: "EEEEEEEE-EEEE-4EEE-8EEE-EEEEEEEEEEEE" },
  ), {
    contactid: uppercaseContactId.toLowerCase(),
    _owningbusinessunit_value: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  });
  assert.throws(() => parseDataverseCreatedContact(
    `https://dream.crm.dynamics.com/api/data/v9.2/contacts(${uppercaseContactId})`,
    { contactid: accountId, _owningbusinessunit_value: "EEEEEEEE-EEEE-4EEE-8EEE-EEEEEEEEEEEE" },
  ), /dataverse_contact_response_invalid/);
});

test("contact lookup asks for two matches so ambiguity fails closed", () => {
  const query = buildAccountScopedContactQuery("READER@EXAMPLE.COM", accountId);
  const url = new URL(`https://dream.crm.dynamics.com${query}`);
  assert.equal(url.searchParams.get("$top"), "2");
  assert.equal(url.searchParams.get("$filter"), `emailaddress1 eq 'reader@example.com' and _parentcustomerid_value eq ${accountId}`);
  const contact = { contactid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", _owningbusinessunit_value: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" };
  assert.deepEqual(selectDataverseContact([contact]), contact);
  assert.deepEqual(selectDataverseContact([{
    contactid: contact.contactid.toUpperCase(),
    _owningbusinessunit_value: contact._owningbusinessunit_value.toUpperCase(),
  }]), contact);
  assert.equal(selectDataverseContact([]), null);
  assert.throws(() => selectDataverseContact([contact, contact]), /dataverse_contact_ambiguous/);
  assert.throws(() => selectDataverseContact([{ contactid: contact.contactid }]), /dataverse_contact_query_invalid/);
  assert.throws(() => selectDataverseContact([{
    contactid: "not-a-guid",
    _owningbusinessunit_value: contact._owningbusinessunit_value,
  }]), /dataverse_contact_guid_invalid/);
  assert.throws(() => selectDataverseContact([{
    contactid: contact.contactid,
    _owningbusinessunit_value: "not-a-guid",
  }]), /dataverse_contact_business_unit_guid_invalid/);
});

test("same-email Contact resolution is serialized and creates only once", async () => {
  const lockPath = dataverseContactLockPath(accountId, " READER@EXAMPLE.COM ");
  assert.match(lockPath, /^locks\/contact\/[a-f0-9]{64}\.lock$/);
  assert.equal(lockPath, dataverseContactLockPath(accountId, "reader@example.com"));

  let queue = Promise.resolve();
  const withLock = async <T>(callback: () => Promise<T>): Promise<T> => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await callback();
    } finally {
      release();
    }
  };
  let contact: { contactid: string; _owningbusinessunit_value: string } | undefined;
  let creates = 0;
  const lookup = async () => contact ?? null;
  const create = async () => {
    creates += 1;
    contact = { contactid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", _owningbusinessunit_value: accountId };
    return contact;
  };
  const [first, second] = await Promise.all([
    resolveDataverseContact(lookup, create, withLock),
    resolveDataverseContact(lookup, create, withLock),
  ]);
  assert.equal(creates, 1);
  assert.equal(first.contactid, second.contactid);
});

test("only JSON and browser form submissions reach schema parsing", async () => {
  const edgeHeaders = {
    "x-azure-fdid": "22222222-2222-4222-8222-222222222222",
    "x-forwarded-host": "briefs.hardmagic.com",
    origin: "https://hardmagic.com",
  };
  const unsupportedHeaders = new Headers({ ...edgeHeaders, "content-type": "text/plain" });
  assert.equal(supportedRequestContentType({ headers: unsupportedHeaders }), null);
  let read = false;
  const unsupported = await briefRequest({
    method: "POST",
    headers: unsupportedHeaders,
    url: "https://briefs.hardmagic.com/api/brief-request",
    text: async () => { read = true; return "ignored"; },
  } as never, {} as never);
  assert.equal(unsupported.status, 415);
  assert.equal(read, false);

  const contactUnsupported = await contactRequest({
    method: "POST",
    headers: unsupportedHeaders,
    url: "https://briefs.hardmagic.com/api/contact-request",
    text: async () => "ignored",
  } as never, {} as never);
  assert.equal(contactUnsupported.status, 415);

  assert.equal(supportedRequestContentType({ headers: new Headers({ "content-type": "application/json; charset=utf-8" }) }), "application/json");
  assert.equal(supportedRequestContentType({ headers: new Headers({ "content-type": "application/x-www-form-urlencoded" }) }), "application/x-www-form-urlencoded");
  assert.deepEqual(await parseRequest({
    headers: new Headers({ "content-type": "application/x-www-form-urlencoded" }),
    text: async () => "name=Ada+Lovelace&consent=yes",
  }), { name: "Ada Lovelace", consent: "yes" });
});

test("malformed ledger state is unavailable and CRM events must match the loaded record", () => {
  assert.deepEqual(parseLedgerRecord(ledger), ledger);
  const receiptOperationId = emailOperationId(requestId, "consultation-receipt");
  const routeOperationId = emailOperationId(requestId, "consultation-route");
  assert.deepEqual(parseLedgerRecord({
    ...ledger,
    delivery: {
      status: "unknown",
      failureCode: "delivery-status-unknown",
      providerMessageId: routeOperationId,
      operationIds: [receiptOperationId, routeOperationId],
    },
  })?.delivery.operationIds, [receiptOperationId, routeOperationId]);
  assert.equal(parseLedgerRecord({ ...ledger, crm: { status: "queued", attempts: "zero" } }), null);
  assert.equal(parseLedgerRecord("not-json"), null);
  assert.equal(crmEventMatchesLedger(event, ledger), true);
  assert.equal(crmEventMatchesLedger({ ...event, requestId: teamId }, ledger), false);
});

test("delivery failure recovery merges only delivery into the latest ledger snapshot", async () => {
  const operationId = emailOperationId(requestId, "brief");
  const local = {
    ...ledger,
    delivery: { status: "unknown" as const, operationIds: [operationId], failureCode: "delivery-status-unknown" },
  };
  const latest = {
    ...ledger,
    consent: { ...ledger.consent, broaderMarketing: true },
    suppressionStatus: "opted-out" as const,
    delivery: { status: "pending" as const, operationIds: [emailOperationId(requestId, "consultation-route")] },
    crm: { status: "synced" as const, attempts: 7, lastAttemptAt: "2026-08-20T00:00:02.000Z" },
  };
  let writes = 0;
  let retried: LedgerRecord | undefined;
  const persisted = await persistDeliveryFailureState(
    "requests/example.json",
    local,
    "etag-old",
    { error: () => undefined } as never,
    requestId,
    "delivery-status-unknown",
    async () => ({ record: latest, etag: "etag-new" }),
    async (_path, record, etag) => {
      writes += 1;
      if (writes === 1) throw { statusCode: 412 };
      retried = record;
      assert.equal(etag, "etag-new");
      return "etag-written";
    },
  );
  assert.equal(persisted, true);
  assert.equal(writes, 2);
  assert.equal(retried?.suppressionStatus, "opted-out");
  assert.equal(retried?.consent.broaderMarketing, true);
  assert.deepEqual(retried?.crm, latest.crm);
  assert.equal(retried?.delivery.status, "unknown");
  assert.deepEqual(retried?.delivery.operationIds, [
    emailOperationId(requestId, "consultation-route"),
    operationId,
  ]);
});

test("confirmed delivery recovery merges sent fields and preserves concurrent ledger updates", async () => {
  const operationId = emailOperationId(requestId, "brief");
  const local = {
    ...ledger,
    delivery: {
      status: "sent" as const,
      sentAt: "2026-08-20T00:00:06.000Z",
      providerMessageId: "confirmed-provider-id",
      operationIds: [operationId],
    },
  };
  const latest = {
    ...ledger,
    consent: { ...ledger.consent, broaderMarketing: true },
    suppressionStatus: "opted-out" as const,
    delivery: { status: "failed" as const, failureCode: "old-failure" },
    crm: { status: "synced" as const, attempts: 10, lastAttemptAt: "2026-08-20T00:00:07.000Z" },
  };
  const merged = mergeDeliverySuccessRecord(latest, local.delivery);
  assert.equal(merged.delivery.status, "sent");
  assert.equal(merged.delivery.providerMessageId, "confirmed-provider-id");
  assert.equal(merged.delivery.failureCode, undefined);
  assert.deepEqual(merged.crm, latest.crm);
  assert.equal(merged.suppressionStatus, "opted-out");

  let writes = 0;
  let retried: LedgerRecord | undefined;
  const persisted = await persistDeliverySuccessState(
    "requests/example.json",
    local,
    "etag-old",
    { error: () => undefined } as never,
    requestId,
    async () => ({ record: latest, etag: "etag-new" }),
    async (_path, record, etag) => {
      writes += 1;
      if (writes === 1) throw { statusCode: 412 };
      retried = record;
      assert.equal(etag, "etag-new");
      return "etag-written";
    },
  );
  assert.equal(persisted, true);
  assert.equal(writes, 2);
  assert.equal(retried?.delivery.status, "sent");
  assert.equal(retried?.delivery.providerMessageId, "confirmed-provider-id");
  assert.deepEqual(retried?.crm, latest.crm);
  assert.equal(retried?.suppressionStatus, "opted-out");
});

test("unsubscribe recovery preserves a concurrent CRM update", async () => {
  const latest = {
    ...ledger,
    consent: { ...ledger.consent, broaderMarketing: true },
    suppressionStatus: "active" as const,
    delivery: { status: "unknown" as const, providerMessageId: "provider-id" },
    crm: { status: "synced" as const, attempts: 8, lastAttemptAt: "2026-08-20T00:00:03.000Z" },
  };
  let writes = 0;
  let retried: LedgerRecord | undefined;
  const persisted = await persistUnsubscribeState(
    "requests/example.json",
    ledger,
    "etag-old",
    { error: () => undefined } as never,
    requestId,
    async () => ({ record: latest, etag: "etag-new" }),
    async (_path, record, etag) => {
      writes += 1;
      if (writes === 1) throw { statusCode: 412 };
      retried = record;
      assert.equal(etag, "etag-new");
      return "etag-written";
    },
  );
  assert.equal(persisted, true);
  assert.equal(writes, 2);
  assert.equal(retried?.suppressionStatus, "opted-out");
  assert.equal(retried?.consent.broaderMarketing, false);
  assert.deepEqual(retried?.crm, latest.crm);
  assert.deepEqual(retried?.delivery, latest.delivery);
});

test("CRM ledger retries merge the latest record for dead-letter and sync paths", async () => {
  const latest = {
    ...ledger,
    consent: { ...ledger.consent, broaderMarketing: true },
    suppressionStatus: "opted-out" as const,
    delivery: { status: "unknown" as const, providerMessageId: "provider-id" },
    crm: { status: "queued" as const, attempts: 9 },
  };
  assert.equal(mergeCrmFailureRecord(latest, 10, "retry-exhausted", "2026-08-20T00:00:04.000Z").crm.status, "failed");
  assert.equal(mergeCrmSyncedRecord(latest, 10, "2026-08-20T00:00:04.000Z").crm.status, "synced");

  let writes = 0;
  let deadLetterRetry: LedgerRecord | undefined;
  const deadLetterPersisted = await persistCrmFailureState(
    "requests/example.json",
    ledger,
    "etag-old",
    4,
    "retry-exhausted",
    { error: () => undefined } as never,
    requestId,
    async () => ({ record: latest, etag: "etag-new" }),
    async (_path, record, etag) => {
      writes += 1;
      if (writes === 1) throw { statusCode: 412 };
      deadLetterRetry = record;
      assert.equal(etag, "etag-new");
      return "etag-written";
    },
  );
  assert.equal(deadLetterPersisted, true);
  assert.equal(deadLetterRetry?.crm.status, "failed");
  assert.equal(deadLetterRetry?.crm.attempts, 9);
  assert.equal(deadLetterRetry?.suppressionStatus, "opted-out");
  assert.deepEqual(deadLetterRetry?.delivery, latest.delivery);

  writes = 0;
  let syncRetry: LedgerRecord | undefined;
  await persistCrmSyncedState(
    "requests/example.json",
    { ...ledger, crm: { status: "synced", attempts: 3, lastAttemptAt: "2026-08-20T00:00:05.000Z" } },
    "etag-old",
    { error: () => undefined } as never,
    requestId,
    async () => ({ record: latest, etag: "etag-new" }),
    async (_path, record, etag) => {
      writes += 1;
      if (writes === 1) throw { statusCode: 412 };
      syncRetry = record;
      assert.equal(etag, "etag-new");
      return "etag-written";
    },
  );
  assert.equal(syncRetry?.crm.status, "synced");
  assert.equal(syncRetry?.crm.attempts, 9);
  assert.equal(syncRetry?.suppressionStatus, "opted-out");
  assert.deepEqual(syncRetry?.delivery, latest.delivery);
});

test("pending records with delivery handles are treated as ambiguous after a crash", () => {
  const pending = {
    ...ledger,
    delivery: {
      status: "pending" as const,
      operationIds: [emailOperationId(requestId, "brief")],
    },
  };
  assert.equal(classifyExistingRequest(pending, ledger.requestFingerprint), "ambiguous");
  const response = replayResponse(
    { headers: new Headers({ origin: "https://hardmagic.com" }) },
    pending,
    ledger.requestFingerprint,
    "/contact/thanks/",
  );
  assert.equal(response.status, 503);
  assert.match(String(response.body), /do not resubmit/i);
});

test("CRM queue initialization is shared, ordered, and retried after a failed initialization", async () => {
  let createCount = 0;
  let resolveInitialization: (() => void) | undefined;
  const queue = {
    createIfNotExists: () => {
      createCount += 1;
      return new Promise<void>((resolve) => { resolveInitialization = resolve; });
    },
  };
  const first = ensureCrmQueueInitialized(queue);
  const second = ensureCrmQueueInitialized(queue);
  assert.equal(createCount, 1);
  resolveInitialization?.();
  await Promise.all([first, second]);
  assert.equal(createCount, 1);

  let failedAttempts = 0;
  const failingQueue = {
    createIfNotExists: async () => {
      failedAttempts += 1;
      throw new Error("temporary queue outage");
    },
  };
  await assert.rejects(ensureCrmQueueInitialized(failingQueue), /temporary queue outage/);
  await assert.rejects(ensureCrmQueueInitialized(failingQueue), /temporary queue outage/);
  assert.equal(failedAttempts, 2);
  resetConfigForTests();
});

test("dead-letter archive paths are collision-safe and idempotent per poison event", () => {
  const archivedAt = new Date("2026-08-20T12:00:00.000Z");
  const nextDay = new Date("2026-08-21T12:00:00.000Z");
  const first = deadLetterArchivePath(event, "retry-exhausted", archivedAt);
  const repeat = deadLetterArchivePath(event, "retry-exhausted", nextDay);
  const otherError = deadLetterArchivePath(event, "request-id-mismatch", archivedAt);
  const otherEvent = deadLetterArchivePath({ ...event, occurredAt: "2026-08-20T00:00:01.000Z" }, "retry-exhausted", archivedAt);
  assert.equal(first, repeat);
  assert.notEqual(first, otherError);
  assert.notEqual(first, otherEvent);
  assert.match(first, /^crm\/2026-08-20\/[a-f0-9-]+-[a-f0-9]{64}\.json$/);
  assert.doesNotMatch(first, /reader@example\.com/i);
});

test("ACS polling always receives an abort signal", async () => {
  let seenAbortSignal: { aborted: boolean } | undefined;
  const result = await pollEmailUntilDone({
    pollUntilDone: async (options) => {
      seenAbortSignal = options?.abortSignal;
      return { status: "Succeeded" };
    },
  });
  assert.deepEqual(result, { status: "Succeeded" });
  assert.ok(seenAbortSignal);
  assert.equal(seenAbortSignal.aborted, false);
});

test("ACS timeout reconciles the same operation, then records ambiguity without resending", async () => {
  const operationId = emailOperationId(requestId, "brief");
  const timeoutSignals: Array<{ aborted: boolean }> = [];
  let timeoutCount = 0;
  let calls = 0;
  let done = false;
  let resultStatus = "Running";
  const result = await pollEmailUntilDone({
    pollUntilDone: async (options) => {
      calls += 1;
      timeoutSignals.push(options?.abortSignal as { aborted: boolean });
      throw new Error("poll timed out");
    },
    poll: async () => { done = true; resultStatus = "Succeeded"; },
    isDone: () => done,
    getResult: () => ({ id: operationId, status: resultStatus }),
  }, () => {
    const signal = { aborted: timeoutCount === 0 };
    timeoutCount += 1;
    return signal as never;
  });
  assert.equal(result.status, "Succeeded");
  assert.equal(calls, 1);
  assert.equal(timeoutSignals.length, 1);
  assert.equal(timeoutSignals[0]?.aborted, true);

  const ambiguousSignals: Array<{ aborted: boolean }> = [];
  await assert.rejects(pollEmailUntilDone({
    pollUntilDone: async (options) => {
      ambiguousSignals.push(options?.abortSignal as { aborted: boolean });
      throw new Error("poll timed out");
    },
    poll: async () => { throw new Error("reconciliation timed out"); },
    isDone: () => false,
    getResult: () => ({ id: operationId, status: "Running" }),
  }, () => ({ aborted: true }) as never, operationId), (error: unknown) => (
    error instanceof EmailDeliveryAmbiguousError && error.operationId === operationId
  ));
  assert.equal(ambiguousSignals.length, 1);

  const unknown = { ...ledger, delivery: { status: "unknown" as const, failureCode: "delivery-status-unknown", providerMessageId: operationId } };
  assert.equal(classifyExistingRequest(unknown, ledger.requestFingerprint), "ambiguous");
  const replay = replayResponse({ headers: new Headers({ origin: "https://hardmagic.com" }) }, unknown, ledger.requestFingerprint, "/contact/thanks/");
  assert.equal(replay.status, 503);
  assert.match(String(replay.body), /do not resubmit/i);
});

test("ACS network poll failures reconcile even when the original signal was not aborted", async () => {
  const operationId = emailOperationId(requestId, "brief");
  let reconciliationCalls = 0;
  await assert.rejects(pollEmailUntilDone({
    pollUntilDone: async () => { throw new Error("network poll error"); },
    poll: async () => {
      reconciliationCalls += 1;
      throw new Error("network reconciliation error");
    },
    isDone: () => false,
    getResult: () => ({ id: operationId, status: "Running" }),
    getOperationState: () => ({ status: "failed", error: new Error("network poll error") }),
  }, () => ({ aborted: false }) as never, operationId), (error: unknown) => (
    error instanceof EmailDeliveryAmbiguousError && error.operationId === operationId
  ));
  assert.equal(reconciliationCalls, 1);
});

test("ACS beginSend ambiguity preserves the stable operation handle while 4xx remains definitive", () => {
  const receiptOperationId = emailOperationId(requestId, "consultation-receipt");
  const operationId = emailOperationId(requestId, "consultation-route");
  const operationIds = [receiptOperationId, operationId];
  const networkError = normalizeEmailBeginSendError(new Error("network outage"), operationId, operationIds);
  assert.ok(networkError instanceof EmailDeliveryAmbiguousError);
  assert.equal((networkError as EmailDeliveryAmbiguousError).operationId, operationId);
  assert.deepEqual((networkError as EmailDeliveryAmbiguousError).operationIds, operationIds);
  const serverError = Object.assign(new Error("provider outage"), { statusCode: 503 });
  const normalizedServerError = normalizeEmailBeginSendError(serverError, operationId, operationIds);
  assert.ok(normalizedServerError instanceof EmailDeliveryAmbiguousError);
  assert.equal((normalizedServerError as EmailDeliveryAmbiguousError).operationId, operationId);
  assert.deepEqual((normalizedServerError as EmailDeliveryAmbiguousError).operationIds, operationIds);
  const clientError = Object.assign(new Error("invalid request"), { statusCode: 400 });
  assert.equal(normalizeEmailBeginSendError(clientError, operationId), clientError);
});

test("ACS beginSend receives the bounded abort signal and turns timeout ambiguity into a non-replayable error", async () => {
  const operationId = emailOperationId(requestId, "brief");
  const signal = { aborted: false };
  let seenOptions: { operationId?: string; abortSignal?: unknown } | undefined;
  const sender = {
    beginSend: async (_message: unknown, options?: { operationId?: string; abortSignal?: unknown }) => {
      seenOptions = options;
      throw new Error("beginSend timeout");
    },
  };
  await assert.rejects(beginEmailSend(sender as never, {} as never, operationId, [operationId], (milliseconds) => {
    assert.equal(milliseconds, 45_000);
    return signal as never;
  }), (error: unknown) => error instanceof EmailDeliveryAmbiguousError && error.operationId === operationId);
  assert.equal(seenOptions?.operationId, operationId);
  assert.equal(seenOptions?.abortSignal, signal);
});

test("consultation partial failures retain both leg handles and block replay", async () => {
  const receiptOperationId = emailOperationId(requestId, "consultation-receipt");
  const routeOperationId = emailOperationId(requestId, "consultation-route");
  const operationIds = [receiptOperationId, routeOperationId];
  const routeClientError = Object.assign(new Error("provider rejected route"), { statusCode: 400 });
  const routeFailure = normalizeEmailBeginSendError(routeClientError, routeOperationId, operationIds);
  assert.equal(routeFailure, routeClientError);
  const partial = aggregateConsultationEmailError(routeFailure, operationIds);
  assert.deepEqual(partial.operationIds, operationIds);
  assert.equal(partial.operationId, routeOperationId);

  const mixedOutcomes = await Promise.allSettled([
    Promise.resolve({ status: "Succeeded" }),
    Promise.reject(new Error("route polling failed")),
  ]);
  assert.equal(allConsultationEmailsSucceeded(mixedOutcomes), false);
  const successfulOutcomes = await Promise.allSettled([
    Promise.resolve({ status: "Succeeded", id: "receipt-provider-id" }),
    Promise.resolve({ status: "Succeeded", id: "route-provider-id" }),
  ]);
  assert.equal(allConsultationEmailsSucceeded(successfulOutcomes), true);
  const missingProviderId = await Promise.allSettled([
    Promise.resolve({ status: "Succeeded", id: "" }),
    Promise.resolve({ status: "Succeeded", id: "route-provider-id" }),
  ]);
  assert.equal(allConsultationEmailsSucceeded(missingProviderId), false);
  const mixed = aggregateConsultationEmailError(
    mixedOutcomes[1]?.status === "rejected" ? mixedOutcomes[1].reason : undefined,
    operationIds,
  );
  assert.deepEqual(mixed.operationIds, operationIds);
  const persisted = parseLedgerRecord({
    ...ledger,
    delivery: {
      status: "unknown",
      failureCode: "delivery-status-unknown",
      providerMessageId: partial.operationId,
      operationIds: [...partial.operationIds],
    },
  });
  assert.deepEqual(persisted?.delivery.operationIds, operationIds);
  assert.equal(classifyExistingRequest(persisted!, ledger.requestFingerprint), "ambiguous");
});

test("confirmed provider IDs turn a following ledger-write failure into unknown delivery", () => {
  const operationId = emailOperationId(requestId, "brief");
  const state = buildDeliveryFailureState(
    { status: "sent", providerMessageId: "accepted-provider-id", operationIds: [operationId] },
    new Error("ledger write lost response"),
    "accepted-provider-id",
  );
  assert.equal(state.status, "unknown");
  assert.equal(state.providerMessageId, "accepted-provider-id");
  assert.deepEqual(state.operationIds, [operationId]);
  assert.equal(buildDeliveryFailureState({ status: "pending", operationIds: [operationId] }, Object.assign(new Error("bad request"), { statusCode: 400 })).status, "failed");
});

test("ACS operation IDs are stable and purpose-scoped", () => {
  const briefOperation = emailOperationId(requestId, "brief");
  assert.equal(briefOperation, emailOperationId(requestId, "brief"));
  assert.notEqual(briefOperation, emailOperationId(requestId, "consultation-receipt"));
  assert.match(briefOperation, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("a successful ACS result must carry a provider ID before brief delivery is sent", () => {
  const operationId = emailOperationId(requestId, "brief");
  assert.equal(requireSucceededEmailProviderId({ status: "Succeeded", id: "provider-id" }, operationId), "provider-id");
  assert.throws(
    () => requireSucceededEmailProviderId({ status: "Succeeded", id: "" }, operationId),
    (error: unknown) => error instanceof EmailDeliveryAmbiguousError && error.operationId === operationId,
  );
  assert.throws(
    () => requireSucceededEmailProviderId(null, operationId),
    (error: unknown) => error instanceof EmailDeliveryAmbiguousError && error.operationId === operationId,
  );
  assert.throws(() => requireSucceededEmailProviderId({ status: "Failed" }, operationId), /acs_send_Failed/);
});

test("CRM enqueue retries are bounded and use short exponential delays", async () => {
  assert.equal(crmEnqueueRetryDelay(0), 100);
  assert.equal(crmEnqueueRetryDelay(1), 200);
  assert.equal(crmEnqueueRetryDelay(2), 400);
  assert.throws(() => crmEnqueueRetryDelay(-1), /crm_enqueue_retry_attempt_invalid/);
  assert.throws(() => crmEnqueueRetryDelay(3), /crm_enqueue_retry_attempt_invalid/);

  let attempts = 0;
  const delays: number[] = [];
  const value = await retryCrmEnqueue(async () => {
    attempts += 1;
    if (attempts < 3) throw { statusCode: 429 };
    return "queued";
  }, async (delay) => { delays.push(delay); });
  assert.equal(value, "queued");
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [100, 200]);

  for (const transient of [
    { statusCode: 408 },
    { statusCode: 500 },
    { statusCode: 503 },
    { code: "ECONNRESET" },
    { code: "ETIMEDOUT" },
    { code: "ENOTFOUND" },
    { code: "EAI_AGAIN" },
    { code: "REQUEST_SEND_ERROR" },
    { name: "AbortError" },
    { cause: { code: "ECONNRESET" } },
  ]) {
    attempts = 0;
    const transientDelays: number[] = [];
    await retryCrmEnqueue(async () => {
      attempts += 1;
      if (attempts < 3) throw transient;
      return "queued";
    }, async (delay) => { transientDelays.push(delay); });
    assert.equal(attempts, 3);
    assert.deepEqual(transientDelays, [100, 200]);
  }

  attempts = 0;
  await assert.rejects(retryCrmEnqueue(async () => {
    attempts += 1;
    throw { statusCode: 429 };
  }, async () => undefined));
  assert.equal(attempts, 3);

  attempts = 0;
  await assert.rejects(retryCrmEnqueue(async () => {
    attempts += 1;
    throw { statusCode: 400 };
  }, async () => undefined));
  assert.equal(attempts, 1);

  attempts = 0;
  await assert.rejects(retryCrmEnqueue(async () => {
    attempts += 1;
    throw new Error("non-retryable");
  }, async () => undefined), /non-retryable/);
  assert.equal(attempts, 1);
});
