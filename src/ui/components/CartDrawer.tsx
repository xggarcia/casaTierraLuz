import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { t } from '../../domain/entities/Product'
import type { CartItem } from '../../domain/entities/Cart'
import { es as i18n } from '../../i18n/es'
import '../styles/cart-drawer.css'

function cartVariantLabel(item: CartItem): string {
  const color = item.colorName ? t(item.colorName) : ''
  const scent = item.scentName ? t(item.scentName) : ''
  if (color && scent) return `${color} · ${scent}`
  return color || scent || ''
}

export function CartDrawer() {
  const { items, count, isDrawerOpen, closeDrawer, setQuantity, removeItem } = useCart()
  const { user } = useAuth()

  const cartTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)

  // Escape key closes the drawer
  useEffect(() => {
    if (!isDrawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isDrawerOpen, closeDrawer])

  // Body scroll lock while open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isDrawerOpen])

  return (
    <>
      <div
        className={`cart-drawer__backdrop${isDrawerOpen ? ' cart-drawer__backdrop--open' : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${isDrawerOpen ? ' cart-drawer--open' : ''}`}
        role="dialog"
        aria-label={i18n.cart.title}
        aria-hidden={!isDrawerOpen}
      >
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            {count > 0 ? `${i18n.cart.title} (${count})` : i18n.cart.title}
          </h2>
          <button
            type="button"
            className="cart-drawer__close"
            aria-label={i18n.cart.close}
            onClick={closeDrawer}
          >
            ×
          </button>
        </div>

        <div className="cart-drawer__body">
          {!user ? (
            <>
              <p>{i18n.cart.loginRequired}</p>
              <Link to="/login" onClick={closeDrawer}>{i18n.cart.goLogin}</Link>
            </>
          ) : items.length === 0 ? (
            <>
              <p className="cart-drawer__empty">{i18n.cart.empty}</p>
              <Link to="/productos" className="cart-drawer__shop-link" onClick={closeDrawer}>
                {i18n.cart.goShop}
              </Link>
            </>
          ) : (
            <ul className="cart-drawer__list">
              {items.map(item => {
                const label = cartVariantLabel(item)
                return (
                  <li key={item.id} className="cart-drawer__line">
                    <div className="cart-drawer__line-image">
                      {item.image ? (
                        <img src={item.image} alt={t(item.productName)} loading="lazy" />
                      ) : (
                        <div aria-hidden="true" />
                      )}
                    </div>

                    <div className="cart-drawer__line-info">
                      <Link
                        to={`/producto/${item.productId}`}
                        className="cart-drawer__line-name"
                        onClick={closeDrawer}
                      >
                        {t(item.productName)}
                      </Link>
                      {label && (
                        <p className="cart-drawer__line-variant">{label}</p>
                      )}
                      <div className="cart-drawer__stepper">
                        <button
                          type="button"
                          className="cart-drawer__stepper-btn"
                          aria-label={i18n.cart.decrease}
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="cart-drawer__stepper-qty">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-drawer__stepper-btn"
                          aria-label={i18n.cart.increase}
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-drawer__line-right">
                      <span className="cart-drawer__line-total">
                        {(item.unitPrice * item.quantity).toFixed(2)}&thinsp;€
                      </span>
                      <button
                        type="button"
                        className="cart-drawer__remove-btn"
                        onClick={() => removeItem(item.id)}
                      >
                        {i18n.cart.remove}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {user && items.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-drawer__total-row">
              <span className="cart-drawer__total-label">{i18n.cart.total}</span>
              <span className="cart-drawer__total-amount">
                {cartTotal.toFixed(2)}&thinsp;€
              </span>
            </div>
            <Link
              to="/carrito"
              className="cart-drawer__view-link"
              onClick={closeDrawer}
            >
              {i18n.cart.viewFull}
            </Link>
            <button
              type="button"
              className="cart-drawer__checkout-btn"
              disabled
              aria-disabled="true"
            >
              {i18n.cart.checkout}
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
