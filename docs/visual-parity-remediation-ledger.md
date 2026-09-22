# Visual-parity remediation ledger

This ledger records the reviewed output of the visual auditor. Generated evidence remains
under `artifacts/visual-audit/` and is intentionally untracked.

## Audit checkpoints

- Baseline auditor: commit `f61f9a7`.
- Hardened attribution and schema v2: commit `6d4e0c3`.
- Schema v3 rendered-style inventory and exact pixel accounting: current worktree.
- Before hardening: `artifacts/visual-audit/v2-before-{home,property-management,real-estate,construction,storage,development}/`.
- Reviewed frozen output: `artifacts/visual-audit/{home,property-management,real-estate,construction,storage,development}-final/`.
- The reviewed run completed all 51 capture recipes across the six routes and compared 209,985,790
  pixels. It retained 12,508 bounded findings and reduced promoted root-cause groups from 397 to 39
  by removing low-confidence, asset, inherited-container, and displacement evidence from the CSS
  priority queue.

Raw changed-pixel totals are not a parity score. They include content, unavailable assets, geometry,
font rasterization, and approved user-directed differences. A finding is actionable only after its
candidate declaration and evidence crop are reviewed.

## Resolved

### Ordinary actions used the gold accent role

- Root cause: `.ui-button-accent` shared its rule with `.surface-gold`, and Storage repeated the same
  choice in its theme rule.
- Resolution: ordinary primary actions now use `--trico-color-action`; the intentionally gold surface
  utility remains unchanged.
- Covered actions: Property Management “Get Free Analysis”, Construction “Start Your Project” and
  “Request Your Bid”, Storage “Partner With Us”, and other callers of the shared action primitive.
- Regression: the browser suite asserts the shared blue background and accessible white foreground.
- The earlier conclusion that reference-blue to candidate-gold substitutions were effectively zero
  was invalid. It relied on same-coordinate semantic pixel pairs and missed displaced foreground
  elements. Schema v3 supersedes that conclusion with candidate-side rendered-style inventory.

### Schema-v3 Home diagnostic

- The first real desktop run inventories 106 visible gold property occurrences despite the bounded
  pixel report labeling zero regions as gold.
- Confirmed shared causes include all eight `.ui-timeline-card strong` labels and all three
  `.ui-news-date` labels. The `.ui-accent-rule` gradient, timeline borders, icon gradients, and SVG
  strokes are also present in the inventory.
- The run reconciles 2,005,872 changed pixels into 1,056 attributed-style, 75,573 geometry, 21,531
  asset/content, and 1,907,712 explicitly unresolved pixels. Nothing outside those buckets is implied
  to be correct.
- Evidence: `artifacts/visual-audit/v3-home-inventory/` (intentionally untracked).
- First shared-role remediation moves timeline labels, timeline dots, the journey line, and news dates
  from gold to the blue highlight role. The same desktop inventory falls from 106 to 56 visible gold
  property occurrences, with zero remaining gold occurrences for those four primitives. Evidence:
  `artifacts/visual-audit/v3-home-after-blue/` (intentionally untracked).

### Auditor false root causes

- Image, video, and canvas regions no longer inherit text-color attribution.
- Candidate presentation properties must perceptually match sampled pixels.
- Foreground `color` is considered only at sampled text or form-control paint.
- Transparent paint, non-rendered borders, and non-rendered outlines are excluded.
- Nearby inverse color regions are classified as displacement.
- Geometry and low-confidence evidence cannot create a CSS root-cause group.
- Exact colors and semantic roles are stored separately, and same-role pairs are suppressed as
  substitutions.

## Reviewed and accepted

- Anniversary/banner shadow regions on Home and Development are small raster/compositing differences.
  Reference and candidate crops are visually indistinguishable; changing the shared shadow is not
  justified.
- The Storage centered-header alpha finding is likewise visually indistinguishable in paired crops.
  An experimental opaque-white change increased raw differences and was removed.
- The 13 approved placeholder assets and documented content exclusions remain accepted differences.

## Deferred pending two-sided live evidence

The remaining frozen P0/P1 groups are dominated by displaced foreground/background pairs: split-hero
copy, review cards, and responsive section positions. Candidate CSS attribution alone cannot prove the
reference declaration for these regions. Representative crops show correct candidate colors at a
different pixel location, so they must be handled as page geometry rather than token substitutions.

The required next evidence step is the one-time headed Lovable authorization followed by live mode:

```sh
npm run visual:audit -- authorize \
  --reference-url https://preview--trico-home-harmony.lovable.app/

npm run visual:audit -- live \
  --reference-url https://preview--trico-home-harmony.lovable.app/ \
  --candidate-url http://app.localhost:8088 \
  --output artifacts/visual-audit/live-reviewed
```

The live report will provide two-sided computed CSS for hover/focus states and is the authority for the
next geometry pass in this order: Property Management, Construction, Real Estate, Storage, Development,
then Home. No remaining frozen P0/P1 item should be converted into a shared token change without that
evidence or a clearly visible paired crop.

## Invariants

- Page stylesheets remain layout-only; source policy rejects page-owned presentation and typography.
- The shared stylesheet contains no page-prefixed selector families.
- The audit is report-only: visual differences return success, while capture, recipe, decoding, and
  schema failures return nonzero.
