import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { t } from '../../domain/entities/Product'
import type { CartItem } from '../../domain/entities/Cart'
import { es as i18n } from '../../i18n/es'
import '../styles/auth.css'
import '../styles/cart.css'

function cartVariantLabel(item: CartItem): string {
  const color = item.colorName ? t(item.colorName) : ''
  const scent = item.scentName ? t(item.scentName) : ''
  if (color && scent) return `${color} · ${scent}`
  return color || scent || ''
}

export function CartPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading, setQuantity, removeItem } = useCart()
  const [actionError, setActionError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasEnteredRef = useRef(false)

  useEffect(() => {
    document.title = 'Carrito — Casa Tierra Luz'
    return () => { document.title = 'Casa Tierra Luz — Velas artesanales' }
  }, [])

  // Entrance reveal — fires once, the first time the cart's real content
  // (list or empty state) is ready to show. Guarded by hasEnteredRef so
  // later quantity/remove updates (which also flow through `items`) never
  // re-trigger a full-list fade.
  useEffect(() => {
    if (authLoading || loading || !user) return
    if (hasEnteredRef.current) return
    hasEnteredRef.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cart__heading, .cart__subtitle',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out' }
      )
      if (items.length === 0) {
        gsap.fromTo(
          '.cart__empty',
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', delay: 0.12 }
        )
      } else {
        gsap.fromTo(
          '.cart__line',
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.045, duration: 0.55, ease: 'power3.out', delay: 0.1 }
        )
        gsap.fromTo(
          '.cart__footer',
          { y: 12, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 + items.length * 0.045 }
        )
      }
    }, containerRef)

    return () => ctx.revert()
  }, [authLoading, loading, user, items])

  async function runCartAction(action: () => Promise<void>) {
    try {
      setActionError(null)
      await action()
    } catch {
      setActionError(i18n.cart.updateError)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="auth-page">
        <div className="auth-column">
          <p>{i18n.loading}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-column">
          <h1 className="auth-heading">{i18n.cart.title}</h1>
          <p className="auth-subheading">{i18n.cart.loginRequired}</p>
          <footer className="auth-footer">
            <p className="auth-footer-text">
              <Link to="/login" className="auth-footer-link">
                {i18n.cart.goLogin}
              </Link>
              {' · '}
              <Link to="/registro" className="auth-footer-link">
                {i18n.cart.goRegister}
              </Link>
            </p>
          </footer>
        </div>
      </div>
    )
  }

  const cartTotal = items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  )

  return (
    <div ref={containerRef} className="cart__page">
      <h1 className="cart__heading">{i18n.cart.title}</h1>
      <p className="cart__subtitle">{i18n.cart.subtitle}</p>

      {actionError && (
        <p className="cart__error" role="status">{actionError}</p>
      )}

      {items.length === 0 ? (
        <div className="cart__empty">
          <p className="cart__empty-text">{i18n.cart.empty}</p>
          <Link to="/productos" className="cart__empty-link">
            {i18n.cart.goShop}
          </Link>
        </div>
      ) : (
        <>
          <ul className="cart__list">
            {items.map(item => {
              const label = cartVariantLabel(item)
              const lineTotal = item.unitPrice * item.quantity

              return (
                <li key={item.id} className="cart__line">
                  <div className="cart__line-image">
                    {item.image ? (
                      <img src={item.image} alt={t(item.productName)} loading="lazy" />
                    ) : (
                      <div aria-hidden="true" />
                    )}
                  </div>

                  <div className="cart__line-info">
                    <Link
                      to={`/producto/${item.productId}`}
                      className="cart__line-name"
                    >
                      {t(item.productName)}
                    </Link>
                    {label && (
                      <p className="cart__line-variant">{label}</p>
                    )}
                  </div>

                  <span className="cart__line-price">
                    {item.unitPrice.toFixed(2)}&thinsp;€
                  </span>

                  <div className="cart__stepper">
                    <button
                      type="button"
                      className="cart__stepper-btn"
                      aria-label={i18n.cart.decrease}
                      onClick={() => runCartAction(() => setQuantity(item.id, item.quantity - 1))}
                    >
                      −
                    </button>
                    <span className="cart__stepper-qty" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="cart__stepper-btn"
                      aria-label={i18n.cart.increase}
                      onClick={() => runCartAction(() => setQuantity(item.id, item.quantity + 1))}
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>

                  <span className="cart__line-total">
                    {lineTotal.toFixed(2)}&thinsp;€
                  </span>

                  <button
                    type="button"
                    className="cart__remove-btn"
                    onClick={() => runCartAction(() => removeItem(item.id))}
                  >
                    {i18n.cart.remove}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="cart__footer">
            <div className="cart__total-row">
              <span className="cart__total-label">{i18n.cart.total}</span>
              <span className="cart__total-amount" aria-live="polite">
                {cartTotal.toFixed(2)}&thinsp;€
              </span>
            </div>
            <button
              type="button"
              className="cart__checkout-btn"
              disabled
              aria-disabled="true"
            >
              {i18n.cart.checkout}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
