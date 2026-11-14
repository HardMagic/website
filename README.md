# HardMagic website

This repository is the internal source repository for HardMagic.

- Internal source of truth: `git.developerdojo.org/HardMagic/website`
- Internal-public preview: the `demo` branch is published to GitLab Pages
  behind the OpenZiti network boundary
- Canonical release branch: GitLab `gh-pages`
- Public deployment: GitHub `HardMagic/website`, `gh-pages` branch, kept in
  sync by `git-mirror-sync`
- Official domain: [hardmagic.com](https://hardmagic.com)
- Source application: [`src/`](src/)
- Static build output: `dist/` (generated, not committed)

_Last verified: 2026-11-14._

The original WordPress export remains recoverable from repository history. The
current site is a static Astro 7 application with schema-validated product
content and self-hosted media. Browser JavaScript is limited to a few small
self-hosted scripts in [`public/scripts/`](public/scripts/) (header navigation,
video archive, WireMark comparison, corporate-email validation). The only
third-party requests are Cloudflare Turnstile on the contact forms and Cloudflare
Insights, both pinned in the CSP that `npm run audit:security` enforces.

## Gated briefs (BriefLock)

[`infra/brief-delivery/`](infra/brief-delivery/) holds the Bicep infrastructure
and the Node 24 Azure Function that deliver gated technical briefs and qualified
consulting intake at `briefs.hardmagic.com`. Its own
[README](infra/brief-delivery/README.md) and `OPERATIONS.md` describe the boundary
and runbook. Its CI jobs live in [`.gitlab/ci/brief-delivery.yml`](.gitlab/ci/brief-delivery.yml);
deployment runs only on protected `demo` with `RUN_BRIEF_LOCK_DEPLOY=1`.

## Development

```sh
npm install
npm run dev
npm run verify
```

`npm run verify` runs the full local gate: Astro check, the TypeScript 7
typecheck, unit and release tests, the build, the security, route, sitemap,
media, link, CTA and rendered-route audits, and the Playwright browser suite.

## CI and release

- Merge requests run `site_tests` (check, typecheck, unit and release tests).
- Every push to protected `demo` runs `pages`, which builds the noindex demo
  preview (base path `/hardmagic`) for GitLab Pages.
- A public release runs from `demo` only when the pipeline is started with
  `RUN_PUBLIC_RELEASE=candidate` (build and evidence only) or
  `RUN_PUBLIC_RELEASE=publish` (also mirrors to GitHub `gh-pages` through
  `mirror_public_release`). See [`.gitlab/ci/site-release.yml`](.gitlab/ci/site-release.yml).

GitLab remains authoritative for all branches. GitLab Pages serves only the
internal-public `demo` preview; GitHub Pages serves the public domain from the
mirrored `gh-pages` branch.
