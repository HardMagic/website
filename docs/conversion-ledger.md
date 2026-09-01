# HardMagic conversion ledger

Status: source contract captured; deployed evidence remains open.

Owner: P0-04 funnel verifier. This ledger describes the rendered public forms and the separately deployed BriefLock boundary. A passing source or unit test does not prove the Azure, Front Door, ACS, Blob, or Dataverse deployment is healthy.

## Route and CTA map

| Source route(s) | Reader intent | Visible action | Form / endpoint | Success state |
| --- | --- | --- | --- | --- |
| `/contact/` | Start a qualified consultation | Send the first question | Consultation form → `POST https://briefs.hardmagic.com/api/contact-request` | `303` to `/contact/thanks/` |
| `/contact/creative-direction/`, `/contact/genai/`, `/contact/media-management/`, `/contact/marketing-consulting/`, `/contact/partnerships/` | Start a lane-specific consultation | Send inquiry | Same consultation endpoint; `source_url` identifies the route | `303` to `/contact/thanks/` |
| `/briefs/:slug/` for the eight catalog slugs | Request one private decision guide | Deliver my private edition | BriefLock form → `POST https://briefs.hardmagic.com/api/brief-request` | `303` to the catalog allowlisted `/:slug/thanks/` route |
| `/contact/thanks/` and `/briefs/:slug/thanks/` | Understand what may happen after submission | Continue reading or contact HardMagic | No submission form; `noindex,nofollow` | Public explanation only; it is not proof of receipt or delivery |

The primary CTA destinations used by the editorial component must resolve to `/contact/#intake` or a lane route whose form carries the same `#intake` anchor. The main consultation page now owns that anchor.

## Rendered form contract

Both forms use native `method="post"` HTML and `application/x-www-form-urlencoded` submission. Browser JavaScript adds a UUID `request_id` to the hidden field; the Function accepts an absent/empty ID for legacy or direct clients and generates one server-side. The ID is an idempotency key, not a user-visible identifier.

### Consultation request

Required fields: `name` (160), `email` (320), `organization` (200), `role` (120), `intake_category`, `mandate` (4,000), `decision_horizon`, `preferred_next_step`, and `consent=yes`.

Optional fields: `marketing_consent=yes` and the source metadata. The rendered form sends a hidden `marketing_consent=no` before the optional checkbox so an unchecked box has an explicit, deterministic value; if checked, the later `yes` value wins when the form is decoded. The request-consent checkbox remains separate and required.

Hidden/anti-abuse fields: `request_id`, `source_url`, `source_campaign`, `_honey`, and the Turnstile response field `cf-turnstile-response`. Source URLs are normalized and restricted to the configured HardMagic origins; campaign values are restricted to a safe slug-like format.

### Brief request

Required fields: `report`, `name` (160), corporate `email` (320), `organization` (200), `role` (120), `industry` (120), `organization_size`, `decision_stage`, `decision_horizon`, `intake_category`, `primary_challenge` (500), `preferred_next_step`, and `consent=yes`.

Optional fields: `context` (2,000) and separate `marketing_consent=yes`. The server rejects selected public mailbox domains, unknown report IDs, unknown service lanes, invalid option values, oversized text, unexpected fields, missing resource consent, and malformed request IDs. Custom domains hosted by Google or Microsoft remain eligible.

The exact report slug is submitted as `report`; the server selects the matching catalog object and creates a read-only HTTPS user-delegation SAS for that exact PDF. Text fields reject C0/C1 control characters before any ledger, email, or CRM side effect. The browser never receives PDF bytes from the public site.

## No-JavaScript and error semantics

Turnstile is intentionally required in the production Function, so a browser with JavaScript disabled cannot produce an accepted protected POST. Each rendered form therefore includes an explicit direct-email fallback and a warning not to send confidential or regulated material. The ordinary HTML form remains useful for browsers with JavaScript enabled and does not depend on an SPA or client-side submit handler.

| Condition | Function result | Browser meaning / side effect |
| --- | --- | --- |
| Valid, new request | `303` with `Location` only to an allowlisted public noindex thanks URL | Ledger is durable; consultation mail or exact brief mail is attempted; CRM projection is queued asynchronously |
| Valid replay, same `request_id` and fingerprint, delivery sent | Same `303`; no new ledger, email, or CRM side effect | Safe refresh/retry of the form |
| Same ID with changed fields | `409` | Rejects request-ID reuse without revealing the original record |
| Same ID while first request is pending | `202` | Do not resubmit; the original worker owns the delivery attempt |
| Same ID after delivery failure | `503` with `Retry-After` | Browser resubmission cannot create a duplicate; operator replay/runbook is required |
| Delivery accepted but provider state or ledger write is ambiguous | `503` without a resend instruction | The ledger retains deterministic ACS operation handle(s); reconcile them before any operator replay, and never overwrite a newer suppression/CRM update |
| Invalid schema, enum, consent, hidden field, or corporate-email policy | `400` | Plain, non-PII validation message; no ledger, email, or CRM side effect |
| Foreign origin | `403`; missing/mismatched Front Door identity or host | `404` before body parsing; no side effect |
| Missing/invalid Turnstile or rate limit | `429` with `Retry-After` | Fail closed; no delivery side effect |
| Storage/email delivery failure after claim | `503` with correlation header | Ledger retains a safe failure code; no false success redirect |
| CRM outage after successful delivery | `303` | Delivery is not blocked; bounded transient queue retries (408/429/5xx/transport) and the queue's five-dequeue dead-letter path own the projection |

All responses are `no-store`, use safe content-type/security headers, and expose only a correlation ID header. Error bodies never include addresses, form values, SAS URLs, provider payloads, or stack traces.

## Consent and downstream contract

`consent=yes` records the purpose-limited resource or consultation response. `marketing_consent` is independent and defaults to `no`; requesting a brief or consultation never subscribes the visitor to marketing. Brief email includes a report-specific unsubscribe action. Unsubscribe writes suppression to the private ledger first and queues the Dataverse status update without rewriting the original resource-consent record.

The private ledger is the delivery system of record. A successful brief request performs this sequence:

1. validate edge identity, origin, body size, schema, corporate-email policy, Turnstile, and rate limits;
2. atomically claim `requests/<requestId>.json` with the normalized request fingerprint;
3. create a 48-hour HTTPS read-only SAS for the catalog filename and send ACS HTML/plain-text email with monitored Reply-To;
4. persist `delivery=sent`, a safe `delivery=failed` code, or `delivery=unknown` with deterministic ACS operation handle(s); conditional-write recovery merges only the changed delivery/CRM/suppression field into the latest ledger snapshot;
5. enqueue the asynchronous Dataverse projection keyed by `hm_requestid`.

The consultation path claims the same ledger shape, sends the requester receipt and internal routing email, then queues the same CRM projection. Both ACS operation handles are recorded before either send begins, and a partial or unresolved leg remains non-replayable until reconciled. The Dataverse payload is limited to the live `hm_*` columns: request type/brief key/title, `hm_requestid`, `hm_name`, `hm_emailhash`, organization/role/industry/size/stage/challenge/horizon/next-step, `hm_interest`, campaign-only `hm_sourcecampaign`, consent scope/marketing consent, delivery/suppression statuses, context, Account-bound Contact lookup, and `ownerid` HardMagic team ownership.

## Evidence still required outside this repository

The following cannot be established by local tests and must be dated against one immutable deployment candidate:

- Front Door custom domain/TLS, exact profile GUID, forwarded host preservation, route allowlist, WAF Prevention rules, 20/minute POST limits, 24 KB body limit, no API caching, and unsubscribe query scrubbing;
- direct `azurewebsites.net` origin denial with and without forged host headers, plus edge health `200` and configured `true`;
- production Turnstile site/secret pairing and hostname validation for both form actions;
- deployed Function package hash, Node 24 runtime, Key Vault secret presence/rotation, storage private containers, anonymous Blob denial, lifecycle/retention policy, and 48-hour SAS expiry/revocation;
- controlled non-production or approved production canaries for valid/no-JS fallback, all six lanes, all eight report IDs, Unicode/length/enum validation, honeypot, foreign origin, oversized body, invalid redirect, replay/idempotency, duplicate-email prevention, timeout, provider failure, and safe correlation evidence;
- ACS sender authentication, HTML/plain-text accessibility, monitored Reply-To, delivery/complaint behavior, and suppression durability;
- Dataverse solution/table/alternate-key/application-user/Business Unit/owner-team boundary, Account-scoped Contact lookup, least-privilege role, idempotent replay, CRM outage retry five times, private dead letter, alert, and operator replay;
- reconciliation of the source contract with the current Azure and Dataverse resource state, because the deployment record and infrastructure README currently describe different verification dates/statuses.

No production submission, personal data, signed URL, secret, or CRM response belongs in this ledger or in automated test output.
