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
