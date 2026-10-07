# TriCo public pages: eighth independent UX re-score — 2026-10-05, 19:37 MDT

I reviewed the running public preview at `http://app.localhost:18090/` in Chromium at **1440 × 900** and **390 × 844** after the Home news suppression, testimonial visibility controls, and lazy image loading. I scrolled through every page before capturing full-page screenshots so deferred images had an opportunity to load. I also followed each mobile hero action and mobile Contact menu link, and exercised the Property Management portfolio reveal, Real Estate listing/team tabs, Storage service reveal, and Development project action. These scores measure visible task access and reading effort, not a formal WCAG audit or a performance benchmark.

The previous score is the latest available for that page: [third all-page pass](./2026-10-05-public-pages-rescore-3.md) for Home, Real Estate, Storage, and Development; [fifth Property Management pass](./2026-10-05-property-management-rescore-5.md); and [seventh Construction pass](./2026-10-05-construction-rescore-7.md). The [original audit](./2026-10-05-public-pages.md) remains the baseline.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive | Previous mean | Current mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------------: | -----------: |
| Home                |         8 |          8 |           8 |           8 |             8 |          8 |          8 |           8.0 |      **8.0** |
| Property Management |         8 |          8 |           8 |           8 |             8 |          8 |          8 |           8.0 |      **8.0** |
| Real Estate         |         8 |          8 |           8 |           8 |             8 |          8 |          8 |           8.0 |      **8.0** |
| Construction        |         8 |          8 |           8 |           8 |             8 |          7 |          8 |           7.9 |      **7.9** |
| Storage             |         8 |          8 |           8 |           8 |             8 |          8 |          8 |           8.0 |      **8.0** |
| Development         |         8 |          8 |           8 |           8 |             8 |          8 |          8 |           8.0 |      **8.0** |

**No score changed.** Removing unapproved content improves factual presentation, but it does not independently prove stronger usability or conversion. All 12 loads returned HTTP 200. After scrolling, I observed no broken images, page exceptions, unresolved in-page links, or horizontal overflow. The reviewed pages also showed no public “coming soon” or numbered-partner placeholders. All six mobile Contact menu links reached `#contact` and closed the menu. The 8s indicate clear usable routes with minor friction; they are not claims of perfection.

## Home

[Desktop screenshot](./screenshots/rescore-8/home-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/home-mobile.png)

- **Hierarchy 8:** The purpose statement and Explore our divisions action lead into the five division cards; the page then moves through values, history, leadership, and careers.
- **Navigation 8:** The hero action lands at `#divisions`; the mobile menu reaches Contact and closes after selection.
- **Readability 8:** The leadership grid and career form remain easy to scan. Suppressing public news leaves no empty news section between leadership and careers ([public news filter and section condition](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/HomeExperience.tsx:245)).
- **Consistency 8:** Banner, palette, cards, and action styling remain aligned with the division pages.
- **Accessibility 8:** One H1, a skip link, named menu controls, and labeled career fields are present in the rendered page.
- **Conversion 8:** Visitors can explore a division, use published contact details, or submit a resume. Careers now says no openings are listed while keeping that resume route ([public opening filter](/Users/Joe.Dodge/Personal/trico-web/frontend/components/CareersSection.tsx:127)).
- **Responsive 8:** The 390 px page stacks cleanly without clipping or horizontal scroll; default full-page height is 8,778 px.

## Property Management

[Desktop screenshot](./screenshots/rescore-8/property-management-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/property-management-mobile.png)

- **Hierarchy 8:** The Free Analysis action, proof metrics, and property image make the offer clear on the first screen.
- **Navigation 8:** The hero action lands at `#contact`; Managed, Commercial, and HOA remain visible as portfolio choices.
- **Readability 8:** The Managed view initially presents three of seven cards. The named reveal expands the collection to seven. The unapproved client-story section is absent, without a blank gap ([public testimonial filter](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:211), [section condition](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:650)).
- **Consistency 8:** The 300+ property claim is not contradicted by the formerly visible lower 500+ testimonial statistic; public rendering passes an empty statistics collection ([public/editor branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:723)).
- **Accessibility 8:** The portfolio tabs and reveal have discernible names; after activating the reveal, its label changes to “Show fewer managed properties.”
- **Conversion 8:** Free Analysis reaches one request form directly; the portfolio does not have to be expanded first.
- **Responsive 8:** The tabs and cards fit at 390 px with no horizontal scroll; default full-page height is 14,777 px.

## Real Estate

[Desktop screenshot](./screenshots/rescore-8/real-estate-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/real-estate-mobile.png)

- **Hierarchy 8:** The commercial/land offer and proof metrics lead into actual featured listing cards.
- **Navigation 8:** Start Your Journey reaches `#contact`; Sold listings and team categories switch when selected.
- **Readability 8:** Listings and people remain grouped in tabs, and full profile text is disclosed on demand. The unapproved testimonial section is absent without an empty heading ([public filter and section condition](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/RealEstateExperience.tsx:363)).
- **Consistency 8:** Listing cards, real profile portraits, and the shared contact treatment fit the division design.
- **Accessibility 8:** The tabs retain names and selected states; profile bios use native disclosure controls and the inquiry fields have labels.
- **Conversion 8:** Listing detail links, agent contacts, and the inquiry form give distinct next steps.
- **Responsive 8:** Tabs and cards fit at 390 px without overflow; default full-page height is 15,894 px.

## Construction

[Desktop screenshot](./screenshots/rescore-8/construction-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/construction-mobile.png)

- **Hierarchy 8:** The crew photo, quote action, and service summary explain the offer quickly.
- **Navigation 8:** Get a Quote reaches `#contact`; Request Plans opens a preaddressed email request from the Plan Room.
- **Readability 8:** One short “Construction projects” state replaces repeated empty project lists; the public Plan Room shows request information without stale plan names.
- **Consistency 8:** The Plan Room says plans are shared by request, matching its email action and avoiding an unsupported login path ([public Plan Room](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:402)).
- **Accessibility 8:** The skip link, named mobile menu, quote field labels, and image alternatives are present.
- **Conversion 7:** The quote form and project inquiry work as paths, but visitors still cannot inspect a current or completed project behind “500+ Projects Completed.” Every seeded project collection is empty and the public page instead offers details by request ([claim](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:85), [empty collection seeds](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:423), [public empty state](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:326)). This is the only category below 8 and remains a content proof gap.
- **Responsive 8:** Plan Room and quote paths remain usable at 390 px with no horizontal scroll; full-page height is 13,208 px.

## Storage

[Desktop screenshot](./screenshots/rescore-8/storage-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/storage-mobile.png)

- **Hierarchy 8:** Partner With Us, owner-focused profitability, and a facility photo establish the offer first.
- **Navigation 8:** The hero action lands at `#contact`; Services, About, Careers, and Contact remain reachable by menu.
- **Readability 8:** Six services are visible initially, with a named control to reveal the other six; team bios remain individually expandable.
- **Consistency 8:** Facility imagery, service cards, and concise profile previews match the site design.
- **Accessibility 8:** The services reveal exposes its expanded state, bios use native disclosure, and the consultation form has labels.
- **Conversion 8:** The partnership request form is reached from the first screen without traversing the service catalog.
- **Responsive 8:** Content stacks at 390 px without clipping or overflow; default full-page height is 10,059 px.

## Development

[Desktop screenshot](./screenshots/rescore-8/development-desktop.png) · [Mobile screenshot](./screenshots/rescore-8/development-mobile.png)

- **Hierarchy 8:** Project imagery and separate View Our Projects and Start Your Project actions make the two primary paths clear.
- **Navigation 8:** The first action lands at `#project-gallery`, where the Featured work and project-type tabs are available; Contact also works from the mobile menu.
- **Readability 8:** Featured work and project types occupy separate labeled tabs, so visitors can inspect evidence without scanning all categories at once.
- **Consistency 8:** Project cards, imagery, and tab treatment align with the other divisions.
- **Accessibility 8:** Tabs retain names and selected states; the contact form has labels and images have alternatives.
- **Conversion 8:** The project path exposes featured work, and the separate contact action reaches the development inquiry form.
- **Responsive 8:** Both project tabs fit at 390 px with no horizontal overflow; default full-page height is 12,023 px.

## Owner content needed

The material blocker is an approved Construction project example: verified name, location, scope, status or completion date, real imagery, and permission to publish. The owner should also verify the “500+ Projects Completed” figure before relying on it as public proof. If TriCo wants news, client stories, or named job openings back on the public pages, it needs current approved items and any required quote, image, and attribution permissions. The current suppression gives visitors an honest page while those items are unavailable.

The lazy-loading result is limited to this rendered check: after scrolling through all 12 pages, every image in the DOM loaded successfully; five to eleven images per page were marked lazy. I did not measure Core Web Vitals or network savings. The career and inquiry submission backends, editor view, email delivery, and accessibility with assistive technology were outside this visual re-score.
