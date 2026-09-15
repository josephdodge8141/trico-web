# UX parity rebuild status

Last updated: 2026-09-14

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
- The second production reconciliation restores source heading leading and
  removes duplicated responsive gutters in About and Contact. About's desktop
  and mobile excess fell from 25/124px to 11/31px; Contact's desktop/tablet
  excess fell to 23/22px and its mobile height is within the required 3px.
  Desktop and tablet route SSIM improved, as did the later mobile tiles. The
  remaining whole-page deltas are +100px desktop, +32px tablet, and -147px
  mobile, with tablet About still 38px short and explicitly queued for its
  vertical-spacing pass.
- The third production reconciliation restores the source footer padding,
  grid/link/legal rhythm, responsive gutter, and mobile link-group breaks, plus
  source mobile testimonial padding. Footer error fell from 61/81/176px to
  11/38/13px across desktop/tablet/mobile, and the mobile testimonial error fell
  from +101px to -15px. Fixed page tiles can temporarily score lower when these
  corrected section boundaries move downstream content; the section geometry
  is retained as the more specific evidence and no difference is masked.
- The fourth production reconciliation restores the source Services container
  widths and mobile heading gap plus the Tenant Portal's 1024px content width,
  768px heading cap, bare 40px icons, card typography, and 60px action. Services
  tablet height error fell from 25px to under 1px and its mobile error from 62px
  to 38px. Tenant Portal desktop/tablet error fell from 38px to 7px; its mobile
  result is 24px short and remains queued. Desktop SSIM improved from 0.772217
  to 0.781534 and all tablet tiles improved. Later mobile tile movement is kept
  visible because it follows genuine upstream geometry changes; no masks were
  added.
- The fifth production reconciliation restores the Process section's source
  content widths and exact mobile card padding, 48px item rhythm, and 64px
  heading gap, plus the Team section's exact 64px mobile heading gap. Process
  mobile height error fell from 39px to 17px and Team from 45px to 21px. The
  whole mobile page gap fell from 117px short to 37px short, every mobile SSIM
  tile improved, and desktop/tablet section heights remained stable. The
  remaining strict parity failures are retained without masking.
- A section-aligned heatmap pass identified repeated shell/type tokens, media
  identity, and generic surface primitives as the highest-impact residuals.
  The resulting broad reconciliation restores the source container/gutter,
  typography, pills, card shadows/radii, form controls, and editor-wrapper-safe
  widths. Aligned SSIM improved for Managed Properties from .741/.630/.437 to
  .833/.788/.638, Team desktop/tablet from .803/.725 to .933/.905, and Contact
  mobile from .633 to .749. Whole-route desktop SSIM improved from .781834 to
  .819559; fixed route tiles remain secondary diagnostics because corrected
  section boundaries can shift later content.
- Property Management's unavailable hero media now uses the approved neutral
  managed placeholder instead of an unrelated high-rise photo. Canonical
  behavior, unit, and browser coverage require the neutral treatment without
  exposing its storage key.
- The disposable local DynamoDB and MinIO volumes were explicitly reset on
  2026-09-11. The clean version-2 seed completed successfully, removing the
  retained version-1 local-data blocker while leaving reset safety restrictions
  and migration planners intact.
- The current Real Estate broad-parity checkpoint replaces the generic renderer
  with the complete dedicated composition, all 31 visual boundaries, responsive
  navigation, listing tabs/galleries, both client-only forms, and source-backed
  imagery. Its CTA contrast and mobile presentation have browser regression
  coverage; its 31 contracts still require semantic version-2 migration.
- The current Construction broad-parity checkpoint replaces the generic main
  page and all 16 category routes. The main route renders 49 boundaries across
  the complete composition; the category routes account for the remaining 16
  project-list entities with category pills, editable honest empty states, and
  no fabricated projects. Its 65 contracts still require semantic version-2
  migration.
- The current Storage checkpoint adds all 18 strict semantic contracts, seeds,
  editor descriptors, dedicated visual boundaries, the full owner-focused
  facility-management composition, and its client-only consultation form. This
  raises semantic coverage to 71 of 195 entities.
- The current Development broad-parity checkpoint replaces the generic renderer
  with the complete dedicated composition, all 28 visual boundaries, its unique
  anniversary treatment, responsive navigation, and client-only contact form.
  Its CTA contrast is explicitly covered; its 28 contracts still require
  semantic version-2 migration.
- Independent browser-only review covered all four rebuilt divisions at
  1440x1100 and 390x844 plus all 16 Construction category routes. It confirmed
  complete hierarchy, nonzero visible images, working mobile navigation, no
  horizontal overflow, and no exposed technical representation. The resulting
  CTA contrast, mobile launcher overlap, and Storage review-label defects were
  fixed with focused browser regression coverage.
- The semantic version-2 migration is now complete for all 195 entities:
  Home 18, Property Management 35, Real Estate 31, Construction 65, Storage 18,
  and Development 28. Every entity has a strict schema, semantic seed, explicit
  novice editor descriptor, and truthful visual-catalog entry. All object and
  collection values are mounted through validated page-document values; raw
  JSON, IDs, UUIDs, revisions, routes, and storage paths remain hidden.
- Real Estate now includes working MLS/LoopNet destinations, deterministic
  listing galleries, active/sold editing isolation, complete team/About render
  coverage, friendly link fields, accessible list semantics, and robust legacy
  fallback. Construction now data-drives its main and category shells, renders
  every project/team field, and exposes honest editable empty project lists on
  all 16 category routes. Development now data-drives its remaining business
  labels and uses valid accessible collection semantics.
- Canonical browser behavior now opens and saves real friendly Hero forms on
  Real Estate, Construction, Storage, and Development and exercises shared
  managed-media selection/upload. Exact behavior accounting is 134 cases.
- Compose Playwright now covers the complete user-facing publication loop:
  edit through a friendly form, verify public/private preview isolation, review
  and publish the exact pending change, inspect publication history, restore the
  previous publication, and verify the public page is restored.
- The September 14 edit-mode regression wave adds test-first coverage for
  post-login edit-mode resumption, reload restoration without a stranded sheet,
  semantic collection undo with persisted-preview cleanup, prominent publishing,
  left-contained editor feedback, searchable full-library Lucide icons, and the
  approved blue Home division-card treatment.
- A follow-up geometry wave keeps every Real Estate card collection at its
  intended centered desktop width in public and edit views. It also keeps the
  canonical Home opening message centered without editor-wrapper drift and
  prevents the Home editing scenario from leaking saved test content.
- The September 15 broad-parity wave resolves audit findings `UX-001` through
  `UX-007` at their shared roots. It adds an opt-in full-width collection
  contract; one semantic blue-led palette; shared hero-media, review-platform,
  and profile-card primitives; shared cross-page section/card rhythm; and a
  feature-owned Real Estate listing-gallery shell. These contracts are used by
  three to five production page families where the behavior is genuinely
  shared, while page composition and the unique listing feature remain locally
  owned. Seven canonical browser scenarios capture the original failures and
  verify desktop, compact, public, and edit-mode behavior without hiding
  intentional gold branding or removing valid hero imagery.

Focused verification at this checkpoint:

- The integrated September 15 root `npm run check` passes with 141 canonical
  cases, 27/27 frontend browser tests, 41/41 frontend unit tests, 26/26
  infrastructure tests, and successful synthesis of the preview foundation,
  development, and production stacks.
- The rebuilt local Compose application passes 49/49 frontend Cucumber
  scenarios and 344/344 steps with exact accounting for all 141 cases.
- Compose Playwright passes 17/17, including authentication, edit-mode resume,
  friendly forms, icon selection, publication/history/rollback, responsive
  editor controls, collection operations, ownership, conflicts, and restored
  pending previews.
- A final browser-only inspection covered all six page tops plus the repaired
  Construction services grid and Real Estate listing gallery. The shared hero
  media, blue-led emphasis, centered grids, counted tabs, and neutral fallbacks
  render as intended with no visible editor leakage while signed out.
- Schemas build passed.
- Home contract and migration tests passed: 18/18.
- Backend build passed.
- Backend Cucumber passed: 49/49 scenarios and 315/315 steps.
- Root `npm run check` passes after the semantic/editor integration wave,
  validating 134 canonical cases.
- Frontend unit tests passed after integration: 41/41.
- Frontend browser tests passed after integration: 27/27, including registered
  self-hosted fonts, dedicated division compositions, CTA contrast, and launcher
  clearance.
- Compose frontend Cucumber passed after integration: 42/42 scenarios and
  292/292 steps, accounting for 134 canonical cases.
- Compose Playwright passed: 17/17, including publish/history/rollback and the
  edit-mode regression wave.
- All 51 visual captures are uniquely cataloged, checksum-valid, decodable,
  nonzero, and covered by the frozen visual-baseline harness.
- The route-scoped visual capture/comparison harness passed 7/7 tests; its
  Property Management comparison result remains intentionally failing for the
  baseline incompatibilities recorded above.

## Intentionally incomplete

- Field-level MLS/LoopNet source/manual override controls and transport exist,
  but `SourceFieldControls` is not yet mounted inside the Real Estate listing
  editor. That remains the next functional editor slice before external sync is
  enabled.
- Property Management requires production changes to reach the retained 0.98
  SSIM and 2px/3px geometry acceptance against its now-approved corrected
  baseline. The reference-policy blocker is resolved; the remaining failures
  are visible implementation differences recorded above.
- Form-state and edit-mode visual references still need capture.
- AWS preview/dedicated-environment deployment remains a later phase; this phase
  intentionally completes local frontend/content/editor behavior first.
- Local content was reset and freshly seeded during the semantic migration's
  final Compose verification. Test-created pending changes were cleaned up;
  uploaded objects and all other local data remain disposable.

## Exact restart sequence

1. Run the final clean root gate and the disposable Compose volume reset/reseed.
2. Run Compose Cucumber and Playwright against all six semantic pages, including
   remaining-division object saves, category empty-list Add, and managed media.
3. Capture the missing form/edit-mode visual states.
4. Return to strict section-level visual comparison now that all six dedicated
   compositions and novice editing contracts are functionally complete.
5. Begin the separate AWS preview/dedicated-environment delivery phase only from
   this verified semantic checkpoint.

The local Docker stack may still be running after Compose verification. Inspect
it with `docker compose ps`; stop it with `docker compose down` before closing a
laptop, or start it with `docker compose up --build -d` when work resumes.
