# Final Review: Cart Side Drawer (Mini-Cart)

VERDICT: SHIP

## Scope reviewed
Full drawer feature across CartContext, CartDrawer, cart-drawer.css, App.tsx,
Header.tsx, ProductDetailPage.tsx, es.ts, and the test files. Reviewed the
actual current source (not just handoff claims) plus a full-suite run.

## Bug-fix re-verification (independent)
CONFIRMED FIXED. `src/ui/contexts/CartContext.tsx` addToCart:
- `!user` returns before the try (drawer stays closed). [line 58]
- `clampedAdd < 1` returns inside the try before any write (drawer stays closed). [66-69]
- `await cartRepository.addOrIncrement(...)` → `await refresh()` → `setIsDrawerOpen(true)`
  are all INSIDE the try, in that order. [70-72]
- The catch does `await refresh()` only and does NOT open the drawer. [73-78]
So the drawer opens on the success path exclusively. The regression test
"drawer stays closed when addOrIncrement throws" now asserts is-drawer-open === false
and PASSES. Verified by running it.

## Full suite (independently run)
624 passing / 35 failing across 3 files. The 3 failing files are pre-existing and
unrelated: admin-crud.test.ts (missing-file read), Header.test.tsx (asserts i18n
nav labels the Header never rendered — predates this feature), wireframe-ui.test.tsx
(expects ui-* / ui-spacer classes never implemented). None reference the drawer,
CartContext drawer state, or the Header cart trigger. Failure count dropped 36→35
vs the tester's paused run because the one intentionally-failing bug test now passes.

## Spec adherence
Matches spec on every checked point: context value shape and wiring; CartDrawer
always-rendered with `--open` modifier classes; role=dialog, aria-label, aria-hidden
toggle; Escape + backdrop + close-button all call closeDrawer; body-scroll lock;
login-fallback / empty / lines / footer branches; stepper, remove, view-full link,
disabled checkout; price formatting `toFixed(2)&thinsp;€`; App.tsx mount position;
Header Link→button with i18n.cart.headerLink; ProductDetailPage addedFeedback removed;
i18n close/viewFull added. All i18n keys used by the drawer exist in es.ts.

## Accessibility / correctness notes (non-blocking; ship-acceptable, log for later)
These do not violate the spec (the spec prescribes exactly this markup) and are not
regressions, but a future a11y pass should consider them:

1. Off-screen-but-focusable when closed. The aside is always in the DOM, translated
   off-screen via CSS transform, with aria-hidden={!isDrawerOpen}. aria-hidden hides
   it from the a11y tree but does NOT remove its links/buttons from the tab order —
   when closed, a keyboard user tabbing through the page can still land on the
   (visually off-screen) close button, product links, stepper, etc. Additionally,
   focusing a descendant of an aria-hidden="true" subtree is an ARIA violation (axe
   flags this). Recommended future fix: add `inert` to the aside (or the whole
   fragment) when !isDrawerOpen, or `visibility:hidden` on `.cart-drawer` until open.
   Not blocking: matches spec, no test covers it, and pointer clicks can't reach it
   off-screen — the gap is keyboard-tab focus only.

2. No focus management. Opening the drawer does not move focus into it, and closing
   does not restore focus to the trigger; there is no focus trap. Spec did not require
   these. Acceptable for ship as a lightweight mini-cart; note for a later a11y pass.

3. role="dialog" without aria-modal="true". Minor; the spec's aria set was followed
   verbatim. Consider adding aria-modal for a future pass.

## Header Link→button change
No navigation regression. The cart trigger was only ever rendered for logged-in users
and now opens the drawer instead of routing to /carrito; /carrito remains reachable via
the drawer's "Ver carrito completo" link and by direct URL. `.site-header__link` already
styles buttons, so no visual regression. The one Header.test.tsx breakage is the
pre-existing i18n-label mismatch, unrelated to this change (confirmed: those assertions
target nav.products/login/register text, not the cart trigger).

## Security / performance
No issues. No new user-input rendering paths; product names go through the existing t()
helper; images use existing src/placeholder logic. addToCart still clamps to stock and
the catch reconciles via refresh() on write failure. No new network calls, no secrets,
no unbounded work. CSS uses only existing tokens.

Ship it. The one paused bug is genuinely fixed and independently reverified; remaining
suite failures are pre-existing and unrelated. Log the three a11y notes for a follow-up.
