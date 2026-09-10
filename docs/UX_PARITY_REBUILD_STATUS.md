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
- `fc5ddd1` adds the frozen baseline manifest and offline verification harness,
  including hashes, dimensions, route/state coverage, viewport and tiled-capture
  geometry, approved masks/corrections, and luminance SSIM checks.
- The next checkpoint adds all 18 strict Home version-2 contracts and semantic
  seeds, deterministic migration preflight/reporting, and the shared novice
  editor primitives. The editor uses friendly forms in a desktop side sheet or
  full-screen mobile sheet and never renders JSON or technical identifiers.

Focused verification at this checkpoint:

- Schemas build passed.
- Home contract and migration tests passed: 18/18.
- Backend build passed.
- Backend Cucumber passed: 42/42 scenarios and 268/268 steps.
- Frontend unit tests passed: 14/14.
- Frontend browser tests passed: 8/8.
- Compose frontend Cucumber passed: 12/12 scenarios and 76/76 steps.
- Compose preview Playwright passed: 2/2.
- All 51 visual captures are uniquely cataloged, checksum-valid, decodable,
  nonzero, and covered by the frozen visual-baseline harness.

## Intentionally incomplete

- The other 177 entities still use legacy contracts and seeds.
- Collection primitives exist, but Home has not yet integrated or browser-proven
  item add/edit/delete/undo/reorder, empty-list Add, and conflict recovery.
- The managed media library and source-field overrides have not started.
- No public page has been replaced with the dedicated parity composition yet.
- Form-state and edit-mode visual references still need capture.

## Exact restart sequence

1. Confirm the branch is clean and starts at the latest checkpoint documented by
   `git log`, then run `npm run check`.
2. Build the dedicated Home composition from the version-2 Home definitions and
   seeds, using the frozen Lovable references as the visual target.
3. Integrate every Home entity with `EditableBoundary`, `EditableCollection`,
   and `EditableItem`; restore the client-only resume form.
4. Prove Home add/edit/delete/undo/reorder, private preview, accessibility, and
   visual parity, then capture Home form and edit-mode reference states.
5. Only after that vertical slice passes, begin the other five page-owned
   contract/composition waves and the shared media/source slice.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
