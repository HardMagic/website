# Release approvals

No release approval is implied by the generated ledgers. Complete this table against
one immutable release manifest before publishing.

| Area | Named approver | Status | Date (UTC) | Evidence / exception expiry |
| --- | --- | --- | --- | --- |
| Editorial and claims | TBD | pending | — | — |
| Brand and client-use rights | TBD | pending | — | — |
| Brief content and source register | TBD | pending | — | `docs/release-evidence/briefs/manifest.json` |
| PDF/UA and accessible HTML alternative | TBD | pending | — | Manual screen-reader review required |
| Privacy, consent, retention, suppression | TBD | pending | — | Funnel canaries required |
| Security, WAF, headers, secrets | TBD | pending | — | Public-edge smoke required |
| Azure/Dataverse/CRM projection | TBD | evidence captured; approval pending | 2026-09-01 | `funnels/canary-2026-09-01.md` |
| Browser, visual, performance QA | TBD | pending | — | `docs/release-evidence/visual/` |
| Release owner and rollback | TBD | pending | — | Timed rehearsal required |

Each exception needs an owner, compensating control, explicit expiry date, and a
decision that the release owner can reverse. “Source check passed” is not an approval.
