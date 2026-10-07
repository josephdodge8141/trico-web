# Property Management: fourth independent UX re-score — 2026-10-05, 23:10 UTC

This focused pass reviews the latest public Property Management page at `http://app.localhost:18090/property-management` in Chromium at 1440 × 900 and 390 × 844. It follows the [third public-page re-score](./2026-10-05-public-pages-rescore-3.md) without changing that historical checkpoint. I captured initial and expanded full-page screenshots, exercised both reveal controls by pointer and keyboard, and checked the mobile Contact path. Scores reflect task access and reading effort, not page height alone; this is not a formal WCAG audit.

| Page                | Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Previous mean |
| ------------------- | --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ------------: |
| Property Management |         8 |          8 |           8 |           7 |             8 |          8 |          8 | **7.9** |           7.9 |

The mean is unchanged because the previous readability issue is resolved while a separate proof-number inconsistency remains. The page returned HTTP 200 in both viewports, with no page exceptions, broken images, public placeholder text, unresolved in-page links, or horizontal overflow.

## What changed in the visitor path

[Desktop initial](./screenshots/rescore-4/property-management-desktop.png) · [Mobile initial](./screenshots/rescore-4/property-management-mobile.png) · [Desktop expanded](./screenshots/rescore-4/property-management-expanded-desktop.png) · [Mobile expanded](./screenshots/rescore-4/property-management-expanded-mobile.png)

| State                | Managed cards | Client stories | Desktop height | Mobile height |
| -------------------- | ------------: | -------------: | -------------: | ------------: |
| Initial              |        3 of 7 |         1 of 4 |      10,245 px |     15,948 px |
| Both expanded        |        7 of 7 |         4 of 4 |      11,186 px |     18,019 px |
| Both collapsed again |        3 of 7 |         1 of 4 |      10,245 px |     15,948 px |

The default mobile page is 1,935 px shorter than the previous 17,883 px capture; the default desktop page is 805 px shorter than its previous 11,050 px capture. Optional expansion restores all content. The Managed control reports “Show all 7 managed properties,” and the client section reports “Show all 4 client stories”; both switch to “Show fewer” and update `aria-expanded`. I activated both, then collapsed both with Enter. Source branches preserve all items in edit mode, but I did not authenticate or evaluate the editor in this public-page pass ([Managed branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:281), [client stories branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:639)).

[Managed initial view](./screenshots/rescore-4/portfolio-initial-mobile.png) · [Client stories initial view](./screenshots/rescore-4/stories-initial-mobile.png) · [Client stories expanded view](./screenshots/rescore-4/stories-expanded-mobile.png)

## Seven category scores

- **Hierarchy 8:** The hero still leads with the management offer, Free Analysis, proof metrics, and a relevant property image. The portfolio and stories follow as secondary evidence.
- **Navigation 8:** Managed, Commercial, and HOA tabs remain visible and usable at mobile width. The hero Free Analysis action and mobile Contact link bypass the full page and reach the inquiry section.
- **Readability 8:** Three property cards and one story give enough initial evidence without requiring a long scan. The controls name the full collection sizes, so additional detail is discoverable on demand. Expansion intentionally restores the longer reading path.
- **Consistency 7:** The public hero claims “300+ Properties” while the client stories statistics claim “500+ Properties Managed,” without a time frame or explanation of the different counts. Both claims are visible in the current page and come from separate seed fields; their relationship is unclear to a prospective owner ([hero statistic](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/property-management.ts:76), [client-story statistic](/Users/Joe.Dodge/Personal/trico-web/packages/zod/seeds/property-management.ts:424)).
- **Accessibility 8:** Both reveal controls are at least 44 px high, expose expanded state, and toggled with keyboard activation. The page retains labeled tabs, form controls, and the shared mobile menu.
- **Conversion 8:** Free Analysis remains the clear business action and goes directly to the single analysis form; optional portfolio and story details do not block that path.
- **Responsive 8:** The default page is shorter at 390 px, all controls and card images fit without overflow, and the mobile Contact menu item lands at `#contact` and closes the menu.

## Remaining action

Reconcile the two property-count claims or label their scopes clearly, such as current portfolio versus all-time properties managed, once the underlying figures are verified. No other category fell below 8 in this focused pass.
