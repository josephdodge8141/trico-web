# Infrastructure buildout status — 2026-09-23

This dated status supplements the [historical buildout checklist](infrastructure-buildout-plan.md); it does not rewrite its original checkboxes. Evidence below was reviewed on 2026-09-23. It distinguishes completed observations from pending checks and owner decisions.

## Verified

- The delivery work is on `main` at `e37b17b`. Merged PRs [#20](https://github.com/josephdodge8141/trico-web/pull/20) (terminal preview cleanup receipts), [#21](https://github.com/josephdodge8141/trico-web/pull/21) (preserve published edits), [#22](https://github.com/josephdodge8141/trico-web/pull/22) (preview readmission after expiry), [#23](https://github.com/josephdodge8141/trico-web/pull/23) (production backup gate), and [#24](https://github.com/josephdodge8141/trico-web/pull/24) (redeploy existing dev release artifacts) are included.
- Development deployed exact release SHA `e37b17b764535e16ec7e05482717623226d01ccd` successfully ([deployment run](https://github.com/josephdodge8141/trico-web/actions/runs/35896951511)). A subsequent existing-artifact rollback to `d568ef1181b5b7718107dfb035444289a61cd23a` ([run](https://github.com/josephdodge8141/trico-web/actions/runs/35898474971)) and forward restore to `e37b17b764535e16ec7e05482717623226d01ccd` ([run](https://github.com/josephdodge8141/trico-web/actions/runs/35899046526)) both succeeded. Each redeploy skipped build/publish and seed steps; release marker and Lambda digest matched the selected manifest, and six routes returned HTTP 200. Periodic probes observed no outage; this was not continuous availability monitoring.
- The public development endpoint passed the safe Cucumber subset twice: 13 scenarios / 100 steps after the initial deployment and again after rollback restore. These were local runs against the deployed endpoint, not GitHub Actions runs.
- SES identity `joedodge.dev` is verified, DKIM reports `SUCCESS`, and SPF/DMARC records are present. SES accepted a direct test-send request (message ID `010f01a0cf0ef219-15d52fab-1ac3-4404-9140-de6be0796fcc-000000`). This confirms API acceptance only, not inbox delivery.
- Cloudflare is authoritative for `joedodge.dev`; the `preview.trico.joedodge.dev` child zone is delegated to Route 53. This differs from the plan's assumption that the parent domain's public hosted zone is Route 53.
- The development table has point-in-time recovery enabled for 35 days, and backup `arn:aws:dynamodb:us-east-2:940482451909:table/trico-web-dev/backup/01790184881710-8b54a267` was observed in `AVAILABLE` state.

## Pending evidence or work

- PR [#14](https://github.com/josephdodge8141/trico-web/pull/14) remains open for the scheduled preview-expiry proof. Its admitted revision `bbfb4f3` first became healthy at `2026-09-23T16:53:03.287Z`, setting fixed expiry to `2026-09-23T20:53:03.287Z`. The 15-minute scheduled sweeper's first run after expiry is due at approximately `21:00Z`. Cleanup has not yet been verified; do not treat the earlier successful sweeper runs as proof of expiry cleanup.
- SES remains in the sandbox (`ProductionAccessEnabled=false`). The test send has not yet been confirmed in the recipient inbox, and production SES access is not enabled.
- `APPLICATION_DEPLOY_ENABLED` is absent and recent automatic main-branch deployment attempts were skipped. The manual exact-SHA dev deployment path has succeeded; automatic dev deployment remains gated off.
- Production application stack is absent. The apex `trico.joedodge.dev` currently returns Cloudflare 530; this is not a production deployment or a production smoke result.
- `docker compose config` passed locally, but a full pull/start attempt is blocked: pulling `node:24-alpine` hit `DeadlineExceeded`, and a direct daemon pull stalled and was canceled. A Docker daemon restart is pending before retrying the local lifecycle proof.

## Owner decisions still needed

- Confirm the intended production domain and cutover plan. The parent domain is Cloudflare-authoritative, so the plan's Route 53 assumption and any permanent aliases/certificate-validation steps need to follow the chosen DNS authority.
- Confirm the SES recipient inbox received the accepted test message; request SES production access only when ready to leave the sandbox.
- Decide when to enable automatic dev deployment after the owner accepts the manual release workflow and its checks.
- Restart Docker Desktop/daemon and repeat the Compose pull/start proof; then observe PR #14's scheduled cleanup after `21:00Z` and record the resource-level result.

No production deployment, production smoke test, SES inbox delivery, or PR #14 expiry cleanup is claimed here.
