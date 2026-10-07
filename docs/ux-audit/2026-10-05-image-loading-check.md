# Public image loading check

Each measurement used a fresh anonymous Chromium context at 390 × 844, `deviceScaleFactor: 1`, and the local Compose preview at `http://app.localhost:18090/`. After `networkidle` at the top of each route, the table sums `PerformanceResourceTiming.encodedBodySize` for resources with `initiatorType === 'img'`. It excludes CSS background images, fonts, JavaScript, and images fetched after scrolling. Browser native lazy-loading thresholds can vary by engine and connection; this is a reproducible first-viewport transfer comparison, not a real-user performance score.

| Route               |          Before |           After | Reduction |
| ------------------- | --------------: | --------------: | --------: |
| Home                | 5,994,797 bytes |    74,417 bytes |     98.8% |
| Property Management | 8,533,930 bytes | 2,462,459 bytes |     71.1% |
| Real Estate         | 9,131,549 bytes | 1,247,969 bytes |     86.3% |
| Construction        | 5,709,478 bytes |   898,454 bytes |     84.3% |
| Storage             | 5,119,724 bytes | 3,003,611 bytes |     41.3% |
| Development         | 8,897,723 bytes | 2,162,587 bytes |     75.7% |

Below-fold portfolio, profile, project, gallery, worker, testimonial, and footer images now use native lazy loading. First-screen hero media stays eager. The shared profile component covers multiple divisions. The existing six-route canonical browser outline was revised before implementation and failed for every route against the eager-loading preview; it now checks that visible images positioned more than 1.5 viewports below the top declare lazy loading. On Home, all four leadership portraits loaded successfully after scrolling to that section. The remaining first-viewport bytes include hero imagery and assets that Chromium begins fetching near the viewport, particularly a Storage profile portrait.

A separate sweep scrolled each of the six public routes from top to bottom at 390 px, waited for network idle, and found no broken visible images, horizontal overflow, or page exceptions. Hidden tab panels were outside that visible-image check; their browsing behavior remains covered by the live Compose scenarios.
