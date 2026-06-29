/**
 * Tests for the Admin Panel CRUD expansion.
 *
 * Covers:
 *  - Code review checks (§3-§10 from the task)
 *  - SupabaseVariantRepository unit tests (mocked supabase)
 *  - SupabaseScentRepository unit tests (mocked supabase)
 *  - SupabaseColorRepository unit tests (mocked supabase)
 *  - SupabaseProductRepository new write methods (mocked supabase)
 *  - Product.ts entity shape (isActive on Color and Scent)
 *  - es.ts i18n keys required by spec §6
 *  - migration SQL content
 *  - AdminPage.tsx source structure
 *  - TabProducts / TabScents / TabColors source structure
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
// Supabase mock infrastructure (shared by all repository tests)
// ---------------------------------------------------------------------------
const {
  mockSingle,
  mockMaybeSingle,
  mockOrder,
  mockDelete,
  mockUpdate,
  mockInsert,
  mockEq,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

// Import repos AFTER mock
import { SupabaseVariantRepository } from '../infrastructure/repositories/SupabaseVariantRepository'
import { SupabaseScentRepository } from '../infrastructure/repositories/SupabaseScentRepository'
import { SupabaseColorRepository } from '../infrastructure/repositories/SupabaseColorRepository'
import { SupabaseProductRepository } from '../infrastructure/repositories/SupabaseProductRepository'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers for building mock query chains
// ---------------------------------------------------------------------------

/** getByProductId: from->select->eq->order */
function setupVariantGetByProductId(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** insert/update/delete that just return { error } */
function setupMutationChain(op: 'insert' | 'update' | 'delete', error: unknown = null) {
  // For insert: from->insert->{ error }
  // For update: from->update->eq->{ error }
  // For delete: from->delete->eq->{ error }
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  if (op === 'insert') {
    mockInsert.mockResolvedValue(leaf)
    mockFrom.mockReturnValue({ insert: mockInsert })
  } else if (op === 'update') {
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
  } else {
    mockDelete.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })
  }
}

/** getAllForAdmin (scents/colors): from->select->order */
function setupAdminSelectChain(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** Product create: from->insert->select->single */
function setupProductCreateChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockFrom.mockReturnValue({ insert: mockInsert })
}

/** Product update/setActive/remove: from->update/delete->eq */
function setupProductWriteChain(op: 'update' | 'delete', error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  if (op === 'update') {
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })
  } else {
    mockDelete.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })
  }
}

// ---------------------------------------------------------------------------
// §3  SupabaseVariantRepository
// ---------------------------------------------------------------------------
describe('SupabaseVariantRepository', () => {
  const repo = new SupabaseVariantRepository()

  const makeDbVariant = (overrides = {}) => ({
    id: 10,
    product_id: 1,
    color_id: 2,
    scent_id: 3,
    price: '9.99',
    stock: '5',
    is_active: true,
    colors: { id: 2, name: { es: 'Rojo' }, hex_code: '#FF0000' },
    scents: { id: 3, name: { es: 'Rosa' } },
    ...overrides,
  })

  // --- getByProductId ---
  describe('getByProductId()', () => {
    it('happy path – maps NUMERIC price and stock to numbers', async () => {
      setupVariantGetByProductId([makeDbVariant()])
      const variants = await repo.getByProductId(1)
      expect(variants).toHaveLength(1)
      expect(variants[0].price).toBe(9.99)
      expect(typeof variants[0].price).toBe('number')
      expect(variants[0].stock).toBe(5)
      expect(typeof variants[0].stock).toBe('number')
    })

    it('maps color including hexCode (DB hex_code -> hexCode)', async () => {
      setupVariantGetByProductId([makeDbVariant()])
      const [v] = await repo.getByProductId(1)
      expect(v.color).not.toBeNull()
      expect(v.color!.hexCode).toBe('#FF0000')
      expect(v.color!.id).toBe(2)
    })

    it('maps scent correctly', async () => {
      setupVariantGetByProductId([makeDbVariant()])
      const [v] = await repo.getByProductId(1)
      expect(v.scent).not.toBeNull()
      expect(v.scent!.id).toBe(3)
      expect(v.scent!.name).toEqual({ es: 'Rosa' })
    })

    it('normalises colors/scents when PostgREST returns array-of-one', async () => {
      const row = makeDbVariant({
        colors: [{ id: 2, name: { es: 'Azul' }, hex_code: '#0000FF' }],
        scents: [{ id: 3, name: { es: 'Lavanda' } }],
      })
      setupVariantGetByProductId([row])
      const [v] = await repo.getByProductId(1)
      expect(v.color!.hexCode).toBe('#0000FF')
      expect(v.scent!.name).toEqual({ es: 'Lavanda' })
    })

    it('returns null color and scent when FK columns are null', async () => {
      setupVariantGetByProductId([makeDbVariant({ colors: null, scents: null })])
      const [v] = await repo.getByProductId(1)
      expect(v.color).toBeNull()
      expect(v.scent).toBeNull()
    })

    it('variant price: null when price column is null (inherit base price)', async () => {
      setupVariantGetByProductId([makeDbVariant({ price: null })])
      const [v] = await repo.getByProductId(1)
      expect(v.price).toBeNull()
    })

    it('returns empty array when no variants', async () => {
      setupVariantGetByProductId([])
      const variants = await repo.getByProductId(99)
      expect(variants).toEqual([])
    })

    it('throws when supabase returns an error', async () => {
      setupVariantGetByProductId([], { message: 'DB error' })
      await expect(repo.getByProductId(1)).rejects.toMatchObject({ message: 'DB error' })
    })
  })

  // --- create ---
  describe('create()', () => {
    it('happy path – calls insert with correct snake_case column names', async () => {
      setupMutationChain('insert')
      await repo.create({
        productId: 1,
        colorId: 2,
        scentId: 3,
        price: 9.99,
        stock: 5,
        isActive: true,
      })
      expect(mockInsert).toHaveBeenCalledWith({
        product_id: 1,
        color_id: 2,
        scent_id: 3,
        price: 9.99,
        stock: 5,
        is_active: true,
      })
    })

    it('sends null colorId and scentId when not assigned', async () => {
      setupMutationChain('insert')
      await repo.create({
        productId: 1,
        colorId: null,
        scentId: null,
        price: null,
        stock: 0,
        isActive: true,
      })
      const arg = mockInsert.mock.calls[0][0]
      expect(arg.color_id).toBeNull()
      expect(arg.scent_id).toBeNull()
      expect(arg.price).toBeNull()
    })

    it('throws on supabase error', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })
      mockFrom.mockReturnValue({ insert: mockInsert })
      await expect(
        repo.create({ productId: 1, colorId: null, scentId: null, price: null, stock: 0, isActive: true })
      ).rejects.toMatchObject({ message: 'insert failed' })
    })
  })

  // --- update ---
  describe('update()', () => {
    it('happy path – calls update with correct columns', async () => {
      setupProductWriteChain('update')
      await repo.update(10, { colorId: 2, scentId: 3, price: 15.0, stock: 3, isActive: false })
      expect(mockUpdate).toHaveBeenCalledWith({
        color_id: 2,
        scent_id: 3,
        price: 15.0,
        stock: 3,
        is_active: false,
      })
      expect(mockEq).toHaveBeenCalledWith('id', 10)
    })

    it('throws on supabase error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'update failed' } })
      mockFrom.mockReturnValue({ update: mockUpdate })
      await expect(
        repo.update(10, { colorId: null, scentId: null, price: null, stock: 0, isActive: true })
      ).rejects.toMatchObject({ message: 'update failed' })
    })
  })

  // --- remove ---
  describe('remove()', () => {
    it('happy path – calls delete with correct id', async () => {
      setupProductWriteChain('delete')
      await repo.remove(10)
      expect(mockEq).toHaveBeenCalledWith('id', 10)
    })

    it('throws on supabase error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'delete failed' } })
      mockFrom.mockReturnValue({ delete: mockDelete })
      await expect(repo.remove(99)).rejects.toMatchObject({ message: 'delete failed' })
    })
  })
})

// ---------------------------------------------------------------------------
// §3  Source-level: SupabaseVariantRepository.ts code review checks
// ---------------------------------------------------------------------------
describe('SupabaseVariantRepository.ts – source review', () => {
  const src = readFile('src/infrastructure/repositories/SupabaseVariantRepository.ts')

  it('VARIANT_SELECT joins colors(id, name, hex_code)', () => {
    expect(src).toMatch(/colors\(id,\s*name,\s*hex_code\)/)
  })

  it('VARIANT_SELECT joins scents(id, name)', () => {
    expect(src).toMatch(/scents\(id,\s*name\)/)
  })

  it('uses Array.isArray(x) ? x[0] : x normalization for colors', () => {
    expect(src).toMatch(/Array\.isArray\(\w+\)\s*\?\s*\w+\[0\]\s*:\s*\w+/)
  })

  it('create() uses product_id column name', () => {
    expect(src).toContain('product_id')
  })

  it('create() uses color_id column name', () => {
    expect(src).toContain('color_id')
  })

  it('create() uses scent_id column name', () => {
    expect(src).toContain('scent_id')
  })

  it('create() uses is_active column name', () => {
    expect(src).toContain('is_active')
  })

  it('price coerced with Number()', () => {
    expect(src).toMatch(/Number\(row\.price\)/)
  })

  it('stock coerced with Number()', () => {
    expect(src).toMatch(/Number\(row\.stock\)/)
  })
})

// ---------------------------------------------------------------------------
// §4  SupabaseScentRepository
// ---------------------------------------------------------------------------
describe('SupabaseScentRepository', () => {
  const repo = new SupabaseScentRepository()

  const makeDbScent = (overrides = {}) => ({
    id: 1,
    name: { es: 'Rosa' },
    description: null,
    is_active: true,
    ...overrides,
  })

  describe('getAllForAdmin()', () => {
    it('happy path – maps DB rows to Scent objects with isActive', async () => {
      setupAdminSelectChain([makeDbScent(), makeDbScent({ id: 2, name: { es: 'Lavanda' }, is_active: false })])
      const scents = await repo.getAllForAdmin()
      expect(scents).toHaveLength(2)
      expect(scents[0].isActive).toBe(true)
      expect(scents[1].isActive).toBe(false)
    })

    it('maps is_active false (silenced scent still returned by getAllForAdmin)', async () => {
      setupAdminSelectChain([makeDbScent({ is_active: false })])
      const [s] = await repo.getAllForAdmin()
      expect(s.isActive).toBe(false)
    })

    it('returns empty array when no scents', async () => {
      setupAdminSelectChain([])
      expect(await repo.getAllForAdmin()).toEqual([])
    })

    it('throws on error', async () => {
      setupAdminSelectChain([], { message: 'scents error' })
      await expect(repo.getAllForAdmin()).rejects.toMatchObject({ message: 'scents error' })
    })
  })

  describe('create()', () => {
    it('happy path – inserts name', async () => {
      setupMutationChain('insert')
      await repo.create({ name: { es: 'Canela' }, description: null })
      expect(mockInsert).toHaveBeenCalledWith({ name: { es: 'Canela' }, description: null })
    })

    it('throws on error', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'insert scent failed' } })
      mockFrom.mockReturnValue({ insert: mockInsert })
      await expect(repo.create({ name: { es: 'X' }, description: null })).rejects.toMatchObject({ message: 'insert scent failed' })
    })
  })

  describe('setActive()', () => {
    it('calls update with is_active and eq id', async () => {
      setupProductWriteChain('update')
      await repo.setActive(1, false)
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(mockEq).toHaveBeenCalledWith('id', 1)
    })

    it('can re-activate (setActive true)', async () => {
      setupProductWriteChain('update')
      await repo.setActive(2, true)
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: true })
    })

    it('throws on error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'setActive failed' } })
      mockFrom.mockReturnValue({ update: mockUpdate })
      await expect(repo.setActive(1, false)).rejects.toMatchObject({ message: 'setActive failed' })
    })
  })

  describe('remove()', () => {
    it('calls delete with id', async () => {
      setupProductWriteChain('delete')
      await repo.remove(5)
      expect(mockEq).toHaveBeenCalledWith('id', 5)
    })

    it('throws on error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'delete scent failed' } })
      mockFrom.mockReturnValue({ delete: mockDelete })
      await expect(repo.remove(5)).rejects.toMatchObject({ message: 'delete scent failed' })
    })
  })
})

// ---------------------------------------------------------------------------
// §4  SupabaseColorRepository
// ---------------------------------------------------------------------------
describe('SupabaseColorRepository', () => {
  const repo = new SupabaseColorRepository()

  const makeDbColor = (overrides = {}) => ({
    id: 1,
    name: { es: 'Rojo' },
    hex_code: '#FF0000',
    is_active: true,
    ...overrides,
  })

  describe('getAllForAdmin()', () => {
    it('happy path – maps hex_code to hexCode and is_active to isActive', async () => {
      setupAdminSelectChain([makeDbColor()])
      const [c] = await repo.getAllForAdmin()
      expect(c.hexCode).toBe('#FF0000')
      expect(c.isActive).toBe(true)
    })

    it('returns silenced colors (isActive false)', async () => {
      setupAdminSelectChain([makeDbColor({ is_active: false })])
      const [c] = await repo.getAllForAdmin()
      expect(c.isActive).toBe(false)
    })

    it('returns empty array when no colors', async () => {
      setupAdminSelectChain([])
      expect(await repo.getAllForAdmin()).toEqual([])
    })

    it('throws on error', async () => {
      setupAdminSelectChain([], { message: 'colors error' })
      await expect(repo.getAllForAdmin()).rejects.toMatchObject({ message: 'colors error' })
    })
  })

  describe('create()', () => {
    it('happy path – inserts name and hex_code', async () => {
      setupMutationChain('insert')
      await repo.create({ name: { es: 'Azul' }, hexCode: '#0000FF' })
      expect(mockInsert).toHaveBeenCalledWith({ name: { es: 'Azul' }, hex_code: '#0000FF' })
    })

    it('throws on error', async () => {
      mockInsert.mockResolvedValue({ error: { message: 'insert color failed' } })
      mockFrom.mockReturnValue({ insert: mockInsert })
      await expect(repo.create({ name: { es: 'X' }, hexCode: '#000' })).rejects.toMatchObject({
        message: 'insert color failed',
      })
    })
  })

  describe('setActive()', () => {
    it('calls update with is_active and eq id', async () => {
      setupProductWriteChain('update')
      await repo.setActive(3, false)
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(mockEq).toHaveBeenCalledWith('id', 3)
    })

    it('throws on error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'setActive color failed' } })
      mockFrom.mockReturnValue({ update: mockUpdate })
      await expect(repo.setActive(3, false)).rejects.toMatchObject({ message: 'setActive color failed' })
    })
  })

  describe('remove()', () => {
    it('calls delete with id', async () => {
      setupProductWriteChain('delete')
      await repo.remove(7)
      expect(mockEq).toHaveBeenCalledWith('id', 7)
    })

    it('throws on error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'delete color failed' } })
      mockFrom.mockReturnValue({ delete: mockDelete })
      await expect(repo.remove(7)).rejects.toMatchObject({ message: 'delete color failed' })
    })
  })
})

// ---------------------------------------------------------------------------
// §4  SupabaseProductRepository new write methods
// ---------------------------------------------------------------------------
describe('SupabaseProductRepository – new write methods', () => {
  const repo = new SupabaseProductRepository()

  const baseInput = {
    name: { es: 'Vela' },
    shortDescription: null,
    longDescription: null,
    basePrice: 12.5,
    images: ['img.jpg'],
    isActive: true,
    isFeatured: false,
  }

  describe('create()', () => {
    it('happy path – returns { id: number } from .select("id").single()', async () => {
      setupProductCreateChain({ id: 42 })
      const result = await repo.create(baseInput)
      expect(result).toEqual({ id: 42 })
    })

    it('maps ProductInput to correct DB columns', async () => {
      setupProductCreateChain({ id: 1 })
      await repo.create({
        name: { es: 'Test' },
        shortDescription: { es: 'Short' },
        longDescription: { es: 'Long' },
        basePrice: 9.99,
        images: ['a.jpg', 'b.jpg'],
        isActive: false,
        isFeatured: true,
      })
      expect(mockInsert).toHaveBeenCalledWith({
        name: { es: 'Test' },
        short_description: { es: 'Short' },
        long_description: { es: 'Long' },
        base_price: 9.99,
        images: ['a.jpg', 'b.jpg'],
        is_active: false,
        is_featured: true,
      })
    })

    it('sends null for shortDescription/longDescription when null', async () => {
      setupProductCreateChain({ id: 2 })
      await repo.create(baseInput)
      const arg = mockInsert.mock.calls[0][0]
      expect(arg.short_description).toBeNull()
      expect(arg.long_description).toBeNull()
    })

    it('throws on supabase error', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'insert error' } })
      mockSelect.mockReturnValue({ single: mockSingle })
      mockInsert.mockReturnValue({ select: mockSelect })
      mockFrom.mockReturnValue({ insert: mockInsert })
      await expect(repo.create(baseInput)).rejects.toMatchObject({ message: 'insert error' })
    })
  })

  describe('update()', () => {
    it('happy path – calls update with correct DB columns', async () => {
      setupProductWriteChain('update')
      await repo.update(5, { ...baseInput, isActive: false })
      expect(mockUpdate).toHaveBeenCalledWith({
        name: { es: 'Vela' },
        short_description: null,
        long_description: null,
        base_price: 12.5,
        images: ['img.jpg'],
        is_active: false,
        is_featured: false,
      })
      expect(mockEq).toHaveBeenCalledWith('id', 5)
    })

    it('throws on supabase error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'update error' } })
      mockFrom.mockReturnValue({ update: mockUpdate })
      await expect(repo.update(5, baseInput)).rejects.toMatchObject({ message: 'update error' })
    })
  })

  describe('setActive()', () => {
    it('only updates is_active column', async () => {
      setupProductWriteChain('update')
      await repo.setActive(3, false)
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(mockEq).toHaveBeenCalledWith('id', 3)
    })

    it('works for reactivation (true)', async () => {
      setupProductWriteChain('update')
      await repo.setActive(3, true)
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: true })
    })

    it('throws on supabase error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'setActive error' } })
      mockFrom.mockReturnValue({ update: mockUpdate })
      await expect(repo.setActive(3, false)).rejects.toMatchObject({ message: 'setActive error' })
    })
  })

  describe('remove()', () => {
    it('deletes by id', async () => {
      setupProductWriteChain('delete')
      await repo.remove(10)
      expect(mockEq).toHaveBeenCalledWith('id', 10)
    })

    it('throws on supabase error', async () => {
      mockDelete.mockReturnValue({ eq: mockEq })
      mockEq.mockResolvedValue({ error: { message: 'delete error' } })
      mockFrom.mockReturnValue({ delete: mockDelete })
      await expect(repo.remove(10)).rejects.toMatchObject({ message: 'delete error' })
    })
  })
})

// ---------------------------------------------------------------------------
// §3  Product entity – isActive on Color and Scent interfaces
// ---------------------------------------------------------------------------
import type { Color, Scent } from '../domain/entities/Product'

describe('Product.ts entity – isActive on Color and Scent', () => {
  it('Color interface requires isActive: boolean', () => {
    const c: Color = { id: 1, name: { es: 'Rojo' }, hexCode: '#FF0000', isActive: true }
    expect(c.isActive).toBe(true)
  })

  it('Color.isActive can be false', () => {
    const c: Color = { id: 2, name: { es: 'Azul' }, hexCode: '#0000FF', isActive: false }
    expect(c.isActive).toBe(false)
  })

  it('Scent interface requires isActive: boolean', () => {
    const s: Scent = { id: 1, name: { es: 'Rosa' }, description: null, isActive: true }
    expect(s.isActive).toBe(true)
  })

  it('Scent.isActive can be false (silenced scent)', () => {
    const s: Scent = { id: 2, name: { es: 'Canela' }, description: null, isActive: false }
    expect(s.isActive).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §7  es.ts – all new i18n keys from spec §6
// ---------------------------------------------------------------------------
import { es } from '../i18n/es'

describe('es.ts – new admin i18n keys required by spec §6', () => {
  const a = es.admin

  // Tab names
  it('has tabProducts', () => expect(a.tabProducts).toBeTruthy())
  it('has tabScents', () => expect(a.tabScents).toBeTruthy())
  it('has tabColors', () => expect(a.tabColors).toBeTruthy())

  // Shared actions
  it('has create', () => expect(a.create).toBeTruthy())
  it('has edit', () => expect(a.edit).toBeTruthy())
  it('has save', () => expect(a.save).toBeTruthy())
  it('has cancel', () => expect(a.cancel).toBeTruthy())
  it('has delete', () => expect(a.delete).toBeTruthy())
  it('has activate', () => expect(a.activate).toBeTruthy())
  it('has deactivate', () => expect(a.deactivate).toBeTruthy())
  it('has silence', () => expect(a.silence).toBeTruthy())
  it('has unsilence', () => expect(a.unsilence).toBeTruthy())
  it('has confirmDelete', () => expect(a.confirmDelete).toBeTruthy())
  it('has saving', () => expect(a.saving).toBeTruthy())
  it('has saveError', () => expect(a.saveError).toBeTruthy())
  it('has deleteError', () => expect(a.deleteError).toBeTruthy())
  it('has emptyList', () => expect(a.emptyList).toBeTruthy())

  // Product form
  it('has productNew', () => expect(a.productNew).toBeTruthy())
  it('has productEdit', () => expect(a.productEdit).toBeTruthy())
  it('has fieldName', () => expect(a.fieldName).toBeTruthy())
  it('has fieldShortDesc', () => expect(a.fieldShortDesc).toBeTruthy())
  it('has fieldLongDesc', () => expect(a.fieldLongDesc).toBeTruthy())
  it('has fieldBasePrice', () => expect(a.fieldBasePrice).toBeTruthy())
  it('has fieldImages', () => expect(a.fieldImages).toBeTruthy())
  it('has fieldActive', () => expect(a.fieldActive).toBeTruthy())
  it('has fieldFeatured', () => expect(a.fieldFeatured).toBeTruthy())

  // Variants section
  it('has variantsTitle', () => expect(a.variantsTitle).toBeTruthy())
  it('has variantNew', () => expect(a.variantNew).toBeTruthy())
  it('has variantEdit', () => expect(a.variantEdit).toBeTruthy())
  it('has variantSave', () => expect(a.variantSave).toBeTruthy())
  it('has variantCancel', () => expect(a.variantCancel).toBeTruthy())
  it('has variantDelete', () => expect(a.variantDelete).toBeTruthy())
  it('has fieldColor', () => expect(a.fieldColor).toBeTruthy())
  it('has fieldScent', () => expect(a.fieldScent).toBeTruthy())
  it('has fieldPrice', () => expect(a.fieldPrice).toBeTruthy())
  it('has fieldStock', () => expect(a.fieldStock).toBeTruthy())
  it('has noColor', () => expect(a.noColor).toBeTruthy())
  it('has noScent', () => expect(a.noScent).toBeTruthy())
  it('has colColor', () => expect(a.colColor).toBeTruthy())
  it('has colScent', () => expect(a.colScent).toBeTruthy())
  it('has colPrice', () => expect(a.colPrice).toBeTruthy())
  it('has colStock', () => expect(a.colStock).toBeTruthy())

  // Scent / Color forms
  it('has scentNew', () => expect(a.scentNew).toBeTruthy())
  it('has colorNew', () => expect(a.colorNew).toBeTruthy())
  it('has fieldHex', () => expect(a.fieldHex).toBeTruthy())
  it('has colHex', () => expect(a.colHex).toBeTruthy())

  // No values are empty strings
  it('no new admin key has an empty string value', () => {
    const newKeys = [
      'tabProducts', 'tabScents', 'tabColors',
      'create', 'edit', 'save', 'cancel', 'delete', 'activate', 'deactivate',
      'silence', 'unsilence', 'confirmDelete', 'saving', 'saveError', 'deleteError', 'emptyList',
      'productNew', 'productEdit', 'fieldName', 'fieldShortDesc', 'fieldLongDesc',
      'fieldBasePrice', 'fieldImages', 'fieldActive', 'fieldFeatured',
      'variantsTitle', 'variantNew', 'variantEdit', 'variantSave', 'variantCancel', 'variantDelete',
      'fieldColor', 'fieldScent', 'fieldPrice', 'fieldStock', 'noColor', 'noScent',
      'colColor', 'colScent', 'colPrice', 'colStock',
      'scentNew', 'colorNew', 'fieldHex', 'colHex',
    ] as const
    const empties = newKeys.filter(k => (a as Record<string, string>)[k] === '')
    expect(empties).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// §9  Migration 002_admin_active_flags.sql – content checks
// ---------------------------------------------------------------------------
describe('002_admin_active_flags.sql – content checks', () => {
  const sql = readFile('supabase/migrations/002_admin_active_flags.sql')

  it('adds is_active to scents table', () => {
    expect(sql).toMatch(/ALTER TABLE scents ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true/i)
  })

  it('adds is_active to colors table', () => {
    expect(sql).toMatch(/ALTER TABLE colors ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true/i)
  })

  it('drops the old permissive Public read scents policy', () => {
    expect(sql).toMatch(/DROP POLICY "Public read scents" ON scents/i)
  })

  it('drops the old permissive Public read colors policy', () => {
    expect(sql).toMatch(/DROP POLICY "Public read colors" ON colors/i)
  })

  it('creates new scents SELECT policy using is_active = true OR is_admin()', () => {
    expect(sql).toMatch(/CREATE POLICY "Public read scents" ON scents FOR SELECT USING \(is_active = true OR is_admin\(\)\)/i)
  })

  it('creates new colors SELECT policy using is_active = true OR is_admin()', () => {
    expect(sql).toMatch(/CREATE POLICY "Public read colors" ON colors FOR SELECT USING \(is_active = true OR is_admin\(\)\)/i)
  })
})

// ---------------------------------------------------------------------------
// §8  AdminPage.tsx – source structure review
// ---------------------------------------------------------------------------
describe('AdminPage.tsx – source review', () => {
  const src = readFile('src/ui/pages/AdminPage.tsx')

  it('imports TabProducts', () => {
    expect(src).toContain("from './admin/TabProducts'")
  })

  it('imports TabScents', () => {
    expect(src).toContain("from './admin/TabScents'")
  })

  it('imports TabColors', () => {
    expect(src).toContain("from './admin/TabColors'")
  })

  it('has three tab buttons', () => {
    const tabButtons = src.match(/<button[\s\S]*?<\/button>/g) ?? []
    expect(tabButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('active tab button is disabled', () => {
    expect(src).toMatch(/disabled=\{tab === 'products'\}/)
    expect(src).toMatch(/disabled=\{tab === 'scents'\}/)
    expect(src).toMatch(/disabled=\{tab === 'colors'\}/)
  })

  it('conditionally renders TabProducts', () => {
    expect(src).toContain("{tab === 'products' && <TabProducts />}")
  })

  it('conditionally renders TabScents', () => {
    expect(src).toContain("{tab === 'scents' && <TabScents />}")
  })

  it('conditionally renders TabColors', () => {
    expect(src).toContain("{tab === 'colors' && <TabColors />}")
  })

  it('auth gate: authLoading wrapped in ui-page', () => {
    expect(src).toMatch(/authLoading[\s\S]{0,100}ui-page/)
  })

  it('auth gate: !isAdmin wrapped in ui-page', () => {
    expect(src).toMatch(/!isAdmin[\s\S]{0,100}ui-page/)
  })

  it('uses i18n for tab button labels (no hardcoded strings)', () => {
    expect(src).not.toContain('"Productos"')
    expect(src).not.toContain('"Olores"')
    expect(src).not.toContain('"Colores"')
  })

  it('uses i18n tab label keys', () => {
    expect(src).toContain('i18n.admin.tabProducts')
    expect(src).toContain('i18n.admin.tabScents')
    expect(src).toContain('i18n.admin.tabColors')
  })
})

// ---------------------------------------------------------------------------
// §5  TabProducts.tsx – source review
// ---------------------------------------------------------------------------
describe('TabProducts.tsx – source review', () => {
  const src = readFile('src/ui/pages/admin/TabProducts.tsx')

  it('variants section is guarded by editingProductId !== null (not for new)', () => {
    // The condition must reference editingProductId !== null or similar logic
    // that excludes 'new' state
    expect(src).toMatch(/editingProductId\s*!==\s*null/)
  })

  it('after creating a new product, uses returned id to switch to edit mode', () => {
    // Must call productRepository.create() and use returned id
    expect(src).toContain('const { id }')
    expect(src).toMatch(/newProduct\s*=\s*updated\.find/)
  })

  it('color dropdown has a "no color" empty-value option', () => {
    expect(src).toMatch(/<option value="">{i18n\.admin\.noColor}<\/option>/)
  })

  it('scent dropdown has a "no scent" empty-value option', () => {
    expect(src).toMatch(/<option value="">{i18n\.admin\.noScent}<\/option>/)
  })

  it('merges existing name on edit (spread then overwrite es)', () => {
    // Pattern: { ...editing.name, es: formName.trim() }
    expect(src).toMatch(/\.\.\.\s*editing\.name,\s*es:/)
  })

  it('empty description textarea sends null (not { es: empty })', () => {
    // The guard must trim and check truthy before building { es: ... }
    // short desc must result in null when empty
    expect(src).toMatch(/formShortDesc\.trim\(\)[\s\S]{0,200}null/)
  })

  it('window.confirm is called before product delete', () => {
    expect(src).toMatch(/window\.confirm\(i18n\.admin\.confirmDelete\)/)
  })

  it('window.confirm is called before variant delete', () => {
    // There must be at least 2 confirm calls (product delete + variant delete)
    const confirms = src.match(/window\.confirm/g) ?? []
    expect(confirms.length).toBeGreaterThanOrEqual(2)
  })

  it('uses getAllForAdmin() for colors dropdown', () => {
    expect(src).toContain('colorRepository.getAllForAdmin()')
  })

  it('uses getAllForAdmin() for scents dropdown', () => {
    expect(src).toContain('scentRepository.getAllForAdmin()')
  })

  it('no hardcoded Spanish strings in JSX (no string literals matching Spanish words)', () => {
    // Check for the specific forbidden strings that must come from i18n
    const forbidden = [
      '"Nuevo producto"', "'Nuevo producto'",
      '"Editar producto"', "'Editar producto'",
      '"Guardar"', "'Guardar'",
      '"Cancelar"', "'Cancelar'",
      '"Variantes"', "'Variantes'",
      '"Sin color"', "'Sin color'",
      '"Sin olor"', "'Sin olor'",
    ]
    forbidden.forEach(s => {
      expect(src, `should not contain hardcoded ${s}`).not.toContain(s)
    })
  })
})

// ---------------------------------------------------------------------------
// §6  TabScents.tsx – source review
// ---------------------------------------------------------------------------
describe('TabScents.tsx – source review', () => {
  const src = readFile('src/ui/pages/admin/TabScents.tsx')

  it('silence button calls setActive(id, !isActive)', () => {
    expect(src).toMatch(/scentRepository\.setActive\(s\.id,\s*!s\.isActive\)/)
  })

  it('refreshes after silence/unsilence (calls loadScents)', () => {
    // After setActive, must call loadScents()
    const match = src.match(/setActive[\s\S]{0,100}loadScents/)
    expect(match).not.toBeNull()
  })

  it('delete calls remove(id) after confirmation', () => {
    expect(src).toContain('scentRepository.remove(s.id)')
  })

  it('delete uses window.confirm before removing', () => {
    expect(src).toMatch(/window\.confirm\(i18n\.admin\.confirmDelete\)/)
  })

  it('refreshes after delete (calls loadScents)', () => {
    const match = src.match(/remove[\s\S]{0,100}loadScents/)
    expect(match).not.toBeNull()
  })

  it('silence button label comes from i18n (not hardcoded)', () => {
    expect(src).toContain('i18n.admin.silence')
    expect(src).toContain('i18n.admin.unsilence')
    expect(src).not.toContain('"Silenciar"')
    expect(src).not.toContain('"Mostrar"')
  })

  it('no hardcoded Spanish strings', () => {
    const forbidden = ['"Nuevo olor"', '"Eliminar"', '"Nombre"']
    forbidden.forEach(s => expect(src, `should not contain ${s}`).not.toContain(s))
  })
})

// ---------------------------------------------------------------------------
// §6  TabColors.tsx – source review
// ---------------------------------------------------------------------------
describe('TabColors.tsx – source review', () => {
  const src = readFile('src/ui/pages/admin/TabColors.tsx')

  it('silence button calls setActive(c.id, !c.isActive)', () => {
    expect(src).toMatch(/colorRepository\.setActive\(c\.id,\s*!c\.isActive\)/)
  })

  it('refreshes after silence/unsilence (calls loadColors)', () => {
    const match = src.match(/setActive[\s\S]{0,100}loadColors/)
    expect(match).not.toBeNull()
  })

  it('delete calls remove(id) after confirmation', () => {
    expect(src).toContain('colorRepository.remove(c.id)')
  })

  it('delete uses window.confirm before removing', () => {
    expect(src).toMatch(/window\.confirm\(i18n\.admin\.confirmDelete\)/)
  })

  it('refreshes after delete (calls loadColors)', () => {
    const match = src.match(/remove[\s\S]{0,100}loadColors/)
    expect(match).not.toBeNull()
  })

  it('create form includes hex input field', () => {
    expect(src).toContain('newHex')
    // Must render a hex input
    expect(src).toMatch(/type="text"[\s\S]{0,200}newHex|newHex[\s\S]{0,200}type="text"/)
  })

  it('create passes hexCode to colorRepository.create()', () => {
    expect(src).toMatch(/colorRepository\.create\([\s\S]{0,80}hexCode/)
  })

  it('hex field uses i18n label (not hardcoded)', () => {
    expect(src).toContain('i18n.admin.fieldHex')
    expect(src).not.toContain('"Color (hex)"')
  })

  it('no hardcoded Spanish strings', () => {
    const forbidden = ['"Nuevo color"', '"Eliminar"', '"Nombre"', '"Hex"']
    forbidden.forEach(s => expect(src, `should not contain ${s}`).not.toContain(s))
  })
})
