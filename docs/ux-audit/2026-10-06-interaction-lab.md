# Local interaction timing lab — 2026-10-06

I loaded each public route twice in a fresh Chromium page at 390 × 844, device scale 1, with simulated 150 ms network latency, 200,000 bytes/s downstream throughput, 100,000 bytes/s upstream throughput, and 4× CPU slowdown. After the H1 appeared and another 1.6 seconds elapsed, I clicked the shared mobile-menu button to open and close it. On Property Management, Real Estate, and Development, I also measured the first click on an inactive content tab in two fresh loads. These were scripted actions against the local Compose preview.

A `PerformanceObserver` watched `event` entries with `durationThreshold: 16`. For each click I grouped qualifying entries by `interactionId` and reported the longest `duration`, which approximates input through the next paint and is rounded to 8 ms by the [Event Timing specification](https://www.w3.org/TR/event-timing/). This is a timing sample for a chosen action. It is **not** page-level Interaction to Next Paint (INP) or a field measurement: [INP considers interactions across a page visit](https://web.dev/articles/inp/), and [lab and field data answer different questions](https://web.dev/articles/lab-and-field-data-differences/).

| Page                | Mobile menu open, two runs |
| ------------------- | -------------------------: |
| Home                |                 40 / 40 ms |
| Property Management |                 48 / 40 ms |
| Real Estate         |                 40 / 40 ms |
| Construction        |                 40 / 40 ms |
| Storage             |                 32 / 32 ms |
| Development         |                 40 / 40 ms |

Each menu opened. The close clicks produced no qualifying event entry at the configured threshold; this does not assign them a zero or exact sub-threshold latency.

| Page                | Inactive tab clicked    |    Two runs |
| ------------------- | ----------------------- | ----------: |
| Property Management | Commercial associations | 96 / 232 ms |
| Real Estate         | Sold (5)                |  88 / 80 ms |
| Development         | Project types           | 104 / 56 ms |

The selected state updated on all six clicks. The 232 ms Property Management sample was almost entirely presentation delay (225.8 ms); its input delay was 4.9 ms and event processing was 1.3 ms. I repeated that exact tab action on four more fresh loads under the same throttling: **56, 64, 56, and 56 ms**. The slow result did not recur in these four repetitions. Six samples are too few to establish its frequency or dismiss a real tail risk, but they do not identify a reproducible Base UI Tabs defect or justify changing the shared primitive now.

Collect real visitor interaction data and perform keyboard and screen-reader journeys before treating this as a completed interaction-quality gate. Any future tab optimization should compare the same action and conditions before and after a specific change.
