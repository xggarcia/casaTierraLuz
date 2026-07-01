/**
 * CartContext drawer state tests.
 *
 * Verifies the "load-bearing" open/close rules from the spec:
 *
 *  - addToCart SUCCESS path → isDrawerOpen becomes true
 *  - addToCart when !user (early return) → isDrawerOpen stays false
 *  - addToCart when already at stock cap (clampedAdd < 1 early return) → isDrawerOpen stays false
 *  - openDrawer() / closeDrawer() toggle isDrawerOpen correctly
 *  - Header cart button calls openDrawer (not navigates to /carrito)
 *
 * Mocks cartRepository at the module boundary (same pattern as
 * cart-context-cap.test.tsx) to keep the tests clean.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// cartRepository mock – hoisted so the vi.mock factory can reference it
// ---------------------------------------------------------------------------
const mockRepo = vi.hoisted(() => ({
  getForUser: vi.fn(),
  addOrIncrement: vi.fn(),
  setQuantity: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../infrastructure/repositories/SupabaseCartRepository', () => ({
  cartRepository: mockRepo,
  SupabaseCartRepository: vi.fn().mockImplementation(() => mockRepo),
}))

// ---------------------------------------------------------------------------
// AuthContext mock – lets tests control the current user
// ---------------------------------------------------------------------------
const mockUser = { id: 'user-drawer-test', email: 'drawer@example.com' } as import('@supabase/supabase-js').User
let currentUser: import('@supabase/supabase-js').User | null = null

vi.mock('../ui/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: currentUser,
    loading: false,
    isAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------
import { CartProvider, useCart } from '../ui/contexts/CartContext'
import type { CartItem } from '../domain/entities/Cart'
import { Header } from '../ui/components/Header'

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = null
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    variantId: 10,
    productId: 100,
    quantity: 2,
    unitPrice: 12.5,
    stock: 5,
    productName: { es: 'Vela Artesanal' },
    image: null,
    colorName: null,
    scentName: null,
    ...overrides,
  }
}

/** Minimal consumer that exposes drawer state and all cart methods. */
function DrawerConsumer({ ctxRef }: { ctxRef: { current: ReturnType<typeof useCart> | null } }) {
  const cart = useCart()
  ctxRef.current = cart
  return (
    <div>
      <span data-testid="is-drawer-open">{String(cart.isDrawerOpen)}</span>
      <span data-testid="count">{cart.count}</span>
    </div>
  )
}

function renderWithCart(ctxRef: { current: ReturnType<typeof useCart> | null }) {
  return render(<CartProvider><DrawerConsumer ctxRef={ctxRef} /></CartProvider>)
}

// ---------------------------------------------------------------------------
// CartContext – openDrawer / closeDrawer primitives
// ---------------------------------------------------------------------------
describe('CartContext – openDrawer / closeDrawer', () => {
  it('isDrawerOpen is false initially', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })

  it('openDrawer() sets isDrawerOpen to true', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    await act(async () => { ctxRef.current!.openDrawer() })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('true')
  })

  it('closeDrawer() sets isDrawerOpen to false after it was opened', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await act(async () => { ctxRef.current!.openDrawer() })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('true')

    await act(async () => { ctxRef.current!.closeDrawer() })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// CartContext – addToCart auto-opens drawer (SUCCESS path only)
// ---------------------------------------------------------------------------
describe('CartContext – addToCart auto-opens drawer on success', () => {
  it('isDrawerOpen becomes true after a successful addToCart', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    await waitFor(() => expect(screen.getByTestId('is-drawer-open').textContent).toBe('false'))

    await act(async () => { await ctxRef.current!.addToCart(99, 1) })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('true')
  })

  it('addToCart calls addOrIncrement before opening the drawer (drawer opens on success)', async () => {
    currentUser = mockUser
    const callOrder: string[] = []
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockImplementation(async () => {
      callOrder.push('addOrIncrement')
    })

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await act(async () => { await ctxRef.current!.addToCart(99, 1) })

    expect(callOrder).toContain('addOrIncrement')
    // Drawer should be open after the whole addToCart resolved
    expect(screen.getByTestId('is-drawer-open').textContent).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// CartContext – addToCart does NOT open drawer on early-return paths (LOAD-BEARING)
// ---------------------------------------------------------------------------
describe('CartContext – addToCart does NOT open drawer on early-return paths', () => {
  it('drawer stays closed when user is null (!user early return)', async () => {
    currentUser = null   // not logged in

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    await act(async () => { await ctxRef.current!.addToCart(10, 1) })

    // No Supabase calls and drawer must stay closed
    expect(mockRepo.addOrIncrement).not.toHaveBeenCalled()
    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })

  it('drawer stays closed when clampedAdd < 1 (already at stock cap)', async () => {
    currentUser = mockUser
    // item at stock cap: quantity=5, stock=5 → clampedAdd = min(1, 5-5) = 0 → early return
    const itemAtCap = makeItem({ variantId: 10, quantity: 5, stock: 5 })
    mockRepo.getForUser.mockResolvedValue([itemAtCap])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('5'))

    await act(async () => { await ctxRef.current!.addToCart(10, 1) })

    // addOrIncrement must NOT have been called (early return)
    expect(mockRepo.addOrIncrement).not.toHaveBeenCalled()
    // Drawer must NOT have opened
    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })

  it('drawer stays closed when adding 0 quantity (clampedAdd < 1)', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    // quantity=0 → clampedAdd = min(0, Infinity) = 0 → early return
    await act(async () => { await ctxRef.current!.addToCart(99, 0) })

    expect(mockRepo.addOrIncrement).not.toHaveBeenCalled()
    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })

  it('drawer stays closed when addOrIncrement throws (repository error is not a successful add)', async () => {
    // Spec says: "only open when something was actually added — i.e. do NOT open if
    // the early return (clampedAdd < 1, or !user) was hit."
    // The intent extends to repository errors: if the write failed, nothing was added.
    // EXPECTED: isDrawerOpen stays false.
    //
    // BUG: The current implementation places setIsDrawerOpen(true) OUTSIDE the try block,
    // after the catch, so it fires even when addOrIncrement throws. This test is expected
    // to FAIL until the implementation is fixed to move setIsDrawerOpen(true) inside the
    // try block after the successful await.
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockRejectedValue(new Error('network error'))

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })

    await act(async () => { await ctxRef.current!.addToCart(99, 1) })

    // Spec requires drawer to stay closed when the write failed.
    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Header – cart button calls openDrawer (not navigates to /carrito)
// ---------------------------------------------------------------------------
describe('Header – cart button opens drawer instead of navigating', () => {
  // We need useCart to return a real-ish mock with openDrawer
  const mockOpenDrawer = vi.fn()

  // The CartContext mock above controls useAuth; for Header we need to also
  // provide useCart. We re-mock useCart at the module level for these tests
  // using the already-mocked AuthContext.
  //
  // Since CartContext is NOT mocked (we mock the repository), we render Header
  // inside a real CartProvider so it can call useCart(), and expose openDrawer
  // via a sibling DrawerConsumer so we can assert on it.

  it('Header renders a button (not a link to /carrito) when user is logged in', () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      </CartProvider>
    )

    // There should be no link pointing to /carrito in the header
    const carritoLink = screen.queryByRole('link', { name: /Carrito/i })
    expect(carritoLink).toBeNull()

    // There should be a button instead
    const carritoBtn = screen.getByRole('button', { name: /Carrito/i })
    expect(carritoBtn).toBeInTheDocument()
  })

  it('clicking the Header cart button opens the drawer (isDrawerOpen becomes true)', async () => {
    currentUser = mockUser
    mockRepo.getForUser.mockResolvedValue([])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }

    await act(async () => {
      render(
        <CartProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header />
            <DrawerConsumer ctxRef={ctxRef} />
          </MemoryRouter>
        </CartProvider>
      )
    })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('false')

    const carritoBtn = screen.getByRole('button', { name: /Carrito/i })

    await act(async () => {
      fireEvent.click(carritoBtn)
    })

    expect(screen.getByTestId('is-drawer-open').textContent).toBe('true')
  })

  it('Header cart button is NOT shown when user is logged out', () => {
    currentUser = null
    mockRepo.getForUser.mockResolvedValue([])

    render(
      <CartProvider>
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      </CartProvider>
    )

    // Logged-out users see no cart button at all
    const carritoBtn = screen.queryByRole('button', { name: /Carrito/i })
    expect(carritoBtn).toBeNull()
  })

  it('Header cart button shows count when count > 0', async () => {
    currentUser = mockUser
    const item = makeItem({ quantity: 3 })
    mockRepo.getForUser.mockResolvedValue([item])

    await act(async () => {
      render(
        <CartProvider>
          <MemoryRouter initialEntries={['/']}>
            <Header />
          </MemoryRouter>
        </CartProvider>
      )
    })

    await waitFor(() => {
      // Button label should include the count
      expect(screen.getByRole('button', { name: /Carrito \(3\)/i })).toBeInTheDocument()
    })
  })
})
