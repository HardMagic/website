import assert from "node:assert/strict";
import test from "node:test";
import { resetConfigForTests } from "../src/config.js";

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

const { briefRequest, health, SECURITY_HEADERS, validateEdgeRequest } = await import("../src/index.js");
const { buildAccountScopedContactQuery, renderBriefEmail } = await import("../src/platform.js");
const { briefs } = await import("../src/catalog.js");

function request(headers: Record<string, string>, url = "https://briefs.hardmagic.com/api/health") {
  return { method: "GET", headers: new Headers(headers), url };
}

function requestWithBody(method: string, headers: Record<string, string>, body = "") {
  return { method, headers: new Headers(headers), url: "https://briefs.hardmagic.com/api/brief-request", text: async () => body };
}

function assertSecurityHeaders(response: { headers?: HeadersInit }) {
  const headers = new Headers(response.headers);
  for (const name of Object.keys(SECURITY_HEADERS)) assert.ok(headers.has(name), `missing ${name}`);
  assert.equal(headers.get("strict-transport-security"), SECURITY_HEADERS["strict-transport-security"]);
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.match(headers.get("content-security-policy") ?? "", /script-src 'none'/);
}

test("edge identity and exact HardMagic host are both required", () => {
  resetConfigForTests();
  assert.equal(validateEdgeRequest(request({ "x-azure-fdid": "22222222-2222-4222-8222-222222222222", "x-forwarded-host": "briefs.hardmagic.com" })), null);
  assert.equal(validateEdgeRequest(request({ "x-forwarded-host": "briefs.hardmagic.com" }))?.status, 404);
  assert.equal(validateEdgeRequest(request({ "x-azure-fdid": "22222222-2222-4222-8222-222222222222", "x-forwarded-host": "evil.example" }))?.status, 404);
});

test("foreign browser origins fail before body processing", () => {
  resetConfigForTests();
  const result = validateEdgeRequest(request({
    "x-azure-fdid": "22222222-2222-4222-8222-222222222222",
    "x-forwarded-host": "briefs.hardmagic.com",
    origin: "https://evil.example",
  }));
  assert.equal(result?.status, 403);
});

test("health, CORS preflight, invalid bodies, and edge failures carry complete security headers", async () => {
  resetConfigForTests();
  const edgeHeaders = {
    "x-azure-fdid": "22222222-2222-4222-8222-222222222222",
    "x-forwarded-host": "briefs.hardmagic.com",
  };
  const healthResponse = await health(request(edgeHeaders) as never);
  assert.equal(healthResponse.status, 200);
  assertSecurityHeaders(healthResponse);

  const optionsResponse = await briefRequest(requestWithBody("OPTIONS", { ...edgeHeaders, origin: "https://hardmagic.com" }) as never, {} as never);
  assert.equal(optionsResponse.status, 204);
  assert.equal(new Headers(optionsResponse.headers).get("access-control-allow-origin"), "https://hardmagic.com");
  assertSecurityHeaders(optionsResponse);

  const invalidBodyResponse = await briefRequest(requestWithBody("POST", { ...edgeHeaders, origin: "https://hardmagic.com", "content-type": "application/json" }, "{}") as never, {} as never);
  assert.equal(invalidBodyResponse.status, 400);
  assertSecurityHeaders(invalidBodyResponse);

  const edgeFailure = await health(request({ ...edgeHeaders, "x-forwarded-host": "evil.example" }) as never);
  assert.equal(edgeFailure.status, 404);
  assertSecurityHeaders(edgeFailure);

  const originalBriefHost = process.env.BRIEF_HOST;
  delete process.env.BRIEF_HOST;
  resetConfigForTests();
  try {
    const configurationFailure = await health(request(edgeHeaders) as never);
    assert.equal(configurationFailure.status, 503);
    assertSecurityHeaders(configurationFailure);
  } finally {
    if (originalBriefHost === undefined) delete process.env.BRIEF_HOST;
    else process.env.BRIEF_HOST = originalBriefHost;
    resetConfigForTests();
  }
});

test("field-guide email is branded, escaped, responsive, and has both private actions", () => {
  resetConfigForTests();
  const rendered = renderBriefEmail("A <reader>", briefs["generative-media-operating-system"], "https://private.example/file.pdf?sig=a&se=b", "https://briefs.hardmagic.com/api/unsubscribe?token=a&b=c");
  assert.match(rendered.html, /HardMagic Corporation/);
  assert.match(rendered.html, /A &lt;reader&gt;/);
  assert.match(rendered.html, /prefers-color-scheme:dark/);
  assert.match(rendered.html, /Open the PDF field guide/);
  assert.match(rendered.html, /sig=a&amp;se=b/);
  assert.match(rendered.html, /Stop report-specific follow-ups/);
  assert.match(rendered.plain, /https:\/\/private\.example\/file\.pdf/);
});

test("Dataverse contact lookup is constrained to the HardMagic Account", () => {
  const query = buildAccountScopedContactQuery("ADA+MEDIA@EXAMPLE.COM", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const url = new URL(`https://dream.crm.dynamics.com${query}`);
  assert.equal(url.searchParams.get("$filter"), "emailaddress1 eq 'ada+media@example.com' and _parentcustomerid_value eq aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.match(url.searchParams.get("$select") ?? "", /_owningbusinessunit_value/);
});
