# Changes — Category filter (store) + Category assignment (admin)

## Files modified

### `src/infrastructure/repositories/SupabaseCategoryRepository.ts`
Added four new methods to `SupabaseCategoryRepository`:
- `getAllActive()` — fetches only `is_active = true` categories; used by the public catalog filter bar and the admin category panel.
- `getCategoryIdsForProduct(productId)` — returns the category IDs assigned to a given product; used to pre-select checkboxes when opening a product in edit mode.
- `setProductCategories(productId, categoryIds)` — delete-then-insert keyed by `product_id`; saves a product's full category set independently of the main product form.
- `getProductCategoryMap()` — returns `{ [productId]: categoryId[] }` from one query; used by `ProductsPage` for client-side filtering without per-category round trips.

No existing methods were renamed or altered.

### `src/i18n/es.ts`
Added four new string keys:
- `products.filterAll` — label for the "Todas" chip.
- `products.filterEmpty` — inline message when a filter yields no products.
- `admin.categoriesTitle` — panel heading in the product edit view.
- `admin.categoriesSave` — save button label in the categories panel.

### `src/ui/styles/catalog.css`
Added filter-bar styles before the product grid block:
- `.catalog__filters` — flex row with wrap and gap, bottom margin to sit above the grid.
- `.catalog__filter` — pill button using existing tokens; transparent background, muted border, ink text, transition on background/color/border.
- `.catalog__filter:hover` — primary background fill.
- `.catalog__filter--active` — ink background, on-primary text, ink border (mirrors load-more hover).
- Added `.catalog__filter` to the `prefers-reduced-motion` transition-none group.

### `src/ui/pages/ProductsPage.tsx`
Feature 1 — category filter in the public catalog:
- Imports added: `categoryRepository`, `Category` type, `es as i18n`.
- New state: `categories`, `productCategoryMap`, `activeCategoryId`.
- Mount effect replaced with `Promise.all` loading products, active categories, and the join map together; error/finally unchanged.
- `handleFilter` function resets `visibleCount` and `prevVisibleRef` on filter change.
- `filteredProducts` derived in render from `productCategoryMap`; `visibleProducts`, `hasMore`, `remaining` now operate on `filteredProducts`.
- Grid-entrance GSAP effect dependency updated from `[allProducts]` to `[allProducts, activeCategoryId]`.
- Filter bar rendered inside `.catalog__container` above the grid when `categories.length > 0`.
- Per-category empty state renders an inline message using `i18n.products.filterEmpty` instead of the full-page `catalog-state` block; masthead and filter bar remain visible.

### `src/ui/pages/admin/TabProducts.tsx`
Feature 2 — category assignment in the admin product form:
- Imports added: `categoryRepository`, `Category` type.
- New state: `availableCategories`, `selectedCategoryIds`, `categoriesSaving`, `categoriesError`.
- `loadVariantData` extended to also call `categoryRepository.getAllActive()` and `categoryRepository.getCategoryIdsForProduct(productId)` in the existing `Promise.all`; sets `availableCategories` and `selectedCategoryIds` on success; failure still silently caught.
- `openNew` resets `availableCategories`, `selectedCategoryIds`, `categoriesError`.
- `openEdit` resets `categoriesError` (data repopulated by `loadVariantData`).
- `cancelEdit` resets `categoriesError`.
- `handleToggleCategory` adds/removes a category ID from `selectedCategoryIds`.
- `handleSaveCategories` guards against non-edit state, calls `setProductCategories`, sets error on failure, independent of the main product save.
- Categories panel added in the right column (`editingProductId !== null` block) above the variants card: `adm-panel-card` with `adm-variants-header`, error alert, loading/empty/checkbox list, and a save footer button. Reuses all existing CSS classes.

## Tester focus areas

1. **Public filter bar** — verify "Todas" shows all products; clicking a category chip shows only assigned products; clicking a second category chip updates correctly; pagination resets to page 1 on each filter change; "load more" count is correct after filtering.
2. **Per-category empty state** — assign a category to no products; select that category chip; confirm the inline message appears and the masthead + filter bar remain visible (no full-page takeover).
3. **No categories exist** — confirm the filter bar does not render at all (no empty `<nav>`).
4. **Admin category panel** — open an existing product; confirm checkboxes load pre-selected; toggle items; click "Guardar categorías"; confirm the join table reflects the new set without affecting other products.
5. **New product flow** — create a product; confirm auto-transition to edit mode shows the category panel.
6. **Saving empty category set** — uncheck all categories; save; confirm all rows are removed from `product_categories` for that product with no error.
7. **Load failure resilience** — `ProductsPage` shows the error state when the `Promise.all` fails; admin category panel failure does not blank the edit page (silent catch).
8. **prefers-reduced-motion** — confirm category chip CSS transitions are suppressed; no GSAP animation on chips.
