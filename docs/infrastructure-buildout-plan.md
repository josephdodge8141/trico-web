# TriCo Infrastructure Buildout Plan

> This plan preserves the original buildout checklist as a historical baseline. See the [2026-09-23 verified status](infrastructure-buildout-status-2026-09-23.md) for current evidence and remaining decisions; do not interpret unchanged checkboxes below as the latest status.

## Objective

Build, secure, validate, and operate the complete TriCo delivery platform from pull-request preview through development and production promotion.

The initial AWS-hosted environments will use `joedodge.dev`; the existing `tricoinc.com` Wix site and DNS remain untouched until a separate production-domain decision and cutover plan are approved.

## Target environment names

| Purpose              | Target hostname                          | Notes                                                       |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| Pull-request preview | `pr-<number>.preview.trico.joedodge.dev` | Disposable four-hour ECS/Fargate environment                |
| Shared development   | `dev.trico.joedodge.dev`                 | Persistent Lambda/API Gateway/CloudFront environment        |
| Optional staging     | `staging.trico.joedodge.dev`             | Add only if a separate staging gate proves useful           |
| Production           | To be decided                            | Do not alter `tricoinc.com` as part of the initial buildout |

Recommended AWS application region: `us-east-2`. CloudFront certificates must be issued in `us-east-1`.

## Verified starting state

### Repository

- [x] React frontend, shared TypeScript backend, schemas, content bootstrap, and local Compose environment exist.
- [x] `FullstackTsPreviewFoundation`, `TricoWeb-dev`, and `TricoWeb-prod` synthesize.
- [x] Infrastructure unit tests pass: 26 of 26.
- [x] Preview, cleanup, candidate, and application-deployment workflow definitions exist on the feature branch.
- [ ] The feature branch is merged to `main`.
- [ ] A clean release candidate exists; frontend work is currently in progress.
- [ ] GitHub recognizes the new workflows; workflow files are not yet on the default branch.
- [ ] A pull request exists for the feature branch.
- [ ] `main` has branch protection or a repository ruleset.

### GitHub control plane

- [ ] `preview` environment exists.
- [ ] `dev` environment exists.
- [ ] `prod` environment exists.
- [ ] Environment variables are configured.
- [ ] Environment secrets are configured.
- [ ] Production has required reviewers.
- [ ] Any Actions workflow has run successfully.

### AWS account

- [x] Public Route 53 zone `joedodge.dev` exists.
  - Hosted zone ID: `Z075904012SAHP4DLL38X`
- [ ] CDK is bootstrapped in `us-east-2`.
- [ ] GitHub Actions OIDC provider exists.
- [ ] GitHub preview and application deployment roles exist.
- [ ] Preview foundation is deployed.
- [ ] Development application stack is deployed.
- [ ] Production application stack is deployed.
- [ ] Release ECR repository exists.
- [ ] Release-artifact S3 bucket exists.
- [ ] ACM certificates for the selected `joedodge.dev` names exist in `us-east-1`.
- [ ] SES sending identity is verified for the chosen sender domain.
- [ ] TriCo CloudFront, Lambda, DynamoDB, S3, ECS, or ECR resources are running.

## Architectural boundary

The intended delivery path is:

1. Candidate code runs credential-free checks.
2. Candidate backend and frontend images are packaged without AWS credentials.
3. Trusted default-branch control code verifies and admits the candidate.
4. A disposable Fargate task serves each approved PR preview.
5. Merge to `main` builds one immutable backend digest and frontend archive.
6. Development deploys those exact artifacts.
7. Production promotes the same tested SHA and artifacts without rebuilding.

The application stacks own runtime resources. A new delivery-bootstrap stack should own the GitHub/AWS trust boundary and durable release stores.

## Phase 0 — Stabilize the repository

### Work

- [ ] Finish the active shared-careers/frontend work.
- [ ] Confirm the working tree is clean.
- [ ] Run the complete repository gate:

  ```sh
  npm ci
  npm run check
  ```

- [ ] Run the local integration gates:

  ```sh
  docker compose up --build -d
  npm run test:behaviors:frontend:compose
  npm run test:browser:compose -w @app/frontend
  docker compose ps
  ```

- [ ] Run the clean-clone proof:

  ```sh
  npm run proof:clean-clone
  npm run proof:docker
  ```

- [ ] Commit all intended work.
- [ ] Push the feature branch.
- [ ] Open a pull request to `main`.

### Exit criteria

- Clean working tree.
- Complete local gate passes.
- Compose health checks and browser suites pass.
- Feature branch is reviewable as a pull request.

## Phase 1 — Correct delivery source before enrollment

### Workflow corrections

- [ ] Derive one validated `RELEASE_SHA` output and use it in every application-deployment step.
  - The manual dev path currently checks out `inputs.release_sha || github.sha` but builds with `github.sha`.
- [ ] Ensure dev and production resolve the same SHA-addressed frontend archive and backend digest.
- [ ] Validate that production cannot rebuild or silently substitute an artifact.
- [ ] Pin DynamoDB Local, MinIO, and Mailpit preview images by digest.
- [ ] Validate ownership before replacing an existing preview task, task definition, or DNS record.
- [ ] Verify cleanup remains generation-conditional under concurrent preview replacements.
- [ ] Decide whether the lifecycle controller becomes the workflow execution path or remains a tested contract around shell effects.
- [ ] Add tests or fixtures for:
  - First preview launch
  - Preview replacement
  - Failed startup
  - Concurrent replacement
  - PR closure
  - Scheduled expiry
  - Missing/stopped ECS task
  - DNS deletion failure
  - Task-definition cleanup failure

### Documentation corrections

- [ ] Remove the obsolete `BACKEND_IMAGE_URI` environment variable from the operator list.
- [ ] Document `BACKEND_REPOSITORY_URI` and `RELEASE_ARTIFACT_BUCKET` as external delivery-foundation outputs.
- [ ] Resolve the contradiction that labels the AWS preview provider a delivery gap while workflows implement the provider effects.
- [ ] State explicitly that the current application schema requires a custom domain, hosted zone, and ACM certificate.
- [ ] Replace preview-host examples with `pr-<number>.preview.trico.joedodge.dev`.
- [ ] Keep actual `@tricoinc.com` employee/editor email requirements separate from infrastructure hostnames.

### Exit criteria

- Workflow identity and artifact tests cover manual and automatic deployment paths.
- Documentation matches the executable workflows.
- All third-party preview container references are immutable.

## Phase 2 — Add a reproducible delivery-bootstrap stack

Create a separate CDK stack, for example `TricoWebDeliveryFoundation`, rather than manually creating permanent delivery resources.

### GitHub trust resources

- [ ] Create or import the GitHub Actions OIDC provider:
  - Issuer: `https://token.actions.githubusercontent.com`
  - Audience: `sts.amazonaws.com`
- [ ] Create a foundation-owner role for the one-time/permanent CDK foundation deployment.
- [ ] Create a preview deployment role.
- [ ] Create a development deployment role.
- [ ] Create a production deployment role.
- [ ] Restrict trust policies by:
  - Repository: `josephdodge8141/trico-web`
  - GitHub environment
  - Default branch or trusted workflow context
  - Expected audience
- [ ] Do not store AWS access keys in GitHub.

### Release resources

- [ ] Create a dedicated immutable Lambda backend ECR repository.
- [ ] Enable scan-on-push.
- [ ] Add a release-retention policy that preserves promoted and rollback releases.
- [ ] Create a private, encrypted, versioned release-artifact S3 bucket.
- [ ] Block all public access.
- [ ] Enforce TLS.
- [ ] Enable lifecycle handling for incomplete multipart uploads.
- [ ] Define a deliberate artifact-retention period; do not use the preview repository's 14-day policy.
- [ ] Scope environment deployment roles to the repository and release prefixes they need.

### Role boundaries

- [ ] Preview role can only:
  - Push to preview ECR repositories
  - Register/deregister bounded preview task definitions
  - Run/stop tagged tasks in the preview cluster
  - Read required CloudFormation outputs and preview secret
  - Read/write the preview lifecycle table
  - Inspect the task ENI
  - Change records only in the preview zone
  - Read/write preview logs as required
- [ ] Development role can only deploy `TricoWeb-dev` and access dev/release resources.
- [ ] Production role can only deploy `TricoWeb-prod`, read immutable release artifacts, create pre-deploy backups, and change approved production records.
- [ ] Foundation-owner permissions are not granted to routine workflows.

### Exit criteria

- The delivery foundation synthesizes with tests.
- IAM trust and permission assertions are covered by template tests.
- A human bootstrap identity is needed only for initial deployment and controlled foundation changes.

## Phase 3 — Bootstrap AWS and deploy permanent delivery resources

### Bootstrap

- [ ] Confirm the AWS account and `us-east-2` as the application region.
- [ ] Bootstrap CDK:

  ```sh
  AWS_PROFILE=mine npx cdk bootstrap aws://<account-id>/us-east-2
  ```

- [ ] Deploy the delivery-bootstrap stack using the controlled owner identity.
- [ ] Record stack outputs needed by GitHub environments.

### Validation

- [ ] `CDKToolkit` is healthy in `us-east-2`.
- [ ] OIDC provider thumbprints/audience are correct.
- [ ] Release ECR tag immutability is enabled.
- [ ] Release bucket versioning, encryption, TLS enforcement, and block-public-access are enabled.
- [ ] IAM Access Analyzer finds no unintended public or cross-account access.

### Exit criteria

- GitHub can request environment-scoped short-lived credentials.
- No long-lived AWS key is required by Actions.
- Release storage exists and is protected.

## Phase 4 — Configure DNS and certificates under `joedodge.dev`

The parent `joedodge.dev` zone already exists in Route 53, so no external registrar delegation is required for the planned subdomains.

### Preview DNS

- [ ] Create a Route 53 child hosted zone for `preview.trico.joedodge.dev`, or use the parent zone directly.
- [ ] Prefer a child zone to limit the preview role's DNS authority.
- [ ] If using a child zone, publish its NS records into hosted zone `Z075904012SAHP4DLL38X`.
- [ ] Configure the preview foundation with:
  - `previewZoneName=preview.trico.joedodge.dev`
  - The child hosted-zone ID
- [ ] Confirm `pr-<number>.preview.trico.joedodge.dev` can be created without authority over unrelated `joedodge.dev` records.

### Development certificate and DNS

- [ ] Request an ACM certificate in `us-east-1` for `dev.trico.joedodge.dev`.
- [ ] Complete DNS validation in Route 53.
- [ ] Create or select the hosted zone that will own `dev.trico.joedodge.dev`.
- [ ] Record:
  - Certificate ARN
  - Hosted-zone ID
  - Hosted-zone name
  - Final public origin

### Optional staging

- [ ] Decide whether staging is necessary after dev soak.
- [ ] Do not create staging merely to duplicate development without a distinct approval or data purpose.

### Exit criteria

- Development certificate is issued.
- Preview zone is delegated and resolvable.
- Preview role has authority only inside the preview child zone.
- No `tricoinc.com` DNS record has changed.

## Phase 5 — Configure SES and editor identity

### Email infrastructure

- [ ] Choose the sending identity.
  - Infrastructure hostnames may use `joedodge.dev`.
  - Employee registration may continue to require `@tricoinc.com` if that remains the business rule.
- [ ] Verify the SES domain identity in `us-east-2`.
- [ ] Publish DKIM records.
- [ ] Publish or confirm SPF alignment.
- [ ] Publish or confirm DMARC policy.
- [ ] Request SES production access if the account is in the sandbox.
- [ ] Decide the production `EMAIL_FROM` address.
- [ ] Test verification and password-reset delivery.

### Editor credentials

- [ ] Select the initial dev editor email.
- [ ] Generate a unique strong password.
- [ ] Store the password only as a protected GitHub environment secret.
- [ ] Document credential rotation and account recovery.

### Exit criteria

- SES identity is verified.
- Test email reaches the intended mailbox and passes authentication checks.
- Development can seed and authenticate the initial editor.

## Phase 6 — Deploy the preview foundation

### Deployment

- [ ] Deploy `FullstackTsPreviewFoundation` with:
  - Application name `trico-web`
  - Preview zone `preview.trico.joedodge.dev`
  - Correct preview hosted-zone ID
- [ ] Capture outputs:
  - Cluster ARN
  - Public subnet IDs
  - Task security-group ID
  - Preview ECR repository names/URIs
  - Lifecycle table name
  - Log-group name
  - Task role ARNs
  - Reviewer secret ARN
  - Preview zone ID/name
- [ ] Confirm retained-resource and cleanup expectations.

### Security validation

- [ ] Confirm only ports 80 and 443 are publicly reachable.
- [ ] Confirm DynamoDB Local, MinIO, Mailpit, and backend ports are not public.
- [ ] Confirm the task role has no unnecessary AWS data permissions.
- [ ] Confirm preview logs retain only the intended period.
- [ ] Confirm ECR repositories are immutable and scan on push.

### Exit criteria

- Preview foundation stack is healthy.
- All outputs required by the preview workflow are available.
- No per-PR task or DNS record exists before a PR is admitted.

## Phase 7 — Configure GitHub environments and repository governance

### `preview` environment

Configure variables:

- [ ] `AWS_REGION=us-east-2`
- [ ] `PREVIEW_DEPLOY_ROLE_ARN`
- [ ] `PREVIEW_BACKEND_REPOSITORY`
- [ ] `PREVIEW_FRONTEND_REPOSITORY`
- [ ] `PREVIEW_FOUNDATION_STACK=FullstackTsPreviewFoundation`

### `dev` environment

Configure variables:

- [ ] `AWS_REGION=us-east-2`
- [ ] `APPLICATION_DEPLOY_ROLE_ARN`
- [ ] `BACKEND_REPOSITORY_URI`
- [ ] `RELEASE_ARTIFACT_BUCKET`
- [ ] `PUBLIC_ORIGIN=https://dev.trico.joedodge.dev`
- [ ] `CUSTOM_DOMAIN=dev.trico.joedodge.dev`
- [ ] `HOSTED_ZONE_ID`
- [ ] `HOSTED_ZONE_NAME`
- [ ] `CLOUDFRONT_CERTIFICATE_ARN`
- [ ] `SES_IDENTITY_DOMAIN`
- [ ] `BEDROCK_MODEL_ID`
- [ ] `REVIEWER_EMAIL`

Configure secrets:

- [ ] `REVIEWER_PASSWORD`

### `prod` environment

- [ ] Create the environment now but do not configure a production hostname until approved.
- [ ] Require one or more named reviewers.
- [ ] Restrict deployment to the protected default branch.
- [ ] Configure independent production credentials and resource names.
- [ ] Do not reuse the dev editor password.

### Repository rules

- [ ] Protect `main`.
- [ ] Require pull requests.
- [ ] Require conversation resolution.
- [ ] Require `factory/code`.
- [ ] Require `factory/preview` once live preview is stable.
- [ ] Prevent force pushes and deletion.
- [ ] Decide whether administrators are also bound by the rule.
- [ ] Define the maintainer policy for the `preview-approved` label.

### Exit criteria

- GitHub environments exist with least-privilege OIDC roles.
- Production requires approval.
- Main cannot receive an unverified direct push.

## Phase 8 — Prove the complete PR-preview lifecycle

### First preview

- [ ] Open a controlled pull request.
- [ ] Confirm candidate checks run without AWS credentials.
- [ ] Confirm admission checksums and repository/run identity are validated.
- [ ] Confirm images are pushed and resolved to digests.
- [ ] Confirm one tagged Fargate task starts.
- [ ] Confirm the lifecycle row is written.
- [ ] Confirm the DNS record resolves:

  ```text
  pr-<number>.preview.trico.joedodge.dev
  ```

- [ ] Confirm HTTPS succeeds.
- [ ] Confirm `/api/v1/health` reports healthy.
- [ ] Confirm the canonical Cucumber and Playwright adapters pass remotely.
- [ ] Confirm editor access works.
- [ ] Confirm Mailpit requires authentication.

### Replacement and cleanup

- [ ] Push a second commit and prove the old generation is retired.
- [ ] Confirm the DNS record points only to the current generation.
- [ ] Confirm the old task definition is deregistered.
- [ ] Close the PR and confirm cleanup.
- [x] Run another preview through four-hour expiry and confirm scheduled cleanup.
  - Verified 2026-09-23 UTC for PR #14 generation `preview-1362078393-14-2`: its fixed expiry was `2026-09-23 20:53:03.287 UTC`; scheduled sweep run [35921330922](https://github.com/josephdodge8141/trico-web/actions/runs/35921330922) started at `21:15:48 UTC` and completed the sweep at `21:17:26 UTC`.
  - At completion, lifecycle state `state#1362078393#14` had no active or retiring generation. The generation receipt was terminal `cleaned` with `expiresAt=1790803045` (`2026-09-30 21:17:25 UTC`, seven-day TTL). Its ECS task stopped at `21:17:19.895 UTC` with reason `expired`; the task definition was `INACTIVE`; ENI `eni-0733c7126c3bf22f6`, the Route 53 record, and public DNS were absent. No manual deletion was performed.
  - This verifies scheduled four-hour expiry cleanup for this generation only; it does not complete the other Phase 8 lifecycle checks.
- [ ] Inspect for orphaned:
  - ECS tasks
  - Task definitions
  - ENIs
  - DNS records
  - DynamoDB state rows
  - ECR tags beyond intended retention

### Exit criteria

- Launch, replacement, closure, failure, and expiry are proven in AWS.
- No cleanup path depends on manually deleting resources.

## Phase 9 — Deploy and soak development

### First development deployment

- [ ] Merge the verified workflow/application changes to `main`.
- [ ] Confirm the application workflow publishes:
  - Backend image tagged by exact main SHA
  - Backend immutable digest
  - Frontend archive under `releases/<sha>/`
- [ ] Deploy `TricoWeb-dev`.
- [ ] Run checksum-safe bootstrap.
- [ ] Upload static frontend assets.
- [ ] Complete CloudFront invalidation.
- [ ] Verify all six public routes.
- [ ] Verify protected editor login.

### Functional soak

- [ ] Verify registration policy and email verification.
- [ ] Verify password reset.
- [ ] Verify sessions and CSRF/origin enforcement.
- [ ] Verify edit, preview, publish, history, and rollback.
- [ ] Verify managed media upload and serving.
- [ ] Verify versioned public content manifests.
- [ ] Verify all public forms and local/client-only behavior as designed.
- [ ] Keep external MLS/LoopNet synchronization disabled.
- [ ] Observe Lambda errors, throttles, duration, and concurrency.
- [ ] Observe DynamoDB and S3 access patterns and costs.
- [ ] Confirm no secrets are emitted into logs or artifacts.

### Exit criteria

- Development is stable through a representative editing and publishing cycle.
- Email, authentication, publication, media, and rollback work on AWS.
- Actual cost and operational behavior are understood.

## Phase 10 — Add operational readiness

### Monitoring and alerting

- [ ] Create an SNS topic or selected notification integration.
- [ ] Attach notification actions to Lambda error and throttle alarms.
- [ ] Add API Gateway 4xx/5xx and latency alarms.
- [ ] Add CloudFront error-rate alarms.
- [ ] Add preview-cleanup failure notification.
- [ ] Create a small CloudWatch dashboard.
- [ ] Decide whether to enable CloudFront and API access logs.
- [ ] Define log retention by environment.

### Cost controls

- [ ] Create a monthly AWS budget.
- [ ] Create a cost-anomaly monitor.
- [ ] Tag all owned resources by application, environment, and scope.
- [ ] Validate preview expiry and ECR cleanup prevent unbounded cost.

### Security controls

- [ ] Review IAM policies with Access Analyzer.
- [ ] Review CloudTrail events from the first preview and development deployments.
- [ ] Confirm account-level CloudTrail is enabled.
- [ ] Decide whether GuardDuty/Security Hub are account requirements.
- [ ] Add dependency and container vulnerability review.
- [ ] Decide whether CloudFront WAF/rate limiting is needed.
- [ ] Configure API throttling appropriate to the site.
- [ ] Define editor credential rotation.

### Recovery

- [ ] Document RPO and RTO.
- [ ] Restore a DynamoDB backup into a temporary table.
- [ ] Recover an earlier S3 object version.
- [ ] Redeploy a previous tested SHA.
- [ ] Verify frontend and backend rollback together.
- [ ] Define backup retention.
- [ ] Record recovery evidence.

### Runbooks

- [ ] Preview failure and manual cleanup.
- [ ] Development deployment failure.
- [ ] Production rollback.
- [ ] DNS/certificate failure.
- [ ] SES delivery failure.
- [ ] Editor account recovery.
- [ ] Data restore.
- [ ] Security incident and credential revocation.

### Exit criteria

- Alarms reach a responsible person.
- Cost alerts are active.
- Rollback and restore are demonstrated, not merely documented.

## Phase 11 — Evaluate external synchronization

Do not enable EventBridge synchronization merely because the schedule exists.

- [ ] Mount the remaining field-level source/manual override controls in the Real Estate editor.
- [ ] Select and validate a Bedrock model in `us-east-2`.
- [ ] Confirm model and managed web-search availability and permissions.
- [ ] Test bounded execution, retries, validation, and manual overrides.
- [ ] Confirm a failed source refresh cannot overwrite approved manual content.
- [ ] Add monitoring and cost limits.
- [ ] Enable first in development only.
- [ ] Complete a dev soak before considering production.

## Phase 12 — Prepare production without changing TriCo DNS

- [ ] Decide the eventual production domain.
- [ ] Create the production ACM certificate in `us-east-1`.
- [ ] Verify production SES identity and sending access.
- [ ] Configure the protected `prod` GitHub environment.
- [ ] Deploy `TricoWeb-prod` using a temporary validation hostname if appropriate.
- [ ] Promote an exact development-tested SHA.
- [ ] Run the production smoke suite.
- [ ] Exercise rollback before public cutover.
- [ ] Take and verify the pre-cutover backup.

Do not alter the existing Wix-hosted `tricoinc.com` records in this phase.

## Phase 13 — Separate production-domain cutover

This phase requires its own approved change plan after the AWS production environment is proven.

- [ ] Inventory current Wix records and site dependencies.
- [ ] Decide whether to migrate the whole DNS zone or change only root/`www` records.
- [ ] Preserve Microsoft 365 MX and related email records.
- [ ] Reduce DNS TTL before cutover.
- [ ] Define the Wix fallback window.
- [ ] Freeze content or reconcile final content changes.
- [ ] Take final backups.
- [ ] Change production DNS.
- [ ] Monitor CDN, API, authentication, editor, email, and publishing.
- [ ] Retain a rapid DNS rollback path until the acceptance window closes.

## Final acceptance checklist

Infrastructure is complete only when:

- [ ] A clean checkout passes the complete repository gate.
- [ ] Every pull request can receive a controlled preview.
- [ ] Preview replacement, closure, failure, and expiry leave no orphaned resources.
- [ ] Merge to `main` deploys development automatically.
- [ ] Production promotes the same immutable artifacts tested in development.
- [ ] GitHub uses short-lived OIDC credentials only.
- [ ] `main` and `prod` are protected.
- [ ] DNS and certificates are validated.
- [ ] SES delivery and domain authentication are validated.
- [ ] Monitoring reaches a human.
- [ ] Cost alerts are active.
- [ ] Backup restore and release rollback have been demonstrated.
- [ ] External synchronization is either proven or intentionally disabled.
- [ ] No `tricoinc.com` production change occurs without a separate approved cutover plan.

## Required owner decisions

- [ ] Confirm `us-east-2` as the application and preview region.
- [ ] Confirm `pr-<number>.preview.trico.joedodge.dev` as the preview convention.
- [ ] Confirm `dev.trico.joedodge.dev` as the shared development URL.
- [ ] Select the initial editor email.
- [ ] Select alert recipients.
- [ ] Select production approvers.
- [ ] Decide whether staging has a distinct purpose.
- [ ] Decide whether external synchronization is required for initial launch.
- [ ] Defer or select the eventual production domain.
