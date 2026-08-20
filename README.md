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

The original WordPress export remains recoverable from repository history. The
current site is a static Astro 7 application with schema-validated product
content, self-hosted media, and no browser JavaScript or third-party requests.

## Development

```sh
npm install
npm run dev
npm run verify
```

GitLab remains authoritative for all branches. GitLab Pages serves only the
internal-public `demo` preview; GitHub Pages serves the public domain from the
mirrored `gh-pages` branch.
