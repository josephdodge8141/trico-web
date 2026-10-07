# Public JavaScript loading check

The route-split baseline still fetched the shared editor UI and full Lucide icon catalog on every anonymous page. Each row below sums Chromium `PerformanceResourceTiming.encodedBodySize` for JavaScript resources in a fresh browser context after `networkidle`, served by the local Compose preview. It excludes CSS, images, fonts, and HTML; it is a transfer comparison, not a real-user timing or Core Web Vitals result.

| Public route        | Route-split baseline | After editor and icon deferral | After server seed split | Total reduction |
| ------------------- | -------------------: | -----------------------------: | ----------------------: | --------------: |
| Home                |        383,528 bytes |                  239,892 bytes |           215,208 bytes |           43.9% |
| Property Management |        394,301 bytes |                  255,095 bytes |           230,993 bytes |           41.4% |
| Real Estate         |        395,447 bytes |                  256,362 bytes |           232,209 bytes |           41.3% |
| Construction        |        387,274 bytes |                  245,027 bytes |           220,980 bytes |           42.9% |
| Storage             |        385,420 bytes |                  242,490 bytes |           222,327 bytes |           42.3% |
| Development         |        392,624 bytes |                  252,237 bytes |           228,057 bytes |           41.9% |

The final public resource lists contain one requested page module and no `EditorSheet`, `EditorToolbar`, `MediaLibraryDialog`, or dynamic icon catalog module. The shared toolbar becomes available after session authentication; dialogs load when opened. The 34 icons used by semantic seeds are included in the ready icon map. Other schema-supported names load through Lucide's dynamic module. An ad hoc catalog comparison resolved all 1,694 schema-supported icon names to either a ready component or a dynamic filename, and the existing browser scenario saved an uncommon `Tractor` icon and observed it in private preview.

The last column was measured again on the rebuilt Compose preview after moving the complete 195-entity `registrySeedData` catalog to `@app/schemas/server`. Browser pages still import the canonical entity definitions and validate published API documents, while backend seed and content services import the catalog from the server entry. The largest shared browser chunk fell from 127.13 KB to 96.62 KB gzip. The local seed job exited successfully against the existing volume, the focused 195-entity schema checks passed, `check:ci` passed, and the rebuilt live Compose behavior run passed 49 scenarios and 429 steps. These transfer numbers do not establish a field or synthetic paint improvement.

The current frontend build, `check:ci`, and full Compose browser behavior run passed. The Compose run covered 49 scenarios and 429 steps against the rebuilt local images. The earlier visual audit gate passed before the server seed split; this split changes module loading, not page composition, and has not received a new independent visual score.
