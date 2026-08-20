# Hosting evidence and header policy

GitLab is the source of truth. The `demo` target is a `/hardmagic/` subpath build and must remain noindex; the `public` target is a root build for the `gh-pages` release artifact and uses `https://hardmagic.com/` as its canonical origin.

The intended release sequence is:

1. A protected GitLab pipeline builds the selected commit with the `public` target, records the lockfile/runtime/artifact hashes, and publishes a candidate artifact.
2. A separately controlled mirror process copies that exact `gh-pages` artifact to the GitHub Pages publishing location. This repository does not verify that process or claim that it is active.
3. The release owner verifies DNS, TLS, redirects, CDN freshness, response headers, and the canonical host at the actual public edge.
4. Rollback republishes a previously recorded artifact whose manifest matches the selected commit and SHA-256; it does not promote the private `demo` artifact.

`headers-policy.json` is the required response-header contract for the public edge. It is deliberately marked `required-unverified`: this repository does not claim that either static host consumes an arbitrary `public/_headers` file. The release owner must establish the policy at the actual edge or record a signed exception with an owner and expiry.

The CI release candidate records the policy path and keeps public-mirror, DNS, TLS, CDN freshness, and rollback evidence separate from source configuration. A matching commit or generated artifact is not public-host verification.

## Latest public-edge spot check — 2026-08-20

The root returned HTTP 200 and Cloudflare/GitHub Pages headers, and the brief
health endpoint returned `{"ok":true,"configured":true}`. This is not a release
pass: the live `robots.txt` was a content-signals document without the canonical
sitemap, and `/portfolio-item/airikai/` returned HTTP 200 rather than the required
edge 301/308. Re-run this spot check after the protected public release and record
the served artifact hash, redirect status, sitemap, headers, and cache freshness.
