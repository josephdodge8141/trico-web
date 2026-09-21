# Frozen Lovable visual baseline

This directory is the immutable 2026-09-10 reference for the TriCo visual-parity rebuild. The
source is the Lovable project recorded in `manifest.json`; comparison never contacts that source.

## Inventory and coordinates

- `pages/` contains full desktop captures and 6,000-pixel tablet/mobile tiles. `tile.y` places each
  tile in its full-page coordinate space.
- `states/` contains bounded menu, listing-tab, and FAQ states.
- `viewport` records the browser viewport requested during capture. The 1,425-pixel desktop page
  images are the 1,440-pixel viewport's content area after its 15-pixel scrollbar. Future page
  captures must use the same content-area crop; state captures retain their full viewport width.
- Every JPEG is listed exactly once with its dimensions and SHA-256 digest. An unknown, missing,
  duplicated, changed, malformed, or out-of-bounds entry fails verification.
- `regions` are named SSIM comparison rectangles in file-local coordinates. The current page tiles
  and bounded states are each one comparison region; agents may split them into named sections as
  those sections are implemented.
- `masks` are file-local rectangles excluded from comparison. No mask is currently approved. Add a
  narrowly bounded mask only when an unavailable-image placeholder or other correction in the
  ledger actually occupies known coordinates.

The committed JPEGs must not be regenerated or reformatted. If a new baseline is intentionally
approved, create a new date directory.

## Offline commands

From the repository root, verify reference integrity:

```bash
node --import tsx tooling/gates/visual-baselines.ts verify
```

Compare a local capture tree that mirrors the manifest's `pages/` and `states/` paths:

```bash
node --import tsx tooling/gates/visual-baselines.ts compare /absolute/path/to/local-captures
```

Capture and compare one public route from a running local stack at the manifest's real Playwright
viewports (including the documented 1,425-pixel desktop content crop):

```bash
node --import tsx tooling/gates/visual-baselines.ts capture \
  http://localhost:8088 /absolute/path/to/local-captures /property-management
node --import tsx tooling/gates/visual-baselines.ts compare-route \
  /absolute/path/to/local-captures /property-management
```

The capture command waits for fonts and images, disables animation, records full document geometry
in `candidate-report.json`, and writes only public page-state images. A final tile is deliberately
short when the candidate document is shorter than the reference so the geometry gate fails instead
of padding or concealing the difference. Route comparison does not contact Lovable or silently add
masks.

The comparison fails closed when files are missing or undecodable, when desktop/tablet geometry
differs by more than 2 pixels, when mobile geometry differs by more than 3 pixels, or when any
unmasked region's 8×8 luminance SSIM is below 0.98. Its JSON report includes each region's score,
pixel count, geometry, tolerance, and failures.

To audit that the manifest can still be deterministically derived from the frozen files, print the
generated representation and review the semantic diff; this command does not write files:

```bash
node --import tsx tooling/gates/visual-baselines.ts generate
```

Form-state and edit-mode references were not part of the 51-image freeze and remain a separate
capture task. They must not be silently treated as covered by this manifest.

## Root-cause visual audit

The report-only visual auditor analyzes every rendered pixel, separates likely displacement from
perceptual color changes, attributes bounded regions to browser elements and CSS rules, and groups
shared causes without weakening the strict baseline gate.

Run an offline audit against the dated frozen captures:

```bash
npm run visual:audit -- frozen \
  --candidate-url http://app.localhost:8088 \
  --output artifacts/visual-audit/current
```

Limit a diagnostic run with `--route`, `--viewport`, or `--state`:

```bash
npm run visual:audit -- frozen \
  --candidate-url http://app.localhost:8088 \
  --output artifacts/visual-audit/home-desktop \
  --route / --viewport desktop
```

For a live two-sided comparison, first create a private Playwright storage state. The file is
written below the ignored `artifacts/` directory with owner-only permissions:

```bash
npm run visual:audit -- authorize \
  --reference-url https://preview--trico-home-harmony.lovable.app/
npm run visual:audit -- live \
  --reference-url https://preview--trico-home-harmony.lovable.app/ \
  --candidate-url http://app.localhost:8088 \
  --output artifacts/visual-audit/live
```

Open `report.html` for filtered, verified root causes and representative evidence crops.
`report.json` schema version 3 preserves exact colors separately from semantic color roles, inventories
visible rendered semantic styles independently of screenshot alignment, and reconciles every changed
pixel into an explicit accounting bucket. Asset and low-confidence findings remain outside prioritized
CSS groups, with attribution ambiguity retained. `summary.md`, `color-substitutions.csv`,
`rendered-style-inventory.csv`, full heatmaps, and representative evidence crops are emitted beside it.
Visual findings return success in this report-only phase; missing state controls, authentication,
capture, decoding, accounting, and report failures return nonzero.
