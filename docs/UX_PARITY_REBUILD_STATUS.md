# UX parity rebuild status

Last updated: 2026-09-11

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
- The current Property Management mobile-CTA checkpoint stacks both actions at
  358x44 with a 12px gap at 390px, while preserving the 100vh hero, accessible
  color hierarchy, focus states, destinations, and desktop side-by-side layout.
- The current Property Management card-geometry checkpoint makes both team
  portraits square and cover-cropped (Mia 430x645 to 430x430 desktop and 324x486
  to 356x356 mobile) and removes the duplicate mobile gutter so representative
  cards use the original 356px content width.
- The current desktop-chrome checkpoint reduces the active editor toolbar from
  69.25px (about 71px in independent review) to exactly 64px at 1425/1440 while
  preserving the mobile 64px bar, visible status/actions, focus, and 44px targets.
- The current Property Management license-icon checkpoint replaces the visible
  `LIC` fallback with an aria-hidden 20px Award icon while retaining the human
  Licenses heading and existing 48px tile geometry.
- The current Property Management responsive-hero checkpoint matches the 1440px
  logo inset, 1024px logo/title geometry, 60px heading and 28px body leading,
  390px full-width copy inset, and 52px mobile header offset while preserving the
  100vh hero and exact 1023/1024 navigation breakpoint.
- The current Property Management desktop-CTA checkpoint matches the original
  desktop/tablet geometry at 202x44 and 148x44 with 6px radii and medium weight,
  while retaining accessible colors/focus states and the approved mobile 358x44
  stacked treatment.
- The current visual-regression checkpoint adds deterministic, route-scoped
  Playwright capture and comparison commands. Candidate capture uses the exact
  manifest viewports, waits for fonts and images, disables animation, records
  real document geometry, and leaves a short final tile unpadded so geometry
  differences fail closed. It does not add masks or change production styling.
- The Property Management comparison currently fails rather than claiming false
  parity. Frozen/candidate geometry is 1425x15,975 versus 1425x15,676 desktop,
  1024x17,282 versus 1024x16,863 tablet, and 390x28,183 versus 390x26,305 mobile.
  The frozen reference includes Property 7-10, incomplete animation states, and
  unloaded hero/portfolio imagery. Even geometry-aligned desktop hero, tenant,
  and team sections score 0.673, 0.864, and 0.825, so reaching 0.98 would require
  broad prohibited masks or reintroducing explicitly excluded/broken content.
- The approved corrected Property Management baseline now lives in the dated
  `2026-09-11-property-management` directory and supersedes only that route's
  defective 2026-09-10 captures. It was rendered independently from a fresh,
  checksum-recorded extraction of the supplied original ZIP, with capture-only
  removal of Property 7-10, exact restoration of the ten source portfolio
  images, mobile overflow clipping, lazy-image activation, and stabilized
  animation. The historical 51 files remain unchanged. No masks were added and
  the 0.98 SSIM plus 2px/3px geometry policies remain intact.
- The first migrated comparison against the corrected reference is a valid
  failure: desktop SSIM is 0.772245; tablet tiles are 0.723072, 0.670944, and
  0.754084; mobile tiles are 0.607856, 0.451529, 0.519009, 0.657285, and
  0.705822. Desktop capture geometry matches; the tablet and mobile documents
  remain 61px and 192px shorter. These are now genuine production-page
  deviations rather than defects in the reference.
- The first production reconciliation restores the source-muted color, exact
  section tint opacities, team/about gradients, careers treatment, and service
  card separation. Before typography was corrected, desktop SSIM improved from
  0.772245 to 0.785667, all tablet tiles improved, and the tablet/mobile height
  gaps fell from 61/192px to 25/96px without changing contracts or editor
  behavior.
- Lato 400/700 and Open Sans 300/400/500/600/700 are now self-hosted through the
  frontend build instead of silently falling back to Arial. Browser acceptance
  confirms both font families are registered and applied, and source-measured
  hero action geometry is restored at 201.75x44 and 149.23x44.
- Candidate capture now preserves an oversized final tile as well as an
  undersized one. The corrected fail-closed check exposed genuine post-font
  document deltas of +133px desktop, +124px tablet, and -8px mobile rather than
  clipping the extra desktop/tablet content to the reference height.

Focused verification at this checkpoint:

- Schemas build passed.
- Home contract and migration tests passed: 18/18.
- Backend build passed.
- Backend Cucumber passed: 45/45 scenarios and 283/283 steps.
- Root `npm run check` passes after the corrected baseline, first CSS
  reconciliation, and self-hosted-font integration, validating 113 canonical
  cases.
- Frontend unit tests passed: 26/26.
- Frontend browser tests passed: 21/21, including registered self-hosted fonts.
- Compose frontend Cucumber passed: 24/24 scenarios and 172/172 steps.
- Compose Playwright passed: 13/13.
- All 51 visual captures are uniquely cataloged, checksum-valid, decodable,
  nonzero, and covered by the frozen visual-baseline harness.
- The route-scoped visual capture/comparison harness passed 7/7 tests; its
  Property Management comparison result remains intentionally failing for the
  baseline incompatibilities recorded above.

## Intentionally incomplete

- The other 142 entities still use legacy contracts and seeds.
- Media and source controls are implemented but not mounted in a page editor.
- Real Estate, Construction, Storage, and Development still use the generic
  renderer and legacy contracts (142 entities remain).
- Property Management requires production changes to reach the retained 0.98
  SSIM and 2px/3px geometry acceptance against its now-approved corrected
  baseline. The reference-policy blocker is resolved; the remaining failures
  are visible implementation differences recorded above.
- Form-state and edit-mode visual references still need capture.
- The existing local DynamoDB volume contains version-1 Home data. The idempotent
  seed correctly refuses it; run the explicit disposable-local v2 reset only when
  preserving that local content is no longer required.

## Exact restart sequence

1. Confirm the branch is clean and starts at the latest checkpoint documented by
   `git log`, then run `npm run check`.
2. Continue section-level Property Management geometry reconciliation after the
   font-corrected candidate; the strict route comparison remains intentionally
   failing until every region meets 0.98 SSIM and 2px/3px geometry tolerance.
3. Mount the media library in Home's logo/leadership image fields; source controls
   wait for the first Real Estate listing editor.
4. Capture the missing form and edit-mode visual states against the approved
   reference policy.
5. Begin Real Estate only after Property Management visual acceptance is resolved.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
