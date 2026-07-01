# Spec: Cart Side Drawer (Mini-Cart)

Add a slide-out side drawer (mini-cart) so users can view and edit cart contents without navigating to `/carrito`. It opens when the user clicks the "Carrito" link in the Header, and auto-opens when an item is added from the product page. The existing `/carrito` full page stays unchanged and remains reachable via a link inside the drawer.

## OPEN QUESTIONS

None blocking. Defaults chosen below (stated inline). Notably:
- Auto-open on add-to-cart: YES, the drawer opens when an item is added from `ProductDetailPage`. This replaces the existing inline `addedFeedback` text on that page (removed — see task 5).
- Drawer supplements, does NOT replace, the `/carrito` page. Drawer has a "Ver carrito completo" link to `/carrito` and a disabled "Finalizar compra" button (mirrors CartPage).
- The Header cart link becomes a `<button>` that opens the drawer instead of a `<Link to="/carrito">`. Full page still reachable from inside the drawer.

---

## State: open/close lives in CartContext

The drawer must be openable from both `Header` and `ProductDetailPage`, so the open state goes in `CartContext` (single provider already wrapping the app in `App.tsx`).

### Modify `src/ui/contexts/CartContext.tsx`

Add to `CartContextValue` interface:
```ts
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
```

Implementation:
- Add `const [isDrawerOpen, setIsDrawerOpen] = useState(false)`.
- `openDrawer = () => setIsDrawerOpen(true)`
- `closeDrawer = () => setIsDrawerOpen(false)`
- Include all three in the provider `value`.
- In `addToCart`, after the `await refresh()`, call `setIsDrawerOpen(true)` so any add-to-cart auto-opens the drawer. IMPORTANT: only open when something was actually added — i.e. do NOT open if the early `return` (clampedAdd < 1, or `!user`) was hit. Place `setIsDrawerOpen(true)` on the success path only, before/after `refresh()` but not inside the `clampedAdd < 1` branch and not when `!user`.

Do not change any other existing behavior in this file.

---

## New component: `src/ui/components/CartDrawer.tsx`

A fixed-position panel that slides in from the right, plus a full-screen backdrop. Rendered once, globally, from `App.tsx` (see task 4). Reads everything from `useCart()` and `useAuth()`.

### Imports (follow `CartPage.tsx` exactly)
```ts
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { t } from '../../domain/entities/Product'
import type { CartItem } from '../../domain/entities/Cart'
import { es as i18n } from '../../i18n/es'
import '../styles/cart-drawer.css'
```

### Behavior
- Read: `const { items, count, isDrawerOpen, closeDrawer, setQuantity, removeItem } = useCart()` and `const { user } = useAuth()`.
- Copy the `cartVariantLabel(item: CartItem)` helper from `CartPage.tsx` verbatim (module-scope function).
- Compute `cartTotal` the same way as `CartPage.tsx`: `items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)`.
- Escape key closes: `useEffect` that adds a `keydown` listener on `window` while `isDrawerOpen` is true; on `Escape` call `closeDrawer()`. Clean up the listener on unmount / when closed.
- Body scroll lock while open: in the same or a second `useEffect`, when `isDrawerOpen` set `document.body.style.overflow = 'hidden'`; restore to `''` on cleanup.
- Always render the component (do not early-return `null` when closed) so the CSS slide transition works. Toggle an `--open` modifier class based on `isDrawerOpen` instead.

### Structure (BEM-ish, matches existing `cart__*` / `pdp__*` conventions)
Root fragment contains a backdrop and the aside:

- Backdrop `<div>`:
  - class `cart-drawer__backdrop` plus `cart-drawer__backdrop--open` when `isDrawerOpen`.
  - `onClick={closeDrawer}`.
  - `aria-hidden="true"`.
- `<aside>` panel:
  - class `cart-drawer` plus `cart-drawer--open` when `isDrawerOpen`.
  - `role="dialog"`, `aria-label={i18n.cart.title}`, `aria-hidden={!isDrawerOpen}`.
  - Header row (`cart-drawer__header`):
    - `<h2 className="cart-drawer__title">` = `i18n.cart.title` + count, e.g. `` `${i18n.cart.title} (${count})` `` when count > 0 else `i18n.cart.title`.
    - Close `<button type="button" className="cart-drawer__close" aria-label={i18n.cart.close} onClick={closeDrawer}>` with `×` (use the `×` glyph, matching the `−` glyph style already used in CartPage steppers).
  - Body (`cart-drawer__body`):
    - If `!user`: render a message paragraph `i18n.cart.loginRequired` and a `<Link to="/login" onClick={closeDrawer}>` = `i18n.cart.goLogin`. (User cannot normally reach this state since the Header only shows the trigger when logged in, but guard anyway.)
    - Else if `items.length === 0`: `<p className="cart-drawer__empty">{i18n.cart.empty}</p>` and a `<Link to="/productos" className="cart-drawer__shop-link" onClick={closeDrawer}>{i18n.cart.goShop}</Link>`.
    - Else: `<ul className="cart-drawer__list">` of lines. Each `<li key={item.id} className="cart-drawer__line">`:
      - Image block `cart-drawer__line-image` — same img/placeholder logic as `CartPage.tsx` (`item.image ? <img src alt={t(item.productName)} loading="lazy"/> : <div aria-hidden="true"/>`).
      - Info block `cart-drawer__line-info`:
        - `<Link to={`/producto/${item.productId}`} className="cart-drawer__line-name" onClick={closeDrawer}>{t(item.productName)}</Link>`
        - variant label `<p className="cart-drawer__line-variant">` when `label` truthy.
        - Stepper (reuse the exact stepper markup/behavior from `CartPage.tsx`, class `cart-drawer__stepper` with `cart-drawer__stepper-btn` / `cart-drawer__stepper-qty`; − button `setQuantity(item.id, item.quantity - 1)`, + button `setQuantity(item.id, item.quantity + 1)` `disabled={item.quantity >= item.stock}`, `aria-label` = `i18n.cart.decrease` / `i18n.cart.increase`).
      - Right column `cart-drawer__line-right`:
        - line total `<span className="cart-drawer__line-total">{(item.unitPrice * item.quantity).toFixed(2)}&thinsp;€</span>`
        - remove `<button type="button" className="cart-drawer__remove-btn" onClick={() => removeItem(item.id)}>{i18n.cart.remove}</button>`
  - Footer (`cart-drawer__footer`) — render only when `user` and `items.length > 0`:
    - total row: `<span className="cart-drawer__total-label">{i18n.cart.total}</span>` + `<span className="cart-drawer__total-amount">{cartTotal.toFixed(2)}&thinsp;€</span>`.
    - `<Link to="/carrito" className="cart-drawer__view-link" onClick={closeDrawer}>{i18n.cart.viewFull}</Link>`
    - `<button type="button" className="cart-drawer__checkout-btn" disabled aria-disabled="true">{i18n.cart.checkout}</button>` (mirrors CartPage disabled checkout).

Use price formatting `X.toFixed(2)&thinsp;€` exactly as in CartPage.

### Edge cases the component must handle
- `count === 0` / empty cart: show empty state, no footer.
- Logged-out fallback: show login prompt, no lines, no footer.
- Escape key and backdrop click both close.
- Body scroll restored correctly on unmount even if closed via route change.
- Reduced motion: handled in CSS (no transitions).

---

## New styles: `src/ui/styles/cart-drawer.css`

Follow the header comment format and token usage of `cart.css`. Requires tokens from `theme.css`. Use ONLY existing CSS custom properties (colors `--c-*`, spacing `--space-*`, `--text-*`, `--radius-*`, motion `--dur-*` / `--ease-*`, z-index `--z-modal-backdrop` / `--z-modal`, `--header-height`, `--font-*`). No hardcoded palette values except where `cart.css` already does (e.g. border color `oklch(from var(--c-primary) calc(l - 0.04) c h)`).

Key rules:
- `.cart-drawer__backdrop`: `position: fixed; inset: 0; background: oklch(0.20 0.025 52 / 0.35); z-index: var(--z-modal-backdrop); opacity: 0; visibility: hidden; transition: opacity var(--dur-base) var(--ease-out-quart), visibility var(--dur-base);`
- `.cart-drawer__backdrop--open`: `opacity: 1; visibility: visible;`
- `.cart-drawer`: `position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw); background: var(--c-bg); z-index: var(--z-modal); display: flex; flex-direction: column; transform: translateX(100%); transition: transform var(--dur-base) var(--ease-out-expo); box-shadow: -2px 0 24px oklch(0.20 0.025 52 / 0.12);`
- `.cart-drawer--open`: `transform: translateX(0);`
- `.cart-drawer__header`: flex row, `justify-content: space-between; align-items: center;` padding `var(--space-6)`, bottom border matching `cart.css` line border color.
- `.cart-drawer__title`: `--font-display`, `--text-xl`, `--c-ink`, `margin: 0`.
- `.cart-drawer__close`: transparent button, `--text-2xl` glyph, `--c-muted` → hover `--c-ink`, `cursor: pointer`, no border, size ~2rem square, `line-height: 1`.
- `.cart-drawer__body`: `flex: 1; overflow-y: auto; padding: var(--space-4) var(--space-6);`
- `.cart-drawer__list`: `list-style:none; margin:0; padding:0; display:flex; flex-direction:column;`
- `.cart-drawer__line`: `display: grid; grid-template-columns: 64px 1fr auto; gap: var(--space-4); padding: var(--space-4) 0; border-bottom: 1px solid oklch(from var(--c-primary) calc(l - 0.04) c h);` (last-child no border via `:last-child`).
- `.cart-drawer__line-image`: 64px square, `border-radius: var(--radius-sm)`, `overflow: hidden`, `background: var(--c-primary)`; inner `img { width:100%; height:100%; object-fit:cover; display:block; }`.
- `.cart-drawer__line-info`: column flex, `gap: var(--space-2)`, `min-width:0`.
- `.cart-drawer__line-name`: `--font-display`, `--text-base`, `--c-ink`, no underline, ellipsis (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`), hover `opacity:0.7`.
- `.cart-drawer__line-variant`: `--font-body`, `--text-sm`, `--c-muted`, `margin:0`.
- Stepper rules: copy the visual spec of `.cart__stepper*` from `cart.css` (same sizing/borders/hover/disabled), renamed to `.cart-drawer__stepper*`. Steppers may be smaller if needed but keep the same style tokens.
- `.cart-drawer__line-right`: column flex, `align-items: flex-end; gap: var(--space-2); justify-content: space-between;`
- `.cart-drawer__line-total`: `--font-body`, `--text-base`, `font-weight:600`, `--c-ink`, `white-space:nowrap`.
- `.cart-drawer__remove-btn`: copy `.cart__remove-btn` style (underlined muted → ink on hover).
- `.cart-drawer__empty`: centered, `--font-display`, `--text-lg`, `--c-ink`, `margin: var(--space-8) 0 var(--space-4)`; `.cart-drawer__shop-link` styled like `.cart__empty-link`.
- `.cart-drawer__footer`: `border-top: 1px solid ...`, `padding: var(--space-6)`, `display:flex; flex-direction:column; gap: var(--space-4);`
- `.cart-drawer__total-row`: flex `justify-content: space-between; align-items: baseline;` — labels/amount styled like `.cart__total-label` / `.cart__total-amount` (may reduce amount to `--text-xl`).
- `.cart-drawer__view-link`: text-style link, `--font-body`, `--text-sm`, underline, `--c-ink`, centered.
- `.cart-drawer__checkout-btn`: copy `.cart__checkout-btn` (disabled accent button), `width: 100%`.
- Responsive: at `max-width: 480px`, `.cart-drawer { width: 100vw; }`.
- Reduced motion block: `@media (prefers-reduced-motion: reduce) { .cart-drawer, .cart-drawer__backdrop { transition: none; } }` plus disable transitions on stepper/remove/name like `cart.css` does.

Note the drawer sits above the header (`--z-modal` = 400 > header `--z-sticky` = 200), which is intended.

---

## Task 4 — Mount drawer globally: `src/App.tsx`

Add `import { CartDrawer } from './ui/components/CartDrawer'` and render `<CartDrawer />` inside `<BrowserRouter>`, as a sibling right after `<Header />` and before `<main className="app-body">`. It must be inside `CartProvider` (it already is) and inside `BrowserRouter` (because it uses `<Link>`).

---

## Task 5 — Header trigger: `src/ui/components/Header.tsx`

Replace the authenticated cart `<Link to="/carrito">` with a `<button>` that opens the drawer.

- Add `openDrawer` to the `useCart()` destructure: `const { count, openDrawer } = useCart()`.
- Replace:
  ```tsx
  <Link to="/carrito" className="site-header__link">
    {count > 0 ? `Carrito (${count})` : 'Carrito'}
  </Link>
  ```
  with:
  ```tsx
  <button
    type="button"
    className="site-header__link"
    onClick={openDrawer}
  >
    {count > 0 ? `${i18n.cart.headerLink} (${count})` : i18n.cart.headerLink}
  </button>
  ```
- Add `import { es as i18n } from '../../i18n/es'` to Header (currently absent). Use `i18n.cart.headerLink` (already `'Carrito'`) for the label text so it is i18n-driven.
- Keep all other Header markup identical.

Note: `.site-header__link` already styles both links and buttons (see `theme.css`), so no new CSS needed.

---

## Task 6 — Remove inline add-to-cart feedback: `src/ui/pages/ProductDetailPage.tsx`

The drawer auto-opening now provides the "added" feedback, so remove the redundant inline banner:
- Remove the `addedFeedback` state (`const [addedFeedback, setAddedFeedback] = useState(false)`).
- Remove the JSX block:
  ```tsx
  {addedFeedback && (
    <p className="pdp__added-feedback" role="status">
      {i18n.cart.added}
    </p>
  )}
  ```
- In the CTA `onClick`, remove `setAddedFeedback(true)` and the `setTimeout(...)` line. The handler becomes: after the guards, `await addToCart(selectedVariant.id, 1)` and nothing else (the context opens the drawer).
- Leave the `i18n` import and everything else in the file unchanged (other `i18n.cart.*` usages remain).

---

## Task 7 — i18n strings: `src/i18n/es.ts`

Add to the `cart:` object (keep existing keys):
```ts
    close: 'Cerrar',
    viewFull: 'Ver carrito completo',
```
`i18n.cart.added` may now be unused by ProductDetailPage but keep the key (do not delete). All other new UI text reuses existing keys: `title`, `empty`, `goShop`, `loginRequired`, `goLogin`, `remove`, `total`, `checkout`, `headerLink`, `increase`, `decrease`.

---

## Tests

Follow existing patterns; do not over-test.

1. `src/test/Header.test.tsx` currently mocks `useCart` returning `{ count, items, loading }`. Update that mock to also include `openDrawer: vi.fn()` (and the drawer fields if referenced) so Header renders. The cart trigger is now a `<button>`, not a link — if any existing assertion targets a "Carrito" link it must be updated; verify none do (current tests do not assert on the cart link, so likely only the mock needs the `openDrawer` addition). Ensure the mock object provides every field Header destructures.

2. Optional new test `src/test/CartDrawer.test.tsx` (mirror `Header.test.tsx` mocking style — mock `useAuth` and `useCart`): render `<CartDrawer />` in `<MemoryRouter>`, and assert:
   - With `isDrawerOpen: true`, `user` set, and a non-empty `items` array, the product name and `i18n.cart.total` render.
   - With `items: []`, `i18n.cart.empty` renders.
   Keep it minimal; only add if straightforward.

Run the full test suite after changes; all existing tests must still pass.

---

## Patterns to copy from (named)
- Line/stepper/remove/empty/total/checkout markup + price formatting: `src/ui/pages/CartPage.tsx`.
- CSS tokens, BEM naming, border colors, responsive + reduced-motion blocks: `src/ui/styles/cart.css` and `src/ui/styles/theme.css`.
- Context value shape and provider wiring: `src/ui/contexts/CartContext.tsx`.
- Test mocking style: `src/test/Header.test.tsx`.
