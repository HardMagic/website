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

- Edge health returns configured `true`; direct Function origin is denied.
- Both API POST routes reject a foreign Origin, missing Front Door identity, honeypot input, oversized body, missing challenge, invalid service lane, and incomplete consent.
- A controlled brief request returns `303`; no response contains PDF bytes or a Blob URL.
- Received email has HardMagic branding, HTML and plain text, monitored Reply-To, a 48-hour exact-blob link, and an unsubscribe link.
- Public PDF guesses return `404` at the edge and anonymous Blob reads fail.
- One Account-bound Contact and one `hm_briefengagement` exist for the request ID.
- Replaying the CRM event is idempotent.
- A forced CRM outage leaves delivery sent, retries five times, then creates one private dead-letter artifact and raises an alert.
- Unsubscribe updates the ledger first and CRM asynchronously.

Never print an address, token, SAS URL, request body, Key Vault value, or full Dataverse response in CI or telemetry.

## Retention and privacy

- request ledger: 395 days by default;
- dead letters: 90 days;
- deployment packages: 30 days;
- PDF masters: retained until superseded under the content release policy;
- Key Vault soft delete/purge protection: 90 days;
- Log Analytics: 90 days;
- Blob soft delete: 30 days.

The privacy owner must define subject-access and deletion authorization. A deletion run removes only the exact request ledger/dead-letter rows and HardMagic engagement. A Contact is deleted only after proving it has no other legitimate HardMagic relationship. Never delete a globally matched Contact.

## Recovery

- Email failure: retain `delivery=failed`; repair provider configuration and redeliver through an operator-only replay tool, never browser resubmission.
- CRM failure: inspect request ID and safe failure code, fix boundary/role/schema, and replay the queue event. Do not modify delivery state.
- Compromised SAS: links expire within 48 hours; rotate the affected PDF blob/version and investigate access logs. Account keys do not exist as a fallback.
- Compromised unsubscribe key: rotate the vault secret, expire old links, and preserve suppression in CRM/ledger.
- Edge bypass: stop the release, disable Function public network access until restrictions are corrected, and inspect WAF/origin logs.
