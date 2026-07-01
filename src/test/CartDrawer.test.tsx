/**
 * Tests for src/ui/components/CartDrawer.tsx
 *
 * Covers:
 *  - Happy path: product name + total label render with items when open
 *  - Empty cart state renders empty message
 *  - Logged-out state renders login prompt, not item list
 *  - Escape key closes the drawer
 *  - Body scroll lock applied while open; restored on close and on unmount
 *  - Backdrop click calls closeDrawer
 *  - Close button (×) calls closeDrawer
 *  - Stepper − button calls setQuantity(item.id, item.quantity - 1)
 *  - Stepper + button calls setQuantity(item.id, item.quantity + 1)
 *  - Stepper + button disabled at stock cap
 *  - Remove button calls removeItem(item.id)
 *  - "Ver carrito completo" link navigates to /carrito and calls closeDrawer
 *  - Product name link navigates to /producto/:id and calls closeDrawer
 *  - Footer NOT rendered when cart is empty
 *  - Always renders (no null return when closed) for CSS transition
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartDrawer } from '../ui/components/CartDrawer'
import { es as i18n } from '../i18n/es'
import type { CartItem } from '../domain/entities/Cart'

vi.mock('../ui/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
import { useAuth } from '../ui/contexts/AuthContext'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

vi.mock('../ui/contexts/CartContext', () => ({
  useCart: vi.fn(),
}))
import { useCart } from '../ui/contexts/CartContext'
const mockUseCart = useCart as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCloseDrawer = vi.fn()
const mockSetQuantity = vi.fn()
const mockRemoveItem = vi.fn()

const baseCartMock = {
  items: [],
  count: 0,
  loading: false,
  isDrawerOpen: false,
  openDrawer: vi.fn(),
  closeDrawer: mockCloseDrawer,
  setQuantity: mockSetQuantity,
  removeItem: mockRemoveItem,
  addToCart: vi.fn(),
  refresh: vi.fn(),
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 10,
    variantId: 1,
    productId: 5,
    productName: { es: 'Vela Ámbar', en: 'Amber Candle' },
    colorName: null,
    scentName: null,
    unitPrice: 12.5,
    quantity: 2,
    stock: 10,
    image: null,
    ...overrides,
  }
}

const loggedInUser = { id: '1', email: 'u@test.com' }

beforeEach(() => {
  vi.clearAllMocks()
  // Reset body overflow before each test
  document.body.style.overflow = ''
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

function renderDrawer() {
  return render(
    <MemoryRouter>
      <CartDrawer />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Happy path: open drawer with items
// ---------------------------------------------------------------------------
describe('CartDrawer – open with items (happy path)', () => {
  it('renders product name and total label when open with items', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem()],
    })

    renderDrawer()

    expect(screen.getByText('Vela Ámbar')).toBeInTheDocument()
    expect(screen.getByText(i18n.cart.total)).toBeInTheDocument()
  })

  it('renders the computed line total correctly (unitPrice × quantity)', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem({ unitPrice: 12.5, quantity: 2 })],
    })

    renderDrawer()

    // 12.50 * 2 = 25.00, formatted as "25.00 €"
    const bodyText = document.body.textContent ?? ''
    expect(bodyText).toMatch(/25\.00/)
  })

  it('renders the cart-drawer aside with role="dialog"', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [makeItem()],
    })

    renderDrawer()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('applies cart-drawer--open class when isDrawerOpen is true', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [makeItem()],
    })

    renderDrawer()

    const aside = screen.getByRole('dialog')
    expect(aside.className).toContain('cart-drawer--open')
  })

  it('does NOT apply cart-drawer--open class when isDrawerOpen is false', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: false,
      items: [makeItem()],
    })

    renderDrawer()

    // When closed the aside has aria-hidden="true"; use { hidden: true } to
    // reach it — the point of this test is the CSS class, not accessibility role.
    const aside = screen.getByRole('dialog', { hidden: true })
    expect(aside.className).not.toContain('cart-drawer--open')
  })

  it('still renders the aside element when closed (no null return)', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: false,
      items: [],
    })

    renderDrawer()

    // Always rendered (not null) so the CSS slide transition can animate.
    // aria-hidden="true" when closed, so query with { hidden: true }.
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Empty cart state
// ---------------------------------------------------------------------------
describe('CartDrawer – empty cart state', () => {
  it('renders empty state message when cart has no items', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 0,
      items: [],
    })

    renderDrawer()

    expect(screen.getByText(i18n.cart.empty)).toBeInTheDocument()
  })

  it('renders shop link to /productos on empty state', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 0,
      items: [],
    })

    renderDrawer()

    const shopLink = screen.getByRole('link', { name: i18n.cart.goShop })
    expect(shopLink).toBeInTheDocument()
    expect(shopLink).toHaveAttribute('href', '/productos')
  })

  it('does NOT render footer (total / "Ver carrito completo") when cart is empty', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 0,
      items: [],
    })

    renderDrawer()

    expect(screen.queryByText(i18n.cart.viewFull)).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.cart.checkout)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Logged-out state (edge case per spec)
// ---------------------------------------------------------------------------
describe('CartDrawer – logged-out user', () => {
  it('shows loginRequired message when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    expect(screen.getByText(i18n.cart.loginRequired)).toBeInTheDocument()
  })

  it('shows link to /login when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    const loginLink = screen.getByRole('link', { name: i18n.cart.goLogin })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  it('does NOT show item list or footer when logged out', () => {
    mockUseAuth.mockReturnValue({ user: null })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [makeItem()],
    })

    renderDrawer()

    // Even with items in state, logged-out guard must hide them
    expect(screen.queryByText('Vela Ámbar')).not.toBeInTheDocument()
    expect(screen.queryByText(i18n.cart.viewFull)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Escape key closes the drawer (load-bearing spec requirement)
// ---------------------------------------------------------------------------
describe('CartDrawer – Escape key closes drawer', () => {
  it('calls closeDrawer when Escape is pressed while open', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
  })

  it('does NOT call closeDrawer on Escape when drawer is closed', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: false,
      items: [],
    })

    renderDrawer()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(mockCloseDrawer).not.toHaveBeenCalled()
  })

  it('does NOT call closeDrawer when a non-Escape key is pressed', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Tab' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })

    expect(mockCloseDrawer).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Body scroll lock (load-bearing spec requirement)
// ---------------------------------------------------------------------------
describe('CartDrawer – body scroll lock', () => {
  it('sets document.body.style.overflow to "hidden" when drawer opens', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores document.body.style.overflow to "" when drawer is closed', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: false,
      items: [],
    })

    renderDrawer()

    expect(document.body.style.overflow).toBe('')
  })

  it('restores overflow to "" on unmount even if drawer was open', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    const { unmount } = renderDrawer()

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Close triggers (backdrop click and close button)
// ---------------------------------------------------------------------------
describe('CartDrawer – close triggers', () => {
  it('backdrop click calls closeDrawer', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    const backdrop = document.querySelector('.cart-drawer__backdrop')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)

    expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
  })

  it('close button (×) calls closeDrawer', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [],
    })

    renderDrawer()

    const closeBtn = screen.getByRole('button', { name: i18n.cart.close })
    fireEvent.click(closeBtn)

    expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Stepper buttons (load-bearing: same behavior as CartPage)
// ---------------------------------------------------------------------------
describe('CartDrawer – stepper buttons', () => {
  it('decrease (−) button calls setQuantity(item.id, item.quantity - 1)', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ id: 10, quantity: 3, stock: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 3,
      items: [item],
    })

    renderDrawer()

    const decreaseBtn = screen.getByRole('button', { name: i18n.cart.decrease })
    fireEvent.click(decreaseBtn)

    expect(mockSetQuantity).toHaveBeenCalledWith(10, 2) // quantity - 1 = 3 - 1 = 2
  })

  it('increase (+) button calls setQuantity(item.id, item.quantity + 1)', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ id: 10, quantity: 2, stock: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    const increaseBtn = screen.getByRole('button', { name: i18n.cart.increase })
    fireEvent.click(increaseBtn)

    expect(mockSetQuantity).toHaveBeenCalledWith(10, 3) // quantity + 1 = 2 + 1 = 3
  })

  it('increase (+) button is disabled when quantity >= stock', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ quantity: 5, stock: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 5,
      items: [item],
    })

    renderDrawer()

    const increaseBtn = screen.getByRole('button', { name: i18n.cart.increase })
    expect(increaseBtn).toBeDisabled()
  })

  it('increase (+) button is enabled when quantity < stock', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ quantity: 3, stock: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 3,
      items: [item],
    })

    renderDrawer()

    const increaseBtn = screen.getByRole('button', { name: i18n.cart.increase })
    expect(increaseBtn).not.toBeDisabled()
  })

  it('decrease (−) at quantity=1 calls setQuantity(item.id, 0) which context routes to removeItem', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ id: 10, quantity: 1, stock: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 1,
      items: [item],
    })

    renderDrawer()

    const decreaseBtn = screen.getByRole('button', { name: i18n.cart.decrease })
    fireEvent.click(decreaseBtn)

    // CartDrawer passes quantity - 1 = 1 - 1 = 0; context then routes to removeItem
    expect(mockSetQuantity).toHaveBeenCalledWith(10, 0)
  })
})

// ---------------------------------------------------------------------------
// Remove button
// ---------------------------------------------------------------------------
describe('CartDrawer – remove button', () => {
  it('clicking remove button calls removeItem(item.id)', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ id: 10 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    const removeBtn = screen.getByRole('button', { name: i18n.cart.remove })
    fireEvent.click(removeBtn)

    expect(mockRemoveItem).toHaveBeenCalledWith(10)
  })

  it('remove button shows correct i18n label', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      items: [makeItem()],
    })

    renderDrawer()

    expect(screen.getByRole('button', { name: i18n.cart.remove })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// "Ver carrito completo" link (load-bearing: must navigate to /carrito and close)
// ---------------------------------------------------------------------------
describe('CartDrawer – "Ver carrito completo" link', () => {
  it('renders "Ver carrito completo" link pointing to /carrito', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem()],
    })

    renderDrawer()

    const viewLink = screen.getByRole('link', { name: i18n.cart.viewFull })
    expect(viewLink).toBeInTheDocument()
    expect(viewLink).toHaveAttribute('href', '/carrito')
  })

  it('clicking "Ver carrito completo" calls closeDrawer', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem()],
    })

    renderDrawer()

    const viewLink = screen.getByRole('link', { name: i18n.cart.viewFull })
    fireEvent.click(viewLink)

    expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Product name link (must navigate to /producto/:id and close)
// ---------------------------------------------------------------------------
describe('CartDrawer – product name link', () => {
  it('product name is a link to /producto/:productId', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ productId: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    const productLink = screen.getByRole('link', { name: 'Vela Ámbar' })
    expect(productLink).toBeInTheDocument()
    expect(productLink).toHaveAttribute('href', '/producto/5')
  })

  it('clicking product name calls closeDrawer', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ productId: 5 })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    const productLink = screen.getByRole('link', { name: 'Vela Ámbar' })
    fireEvent.click(productLink)

    expect(mockCloseDrawer).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Checkout button
// ---------------------------------------------------------------------------
describe('CartDrawer – checkout button', () => {
  it('checkout button is disabled', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem()],
    })

    renderDrawer()

    const checkoutBtn = screen.getByRole('button', { name: i18n.cart.checkout })
    expect(checkoutBtn).toBeDisabled()
  })

  it('checkout button has aria-disabled="true"', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [makeItem()],
    })

    renderDrawer()

    const checkoutBtn = screen.getByRole('button', { name: i18n.cart.checkout })
    expect(checkoutBtn).toHaveAttribute('aria-disabled', 'true')
  })
})

// ---------------------------------------------------------------------------
// Title includes item count when count > 0
// ---------------------------------------------------------------------------
describe('CartDrawer – title display', () => {
  it('shows title without count when cart is empty', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 0,
      items: [],
    })

    renderDrawer()

    // Should show just the title, not "Tu carrito (0)"
    expect(screen.getByText(i18n.cart.title)).toBeInTheDocument()
    expect(screen.queryByText(`${i18n.cart.title} (0)`)).not.toBeInTheDocument()
  })

  it('shows title with count in parentheses when count > 0', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 3,
      items: [makeItem({ quantity: 3 })],
    })

    renderDrawer()

    expect(screen.getByText(`${i18n.cart.title} (3)`)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Variant label rendering
// ---------------------------------------------------------------------------
describe('CartDrawer – variant label', () => {
  it('renders color·scent variant label when both present', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({
      colorName: { es: 'Ámbar' },
      scentName: { es: 'Vainilla' },
    })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    expect(screen.getByText('Ámbar · Vainilla')).toBeInTheDocument()
  })

  it('does NOT render variant label paragraph when colorName and scentName are both null', () => {
    mockUseAuth.mockReturnValue({ user: loggedInUser })
    const item = makeItem({ colorName: null, scentName: null })
    mockUseCart.mockReturnValue({
      ...baseCartMock,
      isDrawerOpen: true,
      count: 2,
      items: [item],
    })

    renderDrawer()

    // No variant label paragraph should exist
    expect(document.querySelector('.cart-drawer__line-variant')).toBeNull()
  })
})
