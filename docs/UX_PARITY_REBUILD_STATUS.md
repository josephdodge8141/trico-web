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
- `5c98efb` hydrates persisted preview visibility and
  the signed-in editor identity so other editors' pending sections lock instead
  of being presented as the current editor's work.
- The current Home editor-matrix checkpoint exercises real add, edit, delete,
  Undo, reorder, empty-list, cross-editor ownership, stale-conflict recovery,
  and persisted-preview behavior through Compose Cucumber and Playwright. It
  also makes sequential collection saves operate on the last saved local value
  and keeps conflict drafts recoverable through Reload latest.
- The current publication-order checkpoint reads the latest page publication
  consistently and assigns publish/rollback timestamps monotonically, removing
  the confirmed same-millisecond history race.
- The current Property Management checkpoint adds all 35 strict semantic
  contracts/seeds and visual slots, a dedicated responsive composition, all 35
  editor boundaries, and both restored client-only forms. Functional acceptance
  is green; exact visual certification remains pending because the 1440px page
  is currently 14,706px tall versus the frozen 15,975px reference.
- The current Property Management asset checkpoint restores ten exact,
  source-backed portfolio/association images. Juniper Ridge and Riverwood
  Crossing retain the neutral placeholder because their mounted legacy records
  explicitly declare no photo.

Focused verification at this checkpoint:

- Schemas build passed.
- Home contract and migration tests passed: 18/18.
- Backend build passed.
- Backend Cucumber passed: 45/45 scenarios and 283/283 steps.
- Root `npm run check` passes after integrating Property Management, validating
  108 canonical cases.
- Frontend unit tests passed: 25/25.
- Frontend browser tests passed: 14/14.
- Compose frontend Cucumber passed: 19/19 scenarios and 125/125 steps.
- Compose Playwright passed: 11/11, including 7/7 preview/editor cases.
- All 51 visual captures are uniquely cataloged, checksum-valid, decodable,
  nonzero, and covered by the frozen visual-baseline harness.

## Intentionally incomplete

- The other 142 entities still use legacy contracts and seeds.
- Media and source controls are implemented but not mounted in a page editor.
- Real Estate, Construction, Storage, and Development still use the generic
  renderer and legacy contracts (142 entities remain).
- Property Management requires its independent 2px/3px geometry and 0.98 SSIM
  comparison; its functional composition is not yet visual-parity acceptance.
  Browser-only review confirmed these remaining gaps in priority order:
  undiscoverable touch item controls; mobile editor chrome obscuring content;
  typography/container/hero scale drift; wrong hero CTA hierarchy; and
  flattened contact details. The original isolated mobile
  comparison redirected to Lovable login, so mobile pixel parity remains
  unmeasured even though local responsive interactions were exercised.
- Form-state and edit-mode visual references still need capture.
- Independent browser-only review could not start because the Mac locked; rerun
  it after unlocking rather than accepting the implementation agent's review.
- The existing local DynamoDB volume contains version-1 Home data. The idempotent
  seed correctly refuses it; run the explicit disposable-local v2 reset only when
  preserving that local content is no longer required.

## Exact restart sequence

1. Confirm the branch is clean and starts at the latest checkpoint documented by
   `git log`, then run `npm run check`.
2. Unlock the Mac and rerun the independent browser-only Home review.
3. Mount the media library in Home's logo/leadership image fields; source controls
   wait for the first Real Estate listing editor.
4. Close the remaining independent Property Management gaps one at a time:
   touch controls, mobile toolbar, geometry/type tuning, CTA hierarchy, and
   contact presentation.
5. Re-run independent desktop/mobile visual comparison and only then begin Real
   Estate.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
