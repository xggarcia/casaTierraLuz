export type Lang = 'ca' | 'es' | 'en'
export type Localized = Partial<Record<Lang, string>>

export interface Color {
  id: number
  name: Localized
  hexCode: string
  isActive: boolean
}

export interface Scent {
  id: number
  name: Localized
  description: Localized | null
  isActive: boolean
}

export interface ProductVariant {
  id: number
  productId: number
  color: Color | null
  scent: Scent | null
  price: number | null   // null = hereda basePrice
  stock: number
  isActive: boolean
}

export interface Product {
  id: number
  name: Localized
  shortDescription: Localized | null
  longDescription: Localized | null
  basePrice: number
  images: string[]
  isActive: boolean
  variants: ProductVariant[]
}

// Helper de texto localizado (export nombrado, reutilizado por las páginas)
export function t(loc: Localized | null | undefined): string {
  return loc?.es ?? loc?.ca ?? loc?.en ?? ''
}
