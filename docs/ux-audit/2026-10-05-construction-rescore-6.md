# Construction: focused independent UX re-score — 2026-10-05, 23:26 UTC

I reviewed the refreshed public Construction page at `http://app.localhost:18090/construction` in Chromium at 1440 × 900 and 390 × 844. This follows the [third six-page re-score](./2026-10-05-public-pages-rescore-3.md). I captured full-page and Plan Room views, followed mobile Plan Room navigation, inspected Request Access, and exercised the quote and project-inquiry paths. Scores reflect what a visitor can do in the public preview, not a formal WCAG audit.

| Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Previous mean |
| --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ------------: |
|         8 |          7 |           8 |           8 |             8 |          7 |          8 | **7.7** |           7.9 |

[Desktop page](./screenshots/construction-rescore-6/construction-desktop.png) · [Mobile page](./screenshots/construction-rescore-6/construction-mobile.png) · [Desktop Plan Room](./screenshots/construction-rescore-6/plan-room-desktop.png) · [Mobile Plan Room](./screenshots/construction-rescore-6/plan-room-mobile.png)

## Seven category scores

- **Hierarchy 8:** A team photo, proof metrics, and quote action lead the page. The Plan Room has a clear restricted-access notice and request card.
- **Navigation 7:** The mobile Plan Room link lands at `#plan-room` and closes the menu; Request Access opens a preaddressed email. The page says approved subcontractors can access current plans and asks for credentials, but exposes no sign-in or plan destination for someone who already has credentials. The public section contains only the email request link ([Plan Room copy](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:151), [public section and request](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:400)). An external portal may exist, but this page does not tell the visitor where to go.
- **Readability 8:** The four seeded project names, numbers, dates, and revision labels no longer appear in public. “Restricted project plans” and the request card are much shorter than a stale-looking plan list. The page passes an empty collection to the public plan renderer ([plan collection branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:418)).
- **Consistency 8:** Plan Room now presents restricted access consistently with the request action. Shared cards, hero styling, and the single project empty state match the rest of the site.
- **Accessibility 8:** The menu, named Request Access link, skip link, labeled quote form, and image alternatives were present. No inert public plan buttons were exposed.
- **Conversion 7:** Get a Quote and Ask about projects both reach the single visible business form, but no current or completed project example is published to support the “500+ Projects Completed” claim. All seeded project collections are empty, so the public page shows an inquiry prompt instead ([proof claim](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:87), [empty collections](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/construction.ts:423), [empty-state rendering](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/ConstructionExperience.tsx:324)).
- **Responsive 8:** The page has no horizontal overflow at 390 px. The mobile menu reaches Plan Room and the quote form; the mobile page is 13,281 px, down from 14,165 px in the previous pass.

Both viewports returned HTTP 200. I observed no page exceptions, broken images, unresolved in-page anchors, or seeded plan names/revisions in the public document. Request Access is a `mailto:` handoff; I did not send an email or verify credential fulfillment.

## Evidence needed for a higher conversion score

Publish verified current or completed work: approved project names and locations, actual project photos, work scope, status or completion dates, and attribution or client permission where needed. One or two credible examples would let a visitor assess the construction claim before asking for references. The current empty collections and unpublished seed plan names are not a substitute for that evidence. For the subcontractor path, add the real credentialed destination or state where approved users should sign in once that destination is known.
