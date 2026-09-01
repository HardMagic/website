# HardMagic corporate site implementation note

- Baseline: recovered WordPress static export; no package manager or framework.
- Target: Astro 7.2.9, static output, no deployment adapter.
- TypeScript: 7.0.2 native CLI for project TypeScript; TypeScript 6.0.2 compatibility API for Astro language tooling until Astro/Volar supports the TypeScript 7 API.
- Content: local, schema-validated Astro content collections.
- Styling: authored modern CSS with semantic tokens and scoped component styles; no UI framework.
- Interaction: semantic HTML/CSS only. No hydrated client islands.
- Routes: home, product index, product details, company, contact, privacy, and 404.
- Accessibility target: WCAG 2.2 AA; keyboard, zoom/reflow, reduced-motion, and forced-colors review.
- Performance target: no route-specific client JavaScript, optimized local media, one eager LCP image, and no third-party requests.
- Deployment: GitLab `demo` builds to private-network GitLab Pages. GitLab `gh-pages` remains the authoritative public release source mirrored to GitHub.
- Known hosting constraint: GitHub Pages cannot set repository-managed HTTP security headers; the site avoids third-party scripts and dynamic input.

## Design direction

Preserve the existing black, ivory, and royal-wine identity, “Dream in Reality,” the raptor symbol, and the brand’s intense cinematic voice. Modernize the system through editorial typography, tactile media, asymmetric grids, explicit evidence, and product-centered narratives.
