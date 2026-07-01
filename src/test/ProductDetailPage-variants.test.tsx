/**
 * Behavioral tests for the ProductDetailPage color/scent picker.
 *
 * Covers the split-picker redesign: color swatches and scent chips are two
 * independent controls over the same variant matrix, resolved back to a
 * single ProductVariant by (colorId, scentId). Both axes gate the same way
 * — an option is disabled only when it's sold out everywhere, never merely
 * because it doesn't pair with the other axis's current selection — so
 * clicking anything enabled always succeeds and reflows the other axis to
 * a valid pairing. These are the behaviors a source-grep test can't verify:
 * initial selection, reflow across a missing combination, and "sold out
 * everywhere" disabling on both axes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import type { ReactNode } from 'react'
import type { Product } from '../domain/entities/Product'

// ---------------------------------------------------------------------------
// react-router-dom mock — supplies useParams()'s :id and no-ops navigation
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode; [k: string]: unknown }) =>
      React.createElement('a', { href: to, ...rest }, children),
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// AuthContext / CartContext mocks
// ---------------------------------------------------------------------------
vi.mock('../ui/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
    loading: false,
    isAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}))

const mockAddToCart = vi.fn()
vi.mock('../ui/contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    items: [],
    count: 0,
    loading: false,
    isDrawerOpen: false,
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
  }),
}))

// ---------------------------------------------------------------------------
// productRepository mock
// ---------------------------------------------------------------------------
const mockGetById = vi.fn()
vi.mock('../infrastructure/repositories/SupabaseProductRepository', () => ({
  productRepository: { getById: (...args: unknown[]) => mockGetById(...args) },
}))

import { ProductDetailPage } from '../ui/pages/ProductDetailPage'

// ---------------------------------------------------------------------------
// Fixture: 3 colors x 3 scents, sparse matrix.
//
//              Lavanda   Vainilla   Cedro
//   Arena        5          4         0     <- Cedro sold out, but only via Arena
//   Carbon       3          —         —     <- no Vainilla or Cedro variant at all
//   Rosa         0          —         —     <- Rosa's only variant is sold out
//
// Rosa is sold out everywhere (disabled color). Cedro is sold out everywhere
// (disabled scent). Vainilla has real stock (via Arena) but no Carbon
// variant exists — selecting it while Carbón is active must reflow color
// back to Arena rather than being blocked or resolving to nothing.
// ---------------------------------------------------------------------------
function makeProduct(): Product {
  const arena = { id: 1, name: { es: 'Arena' }, hexCode: 'oklch(0.85 0.03 76)', isActive: true }
  const carbon = { id: 2, name: { es: 'Carbón' }, hexCode: 'oklch(0.25 0.01 52)', isActive: true }
  const rosa = { id: 3, name: { es: 'Rosa' }, hexCode: 'oklch(0.75 0.05 20)', isActive: true }
  const lavanda = { id: 10, name: { es: 'Lavanda' }, description: null, isActive: true }
  const vainilla = { id: 11, name: { es: 'Vainilla' }, description: null, isActive: true }
  const cedro = { id: 12, name: { es: 'Cedro' }, description: null, isActive: true }

  return {
    id: 1,
    name: { es: 'Vela de prueba' },
    shortDescription: null,
    longDescription: null,
    basePrice: 20,
    images: [],
    isActive: true,
    variants: [
      { id: 100, productId: 1, color: arena, scent: lavanda, price: null, stock: 5, isActive: true },
      { id: 101, productId: 1, color: arena, scent: vainilla, price: null, stock: 4, isActive: true },
      { id: 102, productId: 1, color: arena, scent: cedro, price: null, stock: 0, isActive: true },
      { id: 103, productId: 1, color: carbon, scent: lavanda, price: null, stock: 3, isActive: true },
      { id: 104, productId: 1, color: rosa, scent: lavanda, price: null, stock: 0, isActive: true },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Force prefers-reduced-motion: reduce so the page's GSAP entrance
  // (unrelated to the picker itself) is skipped — otherwise elements sit
  // at visibility:hidden mid-tween, which getByRole correctly treats as
  // inaccessible even though jsdom never advances the animation frames.
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
})

async function renderPDP() {
  mockGetById.mockResolvedValue(makeProduct())
  render(<ProductDetailPage />)
  await waitFor(() => expect(screen.getByText('Vela de prueba')).toBeInTheDocument())
}

describe('ProductDetailPage — color/scent picker', () => {
  it('defaults to the first variant\'s color and scent on load', async () => {
    await renderPDP()
    expect(screen.getByRole('radio', { name: 'Arena' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Lavanda' })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the resolved variant price and availability for the default selection', async () => {
    await renderPDP()
    expect(screen.getByText('5 disponibles')).toBeInTheDocument()
  })

  it('renders both a color swatch row and a scent chip row', async () => {
    await renderPDP()
    expect(screen.getByRole('radiogroup', { name: 'Color' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Aroma' })).toBeInTheDocument()
  })

  it('switching color keeps the current scent when that combination exists', async () => {
    await renderPDP()
    screen.getByRole('radio', { name: 'Carbón' }).click()
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Carbón' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Lavanda' })).toHaveAttribute('aria-checked', 'true')
    })
    expect(screen.getByText('3 disponibles')).toBeInTheDocument()
  })

  it('selecting a scent with no variant for the current color reflows to a color that has it', async () => {
    await renderPDP()
    // Carbón only ever pairs with Lavanda. Vainilla is enabled (it has real
    // stock via Arena) but there's no Carbón+Vainilla variant — clicking it
    // must reflow the color back to Arena rather than being blocked.
    screen.getByRole('radio', { name: 'Carbón' }).click()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Carbón' })).toHaveAttribute('aria-checked', 'true')
    )
    const vainillaChip = screen.getByRole('radio', { name: 'Vainilla' })
    expect(vainillaChip).not.toBeDisabled()
    vainillaChip.click()
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Vainilla' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Arena' })).toHaveAttribute('aria-checked', 'true')
    })
    expect(screen.getByText('4 disponibles')).toBeInTheDocument()
  })

  it('selecting a color with no variant for the current scent reflows to a scent that has it', async () => {
    await renderPDP()
    // Symmetric case: select Vainilla (only exists for Arena), then click
    // Carbón — which is enabled (has stock via Lavanda) but has no Vainilla
    // variant — must reflow the scent back to Lavanda.
    screen.getByRole('radio', { name: 'Vainilla' }).click()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Vainilla' })).toHaveAttribute('aria-checked', 'true')
    )
    const carbonSwatch = screen.getByRole('radio', { name: 'Carbón' })
    expect(carbonSwatch).not.toBeDisabled()
    carbonSwatch.click()
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'Carbón' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Lavanda' })).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('disables a scent chip that is sold out across every color', async () => {
    await renderPDP()
    // Cedro only ever appears as Arena+Cedro, and that variant has 0 stock.
    expect(screen.getByRole('radio', { name: 'Cedro' })).toBeDisabled()
  })

  it('disables a color swatch that is sold out across every scent', async () => {
    await renderPDP()
    // Rosa's only variant (Rosa+Lavanda) has 0 stock.
    expect(screen.getByRole('radio', { name: 'Rosa' })).toBeDisabled()
  })

  it('does not disable a scent merely because it lacks a variant for the current color', async () => {
    await renderPDP()
    // Vainilla has no Carbón pairing, but it has real stock via Arena, so it
    // must stay clickable even while Carbón is selected (the whole point of
    // reflow-on-select instead of relative disabling).
    screen.getByRole('radio', { name: 'Carbón' }).click()
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Carbón' })).toHaveAttribute('aria-checked', 'true')
    )
    expect(screen.getByRole('radio', { name: 'Vainilla' })).not.toBeDisabled()
  })

  it('shows the selected color name as text next to the swatches', async () => {
    await renderPDP()
    expect(screen.getByText('Arena')).toBeInTheDocument()
    screen.getByRole('radio', { name: 'Carbón' }).click()
    await waitFor(() => expect(screen.getAllByText('Carbón').length).toBeGreaterThan(0))
  })

  it('clicking a disabled (sold-out-everywhere) chip does not change the selection', async () => {
    await renderPDP()
    const cedroChip = screen.getByRole('radio', { name: 'Cedro' })
    cedroChip.click()
    expect(screen.getByRole('radio', { name: 'Lavanda' })).toHaveAttribute('aria-checked', 'true')
    expect(cedroChip).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking a disabled (sold-out-everywhere) swatch does not change the selection', async () => {
    await renderPDP()
    const rosaSwatch = screen.getByRole('radio', { name: 'Rosa' })
    rosaSwatch.click()
    expect(screen.getByRole('radio', { name: 'Arena' })).toHaveAttribute('aria-checked', 'true')
    expect(rosaSwatch).toHaveAttribute('aria-checked', 'false')
  })
})
