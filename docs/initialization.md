# Initialization

## Local

No AWS credentials are needed locally. Start the application with:

```sh
docker compose up --build
```

Open `http://app.localhost:8088` for the site and `http://app.localhost:8088/__mailpit/` for captured email. The local Mailpit basic-auth credentials are `local-editor` / `local-mailpit-password`; they protect only disposable local email and must never be reused in a deployed environment.

The seed service invokes `backend/dist/bootstrap.js` with `BOOTSTRAP_MODE=seed-if-empty`. It must be idempotent and must refuse to overwrite nonmatching existing state. DynamoDB and MinIO named volumes persist across ordinary restarts; `docker compose down --volumes` deliberately removes them.

## AWS synthesis

Install the locked dependencies and run `npx cdk synth --quiet`. This creates templates for the preview foundation plus dev and production application stacks without account lookup. The example application image and domains are syntactically valid placeholders and are not deployable artifacts.

For an environment-specific application synthesis, supply an immutable backend image digest and deployment configuration:

```sh
npx cdk synth TricoWeb-dev --quiet \
  -c application:dev:backendImageUri=111111111111.dkr.ecr.us-east-1.amazonaws.com/trico-web-backend@sha256:REPLACE_WITH_64_HEX \
  -c application:dev:publicOrigin=https://dev.example.com \
  -c application:dev:sesIdentityDomain=example.com \
  -c application:dev:bedrockModelId=REPLACE_WITH_MODEL_ID
```

Synthesis does not verify SES identity, Bedrock availability, DNS, IAM enrollment or deploy resources.
