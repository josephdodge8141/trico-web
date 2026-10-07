# Public keyboard and accessibility-tree check — 2026-10-05

I checked the running rewrite preview at `http://app.localhost:18090/` in headless Chromium at 1440 × 900 and 390 × 844. On each of the six public routes, I waited for the page H1 and inspected the browser accessibility tree for exposed buttons, links, textboxes, comboboxes, checkboxes, radio controls, tabs, and menu items without accessible names. **None of the exposed controls in those roles was unnamed.** The scan covered 25–58 interactive nodes per desktop page and 20–52 per mobile page. This is a name check, not a complete screen-reader or WCAG assessment.

The mobile keyboard walkthrough began with **Skip to main content**, then the home link and the Open navigation button. Enter opened the menu and moved Tab focus to its first link. Escape closed the menu. The initial implementation left focus on that now-hidden link, which is a shared-header defect: keyboard users could lose their place. The desktop More sections menu had the same behavior. A second pass found that resizing from an open mobile menu to desktop could leave both menus logically open and again strand focus when the desktop menu closed. The revised existing `@id:public.pages` scenario reproduced both failures, then passed after `PublicHeader` returned focus to the **visible** trigger when Escape dismisses a menu. The corrected focused run passed **6 scenarios and 72 steps** on the live Compose preview.

The existing behavior suite also covers keyboard tab selection, public form labels and serialization, and editor focus containment. After the destination-focus fix, the full live Compose run passed **49 scenarios and 416 steps**, representing all 204 canonical cases through 49 exercised cases and 155 justified no-ops. This check does not establish assistive-technology task completion, color contrast, production Core Web Vitals, or the usability of unpublished owner content.

A later keyboard pass followed a section link with Enter from the mobile menu
and desktop More menu. Both links changed the URL hash but left focus on the
document body, so the next Tab restarted near the top of the page. The revised
existing public-page step failed on all six routes before the shared-header
change. `PublicHeader` now focuses the same-page destination after following a
section link while preserving native hash scrolling. An `aria-hidden` anchor
sentinel such as Construction's `#contact` transfers focus to its containing
section instead. The six-route focused behavior passes **6 scenarios and 72
steps**, and a direct Construction Get Quote keyboard check lands on the
visible bid section. This is browser accessibility evidence, not a screen
reader session.

In a later 390 px authenticated editor pass, opening the Corporate contact
sheet moved keyboard focus to its Close control. Escape closed the sheet and
returned focus to the original **Edit Corporate contact** button. No content
mutation was made. This confirms one mobile editor focus-return path in
Chromium; it does not establish spoken screen-reader output or all editor
journeys.

The five division inquiry forms had a second focus loss. After keyboard
submission, the visible success message appeared but focus was on the document
body. Storage's existing contact-form behavior failed when extended to require
focus on delivery feedback. The shared inquiry hook now focuses the `role=status`
success message or `role=alert` delivery error after the response. A 390px
browser pass confirmed both outcomes receive focus on Property Management,
Real Estate, Construction, Storage, and Development. Property Management's
“Send another request” action also dropped focus when it replaced the
confirmation with a new form; its revised existing behavior failed, then
passed after the first-name field received focus on restart. These checks
exercise browser focus and announced roles, but do not replace an actual
screen-reader journey.

The canonical careers form had the same focus-loss pattern. With a PDF selected,
both delivery failure and successful submission left focus on the document
body; “Submit another” did so again. Empty-form validation displayed errors
above the submit action while focus stayed below them. The revised existing
Home resume behavior failed on first-invalid focus, then passed after the
shared careers form focused the first invalid field, the response message, and
the reset name field. A 390px browser check confirmed error and success focus
and the reset target. The live Home behavior also confirmed that a PDF resume
reached local Mailpit before showing success.
