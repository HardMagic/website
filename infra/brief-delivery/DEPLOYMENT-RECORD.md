# HardMagic BriefLock deployment record

Historical verification noted: 2026-08-12, FocusHive tenant.

Current release evidence: 2026-09-01, FocusHive tenant. Source commit `a39c454`
passed protected pipeline `56132` (Function tests/package, PDF package, Bicep
validation, and what-if). Protected deployment job `1018319` completed with
Azure deployment `hm-brief-lock-51` and Function zip deployment
`a0703c32-9c61-4536-8743-106b47a0b721`. The public artifact was published by
the protected Pages/mirror path; direct GitHub branch mutation was not used.
The exact Function zip uploaded by package job `1018315` has SHA-256
`4eaf83b5e81631f631203b690d5be8e88587516f4297ff57be2ade667348415f`.

The end-to-end non-PII canary returned the expected `303` from Front Door,
delivered the ACS brief email, projected one D365 engagement with the expected
Account/BU/team ownership and live schema fields, and was then cleaned up. The
synthetic D365 engagement, Contact, private ledger blob, and test email were
removed/moved to Deleted Items. No customer data is recorded here.

## Azure

- Subscription: Microsoft Partner Network (`6e60a8fd-9992-4ff7-8a3e-db96b4dfed4f`)
- Resource group: `rg-hardmagic-briefs`
- Function: `fn-hm-briefs-ucrhklk2glcq6`
- Runtime identity client ID: `4456e76a-24fb-4d3d-89b6-b6bdc2ed7e9d`
- Runtime identity object ID: `f7877793-4844-4876-95a4-7e8efe8b2ba3`
- Storage: `sthmbriefucrhklk2glcq6`
- Dedicated Key Vault: `kvhmucrhklk2glcq6`
- Private brief container: `briefs`; the historical record says eight generated technical-brief PDFs were uploaded. The current upload state and each stored checksum are unverified here.
- Direct Function origin: access-restricted and verified to return HTTP 403
- Shared Front Door profile ID: `9640fdb7-bfd5-4890-a984-5a5a7217ad3d`
- HardMagic origin group: `hardmagic-briefs-origins`
- HardMagic route: `hardmagic-briefs-route`
- Custom domain: `briefs.hardmagic.com`
- Shared WAF: `tliwafstandard`, Prevention mode; association remains owned by the shared Terraform edge authority. `edge.bicep` does not manage or replace this binding.

## Dataverse

- Environment: `https://dream.crm.dynamics.com`
- Business Unit: HardMagic (`289b301c-7f96-f111-8075-6045bd09a0b8`)
- Default owner team: HardMagic (`359b301c-7f96-f111-8075-6045bd09a0b8`)
- Account: HardMagic Corporation (`bf43ce99-7f96-f111-8075-7ced8d6f5115`)
- Publisher: `hardmagic`, prefix `hm` (`74db9cdb-8096-f111-8075-7ced8d6f5115`)
- Solution: `hardmagic_briefs` (`1b9cede1-8096-f111-8075-7ced8d6f5115`)
- Table: `hm_briefengagement`, auditing enabled (`b83f1a04-8196-f111-8075-00224803c40c`)
- Alternate key: `hm_requestid`, Active (`c72a3f8a-8196-f111-8075-6045bd09a0b8`)
- Application user: `HardMagic uai-hm-briefs-runtime-ucrhklk2glcq6` (`8bd431e3-8496-f111-8075-00224803c40c`)
- Runtime role: `HardMagic Brief Delivery` (`bdbb5abf-8496-f111-8075-6045bd09a331`),
  assigned to both the application user and the HardMagic owner team. Local
  privileges include `Assign` on Contact and `hm_BriefEngagement`, plus Team
  `Read`/`Append To`, and Account `Read`/`Append To`; no Delete, Global, or
  System Administrator privilege is granted. The source-controlled live
  privilege and solution snapshot is
  [`dataverse/role-hardmagic-brief-delivery.json`](dataverse/role-hardmagic-brief-delivery.json).
  The application user and owner team retain the platform `Basic User` role as
  their separate baseline role.

Secrets remain only in the dedicated Key Vault. This record intentionally contains no secret values, recipient data, signed URLs, or acceptance-test payloads.
