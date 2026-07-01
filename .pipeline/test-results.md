# Test Results: Cart Side Drawer (Mini-Cart)

## Baseline Verification

The coder claimed 94 failures across 6 files before this change, and 35 failures across 3 files after. Independently verified by running `git stash` and restoring:

- **Before (stashed):** 93 failures, 6 files failing
- **After (restored):** 35 failures, 3 files failing (wireframe-ui.test.tsx, Header.test.tsx, admin-crud.test.ts)

This matches the coder's claim (the 1-count difference in the baseline is within test-isolation noise — both runs have the same 6 failing files and the same categories of failure).

All 35 pre-existing failures are confirmed unrelated to this change:
- `wireframe-ui.test.tsx`: checks for `ui-*` class names and `ui-spacer` spans that the final implementation never used
- `Header.test.tsx`: checks for i18n nav labels (`t.nav.products`, `t.nav.login`, `t.nav.register`) that the Header does not actually render (it uses hardcoded `'Colección'`, `'Acceder'` etc.)
- `admin-crud.test.ts`: file-read error on a missing path

---

## Coverage Assessment of the Coder's New Test File

`src/test/CartDrawer.test.tsx` as submitted had 2 tests only:
1. Product name + total label render with items when open
2. Empty state renders without items

This is insufficient coverage for the spec's stated load-bearing behaviors. The spec explicitly flags auto-open on success (and NOT on early-return paths) as critical. The following were untested:

- Auto-open on `addToCart` success
- NOT opening on `!user` early return
- NOT opening on `clampedAdd < 1` early return
- Escape key closes the drawer
- Body scroll lock applied while open, restored on close and on unmount
- Backdrop click calls `closeDrawer`
- Close button (×) calls `closeDrawer`
- Stepper − and + buttons call `setQuantity` with correct arguments
- Stepper + disabled at stock cap
- Remove button calls `removeItem(item.id)`
- "Ver carrito completo" link goes to `/carrito` and calls `closeDrawer`
- Product name link goes to `/producto/:id` and calls `closeDrawer`
- Header cart trigger is a `<button>` (not a `<Link to="/carrito">`) and clicking it opens the drawer
- Drawer footer absent when cart is empty
- Checkout button disabled + `aria-disabled="true"`
- `aria-hidden` toggle on the aside (closed = hidden from a11y tree)
- Always rendered (no null early-return) for CSS slide transition

---

## New Tests Added

Two new test files were written:

### `src/test/CartDrawer.test.tsx` (replaced)
37 tests covering the CartDrawer component directly. All pass.

Groups:
- Open with items (happy path) — 6 tests
- Empty cart state — 3 tests
- Logged-out user — 3 tests
- Escape key closes drawer — 3 tests
- Body scroll lock — 3 tests
- Close triggers (backdrop + close button) — 2 tests
- Stepper buttons — 5 tests
- Remove button — 2 tests
- "Ver carrito completo" link — 2 tests
- Product name link — 2 tests
- Checkout button — 2 tests
- Title display — 2 tests
- Variant label — 2 tests

### `src/test/CartDrawer-context.test.tsx` (new)
13 tests covering CartContext drawer state and the Header button change. 12 pass, 1 intentionally fails (see below).

Groups:
- CartContext openDrawer / closeDrawer primitives — 3 tests
- addToCart auto-opens drawer on success — 2 tests
- addToCart does NOT open drawer on early-return paths — 4 tests (3 pass, 1 fails — see bug)
- Header cart button opens drawer instead of navigating — 4 tests

---

## Bug Found: Drawer Opens on Repository Error (Spec Violation)

**File:** `src/ui/contexts/CartContext.tsx`, lines 70–76

**Failing test:**
```
CartContext – addToCart does NOT open drawer on early-return paths
  > drawer stays closed when addOrIncrement throws (repository error is not a successful add)
```

**What the spec says:**
> "only open when something was actually added — i.e. do NOT open if the early return (clampedAdd < 1, or !user) was hit. Place setIsDrawerOpen(true) on the success path only."

**What the implementation does:**

```ts
const addToCart = async (variantId: number, quantity = 1) => {
  if (!user) return                          // early return ✓ (drawer stays closed)
  try {
    // ...
    if (clampedAdd < 1) return              // early return ✓ (drawer stays closed)
    await cartRepository.addOrIncrement(...)
  } catch {
    // swallows error, falls through
  }
  await refresh()
  setIsDrawerOpen(true)                     // ← BUG: reached even when catch fired
}
```

`setIsDrawerOpen(true)` sits outside the `try` block, so it fires on both the success path AND when `addOrIncrement` throws. On a network error or DB constraint violation, the item was not added but the drawer opens anyway.

**Fix required:** Move `setIsDrawerOpen(true)` inside the `try` block, after the `await cartRepository.addOrIncrement(...)` call and before or after `await refresh()`, but not after the `catch`.

---

## Full Suite Summary

| Condition | Files failing | Tests failing | Tests passing |
|-----------|--------------|---------------|---------------|
| Before this feature (stashed) | 6 | 93 | 518 |
| After feature, before new tests | 3 | 35 | 576 |
| After new tests (final) | **4** | **36** | **623** |

The increase from 35 to 36 failures is the one intentionally failing test that exposes the spec violation above. All other new tests pass (49 new passing tests added: 37 in CartDrawer.test.tsx + 12 in CartDrawer-context.test.tsx).

**Status: PIPELINE PAUSED — reviewer action required on the bug above before this can ship.**
