# TriCo frontend rewrite report

This branch is `codex/trico-full-frontend-rewrite`. The reference checkout is
`~/Personal/fullstack-ts` at `5070d93` on `codex/trico-theme`, including its
DS-21 TriCo preset. The starting TriCo revision is `901ec11`; see
`frontend-rewrite-baseline.md` for the route and editable entity inventory.

## Source change and line counts

| Source                                           |                  Before |                    After |              Change |
| ------------------------------------------------ | ----------------------: | -----------------------: | ------------------: |
| Frontend TSX, including framework and primitives | 9,332 lines in 34 files | 10,426 lines in 51 files |    1,094 more lines |
| Legacy global and six page stylesheets           |  8,374 lines in 7 files |                        0 | 8,374 lines removed |
| Tailwind entry, TriCo preset and font imports    |    338 lines in 3 files |     391 lines in 3 files |       53 more lines |
| All source TSX and CSS together                  |            18,044 lines |             10,817 lines |   7,227 fewer lines |

These counts are physical source lines, excluding generated `dist` assets. Ten
entire old presentation TSX files (5,653 lines) were deleted, including all
seven public page compositions. Twenty-seven new TSX files (6,304 lines) replace
them and add template primitives. Across the original TSX paths, 1,387 old
lines were removed and 1,830 lines were inserted; including deleted and new
files gives 7,040 removed and 8,134 inserted TSX lines. The net TSX count rose
by 1,094 lines. Moving markup to a new filename is not claimed as a React line
saving. The 7,227 total line reduction is driven by stylesheet deletion.

The remaining 391 CSS lines are the 230-line Tailwind entry, 154-line DS-21
preset and 7-line local font import list. The entry maps semantic theme tokens,
bundles Tailwind/shadcn, applies browser base typography and selection, maps
base component duration/overlay exceptions to tokens, and honors reduced
motion. No page, form, editor or component stylesheet remains. The few global
rules are documented inline in `frontend/design-system/themes/main.css`.

## Retained original TSX paths

The following original paths still exist. They are counted as retained paths,
even where their JSX was rebuilt in place.

| Path                                            | Reason retained                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `frontend/App.tsx`                              | Route wiring now points to the replacement experiences.                                                                 |
| `frontend/main.tsx`                             | Application boot entry; only the Tailwind theme import remains.                                                         |
| `frontend/context/EditModeContext.tsx`          | Nonvisual auth, edit state, publication and preview logic.                                                              |
| `frontend/components/ContentIcon.tsx`           | Reusable content icon resolution without styling.                                                                       |
| `frontend/components/ui/button.tsx`             | Existing fullstack-ts shadcn button primitive.                                                                          |
| `frontend/components/ui/card.tsx`               | Existing fullstack-ts shadcn card primitive.                                                                            |
| `frontend/design-system/layout.tsx`             | Expanded from the template Container into token based layout primitives.                                                |
| `frontend/components/CareerApplicationForm.tsx` | Existing form logic; visible fields and action rebuilt with template controls.                                          |
| `frontend/components/CareersSection.tsx`        | Canonical career filtering and prefill retained; card and section presentation rebuilt.                                 |
| `frontend/components/EditableBoundary.tsx`      | Entity ownership/editing behavior retained; visible boundary rebuilt with Tailwind and template controls.               |
| `frontend/components/EditableCollection.tsx`    | Collection add, save, reorder and undo behavior retained; controls and layout rebuilt.                                  |
| `frontend/components/EditableItem.tsx`          | Item operations retained; controls and presentation rebuilt.                                                            |
| `frontend/components/EditorSheet.tsx`           | Editor form behavior retained; sheet presentation rebuilt with template Sheet and fields.                               |
| `frontend/components/EditorToolbar.tsx`         | Publication workflow retained; toolbar and panels rebuilt with template components.                                     |
| `frontend/components/MediaLibraryDialog.tsx`    | Media selection/upload behavior retained; dialog presentation rebuilt.                                                  |
| `frontend/components/ProfileCard.tsx`           | Same original pathname, but a new shadcn Card shared by five divisions.                                                 |
| `frontend/components/ReviewPlatformCard.tsx`    | Same original pathname, but a new shadcn Card shared by five divisions.                                                 |
| `frontend/components/SelectField.tsx`           | Form value and validation behavior retained; control replaced by template NativeSelect.                                 |
| `frontend/components/SemanticEditorForm.tsx`    | Contract driven field logic retained; fields and layout replaced by template inputs, text areas and Tailwind utilities. |
| `frontend/pages/AuthPage.tsx`                   | Auth transport and state retained; visible login, registration and recovery forms rebuilt.                              |
| `frontend/pages/DevelopmentContactForm.tsx`     | Local form behavior retained; presentation rebuilt with template controls.                                              |
| `frontend/pages/PropertyManagementForms.tsx`    | Local form behavior retained; presentation rebuilt with template controls.                                              |
| `frontend/pages/RealEstateForms.tsx`            | Local form behavior retained; presentation rebuilt with template controls.                                              |
| `frontend/pages/StorageContactForm.tsx`         | Local form behavior retained; presentation rebuilt with template controls.                                              |

The new `DivisionSectionIntro` has five production callers; `ProfileCard` and
`ReviewPlatformCard` each have five. `ContentEntity` connects page content to
the existing editor state. Page compositions use shared Container,
MarketingLayout, Card, Button, Badge, Field, Input, Textarea, NativeSelect,
Dialog and Sheet primitives from the reference template. Content schemas,
services, media identities and publication state remain the source of truth.
`AnniversaryBanner` uses the Home presentation on all six public pages and
Construction category pages while retaining each page's editable message.
`FooterQuickLink` gives the five division footers and Construction category
footer one theme-backed link treatment with 44 px mobile tap targets.
Property Management and Real Estate now withhold unchanged seeded testimonials
from public composition because their attribution has not been verified. The
same records remain available in authenticated edit mode. Their shared Public
visibility selector preserves prior visibility for older custom published
content, allows explicit approval without changing a verified quote, and
starts new items hidden.
Home withholds unchanged sample 2024 updates while retaining their records in
the editor. A later owner-directed check of the reference preview confirmed
the four seeded job titles: Property Manager, Project Coordinator, Leasing
Agent, and Administrative Assistant. Those roles now appear publicly on Home
and the matching divisions, with explicit visibility controls in the editor.
The public careers section also accepts a general resume. The earlier
[Home seed-claim check](./ux-audit/2026-10-05-home-seed-claims-check.md)
records the previous suppression decision.
The same check measures native lazy loading for Home's four below-fold leadership
portraits: a fresh mobile entry now transfers only the logo image before
scrolling, while all portraits load when the section approaches the viewport.
The [six-route image check](./ux-audit/2026-10-05-image-loading-check.md)
records 41–99% less first-viewport image transfer after deferring below-fold
media; native lazy thresholds still allow some nearby images to load early.

## Local preview

The rewritten stack uses Compose project `trico-rewrite-preview` at
`http://app.localhost:18090/`. The original stack at port 18088 is separate.
The rewrite preview uses the real backend, DynamoDB Local, MinIO and Mailpit.
It should remain running for side by side inspection.

## Checks

The full frontend Compose behavior run passed: 49 scenarios and 429 steps. It
represented all 204 canonical cases (49 exercised, 155 justified no-op). The
backend behavior run also represented all 204 cases: 57 scenarios and 367 steps
passed, with 147 justified no-op. The local Playwright suite passed all 12
checks. Frontend unit tests passed 44/44; source policy tests passed 10/10; and
the behavior catalog tests passed 30/30. The production frontend build, lint,
typecheck, format check and canonical behavior validation passed. The preview
returned HTTP 200 and was inspected in the in-app browser on Home and all
public routes, including mobile navigation and editor flows.
The final Compose run covers the shared banner, restricted Construction Plan Room,
application attachment delivery, and authenticated editor paths. The local
submission routes also returned 429 at their configured DynamoDB backed caps.

No new tests or Cucumber scenarios were added. Nineteen old public scenarios
that required the legacy pixel-level presentation were removed; functional and
adverse behavior cases remain in the canonical features. The browser smoke
suite was edited down to 12 checks focused on functioning routes, forms,
navigation and editor controls.

Route components now load on demand. The prior 1.52 MB JavaScript entry became
a 235 KB entry plus route and shared chunks. The public route's first load is
215–232 KB of encoded JavaScript across the six pages, measured in fresh
Chromium contexts against the Compose preview after separating the server seed
catalog, versus 384–395 KB in the
route-split baseline before editor and icon deferral. The [loading check](./ux-audit/2026-10-05-loading-check.md)
records each route and the measurement scope. The authenticated editor toolbar, its dialogs, and the
full Lucide icon catalog load when needed; the 34 seed icons remain ready for
immediate rendering. The existing editor behavior still covers an uncommon
icon chosen through the CMS, and all 1,694 schema-supported icon names resolve
to either a ready component or a dynamic Lucide filename.
