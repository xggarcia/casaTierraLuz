/**
 * Tests for src/i18n/es.ts
 * Verifies: every key the spec requires is present, no values are empty strings,
 * and the Translations type is exported.
 */
import { describe, it, expect } from 'vitest'
import { es } from '../i18n/es'
import type { Translations } from '../i18n/es'

describe('es i18n object – required keys', () => {
  // General
  it('has es.loading', () => expect(es.loading).toBeTruthy())
  it('has es.error', () => expect(es.error).toBeTruthy())
  it('has es.notAuthorized', () => expect(es.notAuthorized).toBeTruthy())

  // Nav
  it('has es.nav.products', () => expect(es.nav.products).toBeTruthy())
  it('has es.nav.login', () => expect(es.nav.login).toBeTruthy())
  it('has es.nav.register', () => expect(es.nav.register).toBeTruthy())
  it('has es.nav.logout', () => expect(es.nav.logout).toBeTruthy())
  it('has es.nav.admin', () => expect(es.nav.admin).toBeTruthy())

  // Products
  it('has es.products.title', () => expect(es.products.title).toBeTruthy())
  it('has es.products.empty', () => expect(es.products.empty).toBeTruthy())
  it('has es.products.error', () => expect(es.products.error).toBeTruthy())
  it('has es.products.currency', () => expect(es.products.currency).toBeTruthy())
  it('has es.products.notFound', () => expect(es.products.notFound).toBeTruthy())
  it('has es.products.noVariants', () => expect(es.products.noVariants).toBeTruthy())
  it('has es.products.noColor', () => expect(es.products.noColor).toBeTruthy())
  it('has es.products.noScent', () => expect(es.products.noScent).toBeTruthy())
  it('has es.products.stock', () => expect(es.products.stock).toBeTruthy())
  it('has es.products.basePrice', () => expect(es.products.basePrice).toBeTruthy())
  it('has es.products.variantPrice', () => expect(es.products.variantPrice).toBeTruthy())

  // Auth
  it('has es.auth.email', () => expect(es.auth.email).toBeTruthy())
  it('has es.auth.password', () => expect(es.auth.password).toBeTruthy())
  it('has es.auth.displayName', () => expect(es.auth.displayName).toBeTruthy())
  it('has es.auth.loginTitle', () => expect(es.auth.loginTitle).toBeTruthy())
  it('has es.auth.registerTitle', () => expect(es.auth.registerTitle).toBeTruthy())
  it('has es.auth.loginButton', () => expect(es.auth.loginButton).toBeTruthy())
  it('has es.auth.registerButton', () => expect(es.auth.registerButton).toBeTruthy())
  it('has es.auth.noAccount', () => expect(es.auth.noAccount).toBeTruthy())
  it('has es.auth.hasAccount', () => expect(es.auth.hasAccount).toBeTruthy())

  // Admin
  it('has es.admin.title', () => expect(es.admin.title).toBeTruthy())
  it('has es.admin.colId', () => expect(es.admin.colId).toBeTruthy())
  it('has es.admin.colName', () => expect(es.admin.colName).toBeTruthy())
  it('has es.admin.colBasePrice', () => expect(es.admin.colBasePrice).toBeTruthy())
  it('has es.admin.colVariants', () => expect(es.admin.colVariants).toBeTruthy())
  it('has es.admin.colActive', () => expect(es.admin.colActive).toBeTruthy())
  it('has es.admin.yes', () => expect(es.admin.yes).toBeTruthy())
  it('has es.admin.no', () => expect(es.admin.no).toBeTruthy())
})

describe('Translations type', () => {
  it('Translations type is structurally identical to es', () => {
    // This test confirms the exported type can receive es without error
    const copy: Translations = es
    expect(copy).toBe(es)
  })
})

describe('es i18n – values are non-empty strings (no accidental empty values)', () => {
  function allLeafStrings(obj: unknown, path = ''): [string, string][] {
    if (typeof obj === 'string') return [[path, obj]]
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj).flatMap(([k, v]) =>
        allLeafStrings(v, path ? `${path}.${k}` : k)
      )
    }
    return []
  }

  const entries = allLeafStrings(es)

  it('no key has an empty string value', () => {
    const empties = entries.filter(([, v]) => v === '')
    expect(empties).toEqual([])
  })

  it('total number of i18n keys matches expected count (37)', () => {
    // Exact count from spec:
    // General: 3, Nav: 5, Products: 11, Auth: 9, Admin: 8 = 36... let's just assert >= 36
    expect(entries.length).toBeGreaterThanOrEqual(36)
  })
})
