# UX parity rebuild status

Last updated: 2026-09-10

## Completed checkpoints

- `3093496` fixes unauthenticated edit-mode routing and pending preview rendering.
- `7a652a1` adds the shared semantic editor-contract foundation:
  browser-safe control metadata, object/list editor definitions, render-slot catalog
  contracts, partial/complete validation, and canonical behavior accounting.
- `ac2ac36` freezes 51 original Lovable visual-reference captures for all six
  primary pages at desktop, tablet, and mobile sizes plus key menu, listing, and
  FAQ states. The browser emitted JPEG data, so the committed files use `.jpg`.

Focused verification at this checkpoint:

- Schemas build passed.
- TriCo contract tests passed: 9/9.
- Backend build passed.
- Backend Cucumber passed: 42/42 scenarios and 268/268 steps.
- All 51 visual captures have valid, nonzero image dimensions.

## Intentionally incomplete

- The baseline manifest, checksums, masks, intentional-correction ledger, and
  offline geometry/SSIM comparison harness have not been implemented.
- Page-specific strict schemas, semantic version-2 seeds, and migration tooling
  have not started.
- The novice editor boundaries, side sheet, generated forms, item controls,
  media library, and source-field overrides have not started.
- No public page has been replaced with the dedicated parity composition yet.
- Form-state and edit-mode visual references still need capture.

## Exact restart sequence

1. Confirm the branch is clean and starts at `ac2ac36` or a later checkpoint.
2. Complete the frozen-baseline manifest and offline comparison harness using
   `frontend/visual-baselines/2026-09-10` as immutable input.
3. Implement deterministic version-2 migration tooling and one page-owned
   semantic module for Home using the contracts exported by `@app/schemas`.
4. Build the Home vertical slice: dedicated original-style composition,
   `EditableBoundary`, `EditableCollection`, `EditableItem`, responsive editing
   sheet, and schema-driven form controls.
5. Prove Home add/edit/delete/undo/reorder, private preview, accessibility, and
   visual parity before starting parallel division-page agents.

The local Docker stack is intentionally stopped at this checkpoint. Start it
with `docker compose up --build -d` from the repository root when work resumes.
