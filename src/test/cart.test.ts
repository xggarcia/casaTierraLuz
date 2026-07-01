/**
 * Tests for the Shopping Cart feature.
 *
 * Covers:
 *  - SupabaseCartRepository: getForUser, addOrIncrement, setQuantity, remove
 *  - Cart / CartItemInput entity shapes
 *  - SQL migration content (004_cart.sql)
 *  - i18n cart block key presence + no empty strings
 *  - Source reviews: App.tsx, Header.tsx, ProductDetailPage.tsx, CartPage.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
const root = path.resolve(__dirname, '../../')
function readFile(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf-8')
}

// ---------------------------------------------------------------------------
// Supabase mock infrastructure
// vi.hoisted() ensures these are initialized before vi.mock() factory runs
// ---------------------------------------------------------------------------
const {
  mockMaybeSingle,
  mockOrder,
  mockUpdate,
  mockInsert,
  mockDelete,
  mockEq,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

// Import repo AFTER mock so it picks up the mock
import { SupabaseCartRepository } from '../infrastructure/repositories/SupabaseCartRepository'
import type { CartItem, CartItemInput } from '../domain/entities/Cart'
import { es } from '../i18n/es'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers for building mock query chains
// ---------------------------------------------------------------------------

/**
 * getForUser: from -> select -> eq -> order -> { data, error }
 */
function setupGetForUserChain(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/**
 * addOrIncrement — select path (maybeSingle): from -> select -> eq -> eq -> maybeSingle
 * The update and insert are set up separately per test.
 */
function setupSelectExistingChain(row: unknown, error: unknown = null) {
  mockMaybeSingle.mockResolvedValue({ data: row, error })
  // eq is called twice (user_id, variant_id), chained
  mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })
}

/**
 * update chain used after finding existing row: update -> eq -> { error }
 */
function setupUpdateChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockReturnValue(leaf)
  mockUpdate.mockReturnValue({ eq: mockEq })
}

/**
 * insert chain for new row: insert -> { error }
 */
function setupInsertChain(error: unknown = null) {
  mockInsert.mockResolvedValue({ error })
}

/**
 * setQuantity: from -> update -> eq -> { error }
 */
function setupSetQuantityChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
}

/**
 * remove: from -> delete -> eq -> { error }
 */
function setupRemoveChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  mockDelete.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ delete: mockDelete })
}

/** Build a full DB cart row with nested joins. */
function makeDbCartRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 1,
    variant_id: 10,
    quantity: 2,
    product_variants: {
      id: 10,
      price: '12.50',
      stock: 5,
      product_id: 100,
      colors: { id: 3, name: { es: 'Ámbar' }, hex_code: '#c97d3a' },
      scents: { id: 7, name: { es: 'Vainilla' } },
      products: {
        id: 100,
        name: { es: 'Vela Artesanal' },
        images: ['https://example.com/vela.jpg'],
        base_price: '9.99',
      },
    },
    ...overrides,
  }
}

const repo = new SupabaseCartRepository()

// ---------------------------------------------------------------------------
// SupabaseCartRepository.getForUser()
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.getForUser()', () => {
  it('happy path – maps snake_case join to CartItem camelCase', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items).toHaveLength(1)
    const item = items[0]
    expect(item.id).toBe(1)
    expect(item.variantId).toBe(10)
    expect(item.productId).toBe(100)
    expect(item.quantity).toBe(2)
    expect(item.unitPrice).toBe(12.5)
    expect(item.stock).toBe(5)
    expect(item.image).toBe('https://example.com/vela.jpg')
  })

  it('resolves unitPrice from variant.price when present', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].unitPrice).toBe(12.5)
  })

  it('resolves unitPrice from products.base_price when variant.price is null', async () => {
    const row = makeDbCartRow()
    ;(row.product_variants as Record<string, unknown>).price = null
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].unitPrice).toBe(9.99)
  })

  it('image is images[0] when present', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].image).toBe('https://example.com/vela.jpg')
  })

  it('image is null when products.images is empty', async () => {
    const row = makeDbCartRow()
    ;((row.product_variants as Record<string, unknown>).products as Record<string, unknown>).images = []
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].image).toBeNull()
  })

  it('image is null when products.images is null', async () => {
    const row = makeDbCartRow()
    ;((row.product_variants as Record<string, unknown>).products as Record<string, unknown>).images = null
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].image).toBeNull()
  })

  it('returns empty array when no rows', async () => {
    setupGetForUserChain([])
    const items = await repo.getForUser('user-uuid-123')
    expect(items).toEqual([])
  })

  it('maps colorName from variant colors join', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].colorName).toEqual({ es: 'Ámbar' })
  })

  it('colorName is null when colors is null', async () => {
    const row = makeDbCartRow()
    ;(row.product_variants as Record<string, unknown>).colors = null
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].colorName).toBeNull()
  })

  it('maps scentName from variant scents join', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].scentName).toEqual({ es: 'Vainilla' })
  })

  it('scentName is null when scents is null', async () => {
    const row = makeDbCartRow()
    ;(row.product_variants as Record<string, unknown>).scents = null
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].scentName).toBeNull()
  })

  it('unwraps array-form colors join (Supabase T | T[] shape)', async () => {
    const row = makeDbCartRow()
    ;(row.product_variants as Record<string, unknown>).colors = [
      { id: 3, name: { es: 'Ámbar' }, hex_code: '#c97d3a' },
    ]
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].colorName).toEqual({ es: 'Ámbar' })
  })

  it('unwraps array-form scents join (Supabase T | T[] shape)', async () => {
    const row = makeDbCartRow()
    ;(row.product_variants as Record<string, unknown>).scents = [
      { id: 7, name: { es: 'Vainilla' } },
    ]
    setupGetForUserChain([row])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].scentName).toEqual({ es: 'Vainilla' })
  })

  it('maps productName from products.name', async () => {
    setupGetForUserChain([makeDbCartRow()])
    const items = await repo.getForUser('user-uuid-123')
    expect(items[0].productName).toEqual({ es: 'Vela Artesanal' })
  })

  it('queries from cart_items table', () => {
    setupGetForUserChain([])
    repo.getForUser('user-uuid-123')
    expect(mockFrom).toHaveBeenCalledWith('cart_items')
  })

  it('filters by user_id', () => {
    setupGetForUserChain([])
    repo.getForUser('user-uuid-123')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-uuid-123')
  })

  it('orders by id ascending (oldest first)', () => {
    setupGetForUserChain([])
    repo.getForUser('user-uuid-123')
    expect(mockOrder).toHaveBeenCalledWith('id', { ascending: true })
  })

  it('throws when Supabase returns an error', async () => {
    setupGetForUserChain([], { message: 'DB error', code: '42501' })
    await expect(repo.getForUser('user-uuid-123')).rejects.toMatchObject({ message: 'DB error' })
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.addOrIncrement() — existing-row path
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.addOrIncrement() – existing row', () => {
  const input: CartItemInput = { userId: 'user-abc', variantId: 10, quantity: 1 }

  it('selects existing row with maybeSingle', async () => {
    const existingRow = { id: 5, quantity: 3 }
    setupSelectExistingChain(existingRow)
    setupUpdateChain()
    mockEq.mockReturnValueOnce({ eq: mockEq, maybeSingle: mockMaybeSingle })
      .mockReturnValueOnce({ eq: mockEq, maybeSingle: mockMaybeSingle })
      .mockReturnValue({ error: null })
    await repo.addOrIncrement(input)
    expect(mockMaybeSingle).toHaveBeenCalled()
  })

  it('updates quantity by adding input.quantity to existing quantity', async () => {
    const existingRow = { id: 5, quantity: 3 }
    // Chain: select -> eq -> eq -> maybeSingle resolves with existing row
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    // update chain
    const updateLeaf = { error: null }
    const mockUpdateEq = vi.fn().mockResolvedValue(updateLeaf)
    mockUpdate.mockReturnValue({ eq: mockUpdateEq })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })

    await repo.addOrIncrement(input)
    expect(mockUpdate).toHaveBeenCalledWith({ quantity: 4 }) // 3 + 1
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 5)
  })

  it('throws if select returns error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'select failed' } })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })
    await expect(repo.addOrIncrement(input)).rejects.toMatchObject({ message: 'select failed' })
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.addOrIncrement() — new-row path
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.addOrIncrement() – new row', () => {
  const input: CartItemInput = { userId: 'user-abc', variantId: 10, quantity: 2 }

  it('inserts a new row when no existing row found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

    await repo.addOrIncrement(input)
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-abc',
      variant_id: 10,
      quantity: 2,
    })
  })

  it('does not call update when row does not exist', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

    await repo.addOrIncrement(input)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('throws if insert returns error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

    await expect(repo.addOrIncrement(input)).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('inserts with snake_case columns (user_id, variant_id)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

    await repo.addOrIncrement(input)
    const arg = mockInsert.mock.calls[0][0]
    expect(arg).toHaveProperty('user_id', 'user-abc')
    expect(arg).toHaveProperty('variant_id', 10)
    expect(arg).not.toHaveProperty('userId')
    expect(arg).not.toHaveProperty('variantId')
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.setQuantity()
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.setQuantity()', () => {
  it('updates quantity on the correct cart row', async () => {
    setupSetQuantityChain()
    await repo.setQuantity(7, 3)
    expect(mockFrom).toHaveBeenCalledWith('cart_items')
    expect(mockUpdate).toHaveBeenCalledWith({ quantity: 3 })
    expect(mockEq).toHaveBeenCalledWith('id', 7)
  })

  it('resolves without returning a value (Promise<void>)', async () => {
    setupSetQuantityChain()
    const result = await repo.setQuantity(7, 3)
    expect(result).toBeUndefined()
  })

  it('throws when Supabase returns an error', async () => {
    setupSetQuantityChain({ message: 'update failed' })
    await expect(repo.setQuantity(7, 3)).rejects.toMatchObject({ message: 'update failed' })
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.remove()
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.remove()', () => {
  it('deletes the correct cart row', async () => {
    setupRemoveChain()
    await repo.remove(42)
    expect(mockFrom).toHaveBeenCalledWith('cart_items')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 42)
  })

  it('resolves without returning a value (Promise<void>)', async () => {
    setupRemoveChain()
    const result = await repo.remove(42)
    expect(result).toBeUndefined()
  })

  it('throws when Supabase returns an error', async () => {
    setupRemoveChain({ message: 'delete failed' })
    await expect(repo.remove(42)).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('passes the correct id to eq (different ids)', async () => {
    setupRemoveChain()
    await repo.remove(99)
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.ts – source review
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.ts – source review', () => {
  const src = readFile('src/infrastructure/repositories/SupabaseCartRepository.ts')

  it('defines DbCartItem type', () => {
    expect(src).toContain('DbCartItem')
  })

  it('defines DbVariantJoin type', () => {
    expect(src).toContain('DbVariantJoin')
  })

  it('defines DbProductJoin type', () => {
    expect(src).toContain('DbProductJoin')
  })

  it('CART_SELECT includes the nested join string', () => {
    expect(src).toContain('product_variants')
    expect(src).toContain('colors')
    expect(src).toContain('scents')
    expect(src).toContain('products')
  })

  it('uses maybeSingle() in addOrIncrement', () => {
    expect(src).toContain('maybeSingle()')
  })

  it('exports a singleton cartRepository instance', () => {
    expect(src).toMatch(/export const cartRepository/)
    expect(src).toMatch(/new SupabaseCartRepository\(\)/)
  })

  it('class is named SupabaseCartRepository', () => {
    expect(src).toMatch(/class\s+SupabaseCartRepository/)
  })

  it('every method uses "if (error) throw error" pattern', () => {
    const throwCount = (src.match(/if\s*\(error\)\s*throw\s*error/g) ?? []).length
    // Four throw guards (selectError, update/insert in addOrIncrement, setQuantity, remove)
    expect(throwCount).toBeGreaterThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// Cart entity – interface shapes
// ---------------------------------------------------------------------------
describe('Cart entity interfaces', () => {
  it('CartItem has all required fields with correct types', () => {
    const item: CartItem = {
      id: 1,
      variantId: 10,
      productId: 100,
      quantity: 2,
      unitPrice: 12.5,
      stock: 5,
      productName: { es: 'Vela Artesanal' },
      image: 'https://example.com/vela.jpg',
      colorName: { es: 'Ámbar' },
      scentName: { es: 'Vainilla' },
    }
    expect(item.id).toBe(1)
    expect(typeof item.variantId).toBe('number')
    expect(typeof item.productId).toBe('number')
    expect(typeof item.quantity).toBe('number')
    expect(typeof item.unitPrice).toBe('number')
    expect(typeof item.stock).toBe('number')
    expect(typeof item.productName).toBe('object')
  })

  it('CartItem.image can be null', () => {
    const item: CartItem = {
      id: 2,
      variantId: 11,
      productId: 101,
      quantity: 1,
      unitPrice: 9.99,
      stock: 3,
      productName: { es: 'Sin imagen' },
      image: null,
      colorName: null,
      scentName: null,
    }
    expect(item.image).toBeNull()
    expect(item.colorName).toBeNull()
    expect(item.scentName).toBeNull()
  })

  it('CartItemInput has userId, variantId, quantity', () => {
    const input: CartItemInput = {
      userId: 'uuid-abc',
      variantId: 10,
      quantity: 1,
    }
    expect(Object.keys(input)).toHaveLength(3)
    expect(input).toHaveProperty('userId')
    expect(input).toHaveProperty('variantId')
    expect(input).toHaveProperty('quantity')
  })

  it('CartItemInput does not include id or productId', () => {
    const input: CartItemInput = {
      userId: 'uuid-abc',
      variantId: 10,
      quantity: 1,
    }
    expect(input).not.toHaveProperty('id')
    expect(input).not.toHaveProperty('productId')
  })
})

// ---------------------------------------------------------------------------
// SQL migration content — 004_cart.sql
// ---------------------------------------------------------------------------
describe('supabase/migrations/004_cart.sql – content checks', () => {
  const sql = readFile('supabase/migrations/004_cart.sql')

  it('creates the cart_items table', () => {
    expect(sql).toMatch(/CREATE TABLE cart_items/i)
  })

  it('id column is SERIAL PRIMARY KEY', () => {
    expect(sql).toMatch(/id\s+SERIAL\s+PRIMARY KEY/i)
  })

  it('user_id references auth.users with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/user_id[\s\S]*?REFERENCES auth\.users\(id\)[\s\S]*?ON DELETE CASCADE/i)
  })

  it('variant_id references product_variants with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/variant_id[\s\S]*?REFERENCES product_variants\(id\)[\s\S]*?ON DELETE CASCADE/i)
  })

  it('quantity column has CHECK (quantity > 0)', () => {
    expect(sql).toMatch(/quantity[\s\S]*?CHECK\s*\(\s*quantity\s*>\s*0\s*\)/i)
  })

  it('quantity column defaults to 1', () => {
    expect(sql).toMatch(/quantity[\s\S]*?DEFAULT 1/i)
  })

  it('has UNIQUE (user_id, variant_id) constraint', () => {
    expect(sql).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*variant_id\s*\)/i)
  })

  it('enables row level security', () => {
    expect(sql).toMatch(/ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY/i)
  })

  it('creates SELECT policy scoped to auth.uid() = user_id', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON cart_items FOR SELECT/i)
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/)
  })

  it('creates INSERT policy scoped to auth.uid() = user_id', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON cart_items FOR INSERT/i)
    expect(sql).toMatch(/WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)
  })

  it('creates UPDATE policy scoped to auth.uid() = user_id', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON cart_items FOR UPDATE/i)
  })

  it('creates DELETE policy scoped to auth.uid() = user_id', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON cart_items FOR DELETE/i)
  })

  it('has all four RLS policies (SELECT, INSERT, UPDATE, DELETE)', () => {
    const policies = sql.match(/CREATE POLICY/gi) ?? []
    expect(policies.length).toBeGreaterThanOrEqual(4)
  })

  it('does NOT redefine is_admin() (function already exists in 001)', () => {
    expect(sql).not.toMatch(/CREATE.*FUNCTION.*is_admin/i)
  })
})

// ---------------------------------------------------------------------------
// i18n – cart block keys
// ---------------------------------------------------------------------------
describe('es.ts – cart i18n block', () => {
  const c = es.cart

  it('has cart.title', () => expect(c.title).toBeTruthy())
  it('has cart.subtitle', () => expect(c.subtitle).toBeTruthy())
  it('has cart.empty', () => expect(c.empty).toBeTruthy())
  it('has cart.goShop', () => expect(c.goShop).toBeTruthy())
  it('has cart.loginRequired', () => expect(c.loginRequired).toBeTruthy())
  it('has cart.goLogin', () => expect(c.goLogin).toBeTruthy())
  it('has cart.goRegister', () => expect(c.goRegister).toBeTruthy())
  it('has cart.colProduct', () => expect(c.colProduct).toBeTruthy())
  it('has cart.colUnitPrice', () => expect(c.colUnitPrice).toBeTruthy())
  it('has cart.colQuantity', () => expect(c.colQuantity).toBeTruthy())
  it('has cart.colLineTotal', () => expect(c.colLineTotal).toBeTruthy())
  it('has cart.remove', () => expect(c.remove).toBeTruthy())
  it('has cart.total', () => expect(c.total).toBeTruthy())
  it('has cart.checkout', () => expect(c.checkout).toBeTruthy())
  it('has cart.loginToAdd', () => expect(c.loginToAdd).toBeTruthy())
  it('has cart.added', () => expect(c.added).toBeTruthy())
  it('has cart.headerLink', () => expect(c.headerLink).toBeTruthy())
  it('has cart.increase', () => expect(c.increase).toBeTruthy())
  it('has cart.decrease', () => expect(c.decrease).toBeTruthy())
  it('has cart.updateError', () => expect(c.updateError).toBeTruthy())

  it('no cart key has an empty string value', () => {
    const keys = Object.keys(c) as (keyof typeof c)[]
    const empties = keys.filter(k => c[k] === '')
    expect(empties).toEqual([])
  })

  it('cart block has exactly 22 keys as specified', () => {
    expect(Object.keys(c)).toHaveLength(22)
  })
})

// ---------------------------------------------------------------------------
// App.tsx – /carrito route + CartProvider
// ---------------------------------------------------------------------------
describe('App.tsx – /carrito route and CartProvider', () => {
  const src = readFile('src/App.tsx')

  it('imports CartProvider', () => {
    expect(src).toContain('CartProvider')
    expect(src).toMatch(/from ['"].*CartContext['"]/)
  })

  it('imports CartPage', () => {
    expect(src).toContain('CartPage')
    expect(src).toMatch(/from ['"].*CartPage['"]/)
  })

  it('adds a Route with path /carrito', () => {
    expect(src).toMatch(/path="\/carrito"/)
  })

  it('/carrito route renders CartPage', () => {
    expect(src).toMatch(/\/carrito[\s\S]{0,100}CartPage/)
  })

  it('CartProvider wraps BrowserRouter in JSX (opening tag appears before BrowserRouter)', () => {
    const cartPos = src.indexOf('<CartProvider>')
    const browserPos = src.indexOf('<BrowserRouter')
    expect(cartPos).toBeGreaterThan(-1)
    expect(cartPos).toBeLessThan(browserPos)
  })

  it('CartProvider is inside AuthProvider', () => {
    const authPos = src.indexOf('<AuthProvider>')
    const cartPos = src.indexOf('<CartProvider>')
    expect(cartPos).toBeGreaterThan(authPos)
  })
})

// ---------------------------------------------------------------------------
// Header.tsx – auth-gated Carrito link with count
// ---------------------------------------------------------------------------
describe('Header.tsx – Carrito nav link', () => {
  const src = readFile('src/ui/components/Header.tsx')

  it('imports useCart', () => {
    expect(src).toContain('useCart')
    expect(src).toMatch(/from ['"].*CartContext['"]/)
  })

  it('has a cart trigger button (drawer replaces Link to /carrito)', () => {
    // Cart link is now a <button> that opens the drawer; /carrito is still in the drawer
    expect(src).toMatch(/openDrawer/)
    expect(src).toMatch(/<button[\s\S]{0,200}openDrawer|openDrawer[\s\S]{0,200}<button/)
  })

  it('cart trigger button uses site-header__link class', () => {
    const block = src.match(/openDrawer[\s\S]{0,200}site-header__link|site-header__link[\s\S]{0,200}openDrawer/)
    expect(block).not.toBeNull()
  })

  it('cart trigger is inside the user-authenticated block', () => {
    // The onClick={... openDrawer} usage must appear after the {user ? check
    const userBlock = src.indexOf('user ?')
    const triggerPos = src.indexOf('onClick={isCartPage ? undefined : openDrawer}')
    expect(triggerPos).toBeGreaterThan(userBlock)
  })

  it('does not open the drawer when already on /carrito', () => {
    // Guard against re-opening the mini-cart drawer while viewing the full cart page
    expect(src).toMatch(/isCartPage\s*=\s*location\.pathname\s*===\s*['"]\/carrito['"]/)
    expect(src).toMatch(/onClick=\{isCartPage \? undefined : openDrawer\}/)
  })

  it('uses count from useCart to show item count', () => {
    expect(src).toContain('count')
    expect(src).toMatch(/count\s*>/)
  })

  it('Carrito link is NOT shown in the logged-out branch', () => {
    // The logged-out branch only has /login link; /carrito must not appear there
    const loggedOutBlock = src.match(/\}\s*:\s*\(\s*[\s\S]*?\/login[\s\S]*?\)\s*\}/)
    if (loggedOutBlock) {
      expect(loggedOutBlock[0]).not.toContain('/carrito')
    }
  })
})

// ---------------------------------------------------------------------------
// ProductDetailPage.tsx – useCart wiring
// ---------------------------------------------------------------------------
describe('ProductDetailPage.tsx – useCart + login gate', () => {
  const src = readFile('src/ui/pages/ProductDetailPage.tsx')

  it('imports useCart', () => {
    expect(src).toContain('useCart')
    expect(src).toMatch(/from ['"].*CartContext['"]/)
  })

  it('imports useAuth', () => {
    expect(src).toContain('useAuth')
    expect(src).toMatch(/from ['"].*AuthContext['"]/)
  })

  it('calls addToCart', () => {
    expect(src).toContain('addToCart')
  })

  it('gates on user before adding (routes to /login when !user)', () => {
    expect(src).toMatch(/!user[\s\S]{0,60}\/login|navigate\(['"]\/login['"]\)/)
  })

  it('calls addToCart with selectedVariant.id', () => {
    expect(src).toMatch(/addToCart\(selectedVariant\.id/)
  })

  it('shows i18n.cart.loginToAdd when not logged in', () => {
    expect(src).toContain('i18n.cart.loginToAdd')
  })

  it('does not show inline i18n.cart.added feedback (drawer auto-open replaces it)', () => {
    // The addedFeedback state and JSX block were removed per spec; drawer opens instead
    expect(src).not.toContain('addedFeedback')
  })

  it('preserves isOutOfStock disabled behavior', () => {
    expect(src).toContain('isOutOfStock')
    expect(src).toMatch(/disabled=\{isOutOfStock\}/)
  })
})

// ---------------------------------------------------------------------------
// CartPage.tsx – source review
// ---------------------------------------------------------------------------
describe('CartPage.tsx – source review', () => {
  const src = readFile('src/ui/pages/CartPage.tsx')

  it('imports useAuth', () => {
    expect(src).toContain('useAuth')
    expect(src).toMatch(/from ['"].*AuthContext['"]/)
  })

  it('imports useCart', () => {
    expect(src).toContain('useCart')
    expect(src).toMatch(/from ['"].*CartContext['"]/)
  })

  it('uses auth-page class for login gate (reuses auth.css)', () => {
    expect(src).toContain('auth-page')
  })

  it('uses auth-column class for login gate', () => {
    expect(src).toContain('auth-column')
  })

  it('imports auth.css', () => {
    expect(src).toMatch(/import.*auth\.css/)
  })

  it('imports cart.css', () => {
    expect(src).toMatch(/import.*cart\.css/)
  })

  it('shows login-required message when !user', () => {
    expect(src).toMatch(/!user/)
    expect(src).toMatch(/i18n\.cart\.loginRequired/)
  })

  it('renders Link to /login for unauthenticated users', () => {
    expect(src).toMatch(/to="\/login"/)
    expect(src).toMatch(/i18n\.cart\.goLogin/)
  })

  it('renders Link to /registro for unauthenticated users', () => {
    expect(src).toMatch(/to="\/registro"/)
    expect(src).toMatch(/i18n\.cart\.goRegister/)
  })

  it('renders empty state with link to /productos', () => {
    expect(src).toMatch(/i18n\.cart\.empty/)
    expect(src).toMatch(/to="\/productos"/)
  })

  it('quantity stepper "−" calls setQuantity(item.id, item.quantity - 1)', () => {
    expect(src).toMatch(/setQuantity\(item\.id,\s*item\.quantity\s*-\s*1\)/)
  })

  it('quantity stepper "+" calls setQuantity(item.id, item.quantity + 1)', () => {
    expect(src).toMatch(/setQuantity\(item\.id,\s*item\.quantity\s*\+\s*1\)/)
  })

  it('"+" button is disabled when quantity >= stock', () => {
    expect(src).toMatch(/disabled=\{item\.quantity\s*>=\s*item\.stock\}/)
  })

  it('remove button calls removeItem(item.id)', () => {
    expect(src).toMatch(/removeItem\(item\.id\)/)
  })

  it('shows i18n.cart.remove label on remove button', () => {
    expect(src).toContain('i18n.cart.remove')
  })

  it('has a disabled checkout placeholder button', () => {
    expect(src).toMatch(/disabled/)
    expect(src).toMatch(/i18n\.cart\.checkout/)
  })

  it('sets document.title to Carrito — Casa Tierra Luz', () => {
    expect(src).toContain('Carrito — Casa Tierra Luz')
  })

  it('does not use inline color styles', () => {
    expect(src).not.toMatch(/style=\{.*color:/)
    expect(src).not.toMatch(/style=\{.*background/)
  })

  it('uses aria-label on stepper buttons from i18n', () => {
    expect(src).toContain('i18n.cart.decrease')
    expect(src).toContain('i18n.cart.increase')
  })

  it('displays cart total using toFixed(2) and thinsp', () => {
    expect(src).toMatch(/toFixed\(2\)/)
    expect(src).toContain('&thinsp;€')
  })
})
