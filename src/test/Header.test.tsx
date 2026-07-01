/**
 * Tests for src/ui/components/Header.tsx
 *
 * Verifies: Admin link visibility, nav links, i18n strings from es.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../ui/components/Header'
import { es as t } from '../i18n/es'

// AuthContext mock
vi.mock('../ui/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))
import { useAuth } from '../ui/contexts/AuthContext'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

// CartContext mock — Header uses useCart() for the badge count and openDrawer
vi.mock('../ui/contexts/CartContext', () => ({
  useCart: vi.fn().mockReturnValue({ count: 0, items: [], loading: false, openDrawer: vi.fn(), isDrawerOpen: false, closeDrawer: vi.fn() }),
}))
import { useCart } from '../ui/contexts/CartContext'

const mockUseCart = useCart as ReturnType<typeof vi.fn>

function renderHeader(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Header />
    </MemoryRouter>
  )
}

describe('Header – unauthenticated user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, signOut: vi.fn() })
  })

  it('shows the products link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: t.nav.products })).toBeInTheDocument()
  })

  it('shows login link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: t.nav.login })).toBeInTheDocument()
  })

  it('shows register link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: t.nav.register })).toBeInTheDocument()
  })

  it('does NOT show logout button', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: t.nav.logout })).not.toBeInTheDocument()
  })

  it('does NOT show admin link', () => {
    renderHeader()
    expect(screen.queryByRole('link', { name: t.nav.admin })).not.toBeInTheDocument()
  })

  it('does NOT show user email', () => {
    renderHeader()
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
  })
})

describe('Header – authenticated non-admin user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: 'user@test.com' },
      isAdmin: false,
      signOut: vi.fn(),
    })
  })

  it('shows user email', () => {
    renderHeader()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('shows logout button with correct i18n label', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: t.nav.logout })).toBeInTheDocument()
  })

  it('does NOT show admin link when isAdmin is false', () => {
    renderHeader()
    expect(screen.queryByRole('link', { name: t.nav.admin })).not.toBeInTheDocument()
  })

  it('does NOT show login or register links', () => {
    renderHeader()
    expect(screen.queryByRole('link', { name: t.nav.login })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: t.nav.register })).not.toBeInTheDocument()
  })
})

describe('Header – cart trigger on /carrito', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: 'user@test.com' },
      isAdmin: false,
      signOut: vi.fn(),
    })
  })

  it('does NOT open the drawer when clicked while already on /carrito', () => {
    const openDrawer = vi.fn()
    mockUseCart.mockReturnValue({ count: 1, items: [], loading: false, openDrawer, isDrawerOpen: false, closeDrawer: vi.fn() })
    renderHeader(['/carrito'])
    screen.getByRole('button', { name: `${t.cart.headerLink} (1)` }).click()
    expect(openDrawer).not.toHaveBeenCalled()
  })

  it('marks the cart trigger as aria-disabled on /carrito', () => {
    mockUseCart.mockReturnValue({ count: 0, items: [], loading: false, openDrawer: vi.fn(), isDrawerOpen: false, closeDrawer: vi.fn() })
    renderHeader(['/carrito'])
    expect(screen.getByRole('button', { name: t.cart.headerLink })).toHaveAttribute('aria-disabled', 'true')
  })

  it('still opens the drawer when clicked from other pages', () => {
    const openDrawer = vi.fn()
    mockUseCart.mockReturnValue({ count: 0, items: [], loading: false, openDrawer, isDrawerOpen: false, closeDrawer: vi.fn() })
    renderHeader(['/productos'])
    screen.getByRole('button', { name: t.cart.headerLink }).click()
    expect(openDrawer).toHaveBeenCalledTimes(1)
  })
})

describe('Header – admin user', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { email: 'admin@test.com' },
      isAdmin: true,
      signOut: vi.fn(),
    })
  })

  it('shows admin link ONLY when isAdmin is true', () => {
    renderHeader()
    const adminLink = screen.getByRole('link', { name: t.nav.admin })
    expect(adminLink).toBeInTheDocument()
  })

  it('admin link points to /admin', () => {
    renderHeader()
    const adminLink = screen.getByRole('link', { name: t.nav.admin })
    expect(adminLink).toHaveAttribute('href', '/admin')
  })

  it('still shows products link', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: t.nav.products })).toBeInTheDocument()
  })
})
