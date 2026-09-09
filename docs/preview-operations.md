# Preview operations

The trusted `pull_request_target` workflow definition checks the exact head SHA and builds backend/frontend OCI archives without deployment credentials. Its artifact contains the candidate SHA, immutable repository ID and PR number. The trusted `workflow_run` job checks out reviewed default-branch control code, verifies the artifact/run identity, assumes a preview-environment OIDC role, and may load and push the images without running them.

Required GitHub `preview` environment variables are:

- `AWS_REGION`
- `PREVIEW_DEPLOY_ROLE_ARN`
- `PREVIEW_BACKEND_REPOSITORY`
- `PREVIEW_FRONTEND_REPOSITORY`
- `PREVIEW_FOUNDATION_STACK`

The OIDC role must accept only this immutable repository and the reviewed trusted workflow context. It permits immutable pushes only to the two foundation repositories plus narrowly scoped ECS task, lifecycle-table, log, ENI-inspection, secret-read, and hosted-zone record operations. Foundation deployment uses a separate owner role.

Fork candidates run the credential-free checks but are admitted only after a maintainer adds the `preview-approved` label.

The trusted job starts a generation-tagged Fargate task, stores its ownership and four-hour expiry, publishes the generation-owned DNS value, waits for health, and then runs the canonical frontend Cucumber adapter and Compose Playwright suite against the deployed URL. It publishes `factory/preview` success only after those checks pass; any failure publishes a failing status. The permanent preview secret contains the reviewer email and password, and Mailpit is exposed only through Caddy basic authentication.

The ownership record preserves `candidateSha`, reviewed `controlSha`, workflow run/attempt, immutable repository ID, PR number, deterministic generation, task definition, task ARN, DNS value, status, and expiry. Close, replacement, and four-hour expiry use the same generation-checked cleanup path; uncertain startup remains recorded and therefore eligible for the scheduled expiry cleanup.
