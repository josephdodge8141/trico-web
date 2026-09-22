# Preview operations

The trusted `pull_request_target` workflow definition checks the exact head SHA and builds backend/frontend OCI archives without deployment credentials. Its artifact contains the candidate SHA, immutable repository ID and PR number. The trusted `workflow_run` job checks out reviewed default-branch control code, verifies the artifact/run identity, assumes a preview-environment OIDC role, and may load and push the images without running them.

Required GitHub `preview` environment variables are:

- `AWS_REGION`
- `PREVIEW_DEPLOY_ROLE_ARN`
- `PREVIEW_BACKEND_REPOSITORY`
- `PREVIEW_FRONTEND_REPOSITORY`
- `PREVIEW_FOUNDATION_STACK`
- `ALERT_TOPIC_ARN`

The OIDC role must accept only this immutable repository and the reviewed trusted workflow context. It permits immutable pushes only to the two foundation repositories plus narrowly scoped ECS task, lifecycle-table, log, ENI-inspection, secret-read, and hosted-zone record operations. Foundation deployment uses a separate owner role.

Fork candidates run the credential-free checks but are admitted only after a maintainer adds the `preview-approved` label.

The trusted job invokes the typed lifecycle controller and AWS provider. They persist state before effects, start a generation-tagged Fargate task from digest-pinned images, store a separate generation receipt, publish the generation-owned DNS value, wait for health, and then record the fixed four-hour expiry. The workflow runs the canonical frontend Cucumber adapter and Compose Playwright suite against the deployed URL and publishes `factory/preview` success only after those checks pass. The permanent preview secret contains the reviewer email and password, and Mailpit is exposed only through Caddy basic authentication.

Lifecycle state preserves the immutable repository ID, PR number, admitted revision, ordered commands, deterministic generations, health and expiry. Each generation receipt preserves the task definition, task ARN, DNS value, status and cleanup TTL. Close, replacement, startup timeout and four-hour expiry use the same generation-checked provider path; uncertain startup remains recorded and scheduled reconciliation retries it.
