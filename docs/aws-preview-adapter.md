# AWS preview adapter boundary

The permanent CDK preview foundation owns a public-subnet VPC without NAT, ECS cluster, task security group, immutable frontend/backend ECR repositories, retained lifecycle table, retained logs, a generated reviewer credential secret, bounded execution/runtime roles and a reference to an existing Route 53 child zone. It intentionally owns no pull-request task definition, running task, service or DNS record.

`infra/runtime/compose.ts` compiles already-normalized `docker compose config --format json` data into a bounded role-aware model. It rejects privileged/host capabilities, unknown fields, host mounts and published ports outside Caddy before provider mutation. The AWS provider replaces local build entries and local volumes with admitted immutable image digests and task-lifetime storage.

`infra/runtime/controller.ts` loads state by immutable repository ID and pull request, applies the lifecycle reducer, performs compare-and-swap persistence, and only then executes idempotent effects. Its due-deadline helper binds sweeper work to the exact generation. Provider failure leaves persisted required work available to `reconcile`; it is never success.

`infra/runtime/aws-preview.ts` implements the AWS effect boundary with these controls:

1. Resolve only the emitted cluster, public subnets, security group, task roles, reviewer secret, ECR repositories, lifecycle table and hosted zone.
2. Register a nonprivileged, bounded Fargate task from the compiled Compose model, tag every resource with repository ID, PR and generation, and start exactly one task with a public IP.
3. Persist a generation receipt before DNS mutation, resolve the task ENI, and create only the generation-owned record.
4. Observe the public health route before emitting `healthy`; startup uncertainty must schedule cleanup.
5. During cleanup, verify all ownership tags, remove the exact DNS record, stop and confirm the task, then deregister its task definition before emitting `cleanup-complete`.
6. Sweep due states through generation-bound deadline/reconcile commands and never infer success from absent or uncertain resources.

`trusted-preview.yml` verifies the unprivileged artifact identity, requires the `preview-approved` label for forks, resolves only foundation outputs, pushes immutable image digests and invokes the controller CLI. `preview-cleanup.yml` invokes the same CLI for close and scheduled sweep commands. DynamoDB TTL removes completed state and old receipts only as a storage backstop; scheduled reconciliation remains the authoritative lifecycle mechanism.
