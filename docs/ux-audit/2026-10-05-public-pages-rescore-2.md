# TriCo public pages: second independent UX re-score — 2026-10-05, 22:52 UTC

This pass reviews the refreshed preview at `http://app.localhost:18090/` after the page composition changes. The [first audit](./2026-10-05-public-pages.md) and [first re-score](./2026-10-05-public-pages-rescore.md) remain historical checkpoints. I inspected all six routes in Chromium at 1440 × 900 and 390 × 844, captured new full-page screenshots, and exercised the new tabs, Storage expansion controls, mobile menus, and Construction's quote path. A score of 8 means the task path is clear and usable with minor friction; 7 marks a material but nonblocking issue. These are UX judgments, not a formal WCAG audit.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Prior mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ---------: |
| Home                |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |        8.0 |
| Property Management |         8 |          7 |           7 |           8 |             8 |          8 |          7 | **7.6** |        7.7 |
| Real Estate         |         8 |          8 |           7 |           8 |             8 |          8 |          8 | **7.9** |        7.7 |
| Construction        |         8 |          8 |           8 |           8 |             8 |          7 |          8 | **7.9** |        7.7 |
| Storage             |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |        7.9 |
| Development         |         8 |          7 |           8 |           8 |             8 |          7 |          8 | **7.7** |        7.9 |

All six routes returned HTTP 200 in both viewports. I observed no page exceptions, broken images, public placeholder text, unresolved in-page links, or horizontal page overflow. The scores do not rise automatically because a page became shorter: they account for whether a visitor can find and use the intended content. Property Management and Development score lower than the first re-score because this pass exposed specific task access issues in their new or newly measured paths, despite reduced page length.

## Home

[Desktop screenshot](./screenshots/rescore-2/home-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/home-mobile.png)

- **Hierarchy 8:** The purpose statement and Divisions action remain clear above the five division cards.
- **Navigation 8:** The mobile menu exposes Divisions, Careers, and Contact without requiring a full-page scroll.
- **Readability 8:** Headings and generous spacing keep the long journey and leadership material scannable.
- **Consistency 8:** Banner, cards, actions, and color treatment continue to match the division pages.
- **Accessibility 8:** A skip link, one H1, named mobile menu, and labeled application fields remain present.
- **Conversion 8:** Visitors can reach divisions, contact details, or the career application from obvious paths.
- **Responsive 8:** The 390 px page stacks without overflow and retains menu access.

## Property Management

[Desktop screenshot](./screenshots/rescore-2/property-management-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/property-management-mobile.png)

- **Hierarchy 8:** Hero copy, Free Analysis, proof numbers, and a relevant property image make the service offer clear.
- **Navigation 7:** All three portfolio tabs worked, showing 7 managed properties, 2 commercial associations, and 1 HOA community. On mobile the 528 px tab row sits in a 358 px scroll area, and the HOA tab starts entirely off-screen without a visible cue to scroll sideways. This comes from the scrollable tab container and full-width labels ([portfolio tabs](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:481)).
- **Readability 7:** Tabs reduce the default portfolio section from 4,065 to 2,691 mobile px, but the seven managed-property cards and separate 1,848 px testimonial section still require substantial scanning. The default group and full testimonial collection are page composition choices ([portfolio groups](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:255), [testimonials](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:601)).
- **Consistency 8:** Managed images and shared card styling are coherent; unfinished cards stay out of public view.
- **Accessibility 8:** The tab list has an accessible name and the off-screen HOA tab remains reachable by keyboard; the menu and form controls are named and labeled.
- **Conversion 8:** Free Analysis jumps to one request form, bypassing portfolio length.
- **Responsive 7:** There is no page overflow, and default mobile height fell from 19,265 to 17,891 px. The portfolio tab row still needs horizontal scrolling at 390 px, with its third choice hidden at first sight ([tab scroll area](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:482)).

## Real Estate

[Desktop screenshot](./screenshots/rescore-2/real-estate-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/real-estate-mobile.png)

- **Hierarchy 8:** Commercial and land scope, proof metrics, and a real featured listing lead into the gallery.
- **Navigation 8:** The team tabs fit within the mobile viewport and switch between Leadership, Our Team, and Our Agents; listing and contact routes remain direct.
- **Readability 7:** Tabs remove the need to read all nine profiles in sequence, but the default is Our Agents: five full profiles still make a 3,039 px mobile section. The initial state and complete agent group cause the remaining reading load ([default tab](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:305), [team tabs](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:641)).
- **Consistency 8:** Listing and profile cards share the same visual system and real imagery.
- **Accessibility 8:** Both listing and team controls use named tabs; pointer and keyboard activation changed the selected panel in this pass.
- **Conversion 8:** Listing details and directories are available, and Start Your Journey reaches the contact form.
- **Responsive 8:** Mobile height fell from 19,431 to 17,323 px; team tabs fit without page or local horizontal overflow, and the main tasks remain reachable by menu or hero action.

## Construction

[Desktop screenshot](./screenshots/rescore-2/construction-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/construction-mobile.png)

- **Hierarchy 8:** Team imagery, proof figures, and quote action establish the offer on the first screen.
- **Navigation 8:** Get a Quote reaches the single bid/quote form at `#contact`; Plan Room and project inquiry paths remain discoverable.
- **Readability 8:** When no projects are published, one honest “Construction projects” state replaces two adjacent empty sections. The page then moves to Plan Room without repeating the same absence.
- **Consistency 8:** The photo, cards, and project empty state align with the rest of the site.
- **Accessibility 8:** The quote anchor placed the labeled form within view; the skip link, mobile menu, and image alternatives remain present.
- **Conversion 7:** There is now one construction inquiry form, and the hero reaches it. A visitor seeking proof of completed or current work still sees no published project examples, only a request to ask the team. The source suppresses the second state whenever all project collections are empty ([empty-project handling](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:324), [single form](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:593)).
- **Responsive 8:** The single empty state and single business form cut mobile height from 15,157 to 14,165 px without losing task access.

## Storage

[Desktop screenshot](./screenshots/rescore-2/storage-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/storage-mobile.png)

- **Hierarchy 8:** The owner-focused promise and Partner With Us action remain specific and prominent.
- **Navigation 8:** The mobile menu and hero action reach the main sections and consultation form.
- **Readability 8:** Six services are initially visible on mobile; Show all 12 services revealed the rest, and Read full bio expanded a team profile. Both changes shorten the default scan while preserving details.
- **Consistency 8:** Facility imagery, cards, and concise profile previews fit the shared visual language.
- **Accessibility 8:** The services control updates `aria-expanded`; profile details use native summary/details, and form labels remain present.
- **Conversion 8:** Partner With Us continues to reach one consultation form; the abbreviated services and bios do not interrupt that path.
- **Responsive 8:** Default mobile height fell from 11,939 to 10,059 px with no overflow; both expansion controls worked at 390 px.

## Development

[Desktop screenshot](./screenshots/rescore-2/development-desktop.png) · [Mobile screenshot](./screenshots/rescore-2/development-mobile.png)

- **Hierarchy 8:** The hero pairs real project imagery with separate project and contact actions.
- **Navigation 7:** The project tabs work and fit on mobile, but View Our Projects lands at the start of a section whose first 1,332 px is service cards. The Featured work and Project types tabs appear only afterward because `id="projects"` wraps both services and tabbed project content ([section anchor](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:387), [project tabs](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:418)).
- **Readability 8:** Featured work and project-type content now occupy separate, labeled tabs; each panel shows only the relevant cards.
- **Consistency 8:** Hero and project imagery, card treatment, and tab styling align with other divisions.
- **Accessibility 8:** Named tabs switched with pointer and keyboard input; navigation, form fields, and images retain accessible labels.
- **Conversion 7:** Start Your Project reaches the contact form, but the primary View Our Projects action does not place project evidence in view. Visitors must move past the service cards before seeing Featured work; the same anchor and section composition cause this mismatch ([hero action](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:291), [project section](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:387)).
- **Responsive 8:** Tabs fit at 390 px, the page has no overflow, and default mobile height fell from 12,503 to 12,023 px.

## Decision points

The changes improve actual task access: Property Management visitors can choose a portfolio category, Real Estate visitors can choose a team group, Storage visitors can reveal detail only when needed, and Construction offers one quote path. The remaining high-value fixes are to make the Property Management HOA tab visibly discoverable at 390 px and make Development's project CTA land at the featured work tabs. Publishing real Construction project evidence remains a content priority.

The full career application remains on each division page. It adds about 1,300 px on mobile, but Apply Now prefills the division and role, and business CTAs jump directly to contact. It does not materially block business inquiries in this pass. The earlier “all four divisions” copy is now corrected to “across TriCo divisions” ([career seed](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/home.ts:201)).
