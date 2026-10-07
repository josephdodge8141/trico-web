# Footer tap targets and text contrast — 2026-10-05

I inspected the running rewrite at `http://app.localhost:18090/` in Chromium
at 390 × 844. Each of the five division pages had footer quick links only
19–20 px high. Their vertical spacing separated them, but the clickable text
was small for a touch action. The Construction category footer used the same
pattern.

The division pages and Construction category now use one `FooterQuickLink`
component composed from the base Button primitive and TriCo theme tokens. It
provides a 44 px minimum height on mobile and retains each destination and CMS
collection boundary. Five `public.pages` division examples and
`public.construction-empty` failed on the old rendering; all seven page cases
passed on the rebuilt preview: **7 scenarios, 88 steps**. A direct click from a
Construction category footer reached `/construction#services`, and the
destination became visible after route loading.
The complete live frontend behavior suite then passed **49 scenarios and 423
steps**.

For a separate contrast diagnostic, I sampled 877 visible text-bearing nodes
across the six public routes at 390 px. A Chromium canvas resolved computed
OKLCH colors to sRGB, then combined ancestor backgrounds and measured
luminance contrast. No sampled pair fell below 4.5:1; the lowest computed
sample was an inactive tab at about 4.55:1. This is a browser calculation over
computed styles, not a formal contrast or assistive-technology audit. It does
not prove text contrast over every image and overlay state, spoken output, or
task completion.
