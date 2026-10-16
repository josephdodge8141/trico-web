# Catalog workflow delivery

Baseline: `cbb686db89c1e4ee3517543956c459f618918598`. Hard limits: 1,000 new lines and 3,000 existing lines changed, including tests, configuration, documentation, and lockfiles.

Run `npm run catalog:budget -- cbb686db89c1e4ee3517543956c459f618918598`. Contiguous replacement blocks count removed lines as changed and surplus additions as new. Unrelated deletions cannot offset additions. The checker includes untracked, nonignored files.

Delivered: URL-backed listing categories and combined filters, accessible shared galleries, managed-property address fields, a canonical manually authored lease collection projected into both divisions, storage directory editors, referral inquiry prefill, and construction project routes without public owner information.

Lease and directory collections start empty. Hidden drafts stay out of new public artifacts. Lease approval requires real details, a managed photo, contact destination, and pricing. Lease publication and Property Management rollback rebuild the Real Estate projection in the same manifest operation. The original 35-entity Property Management v1 migration ledger stays historical.

Run the existing local dev mirror with `docker compose -p trico-dev-mirror -f compose.yaml -f compose.dev.yaml up -d --build`. It uses port 18091 and preserves named volumes. Production uses a different project and is not changed.

The full plan is incomplete. Licensed MLS discovery, photo ingestion, sync controls, local MCP pairing/tools, and the versioned catalog migration/report tooling remain. They are estimated to require another 800–1,200 new lines including dependency changes, exceeding this branch's remaining allowance. Feed pricing, identifiers, authorized access, and photo/display terms must also be confirmed. Box-N-Lock assets/destination and real facility/project content still need confirmation. No sidebar chatbot or remote deployment is included.

Validation: root CI checks and the four focused live-local browser scenarios pass. Browser review verified hidden lease draft saving, approval blocking, and draft removal. The separate schema suite has one pre-existing Development partner-count failure: its test expects six entries but the unchanged seed contains zero. No new test cases were added.
