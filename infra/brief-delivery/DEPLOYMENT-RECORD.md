# HardMagic BriefLock deployment record

Historical verification noted: 2026-08-12, FocusHive tenant.

Verification status: **historical inventory, not current release evidence**. This record
does not include a current immutable deployment ID, Function package hash, Blob object
version, PDF upload timestamp, DNS/TLS observation, or end-to-end delivery canary. No
P0-05 work in the website repository performed an Azure upload or changed the deployed
state. Re-verify every item against the named tenant and attach redacted evidence before
calling BriefLock production-ready.

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
- Shared WAF: `tliwafstandard`, Prevention mode; association maintained by `edge.bicep`

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
- Runtime role: `HardMagic Brief Delivery` (`bdbb5abf-8496-f111-8075-6045bd09a331`)

Secrets remain only in the dedicated Key Vault. This record intentionally contains no secret values, recipient data, signed URLs, or acceptance-test payloads.
