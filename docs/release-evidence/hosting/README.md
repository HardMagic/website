# Hosting evidence and header policy

GitLab is the source of truth. The protected `demo` branch is the release source;
its `demo` target is a `/hardmagic/` subpath build and must remain noindex. The
`public` target is a root build for the `gh-pages` release artifact and uses
`https://hardmagic.com/` as its canonical origin.

The intended release sequence is:

1. A protected GitLab pipeline runs `public_release` on `demo`. It runs the
   checks and audits, records the lockfile/runtime/artifact hashes, and emits
   the candidate `public` artifact plus `docs/release-evidence/release-manifest.json`.
2. An explicit manual `mirror_public_release` job can run only after
   `public_release` succeeds. Its GitLab `needs` declaration downloads that
   artifact; it verifies the manifest against the commit, pipeline, `public`
   target, and artifact SHA-256 before doing any external work.
3. The mirror first creates the GitLab canonical `gh-pages` commit containing
   only the approved artifact and atomically publishes that branch update with
   the signed GitLab tag `public-release-$CI_COMMIT_SHA`. It then creates the
   corresponding normal fast-forward GitHub `gh-pages` commit from the same
   artifact tree and pushes it. The job mints a short-lived GitHub App
   installation token from protected `GITHUB_APP_ID`,
   `GITHUB_APP_INSTALLATION_ID`, and masked `GITHUB_APP_PRIVATE_KEY_B64`; the
   protected masked `GITLAB_MIRROR_TOKEN` (with its protected
   `GITLAB_MIRROR_USERNAME`) is used only for the canonical GitLab branch/tag
   push, while protected masked `GITLAB_PROVENANCE_PRIVATE_KEY_B64` signs the
   tag. The GitLab mirror token is an expiring organization bot credential
   sourced from Key Vault; it is used because this self-managed GitLab's CI job
   token cannot push the protected release branch. Missing credentials fail the
   job; none is optional. The job never force-pushes, resets, or publishes the
   source tree.
4. The release owner verifies DNS, TLS, redirects, CDN freshness, response
   headers, and the canonical host at the actual public edge.
5. Rollback republishes a previously recorded artifact whose manifest matches
   the selected commit and SHA-256; it does not promote the private `demo`
   artifact.

The legacy `pages` job remains only as the protected, internal noindex `demo`
preview. It is not a public promotion path, and the older unverified
`git-mirror-sync` behavior must not be used to bypass `public_release` or the
blocking mirror job.

`headers-policy.json` is the required response-header contract for the public edge. It is deliberately marked `required-unverified`: this repository does not claim that either static host consumes an arbitrary `public/_headers` file. The release owner must establish the policy at the actual edge or record a signed exception with an owner and expiry.

The CI release candidate records the policy path and keeps public-mirror, DNS,
TLS, CDN freshness, and rollback evidence separate from source configuration. A
matching commit or generated artifact is not public-host verification.

## Latest public-edge spot check — 2026-08-20

The root returned HTTP 200 and Cloudflare/GitHub Pages headers, and the brief
health endpoint returned `{"ok":true,"configured":true}`. This is not a release
pass: the live `robots.txt` was a content-signals document without the canonical
sitemap, and `/portfolio-item/airikai/` returned HTTP 200 rather than the required
edge 301/308. Re-run this spot check after the protected public release and record
the served artifact hash, redirect status, sitemap, headers, and cache freshness.
