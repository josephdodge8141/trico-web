# TriCo public pages: third independent UX re-score — 2026-10-05, 23:03 UTC

This pass reviews the latest preview at `http://app.localhost:18090/` after the Property Management, Development, and Real Estate fixes. The [original audit](./2026-10-05-public-pages.md), [first re-score](./2026-10-05-public-pages-rescore.md), and [second re-score](./2026-10-05-public-pages-rescore-2.md) remain historical checkpoints. I captured all six routes in Chromium at 1440 × 900 and 390 × 844, plus targeted Property Management tab views at 320 and 390 px. I exercised the three fixes, mobile Contact navigation on every route, and the relevant tab and disclosure controls. Scores reflect task access and reading effort, not page height alone. This is not a formal WCAG audit or usability study.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Previous mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ------------: |
| Home                |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |           8.0 |
| Property Management |         8 |          8 |           7 |           8 |             8 |          8 |          8 | **7.9** |           7.6 |
| Real Estate         |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |           7.9 |
| Construction        |         8 |          8 |           8 |           8 |             8 |          7 |          8 | **7.9** |           7.9 |
| Storage             |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |           8.0 |
| Development         |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |           7.7 |

All 12 desktop/mobile loads returned HTTP 200. I observed no page exceptions, broken images, public placeholder text, unresolved in-page links, or horizontal page overflow. On all six mobile pages, Contact in the open menu navigated to `#contact` and closed the menu. The 8 scores mean a clear usable path with only minor friction; they do not claim the pages are perfect. The two 7 scores below identify the remaining material issues and their current source causes.

## Home

[Desktop](./screenshots/rescore-3/home-desktop.png) · [Mobile](./screenshots/rescore-3/home-mobile.png)

- **Hierarchy 8:** The purpose statement, Divisions action, and five division cards form a clear first path.
- **Navigation 8:** Desktop links and the tested mobile menu reach Divisions, Careers, and Contact directly.
- **Readability 8:** Distinct headings and generous spacing make the journey and leadership sections scannable.
- **Consistency 8:** Banner, palette, cards, and buttons match the family of division pages.
- **Accessibility 8:** The skip link, one H1, named menu, and labeled career fields remain present.
- **Conversion 8:** Division exploration, contact details, and a direct career application are available.
- **Responsive 8:** The 390 px page stacks without clipping, and the menu preserves task access.

## Property Management

[Desktop](./screenshots/rescore-3/property-management-desktop.png) · [Mobile](./screenshots/rescore-3/property-management-mobile.png) · [Tabs at 320 px](./screenshots/rescore-3/property-management-tabs-320.png) · [Tabs at 390 px](./screenshots/rescore-3/property-management-tabs-390.png)

- **Hierarchy 8:** Free Analysis, occupancy proof, and a relevant property image establish the offer immediately.
- **Navigation 8:** Managed, Commercial, and HOA tabs are all visible at 320 and 390 px. At 320 px, each measured 94 × 44 px; all three switched to the correct collection. The menu and hero action reach Contact.
- **Readability 7:** The default Managed tab still shows seven full property cards, followed later by a separate 1,848 px testimonial section. Even with category tabs, visitors comparing the managed portfolio must scan a long card sequence. The default collection and full testimonial collection are page composition choices ([portfolio groups](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:255), [testimonials](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:601)).
- **Consistency 8:** Real property imagery and shared cards support a coherent portfolio story.
- **Accessibility 8:** The compact visible labels retain full accessible names; each tab is a 44 px target and keyboard accessible.
- **Conversion 8:** Free Analysis bypasses the portfolio and reaches the single request form.
- **Responsive 8:** The three-column tab list fits at 320 and 390 px without local or page overflow.

## Real Estate

[Desktop](./screenshots/rescore-3/real-estate-desktop.png) · [Mobile](./screenshots/rescore-3/real-estate-mobile.png) · [Expanded bio](./screenshots/rescore-3/real-estate-bio-expanded-mobile.png)

- **Hierarchy 8:** Commercial and land scope, metrics, and a real featured listing lead into the gallery.
- **Navigation 8:** Listing and team tabs switch categories; hero and menu actions reach contact.
- **Readability 8:** Team tabs avoid a nine-profile sequence, and the default five agent cards show concise identity and contact details. Each full bio opens only when requested.
- **Consistency 8:** Portraits, listing cards, and disclosure styling use the same visual language.
- **Accessibility 8:** The first bio was hidden initially, then became visible after focusing its native summary and pressing Enter. The other profiles remained collapsed; the tab controls retain accessible names.
- **Conversion 8:** Listing details, directories, and the contact form provide clear next actions.
- **Responsive 8:** The team tabs fit at 390 px; default mobile height fell to 17,103 px, with no overflow or loss of direct task links.

## Construction

[Desktop](./screenshots/rescore-3/construction-desktop.png) · [Mobile](./screenshots/rescore-3/construction-mobile.png)

- **Hierarchy 8:** Team photo, proof metrics, and quote action communicate the offer on the first screen.
- **Navigation 8:** Project inquiry, Plan Room, quote form, Careers, and Contact are reachable by menu or in-page actions.
- **Readability 8:** One honest project empty state replaces duplicate Current and Completed empty sections.
- **Consistency 8:** Hero, service cards, and empty-state presentation match the rest of the site.
- **Accessibility 8:** The menu, skip link, labeled quote form, and image alternatives were present in the reviewed states.
- **Conversion 7:** The single quote form is clear, but visitors cannot assess current or completed work from any published example. The page renders only “Project details are available by request” while all project collections are empty. This is a content proof gap, not a button defect ([empty-project handling](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:324), [project inquiry](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:344)).
- **Responsive 8:** At 390 px, the honest empty state is brief and the quote path bypasses the full scroll.

## Storage

[Desktop](./screenshots/rescore-3/storage-desktop.png) · [Mobile](./screenshots/rescore-3/storage-mobile.png)

- **Hierarchy 8:** Owner-focused profitability, a facility photo, and Partner With Us remain clear.
- **Navigation 8:** Menu and hero actions reach Services, About, Careers, and the consultation form.
- **Readability 8:** Six services are shown initially on mobile; an explicit control reveals the other six, and team bios expand individually.
- **Consistency 8:** Real facility imagery, cards, and concise profile previews align with the other divisions.
- **Accessibility 8:** Service expansion exposes its state, bios use native disclosure, and the consultation form has labels.
- **Conversion 8:** Partner With Us reaches one consultation form without requiring visitors to read every service or bio.
- **Responsive 8:** The 10,059 px mobile page has no overflow; collapsed detail keeps the default path manageable.

## Development

[Desktop](./screenshots/rescore-3/development-desktop.png) · [Mobile](./screenshots/rescore-3/development-mobile.png) · [Hero project landing](./screenshots/rescore-3/development-project-landing-mobile.png)

- **Hierarchy 8:** Project imagery and distinct View Our Projects and Start Your Project actions establish two useful paths.
- **Navigation 8:** The hero project action now reaches `#project-gallery`: at 390 px, the Featured work tab appeared 32 px from the top of the viewport. The service cards no longer sit between the visitor and the promised project content.
- **Readability 8:** Featured work and project types occupy separate, labeled tabs with relevant cards in each panel.
- **Consistency 8:** Project imagery, card treatment, and tabs align with the other divisions.
- **Accessibility 8:** Named tabs, labeled contact fields, image alternatives, and the mobile menu remain present.
- **Conversion 8:** The project action now exposes real featured work immediately; the separate contact action reaches the inquiry form.
- **Responsive 8:** Both project tabs fit at 390 px, and the page has no overflow.

## Remaining priority

Publish verified Construction projects or other specific work evidence. The single form and honest empty state make the inquiry path usable, but they cannot supply the project proof a prospective client may need before contacting the team. Property Management's category tabs are now discoverable at narrow widths; reducing the seven-card default portfolio or the separate testimonial block would further ease scanning without changing the direct Free Analysis path.
