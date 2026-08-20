import assert from "node:assert/strict";
import test from "node:test";
import { buildDataverseEngagement } from "../src/platform.js";
import { briefRequestSchema, contactRequestSchema } from "../src/schema.js";

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

const { briefs } = await import("../src/catalog.js");
const {
  classifyExistingRequest,
  isAllowedThankYouPath,
  isSafeLedgerPath,
  ledgerPathForRequest,
  parseCrmEvent,
  parseRequest,
  replayResponse,
  requestFingerprint,
  sanitizeSourceUrl,
  validateEdgeRequest,
} = await import("../src/index.js");

const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const baseBrief = {
  request_id: requestId,
  report: "generative-media-operating-system",
  name: "Ada Lovelace",
  email: "ADA@EXAMPLE.COM",
  organization: "Analytical Engines",
  role: "Creative Director",
  industry: "Media",
  organization_size: "250–999",
  decision_stage: "Exploring",
  decision_horizon: "This quarter",
  primary_challenge: "Build a governed generative media operation",
  preferred_next_step: "Working session",
  intake_category: "genai",
  context: "",
  source_url: "https://hardmagic.com/briefs/generative-media-operating-system/?utm_source=unsafe",
  source_campaign: "technical-brief-library",
  consent: "yes",
  marketing_consent: "no",
  _honey: "",
  "cf-turnstile-response": "test-token",
};

const baseContact = {
  request_id: requestId,
  name: "Grace Hopper",
  email: "grace@example.com",
  organization: "Example",
  role: "VP Media",
  intake_category: "media-management",
  mandate: "Unify the media estate, rights data, and publishing controls.",
  decision_horizon: "90 days",
  preferred_next_step: "Architecture review",
  source_url: "https://hardmagic.com/contact/media-management/?utm_source=unsafe",
  source_campaign: "corporate-intake",
  consent: "yes",
  marketing_consent: "no",
  _honey: "",
  "cf-turnstile-response": "test-token",
};

test("rendered brief and consultation payloads are accepted with explicit consent separation", () => {
  const brief = briefRequestSchema.safeParse(baseBrief);
  assert.equal(brief.success, true);
  if (brief.success) {
    assert.equal(brief.data.email, "ada@example.com");
    assert.equal(brief.data.marketing_consent, "no");
    assert.equal(brief.data.request_id, requestId);
  }

  const contact = contactRequestSchema.safeParse(baseContact);
  assert.equal(contact.success, true);
  if (contact.success) assert.equal(contact.data.marketing_consent, "no");
});

test("server validation rejects missing resource consent, invalid enums, oversized input, and unknown fields", () => {
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, consent: undefined }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, decision_stage: "Guessing" }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, primary_challenge: "x".repeat(501) }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, request_id: "not-a-uuid" }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, _honey: "filled-by-bot" }).success, false);
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, secret_notes: "never collect this" }).success, false);
  assert.equal(contactRequestSchema.safeParse({ ...baseContact, marketing_consent: "maybe" }).success, false);
  assert.equal(contactRequestSchema.safeParse({ ...baseContact, _honey: "filled-by-bot" }).success, false);
  assert.equal(contactRequestSchema.safeParse({ ...baseContact, mandate: "x".repeat(4001) }).success, false);
  assert.equal(contactRequestSchema.safeParse({ ...baseContact, source_campaign: "campaign?email=ada@example.com" }).success, false);
});

test("brief corporate-email policy rejects public mailboxes while custom domains remain eligible", () => {
  for (const email of ["reader@gmail.com", "reader@googlemail.com", "reader@hotmail.co.uk", "reader@outlook.com", "reader@yahoo.co.uk"]) {
    assert.equal(briefRequestSchema.safeParse({ ...baseBrief, email }).success, false, email);
  }
  assert.equal(briefRequestSchema.safeParse({ ...baseBrief, email: "reader@company.onmicrosoft.com" }).success, true);
});

test("request IDs provide stable idempotency fingerprints and safe ledger paths", () => {
  const first = requestFingerprint("brief-request", baseBrief);
  const replay = requestFingerprint("brief-request", { ...baseBrief, request_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "cf-turnstile-response": "fresh-token" });
  const changed = requestFingerprint("brief-request", { ...baseBrief, primary_challenge: "A different decision" });
  assert.equal(first, replay);
  assert.notEqual(first, changed);
  assert.equal(ledgerPathForRequest(requestId), `requests/${requestId}.json`);
});

test("replay decisions prevent duplicate side effects and never echo PII", () => {
  const fingerprint = requestFingerprint("brief-request", baseBrief);
  const pending = { id: requestId, requestFingerprint: fingerprint, delivery: { status: "pending" as const } };
  const complete = { ...pending, delivery: { status: "sent" as const } };
  const failed = { ...pending, delivery: { status: "failed" as const } };
  assert.equal(classifyExistingRequest(pending, fingerprint), "in-flight");
  assert.equal(classifyExistingRequest(complete, fingerprint), "complete");
  assert.equal(classifyExistingRequest(failed, fingerprint), "failed");
  assert.equal(classifyExistingRequest(complete, "different"), "conflict");

  const request = { headers: new Headers({ origin: "https://hardmagic.com" }) };
  const response = replayResponse(request, complete, fingerprint, briefs[baseBrief.report].thankYouPath);
  assert.equal(response.status, 303);
  assert.equal(response.headers?.Location, "https://hardmagic.com/briefs/generative-media-operating-system/thanks/");
  assert.equal(response.headers?.["x-correlation-id"], requestId);
  assert.doesNotMatch(response.body ?? "", /Ada|example|Analytical/);
  assert.equal(replayResponse(request, pending, fingerprint, "/contact/thanks/").status, 202);
  assert.equal(replayResponse(request, failed, fingerprint, "/contact/thanks/").status, 503);
  assert.equal(replayResponse(request, complete, "different", "/contact/thanks/").status, 409);
});

test("redirect and edge boundaries fail closed", () => {
  assert.equal(isAllowedThankYouPath("/contact/thanks/"), true);
  assert.equal(isAllowedThankYouPath(briefs[baseBrief.report].thankYouPath), true);
  assert.equal(isAllowedThankYouPath("https://evil.example/collect"), false);
  assert.equal(isAllowedThankYouPath("/contact/thanks/?next=https://evil.example"), false);

  const headers = new Headers({ "x-azure-fdid": "22222222-2222-4222-8222-222222222222", "x-forwarded-host": "briefs.hardmagic.com" });
  assert.equal(validateEdgeRequest({ headers, url: "https://briefs.hardmagic.com/api/health" }), null);
  assert.equal(validateEdgeRequest({ headers: new Headers({ ...Object.fromEntries(headers), "x-forwarded-host": "briefs.hardmagic.com" }), url: "https://briefs.hardmagic.com/api/health" }), null);
  assert.equal(validateEdgeRequest({ headers: new Headers({ "x-azure-fdid": "22222222-2222-4222-8222-222222222222" }), url: "https://briefs.hardmagic.com/api/health" })?.status, 404);
  assert.equal(validateEdgeRequest({ headers: new Headers({ ...Object.fromEntries(headers), origin: "https://evil.example" }), url: "https://briefs.hardmagic.com/api/health" })?.status, 403);
});

test("CRM queue messages reject path traversal, unknown event types, and non-v4 IDs", () => {
  const valid = {
    schemaVersion: "1.0",
    eventType: "hardmagic.brief.requested",
    requestId,
    ledgerPath: ledgerPathForRequest(requestId),
    occurredAt: "2026-08-20T00:00:00.000Z",
  } as const;
  assert.deepEqual(parseCrmEvent(valid), valid);
  assert.equal(parseCrmEvent({ ...valid, ledgerPath: "requests/../../ledger.json" }), null);
  assert.equal(parseCrmEvent({ ...valid, eventType: "hardmagic.unknown" }), null);
  assert.equal(parseCrmEvent({ ...valid, requestId: "aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa" }), null);
  assert.equal(isSafeLedgerPath("requests/2026-08/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.json"), true);
  assert.equal(isSafeLedgerPath("requests/../../secrets.json"), false);
});

test("body parsing enforces the 24 KB boundary before schema work", async () => {
  let read = false;
  const oversized = await parseRequest({
    headers: new Headers({ "content-length": "24001", "content-type": "application/x-www-form-urlencoded" }),
    text: async () => { read = true; return "ignored"; },
  });
  assert.equal(oversized, null);
  assert.equal(read, false);

  const parsed = await parseRequest({
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify({ report: baseBrief.report }),
  });
  assert.deepEqual(parsed, { report: baseBrief.report });
  assert.equal(await parseRequest({ headers: new Headers({ "content-type": "application/json" }), text: async () => "[]" }), null);
});

test("source URLs are reduced to approved origin paths", () => {
  assert.equal(sanitizeSourceUrl("https://hardmagic.com/contact/?email=ada@example.com#form"), "https://hardmagic.com/contact/");
  assert.equal(sanitizeSourceUrl("https://evil.example/contact/"), "");
  assert.equal(sanitizeSourceUrl("http://hardmagic.com/contact/"), "");
});

test("Dataverse projection uses the documented hm_* contract and no raw email/source URL", () => {
  const record = {
    ...{
      id: requestId,
      requestFingerprint: "fingerprint",
      kind: "brief-request" as const,
      createdAt: "2026-08-20T00:00:00.000Z",
      email: "ada@example.com",
      name: "Ada Lovelace",
      organization: "Analytical Engines",
      role: "Creative Director",
      intakeCategory: "genai",
      sourceUrl: "https://hardmagic.com/briefs/generative-media-operating-system/",
      sourceCampaign: "technical-brief-library",
      consent: { requestedResource: true as const, broaderMarketing: false, capturedAt: "2026-08-20T00:00:00.000Z" },
      suppressionStatus: "active" as const,
      qualification: { primaryChallenge: "Build a governed operation", decisionHorizon: "This quarter", preferredNextStep: "Working session" },
      report: { slug: baseBrief.report, title: briefs[baseBrief.report].title },
      delivery: { status: "sent" as const },
      crm: { status: "queued" as const, attempts: 0 },
    },
  };
  const projection = buildDataverseEngagement(record, "contact-id", "team-id");
  assert.equal(projection.hm_reportkey, baseBrief.report);
  assert.equal(projection.hm_intakecategory, "genai");
  assert.equal(projection.hm_sourcesummary, "technical-brief-library");
  assert.equal(projection.hm_suppressionstatus, "active");
  assert.match(projection.hm_emailhash, /^[a-f0-9]{64}$/);
  assert.equal(projection["hm_contact@odata.bind"], "/contacts(contact-id)");
  assert.equal("hm_sourceurl" in projection, false);
  assert.equal(JSON.stringify(projection).includes("ada@example.com"), false);
});
