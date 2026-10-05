# TriCo frontend audit against fullstack-ts

Compared on 2026-10-05 with `~/Personal/fullstack-ts` at `feat/expo-shared-mobile-demo` before the local `codex/trico-theme` work.

## Where the application is

TriCo has six published public pages, a construction category route, authentication, a semantic CMS editor, publication, media, and local Compose dependencies. The public pages use strict shared content schemas and several genuine shared components. The frontend unit suite passed 45/45 and the frontend built before this migration. The canonical catalog contains 224 cases (126 application, 98 factory).

The current frontend is a mature site with presentation debt, rather than an empty starter. Its checked-in CSS totals 8,652 lines: 5,661 global lines and 2,991 lines across six page stylesheets. The original tracked frontend TSX and CSS totaled 18,162 lines. Most page composition remains in six 489–1,209-line site pages.

| Area         | TriCo before migration                                                                                       | Current fullstack-ts                                               | Work needed                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme        | `--trico-*` palette in one global stylesheet; Tailwind 3 packages present but no Tailwind entry or utilities | Tailwind 4 semantic tokens and 20 selectable presets               | Add TriCo as preset 21 upstream, use its tokens locally, and retire duplicate color declarations after browser parity is verified                    |
| Cards        | Shared review, profile, and career compositions use native `article` elements and page CSS                   | Fixed `Card` primitive with header, content, and footer slots      | Put the common surfaces on `Card`; move their repeated spacing, color, and state rules to semantic utilities                                         |
| Layout       | Each page owns its containers and section rhythm through `ui-*` and division classes                         | `Container`, `Grid`, `Stack`, `MarketingLayout`, and page patterns | Apply template layouts to compatible page sections, then consolidate repeated header/footer structure only where all callers share the same behavior |
| Controls     | Form and editor controls are styled by global/page selectors; several page-specific forms remain             | Fixed Button/Input/Field controls                                  | Migrate controls with validation and editor behavior intact; keep page-specific form logic in pages                                                  |
| Content      | Published manifest and private preview data drive six distinct page compositions                             | Starter fixture pages                                              | Preserve TriCo schemas, content loaders, edit boundaries, and publishing; do not replace them with template demo content                             |
| Verification | Visual and behavior steps assert many legacy CSS selectors and pixel values                                  | Token, contrast, and preset checks                                 | Edit existing checks as each contract moves; run real Compose acceptance and visual checks without adding test cases                                 |

## Actual shared usage

- `DivisionHero` is used by all five division pages.
- `ReviewPlatformCard` is used by all five division pages.
- `ProfileCard` is used by Real Estate, Property Management, and Development.
- `CareersSection` is used by all six public pages.
- The common section heading markup now serves Property Management, Real Estate, Construction, and Storage through `SectionHeading`.
- The five division headers have related navigation and action behavior but differ in logo placement, mobile controls, and page-specific contract. Their markup and CSS need a deliberate common API before extraction.

## Changes on the two local branches

`codex/trico-theme` in fullstack-ts registers DS-21, adds its light and dark tokens, fonts, catalog brief, preference schema, and picker entry. The existing preset and contrast checks pass for 21 themes. The site's copy of DS-21 uses exact source hex values for roles whose browser RGB output is part of the existing visual contract; the template stores the corresponding OKLCH values.

`codex/trico-theme-rebuild` in TriCo runs Tailwind 4 from the DS-21 token entry. The legacy `--trico-*` palette now aliases semantic theme roles. Tailwind utilities sit in a lower CSS layer, preserving the established site and editor rules during migration. Template `Card`, `Button`, and `Container` primitives now serve the shared review/profile/career surfaces, actions, auth submission, and hero/section frames. A shared section heading serves four division pages. The old unused `SitePage`, `HomePage`, `EditableEntity`, and their orphaned selectors are removed.

The branch started with 9,510 frontend TSX lines and 8,652 CSS lines. The current tree has 9,332 TSX lines and 8,712 CSS lines, a net reduction of 118 TSX/CSS lines after adding the theme and primitives. This is an honest transitional saving: the six active page compositions and editing React remain because they still carry live behavior.

## Remaining work for a unified frontend

| Priority | Gap                                                                                               | Concrete replacement                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Page headers and footers each maintain parallel navigation, responsive controls, and visual roles | Identify the common behavior contract, then use shared `SiteHeader` and `SiteFooter` with content supplied by each page. Keep editable boundaries around each entity.   |
| 2        | Three form families and editor controls still rely on broad `.ui-form-*` and page selectors       | Move fields, status, and action presentation to template controls; keep validation, uploads, and submissions in their existing owners.                                  |
| 3        | Six page stylesheets and the global stylesheet still contain most spacing and surface rules       | Convert common roles to semantic Tailwind utilities, delete each replaced rule, and update the existing visual behavior step for the intentional appearance.            |
| 4        | Published page compositions still contain dense, page-local card and section markup               | Use shared primitives where the full input/output behavior recurs across at least three production callers. Retain unique media, listing, and editing behavior locally. |
| 5        | The browser bundle is a single large route chunk                                                  | Split route imports after the shared composition migration so first load need not carry every page and editor view.                                                     |

## Migration order

1. Establish DS-21 TriCo in the template and local Tailwind token pipeline. Keep the current public and editor content paths live.
2. Switch the four already-shared visual compositions to template primitives and migrate section layout where three compatible callers exist.
3. Move repeated page header, footer, forms, and section patterns onto semantic utilities while retiring the corresponding legacy CSS. Existing exact visual assertions need updating to the agreed new appearance.
4. Remove old page React and CSS only after its route, editable entity, form, media, and publication behavior is represented by the replacement. Measure saved lines with `git diff --numstat` against the branch point.

## Local data note

The default Compose project's existing DynamoDB volume contains an unsafe `property-management.header` CURRENT row. Its seed refuses to overwrite that row, as designed. The separate `trico-theme-preview` Compose project uses fresh volumes and port 18088 so this audit can verify the app without deleting existing data or interfering with the template's port 8088.

## Verification

The live preview is at `http://app.localhost:18088/`. The frontend Compose run passed all 69 scenarios and 508 steps, representing all 224 canonical cases as 69 exercised and 155 justified frontend no-ops. The frontend unit suite passed 45/45. TriCo lint, typecheck, formatting, and catalog validation passed. The fullstack-ts DS-21 preset and contrast checks passed 10/10, as did template typecheck, formatting, and catalog validation.
