/**
 * Tests for src/infrastructure/repositories/SupabaseProductRepository.ts
 *
 * These tests mock the supabase client to control what .from().select()... returns,
 * so we can test the mapping and filtering logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Minimal supabase mock that can be configured per-test via `mockReturnValue`
// vi.hoisted() ensures these are initialized before vi.mock() factory runs
// ---------------------------------------------------------------------------
const { mockMaybeSingle, mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

// The mock query builder always chains: from -> select -> eq -> order -> (resolved)
// For getAll():  from().select().eq('is_active', true).order(...)
// For getAllForAdmin(): from().select().order(...)
// For getById(): from().select().eq('id', x).eq('is_active', true).maybeSingle()

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}))

// Re-import AFTER mocking so the module picks up the mock
import { SupabaseProductRepository } from '../infrastructure/repositories/SupabaseProductRepository'

// A complete DbProduct row matching all mapped fields
function makeDbProduct(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: { es: 'Vela Rosa', en: 'Rose Candle' },
    short_description: { es: 'Descripción corta' },
    long_description: null,
    base_price: '12.50',      // NUMERIC arrives as string from Supabase
    images: ['img1.jpg'],
    is_active: true,
    product_variants: [
      {
        id: 10,
        product_id: 1,
        color_id: 1,
        scent_id: 1,
        price: '9.99',        // NUMERIC
        stock: 5,
        is_active: true,
        colors: { id: 1, name: { es: 'Rojo' }, hex_code: '#FF0000' },
        scents: { id: 1, name: { es: 'Rosa' } },
      },
    ],
    ...overrides,
  }
}

function setupMockForGetAll(rows: unknown[], error: unknown = null) {
  // getAll: from -> select -> eq('is_active', true) -> order -> { data, error }
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

function setupMockForGetAllForAdmin(rows: unknown[], error: unknown = null) {
  // getAllForAdmin: from -> select -> order -> { data, error }  (no eq filter)
  mockOrder.mockResolvedValue({ data: rows, error })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

function setupMockForGetById(row: unknown | null, error: unknown = null) {
  // getById: from -> select -> eq('id', x) -> eq('is_active', true) -> maybeSingle -> { data, error }
  mockMaybeSingle.mockResolvedValue({ data: row, error })
  // eq chaining: first .eq returns object with second .eq, second .eq returns object with maybeSingle
  const secondEqResult = { maybeSingle: mockMaybeSingle }
  const firstEqResult = { eq: vi.fn().mockReturnValue(secondEqResult) }
  mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue(firstEqResult) })
  mockFrom.mockReturnValue({ select: mockSelect })
}

beforeEach(() => {
  vi.clearAllMocks()
})

const repo = new SupabaseProductRepository()

// ---------------------------------------------------------------------------
// getAll()
// ---------------------------------------------------------------------------
describe('SupabaseProductRepository.getAll()', () => {
  it('happy path – returns mapped products with NUMERIC fields coerced to number', async () => {
    setupMockForGetAll([makeDbProduct()])
    const products = await repo.getAll()
    expect(products).toHaveLength(1)
    const p = products[0]
    expect(p.id).toBe(1)
    expect(p.basePrice).toBe(12.5)         // was '12.50' string
    expect(typeof p.basePrice).toBe('number')
    expect(p.isActive).toBe(true)
    expect(p.images).toEqual(['img1.jpg'])
    expect(p.name).toEqual({ es: 'Vela Rosa', en: 'Rose Candle' })
    expect(p.shortDescription).toEqual({ es: 'Descripción corta' })
    expect(p.longDescription).toBeNull()
  })

  it('maps variant fields correctly – price and stock coerced to number', async () => {
    setupMockForGetAll([makeDbProduct()])
    const [product] = await repo.getAll()
    const variant = product.variants[0]
    expect(variant.id).toBe(10)
    expect(variant.productId).toBe(1)
    expect(variant.price).toBe(9.99)
    expect(typeof variant.price).toBe('number')
    expect(variant.stock).toBe(5)
    expect(typeof variant.stock).toBe('number')
  })

  it('maps color correctly – hex_code -> hexCode', async () => {
    setupMockForGetAll([makeDbProduct()])
    const [product] = await repo.getAll()
    const color = product.variants[0].color
    expect(color).not.toBeNull()
    expect(color!.hexCode).toBe('#FF0000')
    expect(color!.id).toBe(1)
  })

  it('maps scent correctly', async () => {
    setupMockForGetAll([makeDbProduct()])
    const [product] = await repo.getAll()
    const scent = product.variants[0].scent
    expect(scent).not.toBeNull()
    expect(scent!.id).toBe(1)
    expect(scent!.name).toEqual({ es: 'Rosa' })
  })

  it('normalises colors/scents when PostgREST returns array instead of object', async () => {
    // PostgREST can return FK joins as array-of-one
    const row = makeDbProduct()
    const variant = (row.product_variants as unknown[])[0] as Record<string, unknown>
    variant.colors = [{ id: 2, name: { es: 'Azul' }, hex_code: '#0000FF' }]
    variant.scents = [{ id: 2, name: { es: 'Lavanda' } }]
    setupMockForGetAll([row])
    const [product] = await repo.getAll()
    expect(product.variants[0].color!.hexCode).toBe('#0000FF')
    expect(product.variants[0].scent!.name).toEqual({ es: 'Lavanda' })
  })

  it('produces color: null and scent: null when FK is null', async () => {
    const row = makeDbProduct()
    const variant = (row.product_variants as unknown[])[0] as Record<string, unknown>
    variant.colors = null
    variant.scents = null
    setupMockForGetAll([row])
    const [product] = await repo.getAll()
    expect(product.variants[0].color).toBeNull()
    expect(product.variants[0].scent).toBeNull()
  })

  it('filters out inactive variants (is_active === false)', async () => {
    const row = makeDbProduct()
    ;(row.product_variants as unknown[]).push({
      id: 11,
      product_id: 1,
      color_id: null,
      scent_id: null,
      price: null,
      stock: 0,
      is_active: false,      // should be excluded
      colors: null,
      scents: null,
    })
    setupMockForGetAll([row])
    const [product] = await repo.getAll()
    // Only the active variant (id: 10) should appear
    expect(product.variants).toHaveLength(1)
    expect(product.variants[0].id).toBe(10)
  })

  it('returns empty array when no products', async () => {
    setupMockForGetAll([])
    const products = await repo.getAll()
    expect(products).toEqual([])
  })

  it('uses images ?? [] when images is null', async () => {
    setupMockForGetAll([makeDbProduct({ images: null })])
    const [product] = await repo.getAll()
    expect(product.images).toEqual([])
  })

  it('uses product_variants ?? [] when variants is null', async () => {
    setupMockForGetAll([makeDbProduct({ product_variants: null })])
    const [product] = await repo.getAll()
    expect(product.variants).toEqual([])
  })

  it('variant price: null when price column is null', async () => {
    const row = makeDbProduct()
    const variant = (row.product_variants as unknown[])[0] as Record<string, unknown>
    variant.price = null
    setupMockForGetAll([row])
    const [product] = await repo.getAll()
    expect(product.variants[0].price).toBeNull()
  })

  it('throws when Supabase returns an error', async () => {
    setupMockForGetAll([], { message: 'DB error', code: '500' })
    await expect(repo.getAll()).rejects.toMatchObject({ message: 'DB error' })
  })
})

// ---------------------------------------------------------------------------
// getAllForAdmin()
// ---------------------------------------------------------------------------
describe('SupabaseProductRepository.getAllForAdmin()', () => {
  it('happy path – returns all products including inactive ones', async () => {
    const activeRow = makeDbProduct({ id: 1, is_active: true })
    const inactiveRow = makeDbProduct({ id: 2, is_active: false })
    setupMockForGetAllForAdmin([activeRow, inactiveRow])
    const products = await repo.getAllForAdmin()
    expect(products).toHaveLength(2)
    expect(products[0].isActive).toBe(true)
    expect(products[1].isActive).toBe(false)
  })

  it('maps isActive = false correctly', async () => {
    setupMockForGetAllForAdmin([makeDbProduct({ is_active: false })])
    const [product] = await repo.getAllForAdmin()
    expect(product.isActive).toBe(false)
  })

  it('returns empty array when no products', async () => {
    setupMockForGetAllForAdmin([])
    const products = await repo.getAllForAdmin()
    expect(products).toEqual([])
  })

  it('throws when Supabase returns an error', async () => {
    setupMockForGetAllForAdmin([], { message: 'Admin query failed' })
    await expect(repo.getAllForAdmin()).rejects.toMatchObject({ message: 'Admin query failed' })
  })
})

// ---------------------------------------------------------------------------
// getById()
// ---------------------------------------------------------------------------
describe('SupabaseProductRepository.getById()', () => {
  it('happy path – returns a mapped product for a valid id', async () => {
    setupMockForGetById(makeDbProduct())
    const product = await repo.getById(1)
    expect(product).toBeDefined()
    expect(product!.id).toBe(1)
    expect(product!.basePrice).toBe(12.5)
  })

  it('returns undefined when product is not found (maybeSingle returns null data)', async () => {
    setupMockForGetById(null)
    const product = await repo.getById(9999)
    expect(product).toBeUndefined()
  })

  it('returns undefined (not throws) when Supabase returns an error', async () => {
    setupMockForGetById(null, { message: 'Row not found' })
    const product = await repo.getById(0)
    expect(product).toBeUndefined()
  })

  it('handles NaN id gracefully – returns undefined (no row found)', async () => {
    // Number('abc') === NaN; the query won't match any row
    setupMockForGetById(null)
    const product = await repo.getById(NaN)
    expect(product).toBeUndefined()
  })
})
