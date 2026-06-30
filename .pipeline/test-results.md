# Test Results — Category filter (store) + Category assignment (admin)

Audit date: 2026-06-30
Method: automated tests (Vitest) + `npx tsc --noEmit`

---

## Overall verdict: PASS

All 113 new tests pass. TypeScript compiles clean. The 35 failures in the existing suite are pre-existing regressions unrelated to this feature (confirmed by stashing the feature code and reproducing the same 35 failures on base commit `ee1404a`).

---

## 1. TypeScript compilation

**PASS** — `npx tsc --noEmit` exits 0 with no output.

---

## 2. New test file

**File:** `src/test/category-filter.test.ts`
**Result:** 113 / 113 passed

---

## 3. Checks by area

### 3.1 SupabaseCategoryRepository — four new methods (unit tests + source checks)

| Check | Result |
|---|---|
| `getAllActive()` — happy path maps Category objects, description null handled | PASS |
| `getAllActive()` — `.eq('is_active', true)` called | PASS |
| `getAllActive()` — `.order('id', { ascending: true })` called | PASS |
| `getAllActive()` — returns `[]` when no active categories | PASS |
| `getAllActive()` — throws on Supabase error | PASS |
| `getCategoryIdsForProduct()` — returns `number[]` of category_ids | PASS |
| `getCategoryIdsForProduct()` — queries `product_categories` filtered by `product_id` | PASS |
| `getCategoryIdsForProduct()` — returns `[]` when no rows | PASS |
| `getCategoryIdsForProduct()` — throws on error | PASS |
| `setProductCategories()` — happy path: delete by product_id then insert | PASS |
| `setProductCategories()` — empty set: delete only, no insert | PASS |
| `setProductCategories()` — throws when delete step errors | PASS |
| `setProductCategories()` — throws when insert step errors | PASS |
| `setProductCategories()` — keyed by `product_id`, NOT `category_id` | PASS |
| `getProductCategoryMap()` — reduces rows into `Record<number, number[]>` | PASS |
| `getProductCategoryMap()` — selects `product_id, category_id` | PASS |
| `getProductCategoryMap()` — returns `{}` when no rows | PASS |
| `getProductCategoryMap()` — single-element array for one-category product | PASS |
| `getProductCategoryMap()` — throws on error | PASS |

### 3.2 Column names vs `001_initial_schema.sql`

| Check | Result |
|---|---|
| `getCategoryIdsForProduct` selects column `category_id` | PASS |
| `getCategoryIdsForProduct` filters on column `product_id` | PASS |
| `getProductCategoryMap` selects `product_id, category_id` | PASS |
| `setProductCategories` delete uses `product_id` key | PASS |
| `setProductCategories` insert rows have `product_id` and `category_id` keys | PASS |
| `getAllActive` uses `.eq('is_active', true)` | PASS |
| Existing methods `getAllForAdmin`, `getProductIds`, `setProducts` not renamed | PASS |

### 3.3 ProductsPage.tsx

| Check | Result |
|---|---|
| Imports `categoryRepository`, `Category` type, `es as i18n` | PASS |
| `categories`, `productCategoryMap`, `activeCategoryId` state declared | PASS |
| Mount uses `Promise.all([getAll, getAllActive, getProductCategoryMap])` | PASS |
| `.catch(() => setError(true))` wraps the `Promise.all` | PASS |
| `.finally(() => setLoading(false))` wraps the `Promise.all` | PASS |
| `handleFilter` resets `visibleCount` to `PAGE_SIZE` | PASS |
| `handleFilter` resets `prevVisibleRef.current` to `PAGE_SIZE` | PASS |
| `filteredProducts` checks `activeCategoryId === null` | PASS |
| `filteredProducts` coalesces `productCategoryMap[p.id] ?? []` | PASS |
| GSAP grid entrance dependency array is `[allProducts, activeCategoryId]` | PASS |
| Filter nav only rendered when `categories.length > 0` | PASS |
| Filter nav has `aria-label` | PASS |
| "Todas" chip uses `i18n.products.filterAll` | PASS |
| "Todas" chip `onClick={() => handleFilter(null)}` | PASS |
| Category chips use `catalog__filter` and `catalog__filter--active` classes | PASS |
| Category chip `onClick={() => handleFilter(category.id)}` | PASS |
| Per-category empty state uses `i18n.products.filterEmpty` (inline, not full-page) | PASS |
| `visibleProducts`, `hasMore`, `remaining` derived from `filteredProducts` | PASS |

### 3.4 TabProducts.tsx

| Check | Result |
|---|---|
| Imports `categoryRepository`, `Category` type | PASS |
| `availableCategories`, `selectedCategoryIds`, `categoriesSaving`, `categoriesError` state declared | PASS |
| `loadVariantData` includes `getAllActive()` and `getCategoryIdsForProduct(productId)` | PASS |
| `loadVariantData` sets `availableCategories` and `selectedCategoryIds` | PASS |
| `openNew` resets all three category states | PASS |
| `openEdit` resets `categoriesError` | PASS |
| `cancelEdit` resets `categoriesError` | PASS |
| `handleToggleCategory` adds/removes via `prev.includes(categoryId)` | PASS |
| `handleSaveCategories` guards `editing === 'new' || editing === null` | PASS |
| `handleSaveCategories` calls `setProductCategories(editing.id, selectedCategoryIds)` | PASS |
| `handleSaveCategories` sets `categoriesError` on catch | PASS |
| `handleSaveCategories` sets `categoriesSaving(false)` in finally | PASS |
| Categories panel inside `editingProductId !== null` block | PASS |
| Panel renders `i18n.admin.categoriesTitle` and `i18n.admin.categoriesSave` | PASS |
| Panel shows `adm-alert` for `categoriesError` | PASS |
| Checkboxes bound to `selectedCategoryIds.includes(c.id)` | PASS |
| Checkbox `onChange` calls `handleToggleCategory(c.id)` | PASS |
| Save button `disabled={categoriesSaving}` | PASS |
| Save button shows `i18n.admin.saving` when saving | PASS |
| Save button `onClick={handleSaveCategories}` | PASS |

### 3.5 i18n — `src/i18n/es.ts`

| Check | Result |
|---|---|
| `products.filterAll` exists and equals `'Todas'` | PASS |
| `products.filterEmpty` exists and is non-empty | PASS |
| `admin.categoriesTitle` exists and equals `'Categorías'` | PASS |
| `admin.categoriesSave` exists and equals `'Guardar categorías'` | PASS |
| No new key has an empty string value | PASS |

### 3.6 `src/ui/styles/catalog.css`

| Check | Result |
|---|---|
| `.catalog__filters` defined with `display: flex`, `flex-wrap: wrap`, `margin-bottom` | PASS |
| `.catalog__filter` defined with `border` and `cursor: pointer` | PASS |
| `.catalog__filter:hover` defined | PASS |
| `.catalog__filter--active` defined using `var(--c-ink)` | PASS |
| `.catalog__filter` in `prefers-reduced-motion` `transition: none !important` group | PASS |

### 3.7 Source integrity — `SupabaseCategoryRepository.ts`

| Check | Result |
|---|---|
| All four new methods present with correct signatures and return types | PASS |
| `categoryRepository` singleton exported | PASS |

---

## 4. Pre-existing failures (not caused by this feature)

**35 tests** in three pre-existing files fail. Confirmed pre-existing by stashing the feature code and reproducing the same 35 failures on base commit `ee1404a`.

- `src/test/wireframe-ui.test.tsx` — tests for old wireframe CSS classes (`ui-page`, `ui-header`, `ui-list`) superseded when the catalog redesign landed.
- `src/test/Header.test.tsx` — tests for old `ui-header` nav structure.
- `src/test/admin-crud.test.ts` — the `002_admin_active_flags.sql` migration content block fails because it pre-dates or conflicts with the current migration file structure.

These failures are not regressions introduced by this feature and do not affect the PASS verdict.
