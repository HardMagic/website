# Browser run record

Artifact under test: public `dist/`, fingerprint
`9164f81e7cbf8d3edfbc4e9fd6d67981f98d9c3bb12ed0ad5654c825ec34e1a7` (the full
fingerprint and route contract are in `rendered-route-manifest.json`).

| Run | Result | Notes |
| --- | --- | --- |
| `QA_CAPTURE=0 npm run test:browser` — 2026-08-20 | Partial: 4 passed, 1 interrupted, 775 not run | Historical harness-start check. |
| `npm run test:browser` — 2026-08-31 | 758 passed, 20 expected skips, 29 host-environment failures | Chromium route failures were transient under the long serial run; both affected routes passed targeted reruns. The 27 WebKit launch failures were the host's missing ICU 74/XML2 compatibility libraries, not page failures. |
| `podman run mcr.microsoft.com/playwright:v1.62.1-noble … browser-matrix.spec.ts --project=webkit-390` — 2026-08-31 | 26 passed, 1 expected skip | Containerized WebKit validation completed against the same artifact; this supplies the missing host-library coverage. |
| Targeted Chromium route smoke — 2026-08-31 | 2 passed | `/contact/creative-direction/` and `/portfolio-item/state-parks/` each passed on a clean preview. |

The capture manifest now records the full 153-route × 2-project evidence set;
visual sign-off and the controlled production funnel canaries remain release-owner
checks. Browser evidence does not assert production deployment or live delivery.

Capture PNGs and the generated manifest are CI/object-artifact evidence. The
manifest records each present capture's SHA-256 and byte size, while missing
captures remain explicit in partial-run manifests. Local untracked captures are
disposable working output and are not source truth; use the retained CI/object
artifact and its manifest when reviewing or handing off release evidence.
