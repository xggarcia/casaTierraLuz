# Implementation Spec — Category filter (store) + Category assignment (admin)

## Summary

Two features, one spec.

- **Feature 1 — Category filter in the public catalog.** `/productos` (rendered by `ProductsPage`) must display the active categories as a filter bar above the product grid and let shoppers filter products by clicking a category. Clicking a category shows only products assigned to it. An "Todas" (All) chip shows everything (default state).
- **Feature 2 — Category assignment in the admin product form.** In `TabProducts`, when editing an existing product, the admin must be able to assign one or more categories to that product, inline in the right column of the edit panel (alongside the existing variants panel). Edit mode loads current assignments; saving writes the new set.

---

## OPEN QUESTIONS

None block implementation. The decisions below resolve the two ambiguities in the request:

1. **Repository method names differ from the request brief.** The brief said `SupabaseCategoryRepository` has `getAll()`, `toggleActive()`, `delete()`. The actual file (`src/infrastructure/repositories/SupabaseCategoryRepository.ts`) exposes `getAllForAdmin()`, `setActive()`, `remove()`, plus `create()`, `getProductIds()`, `setProducts()`. There is **no public (active-only) category fetch** and **no method to get a single product's categories**. This spec adds the missing methods (see file 1). Do NOT rename existing methods.

2. **Feature 2 UX pattern.** Two options existed: (a) auto-open an assign step after create like `TabCategories` does; (b) inline checkboxes in the product edit panel. **Chosen: inline checkbox panel in the product edit view**, because `TabProducts` already lazily loads side data (variants, colors, scents) once a product exists (`editingProductId !== null`) and renders it in a right-hand panel. Categories follow the same lifecycle as variants. The create flow already auto-transitions into edit mode after `create()` (see `handleSubmit` lines 149-158), so a newly created product lands in the edit view where the category panel is available. No separate assign screen is needed.

---

## Data model (confirmed, no migrations)

- `categories(id SERIAL, name JSONB, description JSONB, image_url TEXT, is_active BOOLEAN, created_at)`.
- `product_categories(product_id INTEGER, category_id INTEGER, PRIMARY KEY(product_id, category_id))` — join table, columns are exactly `product_id` and `category_id`, both `ON DELETE CASCADE`.
- RLS (from `001_initial_schema.sql`): `product_categories` has `Public read product_cat` (SELECT USING true) and `Admin manage product_cat` (FOR ALL USING is_admin()). `categories` has `Public read categories` for `is_active = true OR is_admin()`. So the public catalog can read active `categories` and all `product_categories` rows without auth.

---

## Files to MODIFY

### 1. `src/infrastructure/repositories/SupabaseCategoryRepository.ts`

Add four methods to the existing `SupabaseCategoryRepository` class. Do NOT change existing methods. Existing `mapCategory` and the `DbCategory` type are reused.

- **`async getAllActive(): Promise<Category[]>`**
  - Copy `getAllForAdmin()` but add `.eq('is_active', true)`.
  - Select `'id, name, description, is_active'`, order by `id` ascending, map via `mapCategory`.
  - Model the active filter on `SupabaseProductRepository.getAll()` (line 106-114).

- **`async getCategoryIdsForProduct(productId: number): Promise<number[]>`**
  - Mirror of existing `getProductIds(categoryId)` (lines 59-66), opposite direction.
  - `.from('product_categories').select('category_id').eq('product_id', productId)`.
  - `return (data as { category_id: number }[]).map(r => r.category_id)`.

- **`async setProductCategories(productId: number, categoryIds: number[]): Promise<void>`**
  - Same delete-then-insert shape as existing `setProducts` (lines 68-81) but keyed by `product_id`.
  - Step 1: `.from('product_categories').delete().eq('product_id', productId)` — throw on error.
  - Step 2: if `categoryIds.length > 0`, `.insert(categoryIds.map(cid => ({ product_id: productId, category_id: cid })))` — throw on error.
  - NOTE: the existing `setProducts(categoryId, ...)` is keyed by category and would wipe a whole category if used from the product side — do not reuse it here.

- **`async getProductCategoryMap(): Promise<Record<number, number[]>>`**
  - `.from('product_categories').select('product_id, category_id')` (no filter; RLS allows public read), throw on error.
  - Reduce rows into `{ [product_id]: number[] }`. Used by the public catalog for client-side filtering in a single query.

### 2. `src/ui/pages/ProductsPage.tsx` — Feature 1

Add client-side category filtering. **Filter client-side on already-loaded products** (do NOT add a per-category Supabase query). Rationale: the catalog already loads all active products in one `getAll()` call and paginates client-side (`PAGE_SIZE = 12`, `visibleCount`). Catalog size is small. Load the product→category map once and filter in memory.

Changes inside the `ProductsPage` component:

- **Imports:** add `categoryRepository` from `'../../infrastructure/repositories/SupabaseCategoryRepository'`, `type { Category }` from `'../../domain/entities/Category'`, and `{ es as i18n }` from `'../../i18n/es'`. (`t` is already imported from `Product`.)
- **New state:**
  - `categories: Category[]` (default `[]`) — active categories.
  - `productCategoryMap: Record<number, number[]>` (default `{}`) — productId → categoryId[].
  - `activeCategoryId: number | null` (default `null`) — `null` means "Todas" (show all).
- **Data loading:** replace the mount `useEffect` that calls `productRepository.getAll()` (lines 109-115) with a `Promise.all([productRepository.getAll(), categoryRepository.getAllActive(), categoryRepository.getProductCategoryMap()])`; set `allProducts`, `categories`, `productCategoryMap` respectively. Keep `.catch(() => setError(true))` and `.finally(() => setLoading(false))` wrapping all three.
- **Derived filtering (in render, after the loading/error/empty guards):**
  - `filteredProducts = activeCategoryId === null ? allProducts : allProducts.filter(p => (productCategoryMap[p.id] ?? []).includes(activeCategoryId))`.
  - Replace the downstream `allProducts`-based render values with `filteredProducts`: `visibleProducts = filteredProducts.slice(0, visibleCount)`, `hasMore = visibleCount < filteredProducts.length`, `remaining = Math.min(PAGE_SIZE, filteredProducts.length - visibleCount)`.
  - Keep the existing `allProducts.length === 0` full-page empty state (the "no products at all" gate) unchanged.
- **Filter change handler:** define a handler that sets `activeCategoryId` (to a category id or `null`) and resets pagination: `setVisibleCount(PAGE_SIZE)` and `prevVisibleRef.current = PAGE_SIZE`.
- **GSAP grid entrance:** add `activeCategoryId` to the dependency array of the grid-entrance effect (currently `[allProducts]`, lines 137-148) so cards re-animate on filter change. The "load more" effect (keyed on `visibleCount`) stays as-is.
- **Filter UI:** render inside the grid `<section>` (line 211), within `.catalog__container`, above `.catalog__grid`, only when `categories.length > 0`:
  - `<nav className="catalog__filters" aria-label="Filtrar por categoría">`.
  - First chip "Todas": `<button type="button" className={"catalog__filter" + (activeCategoryId === null ? " catalog__filter--active" : "")} aria-pressed={activeCategoryId === null} onClick={() => handleFilter(null)}>{i18n.products.filterAll}</button>`.
  - Then one chip per category: label `t(category.name)`, active when `activeCategoryId === category.id`, `onClick={() => handleFilter(category.id)}`.
- **Empty-per-category state:** when `allProducts.length > 0` but `filteredProducts.length === 0`, render an inline message using `i18n.products.filterEmpty` in place of the grid — keep the masthead and filter bar visible (do NOT use the full-page `catalog-state` block).
- Leave the existing hardcoded Spanish strings ("Colección", "Ver N más", error/empty copy) as they are; only the two new strings come from i18n.

### 3. `src/ui/pages/admin/TabProducts.tsx` — Feature 2

Add a categories panel to the product edit view, mirroring the variants panel (right column, `editingProductId !== null` block, lines 482-651).

- **Imports:** add `categoryRepository` from `'../../../infrastructure/repositories/SupabaseCategoryRepository'` and `type { Category }` from `'../../../domain/entities/Category'`.
- **New state:**
  - `availableCategories: Category[]` (default `[]`).
  - `selectedCategoryIds: number[]` (default `[]`).
  - `categoriesSaving: boolean` (default `false`).
  - `categoriesError: string | null` (default `null`).
  - Reuse `variantsLoading` for the loading flag (category data loads in the same `Promise.all`).
- **Loading:** extend `loadVariantData(productId)` (lines 56-70): add `categoryRepository.getAllActive()` and `categoryRepository.getCategoryIdsForProduct(productId)` to the existing `Promise.all`, and in `.then` set `availableCategories` and `selectedCategoryIds`. Keep the existing silent `.catch(() => {})`.
- **Resets:** in `openNew` (lines 72-84) set `setAvailableCategories([])`, `setSelectedCategoryIds([])`, `setCategoriesError(null)`. In `openEdit` (lines 86-98) set `setCategoriesError(null)` (the `loadVariantData` call repopulates the rest). In `cancelEdit` set `setCategoriesError(null)`.
- **Toggle handler:** `handleToggleCategory(categoryId: number)` — add/remove the id from `selectedCategoryIds` (copy the shape of `TabCategories.handleToggleProduct`, lines 84-90).
- **Save handler:** `handleSaveCategories()`:
  - Guard: return if `editing === 'new' || editing === null`.
  - `setCategoriesError(null)`, `setCategoriesSaving(true)`; `await categoryRepository.setProductCategories(editing.id, selectedCategoryIds)`; on catch `setCategoriesError(i18n.admin.saveError)`; `finally setCategoriesSaving(false)`.
  - Independent of `handleSubmit` (saved separately, exactly like variants).
- **UI:** inside the existing `editingProductId !== null` right-column block, add a second `adm-panel-card` for categories (above or below the variants card):
  - Header `adm-variants-header` style with `<p className="adm-panel-card__title" style={{ margin: 0 }}>{i18n.admin.categoriesTitle}</p>`.
  - `categoriesError` → `<div className="adm-alert adm-alert--error">`.
  - If `variantsLoading` → `<p className="adm-loading">{i18n.loading}</p>`; else if `availableCategories.length === 0` → `<p className="adm-empty">{i18n.admin.emptyList}</p>`; else map categories to `<label className="adm-checkbox-field">` with a checkbox bound to `selectedCategoryIds.includes(c.id)`, `onChange={() => handleToggleCategory(c.id)}`, and `<span className="adm-label">{t(c.name)}</span>`.
  - Footer `adm-form-footer` with a primary button: `disabled={categoriesSaving}`, text `categoriesSaving ? i18n.admin.saving : i18n.admin.categoriesSave`, `onClick={handleSaveCategories}`.
- Panel shows only for existing products (`editingProductId !== null`), like variants. New products save first, auto-transition to edit mode, then the panel appears.

### 4. `src/i18n/es.ts`

Add keys (single i18n file confirmed — no `ca.ts` / `en.ts` exist). `Translations` is `typeof es`, so adding keys suffices.

- Under `products:` —
  - `filterAll: 'Todas'`
  - `filterEmpty: 'No hay productos en esta categoría.'`
- Under `admin:` —
  - `categoriesTitle: 'Categorías'`
  - `categoriesSave: 'Guardar categorías'`

### 5. `src/ui/styles/catalog.css`

Add filter-bar styles after the masthead block, using existing tokens only (`--c-ink`, `--c-on-primary`, `--c-muted`, `--c-primary`, `--space-*`, `--radius-sm`, `--font-body`, `--text-sm`, `--dur-fast`, `--ease-out-quart`).

- `.catalog__filters` — `display: flex; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-8);` (sits in `.catalog__container` above the grid).
- `.catalog__filter` — pill button: `font-family: var(--font-body); font-size: var(--text-sm);` transparent background, `1px solid` muted border, `border-radius: var(--radius-sm);` `padding: var(--space-2) var(--space-5);` `color: var(--c-ink); cursor: pointer;` transition on background/color/border via `var(--dur-fast) var(--ease-out-quart)`.
- `.catalog__filter:hover` — subtle fill (`background-color: var(--c-primary)`).
- `.catalog__filter--active` — `background-color: var(--c-ink); color: var(--c-on-primary); border-color: var(--c-ink);` (mirrors `.catalog__load-more-btn:hover`).
- Add `.catalog__filter` to the `prefers-reduced-motion` `transition: none !important` group at the bottom of the file.

No admin CSS changes — the categories panel reuses `adm-panel-card`, `adm-variants-header`, `adm-checkbox-field`, `adm-label`, `adm-form-footer`, `adm-btn`, `adm-btn--primary`, `adm-alert`, `adm-empty`, `adm-loading`, all already present.

---

## Component / function breakdown

| Function | File | Purpose |
|---|---|---|
| `getAllActive()` | SupabaseCategoryRepository.ts | Active-only categories for public catalog + admin panel |
| `getCategoryIdsForProduct(productId)` | SupabaseCategoryRepository.ts | Preselect a product's categories in edit panel |
| `setProductCategories(productId, categoryIds)` | SupabaseCategoryRepository.ts | Save a product's category set (delete-then-insert by product_id) |
| `getProductCategoryMap()` | SupabaseCategoryRepository.ts | One-query `{productId: categoryId[]}` for client-side filtering |
| filter state + bar + `handleFilter` | ProductsPage.tsx | Render chips, filter products client-side, reset pagination |
| categories panel + `handleToggleCategory` + `handleSaveCategories` | TabProducts.tsx | Inline checkbox assignment in product edit view |

---

## Data flow

**Feature 1 (filter):** On `ProductsPage` mount, `Promise.all` loads active products (`getAll`), active categories (`getAllActive`), and the join map (`getProductCategoryMap`). Categories render as chips. Clicking a chip sets `activeCategoryId` and resets `visibleCount`. `filteredProducts` is derived in render from `productCategoryMap[product.id]`. Pagination + GSAP entrance operate on `filteredProducts`.

**Feature 2 (assignment):** Opening a product in `TabProducts` (or creating one, which auto-opens edit) triggers `loadVariantData`, which now also fetches `getAllActive()` (available categories) and `getCategoryIdsForProduct(id)` (current selection). Toggling checkboxes updates `selectedCategoryIds`. "Guardar categorías" calls `setProductCategories(productId, selectedCategoryIds)` (delete-then-insert), independent of the main product save.

---

## Edge cases the implementation MUST handle

1. **No categories exist** — `ProductsPage`: do not render the filter bar (`categories.length === 0` guard). `TabProducts`: categories card shows `emptyList`.
2. **Category with zero products** — `ProductsPage`: keep masthead + filter bar, show `filterEmpty` inline (not the full-page empty state).
3. **Filter change resets pagination** — set `visibleCount = PAGE_SIZE` and `prevVisibleRef.current = PAGE_SIZE` so the "load more" count is correct.
4. **Product with no categories** — appears only under "Todas"; `productCategoryMap[id]` is `undefined` → coalesce to `[]`.
5. **Inactive categories** — excluded from both the public filter and the admin assignment list (`getAllActive`). A product still assigned to a now-inactive category is unaffected in the DB but won't surface a chip; acceptable.
6. **Saving an empty category set** — `setProductCategories` handles `categoryIds.length === 0` (delete only, skip insert), matching the existing `setProducts` guard.
7. **New product before first save** — categories panel hidden until `editingProductId !== null`; create flow auto-transitions to edit mode, so the panel becomes available without extra navigation.
8. **Load failure** — `ProductsPage`: existing `catch(() => setError(true))` must wrap the whole `Promise.all`. `TabProducts`: category load failure must not blank the page; reuse the existing silent `.catch(() => {})` in `loadVariantData`.
9. **prefers-reduced-motion** — filter chips have no GSAP animation; only their CSS transitions must be disabled under the reduced-motion query.

---

## Patterns to copy (named)

- **Checkbox assignment list + toggle handler:** `src/ui/pages/admin/TabCategories.tsx` (`handleToggleProduct`, the `adm-checkbox-field` list).
- **Delete-then-insert join write:** existing `setProducts` in `SupabaseCategoryRepository.ts`.
- **Active-only fetch:** `getAll()` in `SupabaseProductRepository.ts` (`.eq('is_active', true)`).
- **Right-column lazy-loaded panel in product edit view:** the variants panel in `src/ui/pages/admin/TabProducts.tsx` (`loadVariantData`, the `editingProductId !== null` block, `adm-panel-card` + `adm-variants-header`).
- **Client-side pagination + GSAP entrance:** already in `ProductsPage.tsx`; extend, do not rewrite.

---

## Out of scope (do NOT do)

- No new SQL migration (tables + RLS already exist).
- No new route in `src/App.tsx`.
- No renaming of existing `SupabaseCategoryRepository` methods.
- No category management UI changes in `TabCategories.tsx` (assignment from the category side already works).
- No `image_url` handling.
- No new CSS files or theme tokens.

## Files (summary)

| Action | Path |
| --- | --- |
| Modify | `src/infrastructure/repositories/SupabaseCategoryRepository.ts` |
| Modify | `src/ui/pages/ProductsPage.tsx` |
| Modify | `src/ui/pages/admin/TabProducts.tsx` |
| Modify | `src/i18n/es.ts` |
| Modify | `src/ui/styles/catalog.css` |
