# HardMagic BriefLock

This directory is the source-controlled infrastructure and runtime for HardMagic Corporation's gated technical briefs and qualified consulting intake. It is a HardMagic-specific port of the BriefLock pattern—not a copy of another company's live IDs, secrets, PDFs, or deployment workflow.

No resource in this package has been deployed by adding these files.

## Boundary

The target boundary is:

- resource group: `rg-hardmagic-briefs`;
- public edge host: `briefs.hardmagic.com`;
- runtime: Node 22 Azure Functions Flex Consumption;
- private storage: anonymous Blob access disabled, shared keys disabled, OAuth by default;
- private containers: `briefs`, `ledger`, `deadletter`, and `deployments`;
- dedicated user-assigned runtime identity and dedicated Key Vault;
- a custom ACS runtime role limited to Communication Service read/write (no key listing, key rotation, delete, or domain administration);
- Azure Communication Services Email with the display name `HardMagic Corporation`;
- Dream Dataverse projection into `hm_briefengagement`, keyed by `hm_requestid`;
- Application Insights, Log Analytics, retention policies, and a production failure alert.

The web page never serves a PDF. It posts qualification data to the edge host; the Function writes the durable delivery ledger, creates a 48-hour read-only user-delegation SAS for one exact PDF, emails it, and queues CRM projection. A Dynamics outage cannot force a visitor to resubmit or receive a duplicate delivery. Brief requests require a company email address; public mailbox domains including Gmail, Google Mail, Hotmail, Outlook.com, Yahoo, and their supported country variants are rejected before the ledger, email, or CRM queue is touched. Custom company domains hosted by Google or Microsoft remain eligible.

## HardMagic intake taxonomy

The runtime accepts only these service lanes:

- creative direction;
- GenAI;
- media management;
- marketing consulting;
- product strategy;
- creative technology.

Brief requests require role, industry, size, decision stage, decision horizon, challenge, preferred next step, resource-specific consent, and a selected lane. Consultation requests require a mandate and decision horizon. Broader marketing consent is separate and defaults to `no`.

## Source-of-truth and release model

GitLab in the `hardmagic` organization is authoritative. Include `.gitlab/ci/brief-delivery.yml` from the repository's root pipeline. The production apply job is:

- limited to `demo`;
- manual and non-optional once started;
- attached to the protected `brief-lock/production` environment;
- serialized with a GitLab resource group;
- authenticated with a GitLab OIDC ID token;
- gated by `BRIEF_CONFIRM=PROVISION-HARDMAGIC-BRIEFLOCK`.

Required protected and masked CI/CD variables:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
BRIEF_FRONT_DOOR_ID
BRIEF_DEPLOYMENT_PRINCIPAL_OBJECT_ID
BRIEF_ALERT_ACTION_GROUP_RESOURCE_ID
```

The OIDC service principal and its federated credential are bootstrapped outside this deployment. Give it only the control-plane scope required for `rg-hardmagic-briefs`; the template separately limits its data-plane Blob role to the `deployments` container. Never store a client secret in GitLab.

## Validation

```bash
cd infra/brief-delivery/function
npm ci
npm run check
npm test
npm run build
```

Compile Bicep without contacting Azure:

```bash
az bicep build --file infra/brief-delivery/main.bicep --stdout > /dev/null
```

Use the GitLab manual `what-if` job before the protected apply. `parameters.example.json` contains names and placeholders only. Sender address, challenge secret, unsubscribe HMAC key, and Dataverse IDs must be written to the dedicated Key Vault by an authorized secret-management process; they never cross the deployment command line.

## Required external work

This package intentionally does not pretend to own the shared edge or Dataverse control planes. Before deployment is usable:

1. The shared Front Door Terraform authority must create `briefs.hardmagic.com`, route only `/api/brief-request`, `/api/contact-request`, `/api/unsubscribe`, and `/api/health`, preserve the host, and attach the WAF controls in [EDGE-INTEGRATION.md](EDGE-INTEGRATION.md).
2. The HardMagic Dataverse solution, application user, role, BU, Account, team, and custom table must match [DATAVERSE-CONTRACT.md](DATAVERSE-CONTRACT.md).
3. A custom ACS sender domain must be verified and its sender address added to Key Vault.
4. Turnstile must be configured on both forms before production; the production default fails closed when it is absent.
5. Reviewed PDFs must be uploaded to `briefs` using Entra ID and the exact catalog filenames. Do not add PDFs to this infrastructure directory or a public site directory.

See [OPERATIONS.md](OPERATIONS.md) for acceptance, recovery, deletion, and privacy controls.
