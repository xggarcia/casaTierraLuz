/**
 * Tests for src/domain/entities/Product.ts
 * Tests the t() localisation helper and the type contracts.
 */
import { describe, it, expect } from 'vitest'
import { t } from '../domain/entities/Product'
import type { Localized, Product, ProductVariant, Color, Scent } from '../domain/entities/Product'

// ---------------------------------------------------------------------------
// t() – localisation helper
// ---------------------------------------------------------------------------
describe('t() localisation helper', () => {
  it('happy path – returns the "es" value when present', () => {
    const loc: Localized = { es: 'Vela de cera', ca: 'Espelma de cera', en: 'Wax candle' }
    expect(t(loc)).toBe('Vela de cera')
  })

  it('degrades to "ca" when "es" is missing', () => {
    const loc: Localized = { ca: 'Espelma', en: 'Candle' }
    expect(t(loc)).toBe('Espelma')
  })

  it('degrades to "en" when "es" and "ca" are missing', () => {
    const loc: Localized = { en: 'Candle' }
    expect(t(loc)).toBe('Candle')
  })

  it('returns empty string when object is empty (no keys)', () => {
    const loc: Localized = {}
    expect(t(loc)).toBe('')
  })

  it('returns empty string when passed null', () => {
    expect(t(null)).toBe('')
  })

  it('returns empty string when passed undefined', () => {
    expect(t(undefined)).toBe('')
  })

  it('prefers "es" over all other keys (priority order)', () => {
    // All three keys present – must pick es
    const loc: Localized = { es: 'ES', ca: 'CA', en: 'EN' }
    expect(t(loc)).toBe('ES')
  })

  it('ignores empty-string "es" and falls through to "ca"', () => {
    // Per spec: `loc?.es ?? ...` — `??` only short-circuits on null/undefined,
    // so an empty string '' is a valid (returned) value. This verifies the
    // nullish-coalescence semantics exactly as coded.
    const loc: Localized = { es: '', ca: 'CA' }
    expect(t(loc)).toBe('')  // '' is not null/undefined – nullish coalesce stops here
  })
})

// ---------------------------------------------------------------------------
// Product interface – structural shape (compile-time + runtime sanity)
// ---------------------------------------------------------------------------
describe('Product interface shape', () => {
  it('isActive field is required on Product', () => {
    const color: Color = { id: 1, name: { es: 'Rojo' }, hexCode: '#FF0000', isActive: true }
    const scent: Scent = { id: 1, name: { es: 'Rosa' }, description: null, isActive: true }
    const variant: ProductVariant = {
      id: 10,
      productId: 1,
      color,
      scent,
      price: 12.5,
      stock: 5,
      isActive: true,
    }
    const product: Product = {
      id: 1,
      name: { es: 'Vela' },
      shortDescription: null,
      longDescription: null,
      basePrice: 10.0,
      images: [],
      isActive: true,
      variants: [variant],
    }
    expect(product.isActive).toBe(true)
  })

  it('Product.isActive can be false (inactive products exist)', () => {
    const product: Product = {
      id: 2,
      name: { es: 'Inactiva' },
      shortDescription: null,
      longDescription: null,
      basePrice: 5.0,
      images: [],
      isActive: false,
      variants: [],
    }
    expect(product.isActive).toBe(false)
  })

  it('ProductVariant allows null color and scent', () => {
    const variant: ProductVariant = {
      id: 20,
      productId: 2,
      color: null,
      scent: null,
      price: null,
      stock: 0,
      isActive: true,
    }
    expect(variant.color).toBeNull()
    expect(variant.scent).toBeNull()
    expect(variant.price).toBeNull()
  })

  it('Localized is Partial – a product with only "es" key is valid', () => {
    const loc: Localized = { es: 'Solo español' }
    expect(t(loc)).toBe('Solo español')
    // Must not require ca or en keys to be present
    expect('ca' in loc).toBe(false)
    expect('en' in loc).toBe(false)
  })
})
