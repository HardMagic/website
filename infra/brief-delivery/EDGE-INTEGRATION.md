# External edge contract

Front Door remains an externally managed dependency. Its definitions belong in the authoritative shared edge repository, not duplicated here. In particular, the profile-level WAF security policy and its existing associations remain Terraform-owned; `edge.bicep` must not declare `Microsoft.Cdn/profiles/securityPolicies`.

The edge owner must provide:

- custom domain `briefs.hardmagic.com` with managed TLS;
- origin set to the emitted Function hostname;
- origin host header set to `briefs.hardmagic.com`;
- only `/api/brief-request`, `/api/contact-request`, `/api/unsubscribe`, and `/api/health` routed to this origin;
- a deliberate `404` for `/reports/*`, `/*.pdf`, storage hostnames, and all unlisted paths;
- WAF Prevention mode with managed rules;
- 20 requests/minute per client for each POST route, independently;
- a stricter burst rule for `/api/unsubscribe` POST and a health-monitor exemption;
- bot/challenge enforcement compatible with Turnstile;
- request-body maximum 24 KB;
- no caching of API responses;
- log scrubbing for query strings on unsubscribe requests.

Direct origin bypass is denied twice:

1. The Function access restriction allows only the `AzureFrontDoor.Backend` service tag when `x-azure-fdid` equals the supplied Front Door profile GUID. The SCM endpoint reuses the same restriction.
2. The application verifies `x-azure-fdid` and the forwarded host before parsing any body. A missing or mismatched value returns `404`.

The Front Door GUID is non-secret, but it must be the exact production profile ID. A placeholder cannot pass deployment validation. After integration, verify the edge returns `200` for health while the default `azurewebsites.net` hostname returns `403` or `404` both with and without forged host headers.
