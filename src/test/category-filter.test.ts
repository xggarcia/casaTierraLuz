/**
 * Tests for the Category filter (store) + Category assignment (admin) feature.
 *
 * Covers:
 *  1. SupabaseCategoryRepository – four new methods
 *  2. ProductsPage.tsx – source-level checks for new filter logic
 *  3. TabProducts.tsx  – source-level checks for category panel
 *  4. es.ts i18n       – four new keys
 *  5. catalog.css      – filter-bar classes present + reduced-motion group
 *  6. Column-name alignment with 001_initial_schema.sql
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// File reader helper
// ---------------------------------------------------------------------------
const root = path.resolve(__dirname, '../../')
function readFile(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf-8')
}

// ---------------------------------------------------------------------------
// Supabase mock — hoisted so vi.mock() factory can close over them
// ---------------------------------------------------------------------------
const {
  mockOrder,
  mockDelete,
  mockInsert,
  mockEq,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockOrder:  vi.fn(),
  mockDelete: vi.fn(),
  mockInsert: vi.fn(),
  mockEq:     vi.fn(),
  mockSelect: vi.fn(),
  mockFrom:   vi.fn(),
}))

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

// Import AFTER mock — the class is not exported; use the singleton
import { categoryRepository } from '../infrastructure/repositories/SupabaseCategoryRepository'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers: query-chain builders
// ---------------------------------------------------------------------------

/** getAllActive / getAllForAdmin pattern: from->select->eq->order */
function setupSelectEqOrder(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** getAllForAdmin pattern: from->select->order (no eq) */
function setupSelectOrder(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** getCategoryIdsForProduct / getProductCategoryMap: from->select->eq */
function setupSelectEq(rows: unknown[], error: unknown = null) {
  mockEq.mockResolvedValue({ data: rows, error })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** getProductCategoryMap: from->select (no filter) */
function setupSelectOnly(rows: unknown[], error: unknown = null) {
  mockSelect.mockResolvedValue({ data: rows, error })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/**
 * setProductCategories: delete->eq (promise), then insert (promise).
 * We need two separate mockFrom calls, so we use mockReturnValueOnce.
 */
function setupDeleteThenInsert(deleteError: unknown = null, insertError: unknown = null) {
  // delete chain: from->delete->eq
  const mockEqDelete = vi.fn().mockResolvedValue({ error: deleteError })
  const mockDeleteChain = vi.fn().mockReturnValue({ eq: mockEqDelete })

  // insert chain: from->insert
  const mockInsertChain = vi.fn().mockResolvedValue({ error: insertError })

  mockFrom
    .mockReturnValueOnce({ delete: mockDeleteChain })
    .mockReturnValueOnce({ insert: mockInsertChain })

  return { mockEqDelete, mockDeleteChain, mockInsertChain }
}

function setupDeleteOnly(deleteError: unknown = null) {
  const mockEqDelete = vi.fn().mockResolvedValue({ error: deleteError })
  const mockDeleteChain = vi.fn().mockReturnValue({ eq: mockEqDelete })
  mockFrom.mockReturnValue({ delete: mockDeleteChain })
  return { mockEqDelete, mockDeleteChain }
}

// A minimal DB category row
function makeDbCategory(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: { es: 'Navidad' },
    description: { es: 'Colección navideña' },
    is_active: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1.  SupabaseCategoryRepository.getAllActive()
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository.getAllActive()', () => {
  const repo = categoryRepository

  it('happy path – returns only active categories, mapped to Category objects', async () => {
    setupSelectEqOrder([makeDbCategory()])
    const cats = await repo.getAllActive()
    expect(cats).toHaveLength(1)
    expect(cats[0].id).toBe(1)
    expect(cats[0].isActive).toBe(true)
    expect(cats[0].name).toEqual({ es: 'Navidad' })
    expect(cats[0].description).toEqual({ es: 'Colección navideña' })
  })

  it('filters by is_active = true – eq called with correct args', async () => {
    setupSelectEqOrder([makeDbCategory()])
    await repo.getAllActive()
    expect(mockEq).toHaveBeenCalledWith('is_active', true)
  })

  it('orders by id ascending', async () => {
    setupSelectEqOrder([makeDbCategory()])
    await repo.getAllActive()
    expect(mockOrder).toHaveBeenCalledWith('id', { ascending: true })
  })

  it('returns empty array when no active categories', async () => {
    setupSelectEqOrder([])
    const cats = await repo.getAllActive()
    expect(cats).toEqual([])
  })

  it('maps description: null correctly', async () => {
    setupSelectEqOrder([makeDbCategory({ description: null })])
    const [cat] = await repo.getAllActive()
    expect(cat.description).toBeNull()
  })

  it('throws when Supabase returns an error', async () => {
    setupSelectEqOrder([], { message: 'DB error' })
    await expect(repo.getAllActive()).rejects.toMatchObject({ message: 'DB error' })
  })
})

// ---------------------------------------------------------------------------
// 2.  SupabaseCategoryRepository.getCategoryIdsForProduct()
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository.getCategoryIdsForProduct()', () => {
  const repo = categoryRepository

  it('happy path – returns array of category_id numbers', async () => {
    setupSelectEq([{ category_id: 3 }, { category_id: 7 }])
    const ids = await repo.getCategoryIdsForProduct(42)
    expect(ids).toEqual([3, 7])
  })

  it('queries product_categories table filtered by product_id', async () => {
    setupSelectEq([])
    await repo.getCategoryIdsForProduct(99)
    expect(mockFrom).toHaveBeenCalledWith('product_categories')
    expect(mockSelect).toHaveBeenCalledWith('category_id')
    expect(mockEq).toHaveBeenCalledWith('product_id', 99)
  })

  it('returns empty array when product has no categories', async () => {
    setupSelectEq([])
    const ids = await repo.getCategoryIdsForProduct(1)
    expect(ids).toEqual([])
  })

  it('throws when Supabase returns an error', async () => {
    setupSelectEq([], { message: 'query failed' })
    await expect(repo.getCategoryIdsForProduct(1)).rejects.toMatchObject({ message: 'query failed' })
  })
})

// ---------------------------------------------------------------------------
// 3.  SupabaseCategoryRepository.setProductCategories()
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository.setProductCategories()', () => {
  const repo = categoryRepository

  it('happy path – deletes by product_id then inserts the new set', async () => {
    const { mockEqDelete, mockDeleteChain, mockInsertChain } = setupDeleteThenInsert()
    await repo.setProductCategories(5, [10, 20])

    // Delete step
    expect(mockFrom.mock.calls[0][0]).toBe('product_categories')
    expect(mockDeleteChain).toHaveBeenCalled()
    expect(mockEqDelete).toHaveBeenCalledWith('product_id', 5)

    // Insert step – rows must be keyed product_id, category_id
    expect(mockInsertChain).toHaveBeenCalledWith([
      { product_id: 5, category_id: 10 },
      { product_id: 5, category_id: 20 },
    ])
  })

  it('empty category set – deletes then skips insert', async () => {
    const { mockEqDelete, mockInsertChain } = setupDeleteThenInsert()
    // Only one mockFrom call expected (delete only)
    const mockEqDeleteOnly = vi.fn().mockResolvedValue({ error: null })
    const mockDeleteOnly = vi.fn().mockReturnValue({ eq: mockEqDeleteOnly })
    mockFrom.mockReset()
    mockFrom.mockReturnValue({ delete: mockDeleteOnly })

    await repo.setProductCategories(5, [])
    expect(mockEqDeleteOnly).toHaveBeenCalledWith('product_id', 5)
    // insert should NOT have been called
    expect(mockInsertChain).not.toHaveBeenCalled()
  })

  it('throws if the delete step errors', async () => {
    // delete fails
    const mockEqDelete = vi.fn().mockResolvedValue({ error: { message: 'delete failed' } })
    const mockDeleteChain = vi.fn().mockReturnValue({ eq: mockEqDelete })
    mockFrom.mockReturnValue({ delete: mockDeleteChain })

    await expect(repo.setProductCategories(1, [2])).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('throws if the insert step errors', async () => {
    setupDeleteThenInsert(null, { message: 'insert failed' })
    await expect(repo.setProductCategories(1, [2])).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('does NOT use category_id as the delete key (must use product_id)', async () => {
    // The existing setProducts() method deletes by category_id; setProductCategories()
    // must delete by product_id. Confirm it's product_id, not category_id.
    const { mockEqDelete } = setupDeleteThenInsert()
    await repo.setProductCategories(7, [1, 2])
    expect(mockEqDelete).not.toHaveBeenCalledWith('category_id', expect.anything())
    expect(mockEqDelete).toHaveBeenCalledWith('product_id', 7)
  })
})

// ---------------------------------------------------------------------------
// 4.  SupabaseCategoryRepository.getProductCategoryMap()
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository.getProductCategoryMap()', () => {
  const repo = categoryRepository

  it('happy path – reduces rows into { [productId]: categoryId[] }', async () => {
    setupSelectOnly([
      { product_id: 1, category_id: 10 },
      { product_id: 1, category_id: 20 },
      { product_id: 2, category_id: 10 },
    ])
    const map = await repo.getProductCategoryMap()
    expect(map[1]).toEqual([10, 20])
    expect(map[2]).toEqual([10])
  })

  it('queries product_categories with both columns', async () => {
    setupSelectOnly([])
    await repo.getProductCategoryMap()
    expect(mockFrom).toHaveBeenCalledWith('product_categories')
    expect(mockSelect).toHaveBeenCalledWith('product_id, category_id')
  })

  it('returns empty object when no rows', async () => {
    setupSelectOnly([])
    const map = await repo.getProductCategoryMap()
    expect(map).toEqual({})
  })

  it('a product with one category maps to a single-element array', async () => {
    setupSelectOnly([{ product_id: 5, category_id: 3 }])
    const map = await repo.getProductCategoryMap()
    expect(map[5]).toEqual([3])
  })

  it('throws when Supabase returns an error', async () => {
    setupSelectOnly([], { message: 'map error' })
    await expect(repo.getProductCategoryMap()).rejects.toMatchObject({ message: 'map error' })
  })
})

// ---------------------------------------------------------------------------
// 5.  Column-name alignment with 001_initial_schema.sql
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository – column names match migration schema', () => {
  const src = readFile('src/infrastructure/repositories/SupabaseCategoryRepository.ts')

  // product_categories columns are product_id and category_id per 001_initial_schema.sql line 88-90
  it('getCategoryIdsForProduct selects column "category_id"', () => {
    expect(src).toContain("select('category_id')")
  })

  it('getCategoryIdsForProduct filters on column "product_id"', () => {
    expect(src).toMatch(/\.eq\('product_id',\s*productId\)/)
  })

  it('getProductCategoryMap selects columns "product_id, category_id"', () => {
    expect(src).toContain("select('product_id, category_id')")
  })

  it('setProductCategories deletes with eq("product_id")', () => {
    // Must use product_id key on the delete, not category_id
    const deleteBlock = src.slice(src.indexOf('setProductCategories'))
    expect(deleteBlock).toMatch(/\.eq\('product_id',\s*productId\)/)
  })

  it('setProductCategories inserts rows with product_id and category_id keys', () => {
    expect(src).toContain('product_id: productId')
    expect(src).toContain('category_id: cid')
  })

  it('getAllActive filters with eq("is_active", true)', () => {
    expect(src).toContain(".eq('is_active', true)")
  })

  // Confirm no renamed existing methods
  it('getAllForAdmin() still exists (not renamed)', () => {
    expect(src).toContain('async getAllForAdmin()')
  })

  it('getProductIds() still exists (not renamed)', () => {
    expect(src).toContain('async getProductIds(')
  })

  it('setProducts() still exists (not renamed)', () => {
    expect(src).toContain('async setProducts(')
  })
})

// ---------------------------------------------------------------------------
// 6.  ProductsPage.tsx – source-level checks
// ---------------------------------------------------------------------------
describe('ProductsPage.tsx – category filter source checks', () => {
  const src = readFile('src/ui/pages/ProductsPage.tsx')

  it('imports categoryRepository', () => {
    expect(src).toContain("categoryRepository")
    expect(src).toContain("SupabaseCategoryRepository")
  })

  it('imports Category type', () => {
    expect(src).toContain("type { Category }")
  })

  it('imports es as i18n', () => {
    expect(src).toContain('es as i18n')
  })

  it('declares categories state', () => {
    expect(src).toMatch(/useState<Category\[\]>/)
  })

  it('declares productCategoryMap state', () => {
    expect(src).toMatch(/useState<Record<number,\s*number\[\]>>/)
  })

  it('declares activeCategoryId state initialized to null', () => {
    expect(src).toMatch(/useState<number\s*\|\s*null>\(null\)/)
  })

  it('loads products, active categories, and category map in a Promise.all', () => {
    expect(src).toContain('Promise.all(')
    expect(src).toContain('productRepository.getAll()')
    expect(src).toContain('categoryRepository.getAllActive()')
    expect(src).toContain('categoryRepository.getProductCategoryMap()')
  })

  it('Promise.all uses .catch(() => setError(true))', () => {
    expect(src).toMatch(/\.catch\(\(\)\s*=>\s*setError\(true\)\)/)
  })

  it('Promise.all uses .finally(() => setLoading(false))', () => {
    expect(src).toMatch(/\.finally\(\(\)\s*=>\s*setLoading\(false\)\)/)
  })

  it('handleFilter resets visibleCount to PAGE_SIZE', () => {
    expect(src).toContain('setVisibleCount(PAGE_SIZE)')
  })

  it('handleFilter resets prevVisibleRef.current to PAGE_SIZE', () => {
    expect(src).toContain('prevVisibleRef.current = PAGE_SIZE')
  })

  it('filteredProducts uses null check for activeCategoryId', () => {
    expect(src).toMatch(/activeCategoryId\s*===\s*null/)
  })

  it('filteredProducts coalesces missing map entry to empty array', () => {
    // ?? [] is the required coalesce per spec edge case 4
    expect(src).toMatch(/productCategoryMap\[p\.id\]\s*\?\?\s*\[\]/)
  })

  it('GSAP grid entrance dependency array includes activeCategoryId', () => {
    expect(src).toMatch(/\[allProducts,\s*activeCategoryId\]/)
  })

  it('filter nav is only rendered when categories.length > 0', () => {
    expect(src).toMatch(/categories\.length\s*>\s*0/)
  })

  it('filter nav uses i18n.products.filterAll for "Todas" chip', () => {
    expect(src).toContain('i18n.products.filterAll')
  })

  it('filter nav uses aria-label', () => {
    expect(src).toMatch(/aria-label=["']Filtrar por catego/)
  })

  it('filter chips use catalog__filter CSS class', () => {
    expect(src).toContain('catalog__filter')
  })

  it('active chip adds catalog__filter--active class', () => {
    expect(src).toContain('catalog__filter--active')
  })

  it('category chip onClick calls handleFilter with category.id', () => {
    expect(src).toMatch(/handleFilter\(category\.id\)/)
  })

  it('"Todas" chip onClick calls handleFilter(null)', () => {
    expect(src).toMatch(/handleFilter\(null\)/)
  })

  it('per-category empty state uses i18n.products.filterEmpty (not full-page catalog-state)', () => {
    expect(src).toContain('i18n.products.filterEmpty')
    // The filterEmpty message must not be inside a catalog-state block
    // (i.e., it's an inline paragraph, keeping masthead visible)
    const filterEmptyIdx = src.indexOf('i18n.products.filterEmpty')
    const catalogStateIdx = src.indexOf('catalog-state')
    // filterEmpty must appear AFTER the full-page guards (which use catalog-state)
    // so filterEmpty is never inside a catalog-state element
    expect(filterEmptyIdx).toBeGreaterThan(catalogStateIdx)
  })

  it('visibleProducts is derived from filteredProducts (not allProducts)', () => {
    expect(src).toMatch(/filteredProducts\.slice\(/)
  })

  it('hasMore is derived from filteredProducts (not allProducts)', () => {
    expect(src).toMatch(/visibleCount\s*<\s*filteredProducts\.length/)
  })

  it('remaining is derived from filteredProducts (not allProducts)', () => {
    expect(src).toMatch(/filteredProducts\.length\s*-\s*visibleCount/)
  })
})

// ---------------------------------------------------------------------------
// 7.  TabProducts.tsx – source-level checks for category panel
// ---------------------------------------------------------------------------
describe('TabProducts.tsx – category panel source checks', () => {
  const src = readFile('src/ui/pages/admin/TabProducts.tsx')

  it('imports categoryRepository', () => {
    expect(src).toContain('categoryRepository')
    expect(src).toContain('SupabaseCategoryRepository')
  })

  it('imports Category type', () => {
    expect(src).toContain("type { Category }")
  })

  it('declares availableCategories state', () => {
    expect(src).toMatch(/availableCategories[\s\S]{0,60}Category\[\]/)
  })

  it('declares selectedCategoryIds state', () => {
    expect(src).toMatch(/selectedCategoryIds[\s\S]{0,60}number\[\]/)
  })

  it('declares categoriesSaving state (initialized to false)', () => {
    // Type is inferred as boolean from the initial value false
    expect(src).toMatch(/\[categoriesSaving,\s*setCategoriesSaving\]\s*=\s*useState\(false\)/)
  })

  it('declares categoriesError state', () => {
    expect(src).toMatch(/categoriesError[\s\S]{0,60}string\s*\|\s*null/)
  })

  it('loadVariantData includes categoryRepository.getAllActive()', () => {
    expect(src).toContain('categoryRepository.getAllActive()')
  })

  it('loadVariantData includes categoryRepository.getCategoryIdsForProduct(productId)', () => {
    expect(src).toMatch(/categoryRepository\.getCategoryIdsForProduct\(productId\)/)
  })

  it('loadVariantData sets availableCategories', () => {
    expect(src).toContain('setAvailableCategories(')
  })

  it('loadVariantData sets selectedCategoryIds', () => {
    expect(src).toContain('setSelectedCategoryIds(')
  })

  it('openNew resets availableCategories to []', () => {
    const openNewBlock = src.slice(src.indexOf('const openNew'), src.indexOf('const openEdit'))
    expect(openNewBlock).toContain('setAvailableCategories([])')
  })

  it('openNew resets selectedCategoryIds to []', () => {
    const openNewBlock = src.slice(src.indexOf('const openNew'), src.indexOf('const openEdit'))
    expect(openNewBlock).toContain('setSelectedCategoryIds([])')
  })

  it('openNew resets categoriesError to null', () => {
    const openNewBlock = src.slice(src.indexOf('const openNew'), src.indexOf('const openEdit'))
    expect(openNewBlock).toContain('setCategoriesError(null)')
  })

  it('openEdit resets categoriesError to null', () => {
    const openEditBlock = src.slice(src.indexOf('const openEdit'), src.indexOf('const cancelEdit'))
    expect(openEditBlock).toContain('setCategoriesError(null)')
  })

  it('cancelEdit resets categoriesError to null', () => {
    const cancelBlock = src.slice(src.indexOf('const cancelEdit'), src.indexOf('const handleSubmit'))
    expect(cancelBlock).toContain('setCategoriesError(null)')
  })

  it('handleToggleCategory adds or removes an id from selectedCategoryIds', () => {
    expect(src).toContain('handleToggleCategory')
    expect(src).toMatch(/prev\.includes\(categoryId\)/)
  })

  it('handleSaveCategories guards against editing === "new" or null', () => {
    const saveBlock = src.slice(src.indexOf('handleSaveCategories'), src.indexOf('const editingProductId'))
    expect(saveBlock).toMatch(/editing\s*===\s*'new'/)
    expect(saveBlock).toMatch(/editing\s*===\s*null/)
  })

  it('handleSaveCategories calls setProductCategories', () => {
    expect(src).toContain('categoryRepository.setProductCategories(')
  })

  it('handleSaveCategories passes editing.id and selectedCategoryIds to setProductCategories', () => {
    expect(src).toMatch(/setProductCategories\(editing\.id,\s*selectedCategoryIds\)/)
  })

  it('handleSaveCategories sets categoriesError on catch', () => {
    const saveBlock = src.slice(src.indexOf('handleSaveCategories'))
    expect(saveBlock.slice(0, 600)).toContain('setCategoriesError(')
  })

  it('handleSaveCategories sets categoriesSaving in finally', () => {
    const saveBlock = src.slice(src.indexOf('handleSaveCategories'))
    expect(saveBlock.slice(0, 600)).toContain('setCategoriesSaving(false)')
  })

  it('categories panel is inside editingProductId !== null block', () => {
    const editBlock = src.slice(src.indexOf('editingProductId !== null'))
    expect(editBlock).toContain('categoriesTitle')
    expect(editBlock).toContain('categoriesSave')
  })

  it('categories panel renders categoriesTitle from i18n', () => {
    expect(src).toContain('i18n.admin.categoriesTitle')
  })

  it('categories panel renders categoriesSave from i18n', () => {
    expect(src).toContain('i18n.admin.categoriesSave')
  })

  it('categories panel shows adm-alert for categoriesError', () => {
    expect(src).toContain('categoriesError')
    expect(src).toMatch(/adm-alert[\s\S]{0,60}categoriesError|categoriesError[\s\S]{0,60}adm-alert/)
  })

  it('categories panel shows checkboxes bound to selectedCategoryIds.includes()', () => {
    expect(src).toMatch(/selectedCategoryIds\.includes\(c\.id\)/)
  })

  it('category checkbox onChange calls handleToggleCategory', () => {
    expect(src).toMatch(/handleToggleCategory\(c\.id\)/)
  })

  it('save button is disabled when categoriesSaving', () => {
    expect(src).toMatch(/disabled=\{categoriesSaving\}/)
  })

  it('save button shows i18n.admin.saving when categoriesSaving is true', () => {
    expect(src).toMatch(/categoriesSaving\s*\?\s*i18n\.admin\.saving\s*:\s*i18n\.admin\.categoriesSave/)
  })

  it('save button onClick calls handleSaveCategories', () => {
    expect(src).toMatch(/onClick=\{handleSaveCategories\}/)
  })
})

// ---------------------------------------------------------------------------
// 8.  es.ts i18n – four new keys required by spec
// ---------------------------------------------------------------------------
import { es } from '../i18n/es'

describe('es.ts – new i18n keys for category filter feature', () => {
  it('has products.filterAll', () => {
    expect(es.products.filterAll).toBeTruthy()
  })

  it('products.filterAll is "Todas"', () => {
    expect(es.products.filterAll).toBe('Todas')
  })

  it('has products.filterEmpty', () => {
    expect(es.products.filterEmpty).toBeTruthy()
  })

  it('products.filterEmpty is a non-empty string', () => {
    expect(typeof es.products.filterEmpty).toBe('string')
    expect(es.products.filterEmpty.length).toBeGreaterThan(0)
  })

  it('has admin.categoriesTitle', () => {
    expect(es.admin.categoriesTitle).toBeTruthy()
  })

  it('admin.categoriesTitle is "Categorías"', () => {
    expect(es.admin.categoriesTitle).toBe('Categorías')
  })

  it('has admin.categoriesSave', () => {
    expect(es.admin.categoriesSave).toBeTruthy()
  })

  it('admin.categoriesSave is "Guardar categorías"', () => {
    expect(es.admin.categoriesSave).toBe('Guardar categorías')
  })

  it('no new key has an empty string value', () => {
    const keys = ['filterAll', 'filterEmpty'] as const
    const empties = keys.filter(k => es.products[k] === '')
    expect(empties).toEqual([])

    const adminKeys = ['categoriesTitle', 'categoriesSave'] as const
    const adminEmpties = adminKeys.filter(k => es.admin[k] === '')
    expect(adminEmpties).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 9.  catalog.css – filter-bar classes and reduced-motion group
// ---------------------------------------------------------------------------
describe('catalog.css – filter-bar styles', () => {
  const src = readFile('src/ui/styles/catalog.css')

  it('defines .catalog__filters class', () => {
    expect(src).toContain('.catalog__filters')
  })

  it('.catalog__filters uses display: flex', () => {
    const idx = src.indexOf('.catalog__filters')
    const block = src.slice(idx, idx + 300)
    expect(block).toContain('display: flex')
  })

  it('.catalog__filters has flex-wrap: wrap', () => {
    const idx = src.indexOf('.catalog__filters')
    const block = src.slice(idx, idx + 300)
    expect(block).toContain('flex-wrap: wrap')
  })

  it('.catalog__filters has a margin-bottom', () => {
    const idx = src.indexOf('.catalog__filters')
    const block = src.slice(idx, idx + 300)
    expect(block).toContain('margin-bottom')
  })

  it('defines .catalog__filter class (pill button)', () => {
    expect(src).toContain('.catalog__filter {')
  })

  it('.catalog__filter has a border', () => {
    const idx = src.indexOf('.catalog__filter {')
    const block = src.slice(idx, idx + 400)
    expect(block).toContain('border:')
  })

  it('.catalog__filter has a cursor: pointer', () => {
    const idx = src.indexOf('.catalog__filter {')
    const block = src.slice(idx, idx + 400)
    expect(block).toContain('cursor: pointer')
  })

  it('defines .catalog__filter:hover', () => {
    expect(src).toContain('.catalog__filter:hover')
  })

  it('defines .catalog__filter--active class', () => {
    expect(src).toContain('.catalog__filter--active')
  })

  it('.catalog__filter--active uses --c-ink as background', () => {
    const idx = src.indexOf('.catalog__filter--active')
    const block = src.slice(idx, idx + 200)
    expect(block).toContain('var(--c-ink)')
  })

  it('.catalog__filter is included in the prefers-reduced-motion transition-none group', () => {
    const motionBlock = src.slice(src.indexOf('prefers-reduced-motion'))
    expect(motionBlock).toContain('.catalog__filter')
  })
})

// ---------------------------------------------------------------------------
// 10. SupabaseCategoryRepository.ts – source-level integrity checks
// ---------------------------------------------------------------------------
describe('SupabaseCategoryRepository.ts – source-level integrity', () => {
  const src = readFile('src/infrastructure/repositories/SupabaseCategoryRepository.ts')

  it('has getAllActive method', () => {
    expect(src).toContain('async getAllActive()')
  })

  it('has getCategoryIdsForProduct method', () => {
    expect(src).toContain('async getCategoryIdsForProduct(')
  })

  it('has setProductCategories method', () => {
    expect(src).toContain('async setProductCategories(')
  })

  it('has getProductCategoryMap method', () => {
    expect(src).toContain('async getProductCategoryMap()')
  })

  it('getAllActive return type is Promise<Category[]>', () => {
    expect(src).toMatch(/getAllActive\(\):\s*Promise<Category\[\]>/)
  })

  it('getCategoryIdsForProduct return type is Promise<number[]>', () => {
    expect(src).toMatch(/getCategoryIdsForProduct\(productId:\s*number\):\s*Promise<number\[\]>/)
  })

  it('setProductCategories return type is Promise<void>', () => {
    expect(src).toMatch(/setProductCategories\(productId:\s*number,\s*categoryIds:\s*number\[\]\):\s*Promise<void>/)
  })

  it('getProductCategoryMap return type is Record<number, number[]>', () => {
    expect(src).toMatch(/getProductCategoryMap\(\):\s*Promise<Record<number,\s*number\[\]>>/)
  })

  it('categoryRepository singleton is exported', () => {
    expect(src).toContain('export const categoryRepository')
  })
})
