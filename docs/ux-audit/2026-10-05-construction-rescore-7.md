# Construction: final focused UX re-score — 2026-10-05, 23:33 UTC

I reviewed the refreshed public Construction preview at `http://app.localhost:18090/construction` in Chromium at 1440 × 900 and 390 × 844. This follows the [previous Plan Room re-score](./2026-10-05-construction-rescore-6.md). I captured the current full page and Plan Room, followed mobile Plan Room navigation, inspected Request Plans, and checked the quote and project-inquiry anchors. This is a task-path assessment, not a formal WCAG audit.

| Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Previous mean |
| --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ------------: |
|         8 |          8 |           8 |           8 |             8 |          7 |          8 | **7.9** |           7.7 |

[Desktop page](./screenshots/construction-rescore-7/construction-desktop.png) · [Mobile page](./screenshots/construction-rescore-7/construction-mobile.png) · [Desktop Plan Room](./screenshots/construction-rescore-7/plan-room-desktop.png) · [Mobile Plan Room](./screenshots/construction-rescore-7/plan-room-mobile.png)

- **Hierarchy 8:** The team photo, proof metrics, and quote action lead clearly; Plan Room has one restricted-access explanation and a request card.
- **Navigation 8:** Mobile Plan Room navigation landed at `#plan-room` and closed the menu. The public copy now says approved subcontractors receive plans by request, and Request Plans opens a preaddressed `mailto:` link with a project-plans subject. The stated path and visible action match ([public copy and request](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:402), [seeded request text](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:200)).
- **Readability 8:** Four dated plan seeds and revision labels remain absent from the public page; only the restricted notice and request action appear. The plan collection is empty in public mode ([public plan branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:435)).
- **Consistency 8:** The page no longer claims there is a login or credentials path that it cannot show. Plan Room language consistently describes direct sharing by request.
- **Accessibility 8:** Menu and request link have names, quote fields have labels, and the page has a skip link and image alternatives. No inert plan controls are public.
- **Conversion 7:** Get a Quote and Ask about projects both reach one business form, but visitors still cannot see a real current or completed project example supporting “500+ Projects Completed.” All seeded project collections are empty, so the page presents an inquiry prompt ([proof claim](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:87), [empty project seeds](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:423), [empty-state display](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:324)).
- **Responsive 8:** At 390 px, the page has no horizontal overflow; Plan Room and quote navigation work. Mobile height is 13,261 px.

Both viewports returned HTTP 200, with no page exceptions, broken images, unresolved in-page anchors, seeded plan names, revision labels, or login/credential claims in public text. Request Plans hands off to the visitor's email client; I did not send a request or verify plan delivery.

**Factual blocker for Conversion 8:** Publish at least one approved current or completed construction example with a verified name, location, scope, status or completion date, real project imagery, and permission for public attribution. The current “500+” count and inquiry route establish a claim and contact path, but not inspectable work evidence.
