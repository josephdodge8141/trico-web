# TriCo web

TriCo's public website and authenticated in-page content editor, migrated onto the opinionated `fullstack-ts` foundation.

The repository contains one React application, a runtime-independent backend exposed through Express or Lambda, shared strict Zod contracts, canonical Cucumber behavior, DynamoDB persistence, immutable S3/MinIO content releases, and CDK infrastructure. The canonical registry contains 195 editable entities across six pages; forms remain client-only and outside the CMS.

## Local preview

Requirements: Node.js 24–26, npm, and Docker.

```sh
npm ci
npm run check
docker compose up --build --wait
```

Open [http://app.localhost:8088](http://app.localhost:8088). The idempotent seed job creates the table and bucket, loads all entities, five external listing mappings, 51 supplied media assets, six initial page publications, the first immutable manifest, and the local reviewer account:

- Email: `editor@tricoinc.com`
- Password: `local-preview-password`

Mailpit is available behind local Caddy basic authentication at [http://app.localhost:8088/__mailpit/](http://app.localhost:8088/__mailpit/). The local credentials are documented in [docs/preview-operations.md](docs/preview-operations.md).

Run the deployed Compose acceptance adapters while the stack is healthy:

```sh
npm run test:behaviors:frontend:compose
npm run test:browser:compose -w @app/frontend
```

Stop the stack with `docker compose down`. Add `--volumes` only when intentionally discarding local preview data.

## Verification

`npm run check` is the required credential-free repository gate. It builds every workspace; checks formatting, lint, TypeScript, instructions, and source boundaries; executes contract, backend, frontend, browser, infrastructure, and exact behavior-accounting tests; and synthesizes CDK.

Additional proofs:

```sh
npm run proof:clean-clone
npm run proof:docker
```

## Architecture and delivery

- [Architecture](docs/architecture.md)
- [Migration ledger](docs/migration-ledger.md)
- [Initialization and bootstrap](docs/initialization.md)
- [Preview operations](docs/preview-operations.md)
- [AWS preview adapter](docs/aws-preview-adapter.md)
- [Dev and production delivery](docs/production.md)

The original migration ZIP is intentionally not committed. Normalized seeds, input checksums, exclusions, missing-image metadata, and approved cleanup decisions are checked in under `packages/zod/seeds` and `docs/migration-ledger.md`.
