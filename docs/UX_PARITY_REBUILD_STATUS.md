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
- `716392e` adds all 18 strict Home version-2 contracts and semantic
  seeds, deterministic migration preflight/reporting, and the shared novice
  editor primitives. The editor uses friendly forms in a desktop side sheet or
  full-screen mobile sheet and never renders JSON or technical identifiers.
- `8e0cee7` adds opaque, user-bound managed-media upload reservations, constrained
  confirmation, paginated media listing, field-level source overrides, and the
  novice media/source controls. The controls remain unmounted until a page field
  that consumes them is integrated.
- `00e96f6` replaces the generic Home rendering with the dedicated mounted
  composition, all 18 visual/editor boundaries, bundled imagery, responsive
  styling, and the restored client-only resume form.
- The current coordinator checkpoint hydrates persisted preview visibility and
  the signed-in editor identity so other editors' pending sections lock instead
  of being presented as the current editor's work.

Focused verification at this checkpoint:

- Schemas build passed.
- Home contract and migration tests passed: 18/18.
- Backend build passed.
- Backend Cucumber passed: 42/42 scenarios and 268/268 steps.
- Root `npm run check` passed with 102 canonical cases.
- Frontend unit tests passed: 21/21.
- Frontend browser tests passed: 11/11.
- Compose frontend Cucumber passed: 13/13 scenarios and 83/83 steps.
- Compose Playwright passed: 6/6.
- Backend Cucumber passed: 46/46 scenarios and 290/290 steps.
- All 51 visual captures are uniquely cataloged, checksum-valid, decodable,
  nonzero, and covered by the frozen visual-baseline harness.

## Intentionally incomplete

- The other 177 entities still use legacy contracts and seeds.
- Home uses the collection primitives and exposes item controls, but the full
  add/delete/Undo/reorder/conflict matrix still needs dedicated browser cases.
- Media and source controls are implemented but not mounted in a page editor.
- Property Management, Real Estate, Construction, Storage, and Development still
  use the generic renderer and legacy contracts (177 entities remain).
- Form-state and edit-mode visual references still need capture.
- Independent browser-only review could not start because the Mac locked; rerun
  it after unlocking rather than accepting the implementation agent's review.
- A same-millisecond publication-history ordering flake surfaced once during the
  media slice. It passed unchanged on rerun but remains a real ordering gap to fix.
- The existing local DynamoDB volume contains version-1 Home data. The idempotent
  seed correctly refuses it; run the explicit disposable-local v2 reset only when
  preserving that local content is no longer required.

## Exact restart sequence

1. Confirm the branch is clean and starts at the latest checkpoint documented by
   `git log`, then run `npm run check`.
2. Unlock the Mac and rerun the independent browser-only Home review.
3. Add dedicated Home browser cases for add/edit/delete/Undo/reorder, empty lists,
   other-editor ownership, conflict retention, and persisted preview visibility.
4. Mount the media library in Home's logo/leadership image fields; source controls
   wait for the first Real Estate listing editor.
5. Fix deterministic publication-history ordering, then begin the other five
   page-owned contract/composition waves.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
