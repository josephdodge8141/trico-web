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
- The current touch-control checkpoint keeps component/item controls visible in
  edit mode at 390px, gives them novice-readable labels and 44px targets, keeps
  them inside their boundaries, and preserves compact desktop hover controls.
- The current mobile-chrome checkpoint makes the 390px launcher pointer-safe,
  reduces the active toolbar to a 64px status/action bar, keeps all approved
  actions in an accessible disclosure, reserves page space for the bar, and
  separates sheet-body scrolling from the Save/Cancel footer.
- The current Property Management geometry checkpoint restores the 100vh split
  hero, 60px desktop heading, 64px logo, 16px card copy, below-1024 mobile-nav
  breakpoint, alternating process layout, original association widths, and
  section density. At 1425x1100 the corrected page is 15,562px versus a 15,975px
  frozen capture that includes one intentionally excluded Property 7-10 row;
  section boundaries now converge closely without claiming SSIM acceptance.
- The current Property Management CTA checkpoint restores the gold `#86622d`
  primary action and subordinate transparent secondary action, with measured
  contrast of 5.53:1 and at least 14.45:1 respectively plus clear hover/focus.
- The current Property Management contact checkpoint restores five icon-backed,
  human-labeled rows, original vertical grouping, and responsive anchor clearance
  so the contact and form headings remain below the sticky header.
- The current Property Management launcher checkpoint places the Page header and
  Opening section editor controls above their fixed banner/header interception
  layers. Real desktop/mobile cases now open friendly forms and verify Save and
  Cancel without exposing technical representations.
- The current Property Management logo checkpoint uses the legacy corporate
  header mark plus separate division label, restoring measured display size from
  204x64 to 267x64 desktop and 178x56 to 233x56 mobile without distortion.

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
- Property Management requires a final independent 2px/3px geometry and 0.98
  SSIM comparison before visual-parity acceptance. Its second browser-only pass
  found the two dead primary launchers now covered by the checkpoint above, plus
  these remaining visual gaps: mobile CTAs arranged side-by-side instead of
  stacked full-width; Mia's portrait and mobile cards
  using incorrect aspect/width; residual managed-property density; a 71px
  desktop editor toolbar; and a literal `LIC` contact fallback. The original isolated mobile
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
4. Close the second-pass Property Management visual gaps one at a time, beginning
   with mobile CTA layout, then portrait/card geometry.
5. Re-run independent desktop/mobile visual comparison and only then begin Real
   Estate.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
