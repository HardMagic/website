# Launch operations evidence

This file is the release-owner checklist for the static site and BriefLock boundary.
It deliberately leaves external control-plane facts open until an authorized operator
records them.

## Before the window

- [ ] Record the signed public and demo artifact hashes and deployment IDs.
- [ ] Confirm DNS/TLS, GitLab `gh-pages`, GitHub mirror freshness, edge headers, WAF,
      Function package, Key Vault rotation, ACS sender, storage lifecycle, Dataverse
      ownership, alert destinations, and rollback owners.
- [ ] Run the redacted cases in `funnels/` and verify cleanup.
- [ ] Rehearse static rollback and Function rollback separately; never roll private
      brief storage backward destructively with the website.
- [ ] Confirm the staffed launch window, escalation channel, abort threshold, and
      24-hour/7-day review owners.

## During the window

- [ ] Publish the exact public artifact and mirror it through the approved authority.
- [ ] Verify the custom host, canonical URLs, sitemap, robots, headers, cache freshness,
      representative routes, both form endpoints, health, and monitoring.
- [ ] Watch edge errors/WAF classes, Function latency/errors, email failures, queue and
      dead-letter depth, CRM lag, certificate/secret expiry, and web-vitals probes.

## After the window

- [ ] Record observed deployment and monitor evidence against the manifest.
- [ ] Keep the previous static artifact and Function package available for rollback.
- [ ] Review conversion, error, and support signals at 24 hours and 7 days.

Current status: **partially rehearsed**. The controlled brief canary and cleanup are
recorded in `funnels/canary-2026-09-01.md`; full launch-window staffing, rollback,
failure-path, and 24-hour/7-day review rehearsals remain open.
