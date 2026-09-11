# Corrected Property Management visual baseline

This dated route baseline supersedes only the defective Property Management captures in the
immutable `2026-09-10` set. It was rendered independently from the supplied original archive; it
was not captured from the migrated application.

## Provenance

- Source archive: `Trico Property Portal.zip`
- Archive SHA-256: `4474f6c4a992e79275636df0cbbf5568b8a6b667a69d9315e7d7ab3c4a11ba67`
- Renderer: a fresh archive extraction followed by `npm ci` using the archive's lockfile
- Source route: `/property-management`
- Capture date: 2026-09-11

The renderer received only these capture-specific corrections:

1. Removed the generated `Property 7` through `Property 10` records from
   `ManagedProperties.tsx`, as explicitly approved.
2. Replaced the ten `.asset.json` development URLs used by the mounted Property Management
   portfolio with the exact recovered source image bytes for Town Square, Country Square, Alta
   Medical, American Fork Industrial, Bluffdale Industrial, Draper Office 218, Draper Office 194,
   Laurel Square, California Crossing, and Arbor Plaza. No image substitutions were made.
3. Applied `overflow-x: hidden` to the legacy body so the absolute contact badge's eight-pixel
   mobile overflow is clipped as an approved responsive correction.
4. Captured with reduced motion, disabled finite animation at screenshot time, waited for fonts,
   scrolled the whole source document to activate lazy images, waited for every image to settle,
   and returned to the top before capture.

The capture-only source tree and installed dependencies are not committed. The resulting JPEGs,
their dimensions, and their checksums are immutable and fully recorded by `manifest.json`. No
machine-specific path or live-source dependency is stored in this directory.

## Coverage and policy

- Full public page at 1440x1100, 1024x1366, and 390x844 Playwright viewports
- Mobile navigation open at 375x812
- Strict SSIM threshold: 0.98
- Geometry tolerance: 2px desktop/tablet and 3px mobile
- No masks

The independent reference dimensions are 1425x15668 desktop, 1024x16924 tablet, and a 390-pixel
visible mobile crop of the 26497-pixel legacy document. The mobile source DOM remains 398 pixels
wide because of the known absolute badge, while the approved visible viewport is clipped to 390.

## Commands

Property Management automatically resolves to this corrected baseline:

```bash
node --import tsx tooling/gates/visual-baselines.ts verify \
  frontend/visual-baselines/2026-09-11-property-management
node --import tsx tooling/gates/visual-baselines.ts capture \
  http://localhost:8088 /absolute/path/to/candidates /property-management
node --import tsx tooling/gates/visual-baselines.ts compare-route \
  /absolute/path/to/candidates /property-management
```

The first migrated comparison is intentionally not accepted: desktop SSIM is 0.772245; tablet
tiles are 0.723072, 0.670944, and 0.754084; mobile tiles are 0.607856, 0.451529, 0.519009,
0.657285, and 0.705822. Desktop output geometry matches the reference capture, while the tablet
and mobile documents remain 61 and 192 pixels shorter. These are genuine implementation
differences and are not masked or reclassified as passing.
