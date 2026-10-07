# TriCo public-page UX audit — 2026-10-05

Six unauthenticated public routes were reviewed in Chromium at 1440 × 900 and 390 × 844. Each route returned HTTP 200. No page script exceptions, failed image loads, or horizontal overflow appeared in these passes. Scores are UX judgments from the captured states, not a formal WCAG or usability-study result. Screenshots were refreshed after the authentication-gating change; none of the 12 captures shows an **Enter edit mode** control.

The source attribution below compares each score with the current TriCo implementation and `/Users/Joe.Dodge/Personal/fullstack-ts`. **Conversion scores rate the visible path only.** The current public inquiry and application forms prevent submission, reset or show success locally, and make no delivery request ([career handler](/Users/Joe.Dodge/Personal/trico-web/frontend/components/CareerApplicationForm.tsx:91), [Property Management forms](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementForms.tsx:81), [Real Estate forms](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateForms.tsx:14), [Construction forms](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionClientForm.tsx:24), [Storage form](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/StorageContactForm.tsx:15), [Development form](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentContactForm.tsx:11)). These scores must be revisited for end-to-end lead capture.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: |
| Home                |         8 |          5 |           8 |           8 |             7 |          7 |          6 | **7.0** |
| Property Management |         7 |          6 |           7 |           7 |             6 |          7 |          6 | **6.6** |
| Real Estate         |         8 |          7 |           7 |           7 |             7 |          8 |          7 | **7.3** |
| Construction        |         7 |          7 |           7 |           7 |             7 |          8 |          7 | **7.1** |
| Storage             |         8 |          7 |           7 |           8 |             7 |          8 |          7 | **7.4** |
| Development         |         7 |          7 |           7 |           7 |             7 |          7 |          7 | **7.0** |

## What causes the scores?

The copied `MarketingLayout`, `Container`, `Card`, and DS-21 TriCo theme match their current `fullstack-ts` counterparts. They contribute to consistent card styling, spacing constraints, and color. The page files and content seeds choose the headers, hero treatment, section order, number of cards, and links ([base wrapper](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/design-system/page-patterns.tsx:17), [base container](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/design-system/layout.tsx:10), [base card](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/components/ui/card.tsx:4), [theme](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/design-system/themes/presets/ds-21-trico.css:10)). The main weak scores therefore trace to TriCo composition or content, with two shared-control qualifications:

- On division pages, TriCo selects `Button size="icon"` for mobile navigation. The inherited variant is `size-8` (32px), so the undersized target is a combination of the base default and the page's variant choice ([base Button](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/components/ui/button.tsx:27), [Property Management use](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:337)).
- Real Estate builds its own listing tabs even though the base library has a Tabs primitive. Its keyboard behavior needs a separate interaction check; the screenshots did not establish a failure ([page tabs](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:502), [base Tabs](/Users/Joe.Dodge/Personal/fullstack-ts/frontend/components/ui/tabs.tsx:7)).

Each page's linked source trace covers **all seven score categories**, including positive effects of the base components, TriCo choices, and limits of the screenshot evidence.

## Home

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/home-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/home-mobile.png)

- **Hierarchy 8:** The large headline, short explanation, and two primary paths are immediately legible. The hero's second large TriCo logo adds little product context.
- **Navigation 5:** Desktop section links are clear, but the 390px header hides them without a mobile menu. The hero offers links to Divisions and Our Story only; Careers and Contact must be found by scrolling.
- **Readability 8:** Large type and generous spacing support scanning. The lengthy journey timeline and stacked sections make the lower page slower to digest.
- **Consistency 8:** Cards, badges, blue surfaces, and section spacing form a coherent system; the oversized logo artwork feels less purposeful than division photography.
- **Accessibility 7:** One H1, named links/buttons, labeled form fields, and a skip link are present. Missing mobile header navigation reduces wayfinding for keyboard and screen-reader users too.
- **Conversion 7:** “Explore our divisions” is an apt first action, and Get in Touch/Resume paths exist, but contact and careers actions are far down the page.
- **Responsive 6:** There is no horizontal overflow at 390px, but the page becomes 10,225px tall and loses header navigation.

**Source attribution:** [All seven Home scores](./causes/home.md). The missing mobile path comes from Home's `hidden md:flex` navigation with no alternate control ([header](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/HomeExperience.tsx:273)); the long page and secondary logo are Home composition/content choices. The base layout does not determine them.

## Property Management

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/property-management-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/property-management-mobile.png)

- **Hierarchy 7:** Value proposition, analysis CTA, and proof metrics lead well. The hero's generic image placeholder fails to show the portfolio or team.
- **Navigation 6:** The mobile menu opens and exposes section links, but the desktop header packs roughly a dozen destinations into one row. Six footer links (social, privacy, terms) use `href="#"` and lead nowhere.
- **Readability 7:** Sections and cards are labeled clearly, yet the dense service grids and 13,797px desktop page require substantial scanning.
- **Consistency 7:** Shared cards and colors are coherent. The empty hero panel and seven instances of “coming soon” interrupt the otherwise concrete portfolio story.
- **Accessibility 6:** Forms have accessible labels and the page has a skip link. The mobile menu target is only 32 × 32px, and the six placeholder footer links are misleading destinations.
- **Conversion 7:** The Free Analysis action is prominent and a matching form exists. Multiple inquiry/resume/analysis forms make the preferred next step less decisive.
- **Responsive 6:** No horizontal overflow and the menu works, but the single-column mobile page reaches 22,819px and asks users to scroll through many similar cards and forms.

**Source attribution:** [All seven Property Management scores](./causes/property-management.md). Four seeded empty social URLs fall back to `#`, and two legal links are hardcoded to `#`; seed placeholders produce the visible “coming soon” content. The page packs navigation and many sections into one long route ([social links](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:850), [legal links](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:889), [seed](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/property-management.ts:357)). Base cards are not the source of those defects. Both lead forms show local success without delivery ([handlers](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementForms.tsx:81)).

## Real Estate

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/real-estate-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/real-estate-mobile.png)

- **Hierarchy 8:** Headline, service scope, metrics, and featured listings appear in a useful sequence. The hero's generic building icon is weaker evidence than the property imagery below.
- **Navigation 7:** Desktop links cover the main tasks and the mobile menu works. The many desktop destinations make the header busy.
- **Readability 7:** Listings and service cards scan well; the long team, FAQ, careers, reviews, and form sections extend the mobile page to 21,132px.
- **Consistency 7:** The shared blue/card language is steady, while the icon-only hero and a few “coming soon” areas feel less complete than the listing grid.
- **Accessibility 7:** Semantic headings, named controls, labeled fields, and no observed broken images are strengths. The mobile menu target is 32 × 32px.
- **Conversion 8:** “Start Your Journey,” listing tabs, and inquiry forms make both browsing and contacting straightforward.
- **Responsive 7:** Listing cards stack without overflow and the mobile menu opens; the total mobile scroll is still long.

**Source attribution:** [All seven Real Estate scores](./causes/real-estate.md). The page hardcodes a generic hero icon despite rendering listing imagery later, seeds eight header links, and leaves review URLs empty ([hero](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:487), [links](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/real-estate.ts:44), [reviews](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/real-estate.ts:545)). Its inquiry forms show success without delivery ([handler](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateForms.tsx:14)). The base primitives support the consistent card and grid presentation.

## Construction

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/construction-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/construction-mobile.png)

- **Hierarchy 7:** Team photography, a quote CTA, and numeric proof create a credible first screen. Current and Completed Projects each use the identical H2 “Built Across Every Sector,” making two different sector grids look repetitive.
- **Navigation 7:** The mobile menu opens; desktop links expose Projects, Plan Room, Get a Bid, and Contact. The header is crowded at desktop width.
- **Readability 7:** Service/sector cards are concise, but repeating the same eight sectors for current and completed work lengthens the path to actual project details.
- **Consistency 7:** Theme and card treatments match other divisions. Reused sector headings weaken the distinctness of the two project states.
- **Accessibility 7:** Named controls, labeled forms, and alt-bearing imagery are present. The mobile menu target is 32 × 32px.
- **Conversion 8:** Get a Quote is prominent in the header and hero, with bid request and contact forms lower on the page.
- **Responsive 7:** No overflow at 390px; the 18,526px mobile page and repeated grids demand heavy scrolling.

**Source attribution:** [All seven Construction scores](./causes/construction.md). Two seeded project states share an H2 and the page repeats an eight-sector grid for each; all 16 seeded project collections are empty ([headings](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:139), [page loop](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:367), [collections](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:449)). Bid/contact forms show local success without delivery, and Plan Room's View Plans/Specs controls have no action ([form handler](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionClientForm.tsx:24), [plan controls](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:451)). The base Card does not cause the repetition.

## Storage

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/storage-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/storage-mobile.png)

- **Hierarchy 8:** A specific profitability message, facility photo, and Partner With Us CTA establish purpose quickly.
- **Navigation 7:** The desktop header is simple and the mobile “Open navigation” control works. Several sections still require scrolling rather than direct task shortcuts.
- **Readability 7:** The service grid has clear labels, but several management bios are dense next to sparse “coming soon” profiles.
- **Consistency 8:** Real facility imagery and the shared card/theme system make this one of the most coherent division pages; five “coming soon” instances reduce polish.
- **Accessibility 7:** Named menu and form controls, skip link, and no observed broken imagery support access. The mobile menu target is 32 × 32px.
- **Conversion 8:** Partner With Us and the consultation form form a clear owner-focused path.
- **Responsive 7:** No overflow; the 12,747px mobile page is shorter than most divisions, though service cards are entirely stacked.

**Source attribution:** [All seven Storage scores](./causes/storage.md). Storage's real hero photo and focused CTA are page/content strengths; five “coming soon” items come from seed or empty review URLs, not the base card. The consultation form shows a 24-hour follow-up message without sending the inquiry ([handler](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/StorageContactForm.tsx:15)).

## Development

[Desktop screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/development-desktop.png) · [Mobile screenshot](/Users/Joe.Dodge/Personal/trico-web/docs/ux-audit/screenshots/development-mobile.png)

- **Hierarchy 7:** Project and contact actions are visible immediately, with completed-house imagery further down. The hero uses a generic building icon in place of a development image.
- **Navigation 7:** The mobile menu works and the desktop header offers the main sections; the many links mildly crowd the header.
- **Readability 7:** Service categories are clear, but small text in cards and a 14,083px mobile page slow scanning.
- **Consistency 7:** The card/theme system aligns with the other divisions, but six literal “Builder Partner 1”/“Investor Partner 1” cards look like unfinished content.
- **Accessibility 7:** Named controls, labeled fields, and semantic headings are present. The mobile menu target is 32 × 32px.
- **Conversion 7:** “Start Your Project” is visible, but generic hero artwork and numbered partner placeholders weaken trust before the inquiry form.
- **Responsive 7:** No horizontal overflow and a functioning mobile menu; the hero and subsequent cards stack cleanly but make for a long scroll.

**Source attribution:** [All seven Development scores](./causes/development.md). The page hardcodes a building icon although a hero image asset exists in older content metadata, and six numbered partner labels are seed literals ([hero panel](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:308), [partners](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/development.ts:201)). The contact form shows a 24-hour reply promise without delivery, and View Current/Completed controls have no action ([handler](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentContactForm.tsx:11), [project controls](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:396)). These are TriCo implementation/content gaps, not theme defects.

## Highest-impact follow-ups

1. Restore a visible mobile navigation path on Home.
2. Replace the generic Property Management, Real Estate, and Development hero placeholders with relevant, accessible imagery or stronger factual proof.
3. Replace public “coming soon” and numbered partner placeholders with verified content or remove those cards until ready.
4. Clarify Construction’s Current/Completed Projects headings and differentiate the two repeated sector grids.
5. Replace Property Management’s six `href="#"` footer destinations with real destinations or remove the links.
6. Review page length and repeated lead forms on Property Management and Real Estate; keep a clear primary next action at each major section.
7. Make public inquiry/application forms deliver submissions before showing success; give Construction and Development's inert project controls real destinations or remove them.
