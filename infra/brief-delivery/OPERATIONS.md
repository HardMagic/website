# BriefLock operations

## Release gates

Before the first production apply:

1. Review the GitLab `what-if` output.
2. Confirm the protected environment has two-person approval.
3. Confirm Front Door and the existing profile-level WAF binding are represented in the authoritative Terraform repository; do not pass or restore a WAF binding parameter in this site's edge deployment.
4. Confirm the default Function origin is unreachable directly.
5. Confirm all six Key Vault secrets exist without printing values.
6. Confirm the custom ACS sender is authenticated and monitored replies reach a human.
7. Import and validate the HardMagic Dataverse solution and least-privilege role.
8. Upload only reviewed PDFs with Entra ID; shared-key upload is impossible by design.

## Acceptance

- Edge health returns configured `true`; direct Function origin is denied. Front Door uses the maximum 255-second probe interval because every edge location probes independently; keep this frugal interval unless a measured failover objective requires more traffic.
- Both API POST routes reject a foreign Origin, missing Front Door identity, honeypot input, oversized body, missing challenge, invalid service lane, and incomplete consent.
- A controlled brief request returns `303`; no response contains PDF bytes or a Blob URL.
- Received email has HardMagic branding, HTML and plain text, monitored Reply-To, a 48-hour exact-blob link, and an unsubscribe link.
- Public PDF guesses return `404` at the edge and anonymous Blob reads fail.
- One Account-bound Contact and one `hm_briefengagement` exist for the request ID.
- Replaying the CRM event is idempotent.
- A forced CRM outage leaves delivery sent, retries five times, then creates one deterministic private dead-letter artifact and raises an alert. Queue enqueue retries are bounded to three attempts for transient 408/429/5xx/transport failures; downstream projection is alternate-key idempotent. Account-scoped Contact resolution is serialized by a short Blob lease; lease contention fails closed so the queue retries instead of creating a duplicate.
- ACS sends use deterministic operation handle(s) per request and delivery purpose. If polling times out after acceptance, the ledger records `delivery=unknown` and every accepted operation handle; reconcile those provider operations before any operator replay or resend.
- Unsubscribe updates the ledger first and CRM asynchronously.

Never print an address, token, SAS URL, request body, Key Vault value, or full Dataverse response in CI or telemetry.

## Cost posture

- Keep Flex Consumption at 512 MB with no Always Ready instances; the current maximum of 20 instances is a burst ceiling, not a baseline allocation.
- Keep Front Door health probes at the maximum 255-second interval. Every edge location probes independently, so a shorter interval creates origin invocations without improving the delivery contract.
- Keep host and Function logging at `Warning`, exclude only `Exception` from Application Insights sampling, and retain write/delete storage audit logs while disabling duplicate read and metric streams.
- Log Analytics remains on the 90-day PerGB2018 plan without a hard daily cap. A cap can stop ingestion of the failure signals this alert depends on; review the post-change ingestion trend before adding a cap and pair any cap with an independent metric alert.
- Rate-limit counters expire after two days and account+email contact-lock blobs after 30 days. These paths are short-lived coordination state, not request records; the 30-day Blob soft-delete window still applies for recovery without allowing unbounded growth.

## Retention and privacy

- request ledger: 395 days by default;
- rate-limit counters: 2 days;
- account+email contact locks: 30 days;
- dead letters: 90 days;
- deployment packages: 30 days;
- PDF masters: retained until superseded under the content release policy;
- Key Vault soft delete/purge protection: 90 days;
- Log Analytics: 90 days;
- Blob soft delete: 30 days.

The privacy owner must define subject-access and deletion authorization. A deletion run removes only the exact request ledger/dead-letter rows and HardMagic engagement. A Contact is deleted only after proving it has no other legitimate HardMagic relationship. Never delete a globally matched Contact.

## Recovery

- Email failure: retain `delivery=failed`; repair provider configuration and redeliver through an operator-only replay tool, never browser resubmission. For `delivery=unknown`, reconcile every recorded ACS operation handle first; never issue a new operation until the original operation(s) are terminal.
- CRM failure: inspect request ID and safe failure code, fix boundary/role/schema, and replay the queue event. Transient enqueue failures already receive a bounded retry; definitive client/auth failures remain failed for operator review. Do not modify delivery state.
- CRM Contact lock contention: allow the queue retry to acquire the account+email lease; do not bypass the lock or create a second Contact. Dead-letter archives are keyed by event/error hash and a repeated poison delivery is an idempotent no-op.
- Compromised SAS: links expire within 48 hours; rotate the affected PDF blob/version and investigate access logs. Account keys do not exist as a fallback.
- Compromised unsubscribe key: rotate the vault secret, expire old links, and preserve suppression in CRM/ledger.
- Edge bypass: stop the release, disable Function public network access until restrictions are corrected, and inspect WAF/origin logs.
