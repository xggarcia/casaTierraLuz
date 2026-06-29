/**
 * Tests for the "Add description field to Scents (admin)" feature.
 *
 * Covers the tester focus areas from changes.md:
 *  - Empty description stored as null (not { es: '' })
 *  - Whitespace-only description stored as null
 *  - Populated description stored as { es: "..." }
 *  - getAllForAdmin maps description null correctly
 *  - getAllForAdmin maps populated description correctly
 *  - Column count in loading skeleton and data table is 5
 *  - i18n keys fieldDescription and colDescription exist and are non-empty
 *  - Scent interface includes description: Localized | null
 *  - TabScents.tsx source has the textarea and correct null-guard logic
 *  - SupabaseScentRepository select string includes description
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
// Supabase mock (mirrors admin-crud.test.ts setup)
// ---------------------------------------------------------------------------
const {
  mockOrder,
  mockInsert,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

import { SupabaseScentRepository } from '../infrastructure/repositories/SupabaseScentRepository'
import type { Scent } from '../domain/entities/Product'
import { es } from '../i18n/es'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helper: set up from->select->order chain for getAllForAdmin
// ---------------------------------------------------------------------------
function setupAdminSelectChain(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
}

// ---------------------------------------------------------------------------
// Helper: set up from->insert chain for create
// ---------------------------------------------------------------------------
function setupInsertChain(error: unknown = null) {
  const leaf = { error }
  mockInsert.mockResolvedValue(leaf)
  mockFrom.mockReturnValue({ insert: mockInsert })
}

// ---------------------------------------------------------------------------
// §A  SupabaseScentRepository – description field
// ---------------------------------------------------------------------------
describe('SupabaseScentRepository – description field', () => {
  const repo = new SupabaseScentRepository()

  // --- getAllForAdmin maps description ---
  describe('getAllForAdmin() – description mapping', () => {
    it('maps description: null from DB row to Scent.description null', async () => {
      setupAdminSelectChain([
        { id: 1, name: { es: 'Rosa' }, description: null, is_active: true },
      ])
      const [s] = await repo.getAllForAdmin()
      expect(s.description).toBeNull()
    })

    it('maps populated description from DB row', async () => {
      setupAdminSelectChain([
        { id: 2, name: { es: 'Lavanda' }, description: { es: 'Fragancia relajante' }, is_active: true },
      ])
      const [s] = await repo.getAllForAdmin()
      expect(s.description).toEqual({ es: 'Fragancia relajante' })
    })

    it('description field is present on returned Scent objects (not missing)', async () => {
      setupAdminSelectChain([
        { id: 3, name: { es: 'Canela' }, description: null, is_active: false },
      ])
      const [s] = await repo.getAllForAdmin()
      // The key must exist on the object (not undefined)
      expect('description' in s).toBe(true)
    })
  })

  // --- create – null description ---
  describe('create() – empty/whitespace description (UI sends null)', () => {
    it('inserts description: null when caller passes null (empty form field)', async () => {
      setupInsertChain()
      await repo.create({ name: { es: 'Canela' }, description: null })
      expect(mockInsert).toHaveBeenCalledWith({ name: { es: 'Canela' }, description: null })
    })

    it('never sends { es: "" } – caller must pass null, not empty localized', async () => {
      setupInsertChain()
      // Simulate what the UI does for an empty textarea: it passes null, not { es: '' }
      await repo.create({ name: { es: 'Vainilla' }, description: null })
      const arg = mockInsert.mock.calls[0][0]
      // description must not be an object with an empty es key
      expect(arg.description).not.toEqual({ es: '' })
      expect(arg.description).toBeNull()
    })
  })

  // --- create – populated description ---
  describe('create() – populated description', () => {
    it('inserts description: { es: "..." } when caller passes a localized value', async () => {
      setupInsertChain()
      await repo.create({ name: { es: 'Jazmín' }, description: { es: 'Aroma floral intenso' } })
      expect(mockInsert).toHaveBeenCalledWith({
        name: { es: 'Jazmín' },
        description: { es: 'Aroma floral intenso' },
      })
    })

    it('description es key is preserved verbatim (no trimming by repo)', async () => {
      setupInsertChain()
      const text = 'Notas cítricas con fondo amaderado'
      await repo.create({ name: { es: 'Cedro' }, description: { es: text } })
      const arg = mockInsert.mock.calls[0][0]
      expect(arg.description).toEqual({ es: text })
    })
  })

  // --- select string includes description ---
  describe('select string', () => {
    it('getAllForAdmin selects the description column', () => {
      const src = readFile('src/infrastructure/repositories/SupabaseScentRepository.ts')
      expect(src).toContain('description')
      expect(src).toMatch(/select\(['"]id,\s*name,\s*description,\s*is_active['"]\)/)
    })
  })
})

// ---------------------------------------------------------------------------
// §B  Scent entity – description field exists and is typed correctly
// ---------------------------------------------------------------------------
describe('Scent entity – description field', () => {
  it('Scent interface accepts description: null', () => {
    const s: Scent = { id: 1, name: { es: 'Rosa' }, description: null, isActive: true }
    expect(s.description).toBeNull()
  })

  it('Scent interface accepts a populated Localized description', () => {
    const s: Scent = { id: 2, name: { es: 'Cedro' }, description: { es: 'Madera fresca' }, isActive: true }
    expect(s.description).toEqual({ es: 'Madera fresca' })
  })

  it('Scent.description can be multi-language Localized', () => {
    const s: Scent = {
      id: 3,
      name: { es: 'Lavanda' },
      description: { es: 'Relajante', ca: 'Relaxant', en: 'Relaxing' },
      isActive: true,
    }
    expect(s.description?.es).toBe('Relajante')
    expect(s.description?.en).toBe('Relaxing')
  })
})

// ---------------------------------------------------------------------------
// §C  i18n keys – fieldDescription and colDescription
// ---------------------------------------------------------------------------
describe('es.ts – scent description i18n keys', () => {
  it('has admin.fieldDescription', () => {
    expect(es.admin.fieldDescription).toBeTruthy()
  })

  it('admin.fieldDescription is a non-empty string', () => {
    expect(typeof es.admin.fieldDescription).toBe('string')
    expect(es.admin.fieldDescription.length).toBeGreaterThan(0)
  })

  it('has admin.colDescription', () => {
    expect(es.admin.colDescription).toBeTruthy()
  })

  it('admin.colDescription is a non-empty string', () => {
    expect(typeof es.admin.colDescription).toBe('string')
    expect(es.admin.colDescription.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// §D  TabScents.tsx source review – description feature
// ---------------------------------------------------------------------------
describe('TabScents.tsx – description feature source review', () => {
  const src = readFile('src/ui/pages/admin/TabScents.tsx')

  it('declares newDescription state variable', () => {
    expect(src).toContain('newDescription')
  })

  it('has a textarea for scent-description', () => {
    expect(src).toContain('scent-description')
    expect(src).toMatch(/textarea/)
  })

  it('description field is labelled with i18n.admin.fieldDescription', () => {
    expect(src).toContain('i18n.admin.fieldDescription')
  })

  it('description field is NOT required (optional per spec)', () => {
    // The textarea must not have a `required` attribute
    const textareaBlock = src.match(/id="scent-description"[\s\S]{0,300}\/>/)?.[0] ?? ''
    expect(textareaBlock).not.toContain('required')
  })

  it('handleCreate trims whitespace before building description', () => {
    expect(src).toMatch(/newDescription\.trim\(\)/)
  })

  it('handleCreate stores null when description is blank (empty-to-null guard)', () => {
    // Pattern: newDescription.trim() ? { es: ... } : null
    expect(src).toMatch(/newDescription\.trim\(\)\s*\?\s*\{[\s\S]{0,60}es[\s\S]{0,60}\}\s*:\s*null/)
  })

  it('handleCreate never stores { es: "" } (falsy trim short-circuits to null)', () => {
    // Verify the guard is: if trim is falsy -> null (not { es: '' })
    // The pattern above covers this; also check no literal { es: '' } for description
    expect(src).not.toMatch(/description\s*=\s*\{\s*es:\s*['"]{2}\s*\}/)
  })

  it('resets newDescription after successful create', () => {
    expect(src).toContain("setNewDescription('')")
  })

  it('passes description to scentRepository.create()', () => {
    expect(src).toMatch(/create\(\{[\s\S]{0,80}description/)
  })

  // Column count checks
  it('loading skeleton thead has 5 th elements', () => {
    // Count <th> elements inside the loading skeleton thead (first thead block)
    const skeletonTheadMatch = src.match(/loading\s*\?\s*\([\s\S]*?<thead>([\s\S]*?)<\/thead>/)
    const skeletonThead = skeletonTheadMatch?.[1] ?? ''
    const thCount = (skeletonThead.match(/<th/g) ?? []).length
    expect(thCount).toBe(5)
  })

  it('data table thead has 5 th elements', () => {
    // The data table is in the else branch (scents.map)
    // Find the second thead block
    const theadMatches = [...src.matchAll(/<thead>([\s\S]*?)<\/thead>/g)]
    expect(theadMatches.length).toBeGreaterThanOrEqual(2)
    const dataTheadContent = theadMatches[theadMatches.length - 1][1]
    const thCount = (dataTheadContent.match(/<th/g) ?? []).length
    expect(thCount).toBe(5)
  })

  it('data rows render description column with t(s.description)', () => {
    expect(src).toContain('t(s.description)')
  })

  it('description column header uses i18n.admin.colDescription', () => {
    expect(src).toContain('i18n.admin.colDescription')
  })

  it('skeleton rows have 5 td elements', () => {
    // Each skeleton row must have 5 <td> cells
    const skeletonRowMatch = src.match(/<tr key=\{i\}[\s\S]*?<\/tr>/)
    const skeletonRow = skeletonRowMatch?.[0] ?? ''
    const tdCount = (skeletonRow.match(/<td/g) ?? []).length
    expect(tdCount).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// §E  t() helper – renders description correctly (null returns empty string)
// ---------------------------------------------------------------------------
import { t } from '../domain/entities/Product'

describe('t() with scent description values', () => {
  it('t(null) returns empty string (null description renders as empty cell)', () => {
    expect(t(null)).toBe('')
  })

  it('t({ es: "Aroma cítrico" }) returns the es value', () => {
    expect(t({ es: 'Aroma cítrico' })).toBe('Aroma cítrico')
  })

  it('t(undefined) returns empty string', () => {
    expect(t(undefined)).toBe('')
  })

  it('t({}) returns empty string (empty localized = no display text)', () => {
    expect(t({})).toBe('')
  })
})
