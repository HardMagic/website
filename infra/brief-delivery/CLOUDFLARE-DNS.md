# HardMagic BriefLock DNS contract

This file records the desired DNS contract, not a live DNS/TLS observation. No Cloudflare
query, certificate check, or external deployment was performed by the P0-05 website
workstream. Capture the current record values, certificate state, and verification time
in release evidence before relying on this contract.

`hardmagic.com` is authoritative in Cloudflare account `TaoMgt` (account ID `2d0c1675bb88a5f6c7c9bcea5b8e2aad`, zone ID `73af42b5130d61b887c3c18e6d0d9633`).

The edge requires these DNS records:

| Type | Name | Content | Proxy | Purpose |
|---|---|---|---|---|
| CNAME | `briefs.hardmagic.com` | `taodoor-hvbzgrarb3hgfyby.z02.azurefd.net` | DNS only | Azure Front Door traffic |
| TXT | `_dnsauth.briefs.hardmagic.com` | Azure-issued validation token | n/a | Managed-certificate validation |

The Turnstile widget is `HardMagic BriefLock`, site key `0x4AAAAAAEOV4a4wcfxluMkv`, with exact host allowlisting for `hardmagic.com`, `www.hardmagic.com`, and `hardmagic.pages.developerdojo.org`. Its secret belongs only in the dedicated Azure Key Vault secret `turnstile-secret`.

Never commit the Cloudflare API token, Turnstile secret, or transient validation token. The Cloudflare API token is sourced from the protected company vault at deployment time.
