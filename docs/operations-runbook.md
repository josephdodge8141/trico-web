# Operations runbook

This runbook covers the operator actions that are intentionally outside the normal immutable release path. Prefer the GitHub workflows and the typed preview lifecycle controller over direct AWS mutations. Use AWS profile `mine` only for controlled recovery and verification.

## Preview recovery

Normal admission, replacement, pull-request closure, startup timeout, and four-hour expiry all use the generation-checked lifecycle controller described in [Preview operations](preview-operations.md). A failed preview must not block development or production delivery.

1. Inspect the `Trusted preview admission` and `Preview cleanup` workflow runs and capture the pull-request number, candidate SHA, run ID, run attempt, and failure step.
2. Inspect the lifecycle record in the `trico-web-preview-state` DynamoDB table before changing ECS or Route 53. Do not delete a task or DNS record unless its repository ID, pull-request number, generation, and command ownership match the recorded state.
3. Re-run the failed workflow when the failure is transient. The lifecycle operations are idempotent and reconciliation retries uncertain startup and cleanup.
4. For a stuck generation, run the typed CLI from a reviewed checkout with the same foundation outputs and a new monotonically increasing event sequence. Use `close` for an intentionally abandoned pull request and `reconcile` for uncertain state. Never delete all preview records or tasks as a bulk cleanup.
5. Verify the generation-owned DNS record is gone, the ECS task is stopped, the task definition was deregistered, and the lifecycle record retains the cleanup result.

## Development deployment failure

1. Leave `APPLICATION_DEPLOY_ENABLED` false while enrollment or recovery is incomplete.
2. Open the failed `Application deployment` run and record its `RELEASE_SHA`, backend digest, frontend object key, and manifest checksum.
3. If artifact publication failed, fix the source through a pull request and merge a new SHA. Do not reuse a partially published manifest.
4. If the stack update failed, inspect CloudFormation events and allow CloudFormation rollback to finish. Confirm the stack reaches a stable state before retrying the same SHA.
5. Re-run development for the exact main-branch SHA. Verify CloudFormation, `/health`, all six page routes, authentication, editor save/publish, email delivery, and alarms before considering production promotion.

## Production rollback

Production accepts only a tested main-branch SHA and the immutable manifest created by development. It does not rebuild.

1. Stop further promotion and capture the failed release SHA and CloudFormation events.
2. Identify the most recent known-good manifest in the versioned release-artifact bucket. Verify its recorded backend digest, frontend object checksum, and SHA.
3. Confirm the pre-deploy DynamoDB backup for the failed attempt completed.
4. Dispatch production with the known-good tested SHA and approve the protected `prod` environment deployment.
5. If application data is incompatible, restore the required DynamoDB backup to a new table, validate it, and update the stack through a reviewed change. Never overwrite the retained production table in place.
6. Verify HTTPS, `/health`, six page routes, login, editor read/write/publish, email, CloudFront behavior, Lambda alarms, and DynamoDB alarms.

## DNS and certificate recovery

Cloudflare is authoritative for `joedodge.dev`. Route 53 owns the delegated `preview.trico.joedodge.dev` child zone and is also the application stack's record-management boundary. Public certificate validation and permanent application aliases therefore require DNS-only Cloudflare records.

- Preview delegation must contain all four Route 53 nameservers for `preview.trico.joedodge.dev`.
- ACM validation CNAMEs must remain DNS-only. Do not proxy them.
- CloudFront application aliases for `dev.trico.joedodge.dev` and `trico.joedodge.dev` must be added to Cloudflare as DNS-only CNAMEs after their distributions exist.
- Certificates are issued in `us-east-1`; application resources are deployed in `us-east-2`.

Verify authority and validation before retrying a deployment:

```sh
dig NS preview.trico.joedodge.dev @chin.ns.cloudflare.com
AWS_PROFILE=mine aws acm list-certificates --region us-east-1
AWS_PROFILE=mine aws cloudformation describe-stacks --region us-east-1 --stack-name TricoWebEdgeFoundation
```

## SES recovery

The SES identity is `joedodge.dev` in `us-east-2`. Its three DKIM CNAMEs, SPF TXT record, and DMARC TXT record are DNS-only Cloudflare records.

```sh
AWS_PROFILE=mine aws sesv2 get-email-identity \
  --region us-east-2 \
  --email-identity joedodge.dev
```

Do not enable application deployment until the identity and DKIM status are successful. While the account remains in the SES sandbox, recipient addresses must also be verified. Request production access only after the public site, sender identity, bounce/complaint handling, and operational contact are ready.

## Editor access recovery

- Development and production use distinct protected `REVIEWER_PASSWORD` secrets. Never reuse the local, preview, development, or production password.
- `REVIEWER_EMAIL` is the single explicitly allowed bootstrap operator outside `@tricoinc.com`; normal self-registration stays restricted to `@tricoinc.com`.
- Rotate a compromised password in the matching GitHub environment, redeploy that environment, and invalidate active sessions. Do not copy a password between environments.
- The preview reviewer credential is stored in the permanent preview Secrets Manager secret and should be rotated independently if exposed.

## Data restore

- Production DynamoDB has point-in-time recovery and a pre-release on-demand backup. Restore into a new table, validate item counts and publication state, and switch through CloudFormation.
- Content objects and release artifacts are versioned. Restore a prior object version rather than deleting current history.
- Record the release SHA, table backup ARN, restored table name, object version IDs, operator, reason, and validation evidence in the incident record.

## Security incident and credential revocation

1. Disable `APPLICATION_DEPLOY_ENABLED` and the trusted preview workflow when GitHub-to-AWS trust may be compromised.
2. Remove active GitHub environment approvals and rotate affected reviewer or preview secrets.
3. Revoke or narrow the affected OIDC role trust policy. There are no long-lived AWS access keys in Actions.
4. Inspect CloudTrail `trico-web-account-management`, Access Analyzer `trico-web-account-access`, GitHub Actions runs, ECR pushes, S3 object versions, CloudFormation changes, ECS tasks, Lambda configuration, and Route 53 changes.
5. Quarantine suspect image digests and manifests without deleting evidence. Redeploy only a verified SHA and immutable artifact set.
6. Restore workflow access only after the trust policy, repository ruleset, environment protections, and audit trail have been reviewed.

The operations SNS topic is `trico-web-operations`. Confirm its email subscription after creation so alarms and cost-anomaly notifications are delivered.

GitHub's customized OIDC subject includes the immutable owner and repository database IDs as well as the environment. If the repository is transferred or recreated, update those IDs through a reviewed delivery-foundation change before re-enabling deployment workflows.
