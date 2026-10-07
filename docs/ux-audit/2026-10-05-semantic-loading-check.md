# Public route semantics and loading check — 2026-10-05

I inspected the running Compose preview at `http://app.localhost:18090/` in headless Chromium after the eighth visual re-score. This is a browser DOM and simulated-loading check, not a screen-reader usability study or field Core Web Vitals report.

All six public routes had one visible H1, no visible unlabeled button/link/form control, no visible image missing an `alt` attribute, and no duplicate DOM ID at both 390px and 1440px. They previously shared the browser title `TriCo · Building Utah's Future`; each now has a distinct route title. Navigating from Home to Real Estate and back updates the title in the same browser session. The Construction category and editor sign-in routes also have distinct titles.

A later keyboard check found that the shared header's `aria-controls` attributes referred to menu elements absent from the closed DOM, and its expanded mobile button still said “Open navigation.” The header now keeps both controlled menu elements present but hidden when closed. The mobile label switches to “Close navigation” while expanded. On all six public pages, Enter opens each available menu, Escape closes it, `aria-expanded` tracks visibility, and focus stays on the trigger. The Construction category header also passed its existing behavior. This is a keyboard and rendered-accessibility-state check, not a spoken screen-reader session.

Chromium's exposed accessibility tree showed **no unnamed interactive control** among 20 Home, 46 Property Management, 52 Real Estate, 41 Construction, 34 Storage, and 35 Development controls at mobile width. An authenticated Home editor session exposed 191 interactive controls, also with no empty accessible name. This establishes names in Chromium's tree for those states; it does not establish the quality of the names, announcement order, contrast, or task completion with assistive technology.

For a repeatable local stress check, I loaded each public route once in a fresh 390 × 844 Chromium context with 150ms emulated network latency, 200,000 bytes/second download, 95,000 bytes/second upload, and 4× CPU throttling. A buffered `PerformanceObserver` recorded Largest Contentful Paint (LCP) and non-input Cumulative Layout Shift (CLS) 2.2 seconds after the load event.

| Route               | LCP, ms | CLS |
| ------------------- | ------: | --: |
| Home                |   2,700 |   0 |
| Property Management |   2,860 |   0 |
| Real Estate         |   2,880 |   0 |
| Construction        |   2,780 |   0 |
| Storage             |   2,768 |   0 |
| Development         |   2,836 |   0 |

These are single-run local observations against Caddy, DynamoDB Local, and MinIO. The simulated conditions and local image origin are not a substitute for production traffic, device diversity, or field Core Web Vitals. The DOM sweep cannot prove color contrast, focus order, spoken output, or task success with assistive technology. Those remain separate review tasks.

The same preview rebuild exposed a clean-start failure: `seed-if-empty` rejected 16 unchanged, checksum-stamped rows from the preceding TriCo seed after the new clean-install seed changed. The bootstrap now recognizes those exact earlier checksums and leaves their stored values untouched; it continues to reject unknown or malformed pristine rows. An edited Home row was preserved. The seed job exited 0 and an ordinary `docker compose up -d frontend` succeeded with the existing data volume. Public content remains governed by the existing manifest and CMS publication flow; the seed compatibility change does not publish new defaults over live edits.
