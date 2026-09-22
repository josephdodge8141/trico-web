# Compose preview contract

Docker Compose is the only application-maintained container and dependency description. The preview compiler consumes `docker compose config --format json`, validates the normalized result, and applies only the documented `x-preview` extension. It never prints expanded secret values or silently ignores behavior-changing fields.

Version one supports exactly one frontend, one backend and one Caddy router, plus explicitly supported dependency and one-shot containers. All containers share one Fargate task network namespace, so their listening ports must be unique. Caddy alone exposes ports 80 and 443. Local bind mounts and development commands must be explicitly removed or replaced for preview builds.

The extension may identify roles and routes, health/startup interpretation, production build targets or commands, local-only fields, internal endpoint overrides and whole-task resources. It is not a second service manifest and cannot contain arbitrary deployment hooks.

Privileged containers, Docker socket or host device mounts, host/PID assumptions, custom overlay networking, unresolved secret references, application scaling and unsupported Compose fields fail before cloud mutation. Startup/readiness checks are distinct from ongoing liveness checks; readiness loss alone must not restart a stateful dependency such as DynamoDB Local or MinIO.

Named application volumes are task-lifetime storage. Certificate storage is a separately owned platform concern. Production and application data durability are outside this contract.
