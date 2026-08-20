# Browser run record

Artifact under test: public `dist/`, fingerprint `0a18540f92e5` (full SHA is in
`rendered-route-manifest.json`).

| Run | Result | Notes |
| --- | --- | --- |
| `QA_CAPTURE=0 npm run test:browser` — 2026-08-20 | Partial: 4 passed, 1 interrupted, 775 not run | The exhaustive serial matrix was intentionally stopped after confirming the harness starts cleanly. Local Cloudflare Turnstile emitted an unavailable-adapter error; this is not a production funnel canary. |

This record is evidence that the preview lifecycle and test configuration start
correctly, not browser or production sign-off. Complete the full matrix, review
visual captures (the manifest currently expects 306 and only 1 capture is
present), and run the controlled production funnel cases before release.
