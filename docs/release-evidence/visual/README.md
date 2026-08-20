# Browser and visual QA evidence

This directory is produced from the current `dist/` build by:

```bash
node scripts/audit-rendered-routes.mjs
npx playwright test
```

`rendered-route-manifest.json` is the authoritative browser input. It enumerates every generated HTML output, including the eight legacy redirect pages, nine thanks states, the 404 state, and all canonical pages. The manifest records a SHA-256 fingerprint over the rendered HTML paths and bytes so a capture set can be tied to one build.

`rendered-route-audit.json` is a deterministic preflight over the same output. It checks title, description, canonical, language, primary heading, noindex states, image alt attributes, internal routes/fragments, forms, styles, scripts, media, and responsive image candidates.

`visual-capture-manifest.json` records the expected 390px and 1440px capture for every generated route/state and ties those paths to the same build fingerprint.

`browser-run.md` records the latest browser invocation and deliberately distinguishes a partial local run from release sign-off.

`contact-sheet.html` is generated after each Playwright invocation as a visual index of the expected 390px and 1440px captures. Missing images in a partial run remain visible as missing links instead of being silently omitted.

The default browser matrix is deliberately split by cost:

- all manifest routes receive route/status/metadata/link/overflow smoke at 390 px and 1440 px;
- all manifest routes receive axe `wcag2a` + `wcag2aa` at 390 px with reduced motion;
- representative high-risk routes and states receive 320, 768, 1024, 1280, 1920, 200% and 400% reflow proxies, forced colors, no-JavaScript, Chromium, Firefox, WebKit, iOS-size touch, and Android-size touch checks;
- viewport captures are written under `captures/<project>/` when `QA_CAPTURE` is not `0`.

Full 153-route axe at every viewport/browser would multiply the slowest phase without improving route coverage. The release default therefore keeps axe coverage deterministic over all 153 outputs at one representative viewport, while the route smoke covers both required visual widths. `QA_AXE_SCOPE=representative` is available only for fast diagnosis and is not a release gate.

The previous home timeout was traced to the old test’s `fullPage: true` screenshot: axe had completed, then Chromium spent 42.6 seconds in the screenshot phase before the 60-second test timeout. The harness now captures bounded viewport screenshots by default. Set `QA_FULL_PAGE=1` only for an explicitly flagged manual capture; it retains a 10-second screenshot bound so a layout defect remains visible as a failure.

The preview server is foregrounded with `ASTRO_PREVIEW_BACKGROUND=0` because Astro 7 auto-backgrounds under agent shells. Existing preview processes are never reused or silently killed; a stale port fails the run with an actionable lifecycle error.
