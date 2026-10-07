# Property Management: fifth independent UX re-score — 2026-10-05, 23:16 UTC

This final focused pass reviews the refreshed public preview at `http://app.localhost:18090/property-management` in Chromium at 1440 × 900 and 390 × 844. The [fourth re-score](./2026-10-05-property-management-rescore-4.md) remains the earlier checkpoint. I captured initial and expanded states, checked both reveal controls, the portfolio tabs, the Free Analysis action, and mobile Contact navigation. Scores judge public task access; this is not a formal WCAG audit.

| Hierarchy | Navigation | Readability | Consistency | Accessibility | Conversion | Responsive |    Mean | Previous mean |
| --------: | ---------: | ----------: | ----------: | ------------: | ---------: | ---------: | ------: | ------------: |
|         8 |          8 |           8 |           8 |             8 |          8 |          8 | **8.0** |           7.9 |

[Desktop initial](./screenshots/rescore-5/property-management-desktop.png) · [Mobile initial](./screenshots/rescore-5/property-management-mobile.png) · [Desktop expanded](./screenshots/rescore-5/property-management-expanded-desktop.png) · [Mobile expanded](./screenshots/rescore-5/property-management-expanded-mobile.png)

- **Hierarchy 8:** The value proposition, Free Analysis action, proof metrics, and property image are clear on the first screen. Portfolio and client stories follow as supporting evidence.
- **Navigation 8:** Managed, Commercial, and HOA tabs fit in the viewport at both widths. Free Analysis reaches `#contact`; the mobile Contact menu item also reached it and closed the menu.
- **Readability 8:** The default view has 3 of 7 managed cards and 1 of 4 stories. Named reveal controls restore all items on demand. Default height is 10,018 px desktop and 15,514 px mobile, down from 10,245 and 15,948 px in the previous pass.
- **Consistency 8:** The public view now shows the hero's “300+ Properties” statistic without the unexplained “500+ Properties Managed” figure that appeared lower on the page. This holds both before and after expanding the stories. The page passes an empty collection to the lower statistics renderer for public visitors while retaining the editable collection for authenticated editors ([public/editor branch](/Users/Joe.Dodge/Personal/trico-web/frontend/pages/PropertyManagementExperience.tsx:699)). The editor state itself was outside this unauthenticated pass.
- **Accessibility 8:** All portfolio tabs are visible and 44 px high. Both 44 px reveal controls responded to Enter, displayed all seven cards and four stories, and updated `aria-expanded` to `true`.
- **Conversion 8:** The single Free Analysis form remains reachable directly from the hero and navigation, without requiring a visitor to expand content or traverse the page.
- **Responsive 8:** There was no horizontal overflow at 390 px. Both the default and expanded cards stayed within the viewport.

Both loads returned HTTP 200. After images settled, I observed no page exceptions, broken images, public placeholder text, or unresolved in-page links. The expanded page measured 10,959 px desktop and 17,585 px mobile; that longer route is opt-in. No public category remains below 8 in this pass.
