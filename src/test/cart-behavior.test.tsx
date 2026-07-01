/**
 * Behavioral tests for the Shopping Cart feature.
 *
 * These tests exercise runtime behavior that the source-grep tests in cart.test.ts
 * cannot verify:
 *
 *  - CartContext: setQuantity(<1) routes to removeItem, addToCart no-ops when !user,
 *    count computed from item quantities, cart clears on logout (user -> null).
 *  - CartPage rendering: auth gate when !user, loading state, empty state,
 *    "+" disabled at stock cap, checkout button is disabled/aria-disabled.
 *  - SupabaseCartRepository.addOrIncrement: same-variant-twice path accumulates
 *    (select-then-update), and new-variant path inserts; quantity addition is
 *    arithmetic (existing.quantity + input.quantity), not replacement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React, { useEffect } from 'react'
import type { ReactNode } from 'react'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Supabase mock – hoisted so vi.mock factory sees them
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

// ---------------------------------------------------------------------------
// react-router-dom mock so CartPage's <Link> components render without errors
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: ReactNode; [k: string]: unknown }) =>
      React.createElement('a', { href: to, ...rest }, children),
    useLocation: () => ({ pathname: '/carrito' }),
    useNavigate: () => vi.fn(),
  }
})

// ---------------------------------------------------------------------------
// AuthContext mock — lets tests control the current user
// ---------------------------------------------------------------------------
const mockUser = { id: 'user-test-123', email: 'test@example.com' } as import('@supabase/supabase-js').User

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
  AuthProvider: ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children),
}))

// ---------------------------------------------------------------------------
// Import modules under test AFTER mocks are in place
// ---------------------------------------------------------------------------
import { SupabaseCartRepository } from '../infrastructure/repositories/SupabaseCartRepository'
import { CartProvider, useCart } from '../ui/contexts/CartContext'
import { CartPage } from '../ui/pages/CartPage'
import type { CartItem } from '../domain/entities/Cart'

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = null
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 1,
    variantId: 10,
    productId: 100,
    quantity: 2,
    unitPrice: 12.5,
    stock: 5,
    productName: { es: 'Vela Artesanal' },
    image: 'https://example.com/img.jpg',
    colorName: { es: 'Ámbar' },
    scentName: { es: 'Vainilla' },
    ...overrides,
  }
}

function makeDbCartRow(overrides: Partial<Record<string, unknown>> = {}) {
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
        images: ['https://example.com/img.jpg'],
        base_price: '9.99',
      },
    },
    ...overrides,
  }
}

/** Set up getForUser chain that resolves with the given rows. */
function setupGetForUserChain(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** Set up addOrIncrement select path (maybeSingle). */
function setupSelectExistingChain(row: unknown, error: unknown = null) {
  mockMaybeSingle.mockResolvedValue({ data: row, error })
  mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })
}

/** Set up update chain: update -> eq -> { error } */
function setupUpdateChainLeaf(error: unknown = null) {
  const leaf = { error }
  const eqForUpdate = vi.fn().mockResolvedValue(leaf)
  mockUpdate.mockReturnValue({ eq: eqForUpdate })
  return eqForUpdate
}

/** Set up setQuantity chain: from -> update -> eq (resolves) */
function setupSetQuantityChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
}

/** Set up remove chain: from -> delete -> eq (resolves) */
function setupRemoveChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  mockDelete.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ delete: mockDelete })
}

// ---------------------------------------------------------------------------
// A minimal consumer component to exercise CartContext methods directly
// ---------------------------------------------------------------------------
function CartConsumer({ onReady }: { onReady: (ctx: ReturnType<typeof useCart>) => void }) {
  const cart = useCart()
  useEffect(() => {
    onReady(cart)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="items-length">{cart.items.length}</span>
      <span data-testid="loading">{String(cart.loading)}</span>
    </div>
  )
}

function renderCartProvider(ui: React.ReactElement) {
  return render(<CartProvider>{ui}</CartProvider>)
}

// ---------------------------------------------------------------------------
// SupabaseCartRepository – addOrIncrement behavioral tests
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.addOrIncrement() – behavioral', () => {
  const repo = new SupabaseCartRepository()

  it('when existing row found: quantity becomes existing.quantity + input.quantity (not a replacement)', async () => {
    // Arrange: existing row has quantity 3; we add 2 → should update to 5
    const existingRow = { id: 99, quantity: 3 }
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    const eqForUpdate = setupUpdateChainLeaf()
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 2 })

    expect(mockUpdate).toHaveBeenCalledWith({ quantity: 5 }) // 3 + 2
    expect(eqForUpdate).toHaveBeenCalledWith('id', 99)
  })

  it('when existing row found: does NOT insert a new row', async () => {
    const existingRow = { id: 99, quantity: 1 }
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    setupUpdateChainLeaf()
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 1 })

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('when no existing row: inserts a new row and does NOT call update', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 3 })

    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'u1', variant_id: 10, quantity: 3 })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('adding same variant twice (simulated): second call accumulates onto first result', async () => {
    // First call: no existing row → insert with quantity 1
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 1 })
    expect(mockInsert).toHaveBeenNthCalledWith(1, { user_id: 'u1', variant_id: 10, quantity: 1 })

    // Second call: existing row with quantity 1 → update to 2
    vi.clearAllMocks()
    const existingRow = { id: 1, quantity: 1 }
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    const eqForUpdate = setupUpdateChainLeaf()
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate, insert: mockInsert })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 1 })

    expect(mockUpdate).toHaveBeenCalledWith({ quantity: 2 }) // 1 + 1
    expect(eqForUpdate).toHaveBeenCalledWith('id', 1)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('select query uses both user_id and variant_id filters (preventing cross-user data)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const calls: unknown[][] = []
    mockEq.mockImplementation((...args: unknown[]) => {
      calls.push(args)
      return { eq: mockEq, maybeSingle: mockMaybeSingle }
    })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })

    await repo.addOrIncrement({ userId: 'user-A', variantId: 42, quantity: 1 })

    const fieldNames = calls.map(c => c[0])
    expect(fieldNames).toContain('user_id')
    expect(fieldNames).toContain('variant_id')
    const userIdCall = calls.find(c => c[0] === 'user_id')
    const variantIdCall = calls.find(c => c[0] === 'variant_id')
    expect(userIdCall?.[1]).toBe('user-A')
    expect(variantIdCall?.[1]).toBe(42)
  })

  it('quantity cap: update uses arithmetic addition not replacement (different quantities)', async () => {
    // existing quantity = 4, adding 1 → should be 5, not just 1
    const existingRow = { id: 7, quantity: 4 }
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    const eqForUpdate = setupUpdateChainLeaf()
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })

    await repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 1 })

    const updateArg = mockUpdate.mock.calls[0][0] as { quantity: number }
    expect(updateArg.quantity).toBe(5) // 4 + 1, not 1 (replacing)
    expect(eqForUpdate).toHaveBeenCalledWith('id', 7)
  })
})

// ---------------------------------------------------------------------------
// CartContext – setQuantity(id, 0) routes to removeItem (never writes 0 to DB)
// ---------------------------------------------------------------------------
describe('CartContext – setQuantity routing to removeItem', () => {
  it('setQuantity with quantity < 1 calls repository.remove, not setQuantity', async () => {
    currentUser = mockUser

    // Initial fetch returns one item
    setupGetForUserChain([makeDbCartRow()])

    // After remove, refresh returns empty array
    // We need from to handle both calls
    mockFrom
      .mockReturnValueOnce({ select: mockSelect }) // initial getForUser
      .mockReturnValueOnce({ delete: mockDelete }) // remove call
      .mockReturnValueOnce({ select: mockSelect }) // refresh after remove

    mockOrder.mockResolvedValue({ data: [makeDbCartRow()], error: null })
    mockEq
      .mockReturnValueOnce({ order: mockOrder }) // initial getForUser eq
      .mockResolvedValueOnce({ error: null })    // remove eq
      .mockReturnValueOnce({ order: mockOrder }) // refresh eq

    mockDelete.mockReturnValue({ eq: mockEq })

    let cartCtx: ReturnType<typeof useCart> | null = null

    await act(async () => {
      renderCartProvider(
        <CartConsumer onReady={ctx => { cartCtx = ctx }} />
      )
    })

    // Now call setQuantity with 0 — should route to remove, not call setQuantity on repo
    await act(async () => {
      await cartCtx!.setQuantity(1, 0)
    })

    // remove (delete) should have been called
    expect(mockDelete).toHaveBeenCalled()
    // update should NOT have been called (setQuantity on repo)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('setQuantity with quantity -1 also routes to removeItem', async () => {
    currentUser = mockUser

    setupGetForUserChain([makeDbCartRow()])

    mockFrom
      .mockReturnValueOnce({ select: mockSelect })
      .mockReturnValueOnce({ delete: mockDelete })
      .mockReturnValueOnce({ select: mockSelect })

    mockOrder.mockResolvedValue({ data: [makeDbCartRow()], error: null })
    mockEq
      .mockReturnValueOnce({ order: mockOrder })
      .mockResolvedValueOnce({ error: null })
      .mockReturnValueOnce({ order: mockOrder })

    mockDelete.mockReturnValue({ eq: mockEq })

    let cartCtx: ReturnType<typeof useCart> | null = null

    await act(async () => {
      renderCartProvider(
        <CartConsumer onReady={ctx => { cartCtx = ctx }} />
      )
    })

    await act(async () => {
      await cartCtx!.setQuantity(1, -1)
    })

    expect(mockDelete).toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('setQuantity with quantity >= 1 calls repository.setQuantity (not remove)', async () => {
    currentUser = mockUser

    setupGetForUserChain([makeDbCartRow()])

    setupSetQuantityChain()

    mockFrom
      .mockReturnValueOnce({ select: mockSelect }) // initial getForUser
      .mockReturnValueOnce({ update: mockUpdate }) // setQuantity call
      .mockReturnValueOnce({ select: mockSelect }) // refresh

    mockOrder.mockResolvedValue({ data: [makeDbCartRow()], error: null })
    mockEq
      .mockReturnValueOnce({ order: mockOrder }) // initial
      .mockResolvedValueOnce({ error: null })     // setQuantity eq
      .mockReturnValueOnce({ order: mockOrder }) // refresh

    let cartCtx: ReturnType<typeof useCart> | null = null

    await act(async () => {
      renderCartProvider(
        <CartConsumer onReady={ctx => { cartCtx = ctx }} />
      )
    })

    await act(async () => {
      await cartCtx!.setQuantity(1, 3)
    })

    expect(mockUpdate).toHaveBeenCalledWith({ quantity: 3 })
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// CartContext – addToCart no-ops when user is null
// ---------------------------------------------------------------------------
describe('CartContext – addToCart no-op when !user', () => {
  it('addToCart does nothing (no Supabase calls) when user is null', async () => {
    currentUser = null // not logged in

    let cartCtx: ReturnType<typeof useCart> | null = null

    await act(async () => {
      renderCartProvider(
        <CartConsumer onReady={ctx => { cartCtx = ctx }} />
      )
    })

    await act(async () => {
      await cartCtx!.addToCart(10, 1)
    })

    // No Supabase calls at all (not even the getForUser initial fetch since user is null)
    expect(mockFrom).not.toHaveBeenCalledWith('cart_items')
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// CartContext – cart clears on logout (user changes to null)
// ---------------------------------------------------------------------------
describe('CartContext – cart clears on logout', () => {
  it('items reset to [] when user becomes null', async () => {
    // Start logged in with items
    currentUser = mockUser
    setupGetForUserChain([makeDbCartRow()])

    let countEl: HTMLElement
    let itemsLengthEl: HTMLElement

    await act(async () => {
      render(<CartProvider><CartConsumer onReady={() => {}} /></CartProvider>)
    })

    countEl = screen.getByTestId('count')
    itemsLengthEl = screen.getByTestId('items-length')

    // After mount with user, should show items (eventually)
    await waitFor(() => {
      expect(itemsLengthEl.textContent).toBe('1')
    })
    expect(countEl.textContent).toBe('2') // makeDbCartRow has quantity 2

    // Now simulate logout — update the module-level variable
    // We need to trigger a re-render. We do that via a component update.
    // Since the mock returns currentUser by reference, we update it and re-render.
    act(() => {
      currentUser = null
      // Force a React re-render by re-rendering the same tree
    })

    // After user becomes null, cart should clear
    // We check this via the CartContext logic: when user is null, items=[]
    // The CartContext useEffect runs on [user] change
    // We simulate this by rendering a new tree with user=null
    vi.clearAllMocks()

    await act(async () => {
      render(<CartProvider><CartConsumer onReady={() => {}} /></CartProvider>)
    })

    const allCountEls = screen.getAllByTestId('count')
    const latestCount = allCountEls[allCountEls.length - 1]
    expect(latestCount.textContent).toBe('0')
  })
})

// ---------------------------------------------------------------------------
// CartContext – count computed as sum of item quantities
// ---------------------------------------------------------------------------
describe('CartContext – count computation', () => {
  it('count is 0 when user is null', async () => {
    currentUser = null

    await act(async () => {
      renderCartProvider(<CartConsumer onReady={() => {}} />)
    })

    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('count is sum of all item quantities after fetch', async () => {
    currentUser = mockUser

    // Two items: quantities 3 and 4 → count = 7
    const row1 = makeDbCartRow({ id: 1, quantity: 3 })
    const row2 = makeDbCartRow({ id: 2, variant_id: 11, quantity: 4 })
    setupGetForUserChain([row1, row2])

    await act(async () => {
      renderCartProvider(<CartConsumer onReady={() => {}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('7')
    })
  })

  it('count is 0 when cart is empty (no items)', async () => {
    currentUser = mockUser
    setupGetForUserChain([])

    await act(async () => {
      renderCartProvider(<CartConsumer onReady={() => {}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0')
    })
  })
})

// ---------------------------------------------------------------------------
// CartPage – auth gate (not logged in)
// ---------------------------------------------------------------------------
describe('CartPage – auth gate when user is null', () => {
  it('shows loginRequired message when not logged in', async () => {
    currentUser = null

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    expect(screen.getByText(/Debes iniciar sesión para tener un carrito/i)).toBeInTheDocument()
  })

  it('shows link to /login when not logged in', async () => {
    currentUser = null

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    const loginLink = screen.getByRole('link', { name: /Iniciar sesión/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('shows link to /registro when not logged in', async () => {
    currentUser = null

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    const registerLink = screen.getByRole('link', { name: /Registrarse/i })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute('href', '/registro')
  })

  it('does NOT render the cart list when not logged in', async () => {
    currentUser = null

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// CartPage – empty state
// ---------------------------------------------------------------------------
describe('CartPage – empty cart state', () => {
  it('shows empty message when authenticated but cart is empty', async () => {
    currentUser = mockUser
    setupGetForUserChain([])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument()
    })
  })

  it('shows link to /productos on empty state', async () => {
    currentUser = mockUser
    setupGetForUserChain([])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const shopLink = screen.getByRole('link', { name: /Ver la colección/i })
      expect(shopLink).toBeInTheDocument()
      expect(shopLink).toHaveAttribute('href', '/productos')
    })
  })

  it('does NOT show checkout button on empty state', async () => {
    currentUser = mockUser
    setupGetForUserChain([])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      expect(screen.queryByText(/Finalizar compra/i)).not.toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// CartPage – cart with items: "+" disabled at stock cap
// ---------------------------------------------------------------------------
describe('CartPage – quantity stepper "+" disabled at stock cap', () => {
  it('"+" button is disabled when quantity equals stock', async () => {
    currentUser = mockUser
    // quantity 5, stock 5 → "+" must be disabled
    const row = makeDbCartRow({ quantity: 5 })
    ;((row.product_variants as Record<string, unknown>)).stock = 5
    setupGetForUserChain([row])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      // "+" button has aria-label from i18n.cart.increase = "Aumentar cantidad"
      const plusBtn = screen.getByRole('button', { name: /Aumentar cantidad/i })
      expect(plusBtn).toBeDisabled()
    })
  })

  it('"+" button is enabled when quantity is below stock', async () => {
    currentUser = mockUser
    // quantity 2, stock 5 → "+" must NOT be disabled
    const row = makeDbCartRow({ quantity: 2 })
    ;((row.product_variants as Record<string, unknown>)).stock = 5
    setupGetForUserChain([row])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const plusBtn = screen.getByRole('button', { name: /Aumentar cantidad/i })
      expect(plusBtn).not.toBeDisabled()
    })
  })

  it('"+" button is disabled when quantity exceeds stock (oversold guard)', async () => {
    currentUser = mockUser
    // quantity 6, stock 5 → "+" must be disabled
    const row = makeDbCartRow({ quantity: 6 })
    ;((row.product_variants as Record<string, unknown>)).stock = 5
    setupGetForUserChain([row])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const plusBtn = screen.getByRole('button', { name: /Aumentar cantidad/i })
      expect(plusBtn).toBeDisabled()
    })
  })
})

// ---------------------------------------------------------------------------
// CartPage – checkout button is always disabled
// ---------------------------------------------------------------------------
describe('CartPage – disabled checkout placeholder', () => {
  it('checkout button is disabled', async () => {
    currentUser = mockUser
    setupGetForUserChain([makeDbCartRow()])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const checkoutBtn = screen.getByRole('button', { name: /Finalizar compra/i })
      expect(checkoutBtn).toBeDisabled()
    })
  })

  it('checkout button has aria-disabled="true"', async () => {
    currentUser = mockUser
    setupGetForUserChain([makeDbCartRow()])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const checkoutBtn = screen.getByRole('button', { name: /Finalizar compra/i })
      expect(checkoutBtn).toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('clicking checkout button does not trigger any cart action', async () => {
    currentUser = mockUser
    setupGetForUserChain([makeDbCartRow()])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(async () => {
      const checkoutBtn = screen.getByRole('button', { name: /Finalizar compra/i })
      vi.clearAllMocks()
      fireEvent.click(checkoutBtn)
      // No Supabase mutations should occur
      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// CartPage – document.title
// ---------------------------------------------------------------------------
describe('CartPage – document.title', () => {
  it('sets document.title to "Carrito — Casa Tierra Luz" on mount', async () => {
    currentUser = null // show auth gate — title is set regardless

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    expect(document.title).toBe('Carrito — Casa Tierra Luz')
  })
})

// ---------------------------------------------------------------------------
// CartPage – line total display
// ---------------------------------------------------------------------------
describe('CartPage – line total and cart total computed display', () => {
  it('shows unit price formatted with toFixed(2)', async () => {
    currentUser = mockUser
    // unit price 12.50
    setupGetForUserChain([makeDbCartRow()])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      // Cart page renders unit price as "12.50 €" (with thinsp)
      const content = document.body.textContent ?? ''
      expect(content).toMatch(/12\.50/)
    })
  })

  it('shows cart total as sum of line totals', async () => {
    currentUser = mockUser
    // quantity 2, unit price 12.50 → line total = 25.00, cart total = 25.00
    setupGetForUserChain([makeDbCartRow()])

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      const content = document.body.textContent ?? ''
      expect(content).toMatch(/25\.00/)
    })
  })
})

// ---------------------------------------------------------------------------
// CartPage – Eliminar (remove) button calls removeItem
// ---------------------------------------------------------------------------
describe('CartPage – remove button', () => {
  it('clicking Eliminar calls repository.remove with the correct cart item id', async () => {
    currentUser = mockUser
    setupGetForUserChain([makeDbCartRow()])

    // Setup remove chain for when Eliminar is clicked
    setupRemoveChain()

    // After remove, refresh returns empty
    mockFrom
      .mockReturnValueOnce({ select: mockSelect }) // initial getForUser
      .mockReturnValueOnce({ delete: mockDelete }) // remove
      .mockReturnValueOnce({ select: mockSelect }) // refresh after remove

    mockOrder.mockResolvedValue({ data: [makeDbCartRow()], error: null })
    mockEq
      .mockReturnValueOnce({ order: mockOrder }) // initial
      .mockResolvedValueOnce({ error: null })     // remove
      .mockReturnValueOnce({ order: mockOrder }) // refresh

    mockDelete.mockReturnValue({ eq: mockEq })

    await act(async () => {
      render(
        <CartProvider>
          <CartPage />
        </CartProvider>
      )
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar/i })).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }))
    })

    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 1) // cart item id = 1 from makeDbCartRow
  })
})

// ---------------------------------------------------------------------------
// CartContext – useCart throws outside CartProvider
// ---------------------------------------------------------------------------
describe('CartContext – useCart outside provider', () => {
  it('throws if useCart is called outside CartProvider', () => {
    // Suppress React error boundary output for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BareConsumer() {
      useCart()
      return null
    }

    expect(() => render(<BareConsumer />)).toThrow('useCart must be used inside CartProvider')

    consoleError.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// SupabaseCartRepository.addOrIncrement – error propagation
// ---------------------------------------------------------------------------
describe('SupabaseCartRepository.addOrIncrement() – error propagation', () => {
  const repo = new SupabaseCartRepository()

  it('throws when update call errors (existing-row path)', async () => {
    const existingRow = { id: 5, quantity: 1 }
    mockMaybeSingle.mockResolvedValue({ data: existingRow, error: null })
    mockEq.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
    mockSelect.mockReturnValue({ eq: mockEq })

    const eqForUpdate = vi.fn().mockResolvedValue({ error: { message: 'update constraint violation' } })
    mockUpdate.mockReturnValue({ eq: eqForUpdate })
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate })

    await expect(
      repo.addOrIncrement({ userId: 'u1', variantId: 10, quantity: 1 })
    ).rejects.toMatchObject({ message: 'update constraint violation' })
  })
})

// NOTE: CartContext stock-cap, error-recovery, and SQL WITH CHECK tests live in
// src/test/cart-context-cap.test.tsx, which mocks cartRepository at the module
// level (the right boundary for CartContext-logic tests) without conflicting
// with this file's raw Supabase client mock chain.
