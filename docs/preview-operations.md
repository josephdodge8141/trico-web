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

## AIStor Free license

The local and ECS preview object store uses the digest-pinned official AIStor image in single-node mode. Obtain an AIStor Free license from [MinIO](https://www.min.io/pricing) and save the downloaded `minio.license` outside version control. For local Compose, place it at `.secrets/aistor.license` or set `AISTOR_LICENSE_FILE` to its path. The `.secrets` directory is ignored by Git and excluded from Docker build contexts. The object store will not become healthy without a valid license.

The permanent preview foundation creates `PreviewAistorLicenseSecretArn` and grants read access only to the ECS task execution role. After deploying that foundation, load the license file into the secret through a trusted operator session:

```sh
foundation_stack=FullstackTsPreviewFoundation
license_secret_arn="$(aws cloudformation describe-stacks --stack-name "$foundation_stack" --query "Stacks[0].Outputs[?OutputKey=='PreviewAistorLicenseSecretArn'].OutputValue | [0]" --output text)"
test -n "$license_secret_arn" && test "$license_secret_arn" != None
aws secretsmanager put-secret-value --secret-id "$license_secret_arn" --secret-string "file://$PWD/.secrets/aistor.license" >/dev/null
```

The trusted preview workflow passes only the secret ARN to ECS. ECS injects the license into the AIStor container, which writes a private temporary license file before starting the server. The workflow fails before task launch if the foundation has no license secret output. Never put the token in a repository file, GitHub variable, task definition environment entry, or workflow log.

Fork candidates run the credential-free checks but are admitted only after a maintainer adds the `preview-approved` label.

The trusted job invokes the typed lifecycle controller and AWS provider. They persist state before effects, start a generation-tagged Fargate task from digest-pinned images, store a separate generation receipt, publish the generation-owned DNS value, wait for health, and then record the fixed four-hour expiry. The workflow runs the canonical frontend Cucumber adapter and Compose Playwright suite against the deployed URL and publishes `factory/preview` success only after those checks pass. The permanent preview secret contains the reviewer email and password, and Mailpit is exposed only through Caddy basic authentication.

Lifecycle state preserves the immutable repository ID, PR number, admitted revision, ordered commands, deterministic generations, health and expiry. Each generation receipt preserves the task definition, task ARN, DNS value, status and cleanup TTL. Close, replacement, startup timeout and four-hour expiry use the same generation-checked provider path; uncertain startup remains recorded and scheduled reconciliation retries it.

## Scheduled-expiry acceptance exercise

Keep one controlled pull request open after `factory/preview` succeeds. Do not push a replacement commit or close the pull request during the four-hour lifetime. After the fixed expiry passes and the scheduled cleanup workflow runs, verify that the lifecycle state has no active or retiring generation and that the generation receipt records successful cleanup. Also verify that the ECS task is stopped, its task definition is deregistered, its ENI and Route 53 record are gone, and no manual deletion was required. A later commit may admit a fresh generation for the same still-open pull request.
