# Changes: Cart Side Drawer (Mini-Cart)

## Files Modified

### `src/ui/contexts/CartContext.tsx`
- Added `isDrawerOpen`, `openDrawer`, `closeDrawer` to `CartContextValue` interface.
- Added `const [isDrawerOpen, setIsDrawerOpen] = useState(false)` state in `CartProvider`.
- Added `openDrawer` and `closeDrawer` functions.
- In `addToCart`, added `setIsDrawerOpen(true)` on the success path only (after `await refresh()`), not inside the `clampedAdd < 1` early-return or the `!user` early-return.
- Added all three drawer fields to the provider `value` object.

### `src/i18n/es.ts`
- Added `close: 'Cerrar'` and `viewFull: 'Ver carrito completo'` to the `cart` block.
- Cart block now has 21 keys (was 19).

### `src/ui/components/Header.tsx`
- Added `import { es as i18n } from '../../i18n/es'`.
- Added `openDrawer` to `useCart()` destructure.
- Replaced `<Link to="/carrito" className="site-header__link">` with a `<button type="button" className="site-header__link" onClick={openDrawer}>`.
- Label text now uses `i18n.cart.headerLink` instead of hardcoded `'Carrito'`.

### `src/ui/pages/ProductDetailPage.tsx`
- Removed `addedFeedback` state (`useState(false)`).
- Removed the `{addedFeedback && <p className="pdp__added-feedback">...</p>}` JSX block.
- Removed `setAddedFeedback(true)` and `setTimeout(...)` from the CTA `onClick` handler.
- The handler now simply calls `await addToCart(selectedVariant.id, 1)` after the guards; the drawer auto-opening in `CartContext` provides the user feedback.

### `src/App.tsx`
- Added `import { CartDrawer } from './ui/components/CartDrawer'`.
- Added `<CartDrawer />` as a sibling immediately after `<Header />` and before `<main className="app-body">`, inside both `CartProvider` and `BrowserRouter`.

### `src/test/Header.test.tsx`
- Updated `useCart` mock to include `openDrawer: vi.fn()`, `isDrawerOpen: false`, and `closeDrawer: vi.fn()` so the Header component (which now destructures `openDrawer`) renders without errors.

### `src/test/cart.test.ts`
- Updated `"cart block has exactly 19 keys"` → `"cart block has exactly 21 keys"` to match the two new i18n keys.
- Replaced three `Header.tsx – Carrito nav link` tests that checked for `<Link to="/carrito">` with tests that check for `openDrawer` (the drawer button), since the spec replaces the Link with a button.
- Updated `"shows i18n.cart.added feedback after successful add"` to `"does not show inline i18n.cart.added feedback"` which asserts `addedFeedback` is absent.

## Files Created

### `src/ui/components/CartDrawer.tsx`
New component. Always rendered (no conditional null return) so CSS slide transition works. Key behaviors:
- Reads `isDrawerOpen`, `closeDrawer`, `items`, `count`, `setQuantity`, `removeItem` from `useCart()` and `user` from `useAuth()`.
- `useEffect` listens for `Escape` keydown when open; cleans up on close/unmount.
- `useEffect` sets `document.body.style.overflow = 'hidden'` when open; restores on cleanup.
- Renders a backdrop `<div>` (click to close) and an `<aside role="dialog">`.
- BEM classes: `cart-drawer__backdrop`, `cart-drawer__backdrop--open`, `cart-drawer`, `cart-drawer--open`, `cart-drawer__header`, `cart-drawer__title`, `cart-drawer__close`, `cart-drawer__body`, `cart-drawer__list`, `cart-drawer__line`, `cart-drawer__line-image`, `cart-drawer__line-info`, `cart-drawer__line-name`, `cart-drawer__line-variant`, `cart-drawer__stepper`, `cart-drawer__stepper-btn`, `cart-drawer__stepper-qty`, `cart-drawer__line-right`, `cart-drawer__line-total`, `cart-drawer__remove-btn`, `cart-drawer__empty`, `cart-drawer__shop-link`, `cart-drawer__footer`, `cart-drawer__total-row`, `cart-drawer__total-label`, `cart-drawer__total-amount`, `cart-drawer__view-link`, `cart-drawer__checkout-btn`.
- Footer (total, view-full link, disabled checkout button) renders only when `user && items.length > 0`.
- `cartVariantLabel` helper copied verbatim from `CartPage.tsx`.

### `src/ui/styles/cart-drawer.css`
New stylesheet for `CartDrawer`. Uses only existing CSS custom properties from `theme.css`. Key rules:
- Backdrop slides from `opacity: 0; visibility: hidden` to `opacity: 1; visibility: visible` via `--dur-base` / `--ease-out-quart`.
- Panel slides from `translateX(100%)` to `translateX(0)` via `--dur-base` / `--ease-out-expo`.
- Drawer `z-index: var(--z-modal)` (400) sits above header `--z-sticky` (200).
- Border color matches `cart.css`: `oklch(from var(--c-primary) calc(l - 0.04) c h)`.
- Responsive: `width: 100vw` at `max-width: 480px`.
- `@media (prefers-reduced-motion: reduce)` disables all transitions on drawer, backdrop, and interactive elements.

### `src/test/CartDrawer.test.tsx`
New minimal test file. Mocks `useAuth` and `useCart`. Two test cases:
1. With `isDrawerOpen: true`, non-empty `items`, and a logged-in `user`: asserts product name and `i18n.cart.total` are in the DOM.
2. With `isDrawerOpen: true` and empty `items`: asserts `i18n.cart.empty` is in the DOM.

## Test Results

Baseline (before this spec): 6 test files failing, 94 test failures.  
After this spec: 3 test files failing, 35 test failures.  
All 35 remaining failures are pre-existing (wireframe-ui expects `ui-*` class names not in the implementation; Header.test checks i18n nav labels that don't match rendered text; admin-crud reads a missing file). No new failures introduced.

## Bug Fix: drawer must not open on repository error (2026-07-01)

### File modified: `src/ui/contexts/CartContext.tsx`

`setIsDrawerOpen(true)` and its preceding `await refresh()` were sitting outside the `try` block, so they executed unconditionally — including after the `catch` swallowed an `addOrIncrement` error. Nothing was actually added in that case, so the drawer must not open.

Fix: moved `await refresh()` and `setIsDrawerOpen(true)` inside the `try` block, immediately after the successful `await cartRepository.addOrIncrement(...)` call. A separate `await refresh()` remains in the `catch` block to reconcile UI state when the write fails, but it does not set `isDrawerOpen`.

The test `"drawer stays closed when addOrIncrement throws (repository error is not a successful add)"` in `src/test/CartDrawer-context.test.tsx` now passes. All 13 tests in that file pass; the pre-existing 30 failures in `wireframe-ui.test.tsx` are unchanged.

## Tester Focus Areas

1. **Drawer open/close**: Click header "Carrito" button → drawer slides in. Press Escape or click backdrop → drawer slides out. Body scroll is locked while open and restored on close.
2. **Add to cart auto-open**: On `ProductDetailPage`, clicking "Añadir al carrito" (logged in, in-stock variant) opens the drawer. The old inline "Añadido al carrito" text no longer appears.
3. **At-stock-cap**: Adding when already at stock cap does NOT open the drawer (early return before `setIsDrawerOpen(true)`).
4. **Logged-out**: Adding while not logged in navigates to `/login` and does NOT open the drawer.
5. **Drawer line items**: Stepper +/− updates quantities; − at 1 removes the item. Remove button removes the item. Product name link navigates to product page and closes drawer.
6. **"Ver carrito completo" link**: Visible in footer, navigates to `/carrito`, closes drawer.
7. **Empty cart state**: Shows `i18n.cart.empty` and link to `/productos`.
8. **Reduced motion**: Verify no transitions fire under `prefers-reduced-motion: reduce`.
9. **Mobile (≤480px)**: Drawer takes full viewport width.
