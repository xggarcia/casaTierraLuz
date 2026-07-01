import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { cartRepository } from '../../infrastructure/repositories/SupabaseCartRepository'
import type { CartItem } from '../../domain/entities/Cart'

interface CartContextValue {
  items: CartItem[]
  count: number                // sum of item.quantity across items
  loading: boolean
  addToCart: (variantId: number, quantity?: number) => Promise<void> // quantity default 1
  setQuantity: (cartItemId: number, quantity: number) => Promise<void>
  removeItem: (cartItemId: number) => Promise<void>
  refresh: () => Promise<void>
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

  const refresh = async () => {
    if (!user) {
      setItems([])
      return
    }
    try {
      const data = await cartRepository.getForUser(user.id)
      setItems(data)
    } catch {
      // leave items as-is on error; page error states handle display
    }
  }

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    cartRepository
      .getForUser(user.id)
      .then(data => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user])

  const addToCart = async (variantId: number, quantity = 1) => {
    if (!user) return
    try {
      // Cap the total (existing + adding) at the variant's stock.
      // We read current items from state to compute the existing quantity for this variant.
      const existingItem = items.find(i => i.variantId === variantId)
      const stock = existingItem?.stock ?? Infinity
      const existingQty = existingItem?.quantity ?? 0
      const clampedAdd = Math.min(quantity, Math.max(0, stock - existingQty))
      if (clampedAdd < 1) {
        // Already at or above stock; do not write anything.
        return
      }
      await cartRepository.addOrIncrement({ userId: user.id, variantId, quantity: clampedAdd })
      await refresh()
      setIsDrawerOpen(true)
    } catch {
      // On repository error (e.g. race / unique constraint violation), reconcile
      // the UI to the true DB state by re-fetching instead of silently losing the update.
      // Do NOT open the drawer — nothing was successfully added.
      await refresh()
    }
  }

  const setQuantity = async (cartItemId: number, quantity: number) => {
    if (quantity < 1) {
      await removeItem(cartItemId)
      return
    }
    // Belt-and-suspenders stock cap: clamp to the line's current stock.
    const item = items.find(i => i.id === cartItemId)
    const capped = item ? Math.min(quantity, item.stock) : quantity
    await cartRepository.setQuantity(cartItemId, capped)
    await refresh()
  }

  const removeItem = async (cartItemId: number) => {
    await cartRepository.remove(cartItemId)
    await refresh()
  }

  const count = items.reduce((acc, item) => acc + item.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, count, loading,
      addToCart, setQuantity, removeItem, refresh,
      isDrawerOpen, openDrawer, closeDrawer,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
