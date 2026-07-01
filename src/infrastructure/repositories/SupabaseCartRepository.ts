import { supabase } from '../supabase/client'
import type { CartItem, CartItemInput } from '../../domain/entities/Cart'

const CART_SELECT =
  'id, variant_id, quantity, ' +
  'product_variants(id, price, stock, product_id, ' +
    'colors(id, name, hex_code), scents(id, name), ' +
    'products(id, name, images, base_price))'

type DbColor = {
  id: number
  name: Record<string, string>
  hex_code: string
}

type DbScent = {
  id: number
  name: Record<string, string>
}

type DbProductJoin = {
  id: number
  name: Record<string, string>
  images: string[] | null
  base_price: number | string
}

type DbVariantJoin = {
  id: number
  price: number | string | null
  stock: number
  product_id: number
  colors: DbColor | DbColor[] | null
  scents: DbScent | DbScent[] | null
  products: DbProductJoin | DbProductJoin[] | null
}

type DbCartItem = {
  id: number
  variant_id: number
  quantity: number
  product_variants: DbVariantJoin | DbVariantJoin[] | null
}

function mapColor(raw: DbColor | DbColor[] | null): Record<string, string> | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c) return null
  return c.name
}

function mapScent(raw: DbScent | DbScent[] | null): Record<string, string> | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  if (!s) return null
  return s.name
}

function mapCartItem(row: DbCartItem): CartItem {
  const variant = Array.isArray(row.product_variants)
    ? row.product_variants[0]
    : row.product_variants
  if (!variant) throw new Error('Missing product_variants join on cart_items row')

  const product = Array.isArray(variant.products)
    ? variant.products[0]
    : variant.products
  if (!product) throw new Error('Missing products join on product_variants row')

  const unitPrice =
    variant.price != null ? Number(variant.price) : Number(product.base_price)

  return {
    id: row.id,
    variantId: row.variant_id,
    productId: product.id,
    quantity: row.quantity,
    unitPrice,
    stock: Number(variant.stock),
    productName: product.name,
    image: product.images?.[0] ?? null,
    colorName: mapColor(variant.colors),
    scentName: mapScent(variant.scents),
  }
}

export class SupabaseCartRepository {
  // All cart lines for a user, oldest first. Ordered by id ascending.
  async getForUser(userId: string): Promise<CartItem[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(CART_SELECT)
      .eq('user_id', userId)
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbCartItem[]).map(mapCartItem)
  }

  // Add to cart. If a row for (userId, variantId) exists, increment its quantity;
  // otherwise insert a new row.
  async addOrIncrement(input: CartItemInput): Promise<void> {
    const { data: existing, error: selectError } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', input.userId)
      .eq('variant_id', input.variantId)
      .maybeSingle()
    if (selectError) throw selectError

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: (existing as { id: number; quantity: number }).quantity + input.quantity })
        .eq('id', (existing as { id: number; quantity: number }).id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: input.userId,
          variant_id: input.variantId,
          quantity: input.quantity,
        })
      if (error) throw error
    }
  }

  // Set an exact quantity for a cart row. Must be >= 1 (caller guards).
  async setQuantity(cartItemId: number, quantity: number): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
    if (error) throw error
  }

  // Remove one cart line entirely.
  async remove(cartItemId: number): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
    if (error) throw error
  }
}

export const cartRepository = new SupabaseCartRepository()
