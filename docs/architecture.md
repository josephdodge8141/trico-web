# TriCo architecture

TriCo is one React application backed by one runtime-neutral TypeScript domain. Express runs the domain locally and in ECS previews; an API Gateway Lambda image runs the same domain in `dev` and `prod`. Shared Zod contracts remain the only structured application contract.

Public content is a versioned manifest plus immutable page JSON in S3-compatible storage. Editors use authenticated `/api/v1` endpoints. DynamoDB stores identity, sessions, entities, pending changes, preferences, external sources, publication snapshots, operations and site state in one environment-specific table with one overloaded GSI.

`compose.yaml` is the source for local and preview container topology. Local dependencies are DynamoDB Local, MinIO and Mailpit; the one-shot `seed` container runs only after durable dependencies are healthy. Mailpit has no published port and is reachable only through Caddy's basic-authenticated `/__mailpit/` route.

CDK has two distinct responsibilities:

- `FullstackTsPreviewFoundation` synthesizes retained shared network, ECS, ECR, lifecycle-state and DNS references. It contains no per-PR task or record.
- `TricoWeb-dev` and `TricoWeb-prod` synthesize isolated Lambda/API Gateway, DynamoDB, S3/CloudFront, EventBridge, SES/Bedrock IAM, logs and alarms. Backend images must be supplied by immutable ECR digest.

The pure lifecycle reducer and controller persist generation ownership before effect execution. The checked-in Compose compiler validates normalized Compose and rejects unsupported or dangerous semantics. The AWS effect provider that turns those effects into ECS tasks and owned Route 53 records remains an explicit delivery gap; workflows fail rather than imply a live preview.
