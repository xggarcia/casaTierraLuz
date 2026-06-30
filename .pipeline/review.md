# Review — Category filter (store) + Category assignment (admin)

Reviewer: senior review stage
Date: 2026-06-30
Method: read spec/changes/test-results, full `git diff`, read of `SupabaseCategoryRepository.ts`, `Category.ts`, `ProductsPage.tsx` render block, `TabProducts.tsx`, and the test file; cross-checked i18n keys and CSS tokens.

## VERDICT: SHIP WITH WARNINGS

Both features are implemented correctly and match the spec. The repository layer has real behavioral unit tests. The two warnings below are about test depth and unspecced scope creep, not about broken behavior.

---

## Correctness — PASS

Feature 1 (catalog filter) and Feature 2 (admin assignment) both match the spec.

- Repository: all four methods (`getAllActive`, `getCategoryIdsForProduct`, `setProductCategories`, `getProductCategoryMap`) match the spec to the letter. `setProductCategories` is correctly keyed by `product_id` (delete-then-insert), NOT `category_id`, so it cannot wipe a sibling product's assignments. Empty-set guard (`categoryIds.length > 0`) present. Existing methods untouched.
- Data flow is correct. `productCategoryMap` is built directly from `product_categories` join rows keyed by `product_id`, so a product can only surface under a category it is actually assigned to. The `?? []` coalesce means a product with no categories appears only under "Todas" (never wrongly filtered in). "Todas" (`activeCategoryId === null`) returns `allProducts` unfiltered, so it can never show fewer than expected.
- Pagination reset on filter change is correct: `handleFilter` sets `visibleCount = PAGE_SIZE` and `prevVisibleRef.current = PAGE_SIZE`. `visibleProducts` / `hasMore` / `remaining` all derive from `filteredProducts`, not `allProducts`.
- Per-category empty state (lines 260-263) is inline inside `.catalog__container`; masthead (line 226) and filter nav (line 236) render above it unconditionally, so both stay visible. Matches edge case #2. The full-page `catalog-state` "no products at all" gate (line 200) is preserved.
- Admin panel mirrors the variants panel: lazy-loaded in the same `Promise.all`, gated on `editingProductId !== null`, independent save, silent catch on load. `handleSaveCategories` guards `editing === 'new' || editing === null`.

## Type safety — PASS

No `any`. `Category` entity is properly typed. Casts in the repo (`data as ... DbCategory[]`, `as { category_id: number }[]`) match the established pattern in the same file's pre-existing methods. `tsc --noEmit` reported clean by the tester.

## i18n — PASS

All four new keys present (`products.filterAll`, `products.filterEmpty`, `admin.categoriesTitle`, `admin.categoriesSave`). Other keys referenced by the new JSX (`i18n.loading`, `i18n.admin.saving`, `i18n.admin.saveError`, `i18n.admin.emptyList`) all exist. No missing-key risk.

## Security — PASS

Repo layer correctly relies on RLS. `getProductCategoryMap` does an unfiltered public read of `product_categories` (allowed by the `Public read product_cat` policy). Writes go through `setProductCategories`, gated by `Admin manage product_cat` (is_admin()). No auth logic duplicated client-side. Correct.

## Performance — PASS

Single `Promise.all` on mount (no per-category round-trip). `filteredProducts` is an O(n) in-render derivation over a small catalog — acceptable. GSAP grid-entrance effect adds `activeCategoryId` to its deps as specced; no conflict with the `visibleCount` load-more effect.

---

## WARNINGS

### WARNING 1 — ProductsPage / TabProducts tests are source-string assertions, not behavioral
`src/test/category-filter.test.ts` covers the repository with real mocked-Supabase behavioral tests (good), but every ProductsPage and TabProducts check is `expect(src).toContain(...)` / `toMatch(...)` against the raw file text (e.g. lines 384-467: `expect(src).toContain('filteredProducts.slice(')`). These assert the code *contains a string*, not that filtering, pagination reset, or the per-category empty state actually behave correctly. A future refactor that renames a variable would fail the test without any behavior change, and conversely a logic bug that preserved the strings would pass green. The 113 green count overstates real coverage for the two UI features. Recommend adding at least one render-level test (React Testing Library) that mounts `ProductsPage`, clicks a chip, and asserts the rendered grid shrinks — but this is not ship-blocking given the logic is simple and verified by reading.

### WARNING 2 — Unspecced scope creep in the diff
The diff includes changes the spec did not request and `changes.md` does not document:
- `src/ui/pages/AdminPage.tsx` — new "Categorías" admin tab wired to a new `TabCategories`.
- `src/ui/pages/admin/TabCategories.tsx` and `src/domain/entities/Category.ts` — new untracked files.
- `src/i18n/es.ts` — extra keys beyond the four specced (`tabCategories`, `categoryNew`, `categoryAssignTitle`, `assign`).
- `src/ui/pages/HomePage.tsx` — footer copy changed `España` -> `Barcelona` (unrelated to this feature).

These compile clean and appear internally consistent, but they were not in scope, not in `changes.md`, and not covered by the test audit's focus areas. The `HomePage` footer edit in particular is an unrelated content change riding along in this PR. Recommend either documenting these in `changes.md` or splitting the `HomePage` footer change into its own commit. Not blocking, but a reviewer downstream should be aware the PR does more than the spec/changes describe.

---

## SUGGESTION

- ProductsPage per-category empty state uses inline `style={{...}}` (line 261) while the rest of the catalog uses CSS classes. Minor inconsistency; a `.catalog__filter-empty` class would match the file's convention. Cosmetic only.

