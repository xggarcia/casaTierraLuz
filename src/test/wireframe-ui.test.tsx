/**
 * Tests for the wireframe CSS layout changes (spec: Interfaz simple / wireframe).
 *
 * Covers:
 *  - simple.css content rules (no forbidden properties, light background)
 *  - main.tsx imports simple.css (not globals.css)
 *  - Header.tsx: ui-header on <nav>, ui-spacer span present
 *  - ProductsPage.tsx: ui-page wrapper, ui-list on <ul>, h1 from i18n
 *  - ProductDetailPage.tsx: ui-page wrapper for all states
 *  - LoginPage.tsx: ui-page, ui-form, ui-field, ui-error (no inline style)
 *  - RegisterPage.tsx: same as Login
 *  - AdminPage.tsx: ui-page wrapper, ui-table on <table>
 *  - No hardcoded UI strings in any modified component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// File-content helpers
// ---------------------------------------------------------------------------
function readSrc(relative: string): string {
  return fs.readFileSync(
    `${process.cwd()}/${relative}`,
    'utf-8'
  )
}

// ---------------------------------------------------------------------------
// CSS file rules
// ---------------------------------------------------------------------------
describe('simple.css – forbidden properties absent', () => {
  const css = readSrc('src/ui/styles/simple.css')

  it('has no @keyframes', () => {
    expect(css).not.toMatch(/@keyframes/)
  })

  it('has no transition property', () => {
    // Reject `transition:` or `transition :`
    expect(css).not.toMatch(/\btransition\s*:/)
  })

  it('has no animation property', () => {
    expect(css).not.toMatch(/\banimation\s*:/)
  })

  it('has no transform property', () => {
    expect(css).not.toMatch(/\btransform\s*:/)
  })

  it('does not use position:fixed on the header (or anywhere)', () => {
    expect(css).not.toMatch(/position\s*:\s*fixed/)
  })

  it('background is light (#f5f5f5 on body, not dark like #0b0d10)', () => {
    expect(css).toMatch(/background\s*:\s*#f5f5f5/)
    expect(css).not.toMatch(/#0b0d10/)
  })
})

describe('simple.css – required class selectors present', () => {
  const css = readSrc('src/ui/styles/simple.css')

  it('defines .ui-header', () => { expect(css).toMatch(/\.ui-header/) })
  it('defines .ui-spacer', () => { expect(css).toMatch(/\.ui-spacer/) })
  it('defines .ui-page', () => { expect(css).toMatch(/\.ui-page/) })
  it('defines .ui-form', () => { expect(css).toMatch(/\.ui-form/) })
  it('defines .ui-field', () => { expect(css).toMatch(/\.ui-field/) })
  it('defines .ui-error', () => { expect(css).toMatch(/\.ui-error/) })
  it('defines .ui-list', () => { expect(css).toMatch(/\.ui-list/) })
  it('defines .ui-table', () => { expect(css).toMatch(/\.ui-table/) })
})

// ---------------------------------------------------------------------------
// main.tsx import check
// ---------------------------------------------------------------------------
describe('main.tsx – CSS import', () => {
  const main = readSrc('src/main.tsx')

  it('imports simple.css', () => {
    expect(main).toMatch(/import\s+['"]\.\/ui\/styles\/simple\.css['"]/)
  })

  it('does NOT import globals.css', () => {
    expect(main).not.toMatch(/globals\.css/)
  })
})

// ---------------------------------------------------------------------------
// Header.tsx – static source checks
// ---------------------------------------------------------------------------
describe('Header.tsx – className structure in source', () => {
  const src = readSrc('src/ui/components/Header.tsx')

  it('<nav> has className="ui-header"', () => {
    expect(src).toMatch(/className="ui-header"/)
  })

  it('has <span className="ui-spacer" />', () => {
    expect(src).toMatch(/className="ui-spacer"/)
  })

  it('does not contain any hardcoded UI string (text only from i18n)', () => {
    // The component uses t.nav.* keys – it must not contain literal Spanish strings
    const hardcodedStrings = ['Productos', 'Iniciar', 'Registro', 'Salir', 'Admin']
    hardcodedStrings.forEach(s => {
      expect(src).not.toContain(`"${s}"`)
      expect(src).not.toContain(`'${s}'`)
    })
  })
})

// ---------------------------------------------------------------------------
// Header.tsx – rendered output checks (via @testing-library)
// ---------------------------------------------------------------------------
vi.mock('../ui/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
import { useAuth } from '../ui/contexts/AuthContext'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

// CartContext mock — Header uses useCart() for the badge count
vi.mock('../ui/contexts/CartContext', () => ({
  useCart: vi.fn().mockReturnValue({ count: 0, items: [], loading: false }),
}))

import { Header } from '../ui/components/Header'
import { es as t } from '../i18n/es'

function renderHeader() {
  return render(<MemoryRouter><Header /></MemoryRouter>)
}

describe('Header – ui-header nav element rendered', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, signOut: vi.fn() })
  })

  it('<nav> element has class ui-header', () => {
    const { container } = renderHeader()
    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav!.className).toContain('ui-header')
  })

  it('ui-spacer span is in the DOM', () => {
    const { container } = renderHeader()
    const spacer = container.querySelector('span.ui-spacer')
    expect(spacer).not.toBeNull()
  })

  it('products link text comes from i18n (not hardcoded)', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: t.nav.products })).toBeInTheDocument()
  })
})

describe('Header – ui-spacer is between products link and user block', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: 'x@test.com' },
      isAdmin: false,
      signOut: vi.fn(),
    })
  })

  it('spacer exists when user is logged in', () => {
    const { container } = renderHeader()
    expect(container.querySelector('span.ui-spacer')).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// ProductsPage.tsx – source checks
// ---------------------------------------------------------------------------
describe('ProductsPage.tsx – className structure in source', () => {
  const src = readSrc('src/ui/pages/ProductsPage.tsx')

  it('has className="ui-page" wrapper', () => {
    expect(src).toMatch(/className="ui-page"/)
  })

  it('has className="ui-list" on <ul>', () => {
    expect(src).toMatch(/className="ui-list"/)
  })

  it('loading state is wrapped in ui-page', () => {
    // Each early-return must also have ui-page
    const loadingMatch = src.match(/loading[\s\S]{0,80}ui-page/)
    expect(loadingMatch).not.toBeNull()
  })

  it('error state is wrapped in ui-page', () => {
    const errorMatch = src.match(/error[\s\S]{0,80}ui-page/)
    expect(errorMatch).not.toBeNull()
  })

  it('empty state is wrapped in ui-page', () => {
    expect(src).toMatch(/products\.length === 0[\s\S]{0,80}ui-page/)
  })

  it('h1 renders i18n products.title (no hardcoded text)', () => {
    expect(src).toMatch(/i18n\.products\.title/)
    expect(src).not.toMatch(/<h1>\s*Productos\s*<\/h1>/)
  })
})

// ---------------------------------------------------------------------------
// ProductDetailPage.tsx – source checks
// ---------------------------------------------------------------------------
describe('ProductDetailPage.tsx – className structure in source', () => {
  const src = readSrc('src/ui/pages/ProductDetailPage.tsx')

  it('main render has className="ui-page"', () => {
    expect(src).toMatch(/className="ui-page"/)
  })

  it('loading state wrapped in ui-page', () => {
    const m = src.match(/loading[\s\S]{0,80}ui-page/)
    expect(m).not.toBeNull()
  })

  it('not-found state wrapped in ui-page', () => {
    const m = src.match(/!product[\s\S]{0,80}ui-page/)
    expect(m).not.toBeNull()
  })

  it('uses i18n for all user-facing strings (no Spanish literals)', () => {
    const forbidden = ['Cargando', 'Producto no encontrado', 'Precio base', 'Precio', 'Stock', 'Sin variantes']
    forbidden.forEach(s => {
      expect(src).not.toContain(`"${s}"`)
      expect(src).not.toContain(`'${s}'`)
    })
  })
})

// ---------------------------------------------------------------------------
// LoginPage.tsx – source checks
// ---------------------------------------------------------------------------
describe('LoginPage.tsx – className structure in source', () => {
  const src = readSrc('src/ui/pages/LoginPage.tsx')

  it('root div has className="ui-page"', () => {
    expect(src).toMatch(/className="ui-page"/)
  })

  it('form has className="ui-form"', () => {
    expect(src).toMatch(/className="ui-form"/)
  })

  it('field divs have className="ui-field"', () => {
    const matches = src.match(/className="ui-field"/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(2) // email + password fields
  })

  it('error paragraph has className="ui-error"', () => {
    expect(src).toMatch(/className="ui-error"/)
  })

  it('NO inline style={{ color: ... }} remaining on error paragraph', () => {
    // The spec requires removal of style={{ color: 'red' }}
    expect(src).not.toMatch(/style=\{\{[^}]*color[^}]*\}\}/)
  })

  it('does not hardcode UI strings', () => {
    const forbidden = ['Iniciar sesión', 'Correo electrónico', 'Contraseña', 'Entrar']
    forbidden.forEach(s => {
      expect(src).not.toContain(`"${s}"`)
      expect(src).not.toContain(`'${s}'`)
    })
  })
})

// ---------------------------------------------------------------------------
// RegisterPage.tsx – source checks
// ---------------------------------------------------------------------------
describe('RegisterPage.tsx – className structure in source', () => {
  const src = readSrc('src/ui/pages/RegisterPage.tsx')

  it('root div has className="ui-page"', () => {
    expect(src).toMatch(/className="ui-page"/)
  })

  it('form has className="ui-form"', () => {
    expect(src).toMatch(/className="ui-form"/)
  })

  it('field divs have className="ui-field" (at least 3 fields: name, email, password)', () => {
    const matches = src.match(/className="ui-field"/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(3)
  })

  it('error paragraph has className="ui-error"', () => {
    expect(src).toMatch(/className="ui-error"/)
  })

  it('NO inline style={{ color: ... }} remaining', () => {
    expect(src).not.toMatch(/style=\{\{[^}]*color[^}]*\}\}/)
  })

  it('does not hardcode UI strings', () => {
    const forbidden = ['Registro', 'Correo electrónico', 'Contraseña', 'Nombre', 'Registrarse']
    forbidden.forEach(s => {
      expect(src).not.toContain(`"${s}"`)
      expect(src).not.toContain(`'${s}'`)
    })
  })
})

// ---------------------------------------------------------------------------
// AdminPage.tsx – source checks
// ---------------------------------------------------------------------------
describe('AdminPage.tsx – className structure in source', () => {
  const src = readSrc('src/ui/pages/AdminPage.tsx')

  it('main render has className="ui-page"', () => {
    expect(src).toMatch(/className="ui-page"/)
  })

  it('tab shell renders ui-page wrapper', () => {
    // AdminPage.tsx is now a tab shell; ui-table lives in TabProducts.tsx
    expect(src).toMatch(/className="ui-page"/)
  })

  it('authLoading state wrapped in ui-page', () => {
    const m = src.match(/authLoading[\s\S]{0,80}ui-page/)
    expect(m).not.toBeNull()
  })

  it('notAuthorized state wrapped in ui-page', () => {
    const m = src.match(/!isAdmin[\s\S]{0,80}ui-page/)
    expect(m).not.toBeNull()
  })

  it('has at least 3 ui-page wrappers (authLoading, !isAdmin, main render)', () => {
    // Loading/error states for data are inside Tab components, not AdminPage itself
    const matches = src.match(/className="ui-page"/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(3)
  })

  it('TabProducts.tsx has ui-table for the product list', () => {
    // Table and data states live in TabProducts; AdminPage provides the ui-page shell
    const tabSrc = readSrc('src/ui/pages/admin/TabProducts.tsx')
    expect(tabSrc).toMatch(/className="ui-table"/)
  })

  it('does not hardcode UI strings', () => {
    const forbidden = [
      'Panel de administración',
      'ID',
      'Nombre',
      'Precio base',
      'Variantes',
      'Activo',
    ]
    forbidden.forEach(s => {
      expect(src).not.toContain(`"${s}"`)
      expect(src).not.toContain(`'${s}'`)
    })
  })
})

// ---------------------------------------------------------------------------
// Cross-cutting: no hardcoded Spanish text in modified component files
// ---------------------------------------------------------------------------
describe('Cross-cutting – no hardcoded text in component files', () => {
  const files = [
    'src/ui/components/Header.tsx',
    'src/ui/pages/ProductsPage.tsx',
    'src/ui/pages/ProductDetailPage.tsx',
    'src/ui/pages/LoginPage.tsx',
    'src/ui/pages/RegisterPage.tsx',
    'src/ui/pages/AdminPage.tsx',
  ]

  // These strings should only appear inside es.ts, never as string literals in component files
  const spanishPhrases = [
    'Cargando...',
    'No tienes permiso',
    'No hay productos',
    'Error al cargar',
    'Producto no encontrado',
    'Sin variantes disponibles',
  ]

  files.forEach(file => {
    spanishPhrases.forEach(phrase => {
      it(`${file} does not hardcode "${phrase}"`, () => {
        const src = readSrc(file)
        expect(src).not.toContain(phrase)
      })
    })
  })
})
