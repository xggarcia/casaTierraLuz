import type { Localized } from './Product'

// One line in the cart, joined with product + variant display data.
export interface CartItem {
  id: number                  // cart_items.id
  variantId: number           // product_variants.id
  productId: number           // products.id (for linking to /producto/:id)
  quantity: number
  unitPrice: number           // variant.price ?? product.base_price (resolved)
  stock: number               // variant.stock — used to cap quantity
  productName: Localized      // products.name
  image: string | null        // products.images[0] ?? null
  colorName: Localized | null // colors.name of the variant, or null
  scentName: Localized | null // scents.name of the variant, or null
}

// Input for adding to the cart (user_id comes from auth at the call site).
export interface CartItemInput {
  userId: string
  variantId: number
  quantity: number  // amount to add (>= 1)
}
