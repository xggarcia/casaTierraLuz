/**
 * CartContext stock-cap and error-recovery tests (review fixes #1 and #2).
 *
 * Mocks cartRepository at the module boundary so CartContext logic can be
 * tested cleanly without threading raw Supabase mock chains through multi-step
 * sequences. Kept in a separate file to avoid conflicting with the raw
 * Supabase client mock in cart-behavior.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React, { useEffect } from 'react'
import type { ReactNode } from 'react'
import * as fs from 'fs'
import * as path from 'path'

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
// AuthContext mock – control the current user
// ---------------------------------------------------------------------------
const mockUser = { id: 'user-cap-test', email: 'cap@example.com' } as import('@supabase/supabase-js').User
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
// react-router-dom mock so any <Link> in CartPage renders without errors
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
// Imports AFTER mocks
// ---------------------------------------------------------------------------
import { CartProvider, useCart } from '../ui/contexts/CartContext'
import type { CartItem } from '../domain/entities/Cart'

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

// Minimal consumer that exposes context values via data-testid spans.
// cartCtxRef is updated on every render so callers always get the latest
// closure (with up-to-date items state) when they call mutations.
function CartConsumer({ ctxRef }: { ctxRef: { current: ReturnType<typeof useCart> | null } }) {
  const cart = useCart()
  ctxRef.current = cart
  return (
    <div>
      <span data-testid="count">{cart.count}</span>
      <span data-testid="items-length">{cart.items.length}</span>
    </div>
  )
}

function renderWithCart(ctxRef: { current: ReturnType<typeof useCart> | null }) {
  return render(<CartProvider><CartConsumer ctxRef={ctxRef} /></CartProvider>)
}

// ---------------------------------------------------------------------------
// CartContext – stock cap in setQuantity (review fix #1)
// ---------------------------------------------------------------------------
describe('CartContext – stock cap clamping in setQuantity', () => {
  beforeEach(() => { currentUser = mockUser })

  it('setQuantity clamps to item.stock when quantity exceeds stock', async () => {
    const item = makeItem({ id: 1, variantId: 10, quantity: 2, stock: 5 })
    mockRepo.getForUser.mockResolvedValue([item])
    mockRepo.setQuantity.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    // Wait for items to be loaded — ctxRef.current now has fresh closure with items
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('1'))

    await act(async () => { await ctxRef.current!.setQuantity(1, 9999) })

    // Must have been called with the stock cap (5), not 9999
    expect(mockRepo.setQuantity).toHaveBeenCalledWith(1, 5)
  })

  it('setQuantity at exactly stock passes through unchanged', async () => {
    const item = makeItem({ id: 1, variantId: 10, quantity: 3, stock: 5 })
    mockRepo.getForUser.mockResolvedValue([item])
    mockRepo.setQuantity.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('1'))

    await act(async () => { await ctxRef.current!.setQuantity(1, 5) })

    expect(mockRepo.setQuantity).toHaveBeenCalledWith(1, 5)
  })

  it('setQuantity below stock passes through unchanged', async () => {
    const item = makeItem({ id: 1, variantId: 10, quantity: 1, stock: 10 })
    mockRepo.getForUser.mockResolvedValue([item])
    mockRepo.setQuantity.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('1'))

    await act(async () => { await ctxRef.current!.setQuantity(1, 4) })

    expect(mockRepo.setQuantity).toHaveBeenCalledWith(1, 4)
  })
})

// ---------------------------------------------------------------------------
// CartContext – stock cap in addToCart (review fix #1)
// ---------------------------------------------------------------------------
describe('CartContext – stock cap clamping in addToCart', () => {
  beforeEach(() => { currentUser = mockUser })

  it('addToCart clamps so total (existing + adding) does not exceed stock', async () => {
    // Existing: variantId=10, quantity=4, stock=5 → adding 3 would make 7, cap to 1
    const item = makeItem({ id: 1, variantId: 10, quantity: 4, stock: 5 })
    mockRepo.getForUser.mockResolvedValue([item])
    mockRepo.addOrIncrement.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('1'))

    await act(async () => { await ctxRef.current!.addToCart(10, 3) })

    // clampedAdd = min(3, 5-4) = 1
    expect(mockRepo.addOrIncrement).toHaveBeenCalledWith({
      userId: mockUser.id,
      variantId: 10,
      quantity: 1,
    })
  })

  it('addToCart is a no-op (skips addOrIncrement) when already at stock', async () => {
    // quantity=5, stock=5 → 0 remaining → skip write
    const item = makeItem({ id: 1, variantId: 10, quantity: 5, stock: 5 })
    mockRepo.getForUser.mockResolvedValue([item])

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('1'))

    await act(async () => { await ctxRef.current!.addToCart(10, 1) })

    expect(mockRepo.addOrIncrement).not.toHaveBeenCalled()
  })

  it('addToCart for a new variant passes the full quantity (no existing item, Infinity cap)', async () => {
    // No existing item for variantId=99 → cap is Infinity → clampedAdd = quantity
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockResolvedValue(undefined)

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('0'))

    await act(async () => { await ctxRef.current!.addToCart(99, 2) })

    expect(mockRepo.addOrIncrement).toHaveBeenCalledWith({
      userId: mockUser.id,
      variantId: 99,
      quantity: 2,
    })
  })
})

// ---------------------------------------------------------------------------
// CartContext – addToCart error recovery via refresh (review fix #2)
// ---------------------------------------------------------------------------
describe('CartContext – addToCart error recovery via refresh', () => {
  beforeEach(() => { currentUser = mockUser })

  it('when addOrIncrement throws, CartContext does NOT propagate the error', async () => {
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockRejectedValue(new Error('23505 unique_violation'))

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('0'))

    let threw = false
    await act(async () => {
      try { await ctxRef.current!.addToCart(10, 1) } catch { threw = true }
    })

    expect(threw).toBe(false)
  })

  it('after addOrIncrement throws, CartContext re-fetches and reconciles UI to DB state', async () => {
    const reconciledItem = makeItem({ id: 1, variantId: 10, quantity: 2, stock: 5 })
    mockRepo.getForUser
      .mockResolvedValueOnce([])               // initial load (empty)
      .mockResolvedValueOnce([reconciledItem]) // refresh after catch
    mockRepo.addOrIncrement.mockRejectedValue(new Error('23505 unique_violation'))

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))

    await act(async () => { await ctxRef.current!.addToCart(10, 1) })

    // Count should reflect the reconciled row (quantity=2)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'))
  })

  it('getForUser is called again (the refresh) after addOrIncrement throws', async () => {
    mockRepo.getForUser.mockResolvedValue([])
    mockRepo.addOrIncrement.mockRejectedValue(new Error('race'))

    const ctxRef: { current: ReturnType<typeof useCart> | null } = { current: null }
    await act(async () => { renderWithCart(ctxRef) })
    await waitFor(() => expect(screen.getByTestId('items-length').textContent).toBe('0'))

    const callsBefore = mockRepo.getForUser.mock.calls.length

    await act(async () => { await ctxRef.current!.addToCart(10, 1) })

    // At least one more getForUser call must have happened (the recovery refresh)
    expect(mockRepo.getForUser.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ---------------------------------------------------------------------------
// supabase/migrations/004_cart.sql – WITH CHECK on update policy (review fix #3)
// ---------------------------------------------------------------------------
describe('004_cart.sql – Own cart update policy WITH CHECK (review hardening)', () => {
  const root = path.resolve(__dirname, '../../')
  const sql = fs.readFileSync(path.join(root, 'supabase/migrations/004_cart.sql'), 'utf-8')

  it('Own cart update policy has WITH CHECK (auth.uid() = user_id)', () => {
    const updateBlock = sql.match(
      /CREATE POLICY "Own cart update"[\s\S]*?(?=CREATE POLICY|$)/
    )?.[0] ?? ''
    expect(updateBlock).toMatch(/WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)
  })

  it('Own cart update policy has both USING and WITH CHECK', () => {
    const updateBlock = sql.match(
      /CREATE POLICY "Own cart update"[\s\S]*?(?=CREATE POLICY|$)/
    )?.[0] ?? ''
    expect(updateBlock).toMatch(/USING\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)
    expect(updateBlock).toMatch(/WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)
  })
})
