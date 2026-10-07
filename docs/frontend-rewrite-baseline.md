# Frontend rewrite baseline

Recorded from commit `901ec11` on `codex/trico-theme-rebuild` before rewriting presentation. The rewrite branch is `codex/trico-full-frontend-rewrite`.

## Lines and files

| Scope                                                | Files | Lines |
| ---------------------------------------------------- | ----: | ----: |
| Frontend TSX, including existing template primitives |    34 | 9,332 |
| Legacy global stylesheet (`frontend/styles.css`)     |     1 | 5,383 |
| Legacy page stylesheets (`frontend/pages/*.css`)     |     6 | 2,991 |
| TriCo theme entry, preset, and fonts                 |     3 |   338 |

The seven legacy stylesheets total **8,374 lines**. The rewrite must delete all seven files and their imports. The 34 TSX files include 8,765 lines in the old page/component presentation implementation; `App`, `main`, the edit-mode context, and the existing template primitives/layout account for the other 567 lines. Retained TSX must be audited file by file; moving old markup does not count as replacement.

## Route and content inventory

| Route                  | Sections in registered content order                                                                                                                            | Registered entities |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------: |
| `/`                    | anniversary banner, header, hero, divisions, core values, journey, leadership, news, careers, contact, footer                                                   |                  18 |
| `/property-management` | anniversary banner, header, hero, services, process, portfolio, tenant portal, team, about, testimonials, FAQ, careers, reviews, contact, footer                |                  35 |
| `/real-estate`         | anniversary banner, header, hero, listings, services, process, about, team, careers, testimonials, FAQ, reviews, contact, footer                                |                  31 |
| `/construction`        | anniversary banner, header, hero, services, current projects, completed projects, plan room, pros, team, workers, about, bid, careers, reviews, contact, footer |                  65 |
| `/storage`             | anniversary banner, header, hero, services, team, about, reviews, contact, footer                                                                               |                  18 |
| `/development`         | anniversary banner, header, hero, land experts, services, projects, partners, team, about, reviews, contact, footer                                             |                  28 |

Construction also has `/construction/current/:categoryId` and `/construction/completed/:categoryId`. Authentication routes are `/login`, `/register`, `/request-reset`, `/reset-password`, and `/verify-email`. The catchall returns to Home. Five registered entities are retired and must not appear in the public pages.

## Editable and interactive surfaces

The 195 registered entities are wrapped by object or collection boundaries in the six published pages; collection items have their own controls. The replacement must keep editor ownership, pending revisions, stale conflict recovery, list add/remove/reorder, preview visibility, save, discard, publish, media selection, and searchable icon selection. `EditModeContext` owns nonvisual session and pending-change state. The old presentation consists of `EditableBoundary`, `EditableCollection`, `EditableItem`, `EditorSheet`, `EditorToolbar`, `MediaLibraryDialog`, `SemanticEditorForm`, and `SourceFieldControls`.

Public interactions include six page navigations, construction category navigation, Real Estate listing tabs and external actions, five division careers filters, application prefill, accessible selection controls, image fallbacks, and the client forms on Home, Property Management, Real Estate, Construction, Storage, and Development. The auth UI has sign-in, registration, reset request, reset confirmation, and verification states.

## Source of design-system components

`~/Personal/fullstack-ts` is at `codex/trico-theme` commit `5070d93`. Its DS-21 preset and shadcn based `frontend/components/ui` and `frontend/design-system` are the source for the replacement. The current TriCo tree has only Card, Button, and Container copies; the rest of its presentation remains custom.
