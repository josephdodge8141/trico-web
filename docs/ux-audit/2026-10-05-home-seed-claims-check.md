# Home seed-claim check

The Home seed contained three dated 2024 “News & Updates” cards and four named job openings. The repository has no source or approval record for those statements, and the openings have no current vacancy status. They should not be presented to public visitors as current claims solely because they were seeded.

The public composition now omits an unchanged seed update and an unchanged seed opening. The editor retains every record and offers a Public visibility selection: keep its prior visibility, approve it, or hide it. New items start hidden. Existing custom published content keeps its previous visibility until an editor makes an explicit choice; an approved seed item can appear without changing its wording. The shared careers section remains on all six routes. When no current opening is listed, it says so and keeps the general resume form available. The form's delivery path and attachment behavior are unchanged.

| View       | Screenshot                                                 | Public Home height | Horizontal overflow |
| ---------- | ---------------------------------------------------------- | -----------------: | ------------------- |
| 1440 × 900 | [Desktop](./screenshots/home-seed-claims/home-desktop.png) |           5,453 px | None                |
| 390 × 844  | [Mobile](./screenshots/home-seed-claims/home-mobile.png)   |           8,778 px | None                |

Fresh anonymous Chromium contexts found no `#news` section, no Apply Now cards, one accurate no-openings message, and no page exceptions in either viewport. The two existing canonical scenarios were revised before implementation, failed against the previous preview, and passed after the change (2 scenarios, 17 steps). This is a factual-content check, not a fresh subjective score or proof that any specific opening is available.

The later visibility-control check exercised the Home news and careers editor selectors and saved an approved new opening through the real backend. The stored seed data remains unchanged; parsing an existing item supplies the legacy status. A direct contract check confirmed the four decisions: legacy seed hidden, legacy custom item visible, approved seed visible, and explicitly hidden custom item hidden.

The four leadership portraits sit below the first mobile screen. Previously, a fresh 390 px visit transferred 5,994,797 bytes of image resources before scrolling, including all four portraits. Native lazy loading now transfers only the 74,417-byte logo before scrolling; all four portraits load successfully when the leadership section approaches the viewport. The screenshots above were recaptured after bringing that section into view so they show the complete composition.
