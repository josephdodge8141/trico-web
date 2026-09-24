# Infrastructure buildout status — 2026-09-23

This dated status supplements the [historical buildout checklist](infrastructure-buildout-plan.md); it does not rewrite its original checkboxes. Evidence below was reviewed on 2026-09-23. It distinguishes completed observations from pending checks and owner decisions.

## Verified

- The delivery work is on `main`. Merged PRs [#20](https://github.com/josephdodge8141/trico-web/pull/20) (terminal preview cleanup receipts), [#21](https://github.com/josephdodge8141/trico-web/pull/21) (preserve published edits), [#22](https://github.com/josephdodge8141/trico-web/pull/22) (preview readmission after expiry), [#23](https://github.com/josephdodge8141/trico-web/pull/23) (production backup gate), [#24](https://github.com/josephdodge8141/trico-web/pull/24) (redeploy existing dev release artifacts), [#14](https://github.com/josephdodge8141/trico-web/pull/14) (scheduled preview-expiry proof), and [#31](https://github.com/josephdodge8141/trico-web/pull/31) (side-by-side production subdomain certificate) are included.
- PR #14's scheduled expiry exercise completed for preview generation `preview-1362078393-14-2`. Its fixed expiry was `2026-09-23 20:53:03.287 UTC`; scheduled sweep run [35921330922](https://github.com/josephdodge8141/trico-web/actions/runs/35921330922) completed at `21:17:26 UTC`. The lifecycle state had no active or retiring generation; the generation receipt was terminal `cleaned`; the ECS task had stopped for reason `expired`; the task definition was `INACTIVE`; and its ENI, Route 53 record, and public DNS were absent. No manual deletion was performed. This proves scheduled expiry cleanup for this generation only; it does not complete the other lifecycle checks. The detailed receipt is recorded in the [historical plan](infrastructure-buildout-plan.md).
- PR #31 added a DNS-validated certificate for the production subdomain alongside the existing certificate and a separate certificate ARN output. This is a merged infrastructure change; it does not establish public production availability or a successful smoke test.
- Development deployed exact release SHA `e37b17b764535e16ec7e05482717623226d01ccd` successfully ([deployment run](https://github.com/josephdodge8141/trico-web/actions/runs/35896951511)). Existing-artifact rollback to `d568ef1181b5b7718107dfb035444289a61cd23a` ([run](https://github.com/josephdodge8141/trico-web/actions/runs/35898474971)) and restore to `e37b17b764535e16ec7e05482717623226d01ccd` ([run](https://github.com/josephdodge8141/trico-web/actions/runs/35899046526)) also succeeded. Both redeploys skipped build, publish, and seed steps; the release marker and Lambda digest matched the selected manifest, and six routes returned HTTP 200. Periodic probes observed no outage; this was not continuous availability monitoring.
- The public development endpoint passed the safe Cucumber subset twice: 13 scenarios / 100 steps after initial deployment and again after rollback restore. These were local runs against the deployed endpoint, not GitHub Actions runs.
- Production SES sending access has been granted, and the SES identity is verified. This status does not claim inbox delivery for a test message.
- Cloudflare is authoritative for `joedodge.dev`; the `preview.trico.joedodge.dev` child zone is delegated to Route 53. This differs from the plan's assumption that the parent domain's public hosted zone is Route 53.
- The development table has point-in-time recovery enabled for 35 days, and backup `arn:aws:dynamodb:us-east-2:940482451909:table/trico-web-dev/backup/01790184881710-8b54a267` was observed in `AVAILABLE` state.
- Production stack assets have been deployed. The public production smoke test is still pending setup and validation of the new production hostname. Stack asset deployment alone does not prove public application health or a completed production release.
- Automatic application delivery remains disabled. The manual exact-SHA development deployment path is available; an automatic main-branch push must not be represented as delivering development or production.

## Pending evidence or work

- Configure and validate the new production hostname, then run the public production smoke suite against it. Until that passes, no production smoke success or public production readiness is claimed.
- Confirm SES test-message inbox delivery if that evidence is needed; production sending access and identity verification do not establish inbox receipt.
- Keep automatic delivery disabled until its enablement is an explicit owner decision and the required checks are accepted.
- `docker compose config` passed locally, but a full pull/start attempt is blocked: pulling `node:24-alpine` hit `DeadlineExceeded`, and a direct daemon pull stalled and was canceled. A Docker daemon restart is pending before retrying the local lifecycle proof.

## Owner decisions still needed

- Confirm the new temporary production-validation hostname and complete DNS/certificate setup against Cloudflare, which is authoritative for `joedodge.dev`. Separately decide whether any future `tricoinc.com` cutover is wanted; no Wix DNS change is included or authorized by this buildout.
- Decide when, if ever, to enable automatic application delivery after reviewing the manual release workflow and its checks.
- Restart Docker Desktop/daemon and repeat the Compose pull/start proof.

No public production smoke test, production inbox delivery, or full local Compose lifecycle proof is claimed here.
