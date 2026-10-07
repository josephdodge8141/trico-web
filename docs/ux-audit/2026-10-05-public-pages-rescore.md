# TriCo public pages: independent UX re-score — 2026-10-05

This re-score compares the running preview at `http://app.localhost:18090/` with the [first audit](./2026-10-05-public-pages.md). I reviewed all six public routes in Chromium at 1440 × 900 and 390 × 844, captured fresh full-page screenshots, and exercised mobile navigation, hero actions, listing tabs, a career application prefill, and a failed inquiry. Scores are judgments about the visitor's ability to find and complete a task, not a WCAG audit or a page-height contest. A score of 8 means a clear, usable path with only minor friction; 7 marks a material but nonblocking issue.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: |
| Home                |         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |
| Property Management |         8 |          8 |           7 |           8 |             8 |          8 |          7 | **7.7** |
| Real Estate         |         8 |          8 |           7 |           8 |             8 |          8 |          7 | **7.7** |
| Construction        |         8 |          8 |           7 |           8 |             8 |          7 |          8 | **7.7** |
| Storage             |         8 |          8 |           7 |           8 |             8 |          8 |          8 | **7.9** |
| Development         |         8 |          8 |           7 |           8 |             8 |          8 |          8 | **7.9** |

All 12 routes and viewports returned HTTP 200, with no page exceptions, broken images, unresolved in-page links, or horizontal overflow. The mobile menu's open control measured 44 × 44 px on every route; its Contact link landed at `#contact` and closed the menu. The published pages showed no literal “coming soon” or numbered partner placeholders. These are direct improvements over the first audit, as are relevant hero images on Property Management, Real Estate, and Development, and the removal of dead Property Management footer links. I did not send a fresh live inquiry in this visual pass. The current form code waits for the request before showing success, and the implementation task separately verified Mailpit delivery, including a career attachment.

## Home

[Desktop screenshot](./screenshots/rescore/home-desktop.png) · [Mobile screenshot](./screenshots/rescore/home-mobile.png)

- **Hierarchy 8:** The first screen leads with the family purpose, then a direct Divisions action; the five division cards are the next major section.
- **Navigation 8:** The shared mobile menu exposes Divisions, Careers, and Contact. I opened it and reached Contact without scrolling through the 10,189 px page.
- **Readability 8:** Large type and distinct section headings keep the long journey and leadership content scannable.
- **Consistency 8:** The blue palette, buttons, cards, and anniversary banner match the division pages.
- **Accessibility 8:** One H1, skip link, named 44 px mobile menu, and labeled application fields provide a sound observed baseline.
- **Conversion 8:** Explore our divisions lands on the cards; Get in touch is available in the desktop header and mobile menu. Career applications can be completed on the page.
- **Responsive 8:** Content stacks without clipping; the menu preserves task access at 390 px.

## Property Management

[Desktop screenshot](./screenshots/rescore/property-management-desktop.png) · [Mobile screenshot](./screenshots/rescore/property-management-mobile.png)

- **Hierarchy 8:** The value proposition, Free Analysis action, proof statistics, and now-relevant property photo communicate the offer immediately.
- **Navigation 8:** A compact desktop header and functioning mobile menu reach Services, Portfolio, Careers, and Contact. Public footer links have destinations or are omitted.
- **Readability 7:** The 4,065 px mobile portfolio section contains managed properties plus COA and HOA collections; the separate 1,848 px testimonials section adds another extended reading task. This composition, rather than the shared Card, causes the scanning load ([portfolio sections](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:435), [testimonials](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:573)).
- **Consistency 8:** Managed imagery and the common card system replace the earlier empty hero and public placeholders.
- **Accessibility 8:** The tested menu is 44 px, form fields have labels, and the page has a skip link and no observed broken images.
- **Conversion 8:** Both hero and later analysis actions jump to one Free Property Analysis form. Its success state follows the request rather than appearing locally on click.
- **Responsive 7:** There is no overflow, and Free Analysis bypasses the 19,265 px mobile document. A visitor comparing portfolio categories still has to traverse three stacked collections, because the mobile layout collapses the portfolio grids into one column ([portfolio collections](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:435)).

## Real Estate

[Desktop screenshot](./screenshots/rescore/real-estate-desktop.png) · [Mobile screenshot](./screenshots/rescore/real-estate-mobile.png)

- **Hierarchy 8:** Commercial and land scope, metrics, and a real featured listing establish relevance before the gallery.
- **Navigation 8:** The mobile menu reaches the main tasks; listing directory actions are available and visually secondary to the site contact action.
- **Readability 7:** The 5,147 px mobile Team section groups leadership, staff, and agents in sequence, so visitors looking for a specific person must scan many full profile cards. The page explicitly renders all three groups together ([team composition](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:606)).
- **Consistency 8:** Hero, listing, and profile imagery now use the same card and color language; unready review destinations are suppressed.
- **Accessibility 8:** Listing status uses labeled tabs. I focused Sold, pressed Enter, moved focus with an arrow key, and pressed Enter to return to Active; the selected tab changed correctly.
- **Conversion 8:** Five active listings have external detail links, the directory and contact actions are distinct, and Start Your Journey jumps to the working contact form.
- **Responsive 7:** Cards do not overflow, and the 19,431 px mobile page has direct section navigation. Nine sequential personnel profiles still make the team block a long one-column passage ([team composition](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:606)).

## Construction

[Desktop screenshot](./screenshots/rescore/construction-desktop.png) · [Mobile screenshot](./screenshots/rescore/construction-mobile.png)

- **Hierarchy 8:** Team photography, a quote action, and proof numbers form a credible first screen. Current and Completed Projects now have distinct headings.
- **Navigation 8:** Projects, Plan Room, Get a Bid, Careers, and Contact are exposed through the shared navigation. Plan Room offers an email request action.
- **Readability 7:** Current and Completed Projects each show a short empty state and Ask about projects action. They are honest, but two adjacent sections communicate nearly the same absence before Plan Room. Both are rendered by the same status loop when all project collections are empty ([project status loop](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:320)).
- **Consistency 8:** The hero and service cards match the family style, and fabricated project cards are hidden from the published view.
- **Accessibility 8:** The mobile menu, headings, labeled forms, image alternatives, and skip link behaved as expected in this pass.
- **Conversion 7:** Get a Quote reaches a contact form, but visitors seeking project proof find no published examples in either state. There is also a separate bid form before the contact quote form, making the best inquiry path less clear. The empty status is a content gap, while the duplicate form path is page composition ([empty-project handling](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:324), [bid form](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:579), [contact form](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:634)).
- **Responsive 8:** At 390 px, the page has no overflow, the project empty states are brief, and quote/contact navigation bypasses the 15,157 px total scroll.

## Storage

[Desktop screenshot](./screenshots/rescore/storage-desktop.png) · [Mobile screenshot](./screenshots/rescore/storage-mobile.png)

- **Hierarchy 8:** The owner-focused profitability promise, facility photo, and Partner With Us action set a clear purpose.
- **Navigation 8:** The mobile menu reaches Services, Features, About, Careers, and Contact; the primary hero action reaches the consultation form.
- **Readability 7:** The 3,193 px mobile Services section and 2,544 px Team section are useful but text-heavy when every card stacks. The page renders both collections in full before the contact section ([services](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/StorageExperience.tsx:272), [team](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/StorageExperience.tsx:301)).
- **Consistency 8:** Real facility imagery, common cards, and neutral profile fallback align with the other divisions. Public “coming soon” bios are hidden.
- **Accessibility 8:** Menu, skip link, and consultation labels were present. Submitting the empty form identified four required fields without a false success message.
- **Conversion 8:** Partner With Us reaches one consultation form. In a simulated request failure, the form showed an error and retained the entered first name.
- **Responsive 8:** The long mobile page has no overflow; the owner action and menu make the main task immediately reachable.

## Development

[Desktop screenshot](./screenshots/rescore/development-desktop.png) · [Mobile screenshot](./screenshots/rescore/development-mobile.png)

- **Hierarchy 8:** A real completed-home image, project action, contact action, and proof metrics make the first screen concrete.
- **Navigation 8:** The shared mobile menu exposes Projects, Team, Careers, and Contact. View Our Projects landed on the project section.
- **Readability 7:** The 2,673 px mobile Projects block includes category descriptions and featured cards, followed by a 1,719 px Team block; both are useful, but create a lengthy sequential scan for a visitor comparing work. The page renders those collections in full ([projects](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:321), [team](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/DevelopmentExperience.tsx:434)).
- **Consistency 8:** The hero image and featured cards now match the other divisions; numbered partner placeholders are absent in public view.
- **Accessibility 8:** Named navigation, a skip link, labeled form fields, and image alternatives were present in the observed states.
- **Conversion 8:** The two hero actions lead to project evidence and the contact form respectively; the inquiry path shows success only after a request.
- **Responsive 8:** The 12,503 px page stacks without overflow, with direct menu and hero links to the main tasks.

## Cross-page judgment and remaining priorities

The full career application appears on all five division pages, adding about 1,300–1,350 px to each mobile route. That is meaningful page length, but it also lets a visitor apply from the relevant division, filters openings to that division, and prefills the role after Apply Now. I verified the Real Estate form prefills “Real Estate” and “Leasing Agent.” The header's Contact link and each business CTA jump past Careers, so the repeated form does not materially block a client inquiry. I would retain its direct application path while reducing surrounding duplication before replacing it with a link back to Home ([shared careers implementation](/Users/Joe.Dodge/Personal/trico-web/frontend/components/CareersSection.tsx:89)).

The highest-value remaining improvements are to publish actual Construction examples or combine its two empty project sections, clarify which Construction inquiry form to use, and provide shorter ways to browse Property Management portfolios and Real Estate personnel on mobile. A small shared copy correction is also due: the careers description says “all four divisions” while five division pages are present ([careers seed](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/home.ts:201)).
