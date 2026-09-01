# Funnel evidence

This directory is reserved for redacted, controlled canary evidence. A source-level
schema test or `api/health` response is not an end-to-end conversion proof.

For each canary, record only:

- release manifest fingerprint and deployment/pipeline ID;
- UTC timestamp, route, case ID, and correlation ID;
- expected status/location and observed status/location;
- ledger/PDF object version, email provider message ID, and Dataverse projection ID
  only when the release owner’s cleanup policy permits those identifiers;
- cleanup result, retention expiry, owner, and unresolved exception.

Required case groups are the valid contact path, all six contact lanes, all eight
brief IDs, no-JavaScript/direct fallback, invalid schema and corporate-email rejection,
Turnstile/edge/WAF rejection, idempotent replay, exact-brief delivery, expiry/revocation,
CRM outage/retry, and suppression. Never store submitted names, email addresses,
mandates, tokens, PDF URLs, or raw request bodies here.

Current status: **controlled brief canary run**. The redacted
[`canary-2026-09-01.md`](canary-2026-09-01.md) proves the valid brief path through
Front Door, ACS, Blob ledger, the corrected Dataverse projection, bounded CRM retry,
and cleanup. The complete contact-lane, failure-path, expiry/revocation, suppression,
and rollback case groups remain open.
