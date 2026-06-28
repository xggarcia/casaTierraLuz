import { supabase } from '../supabase/client'
import type { Product, ProductVariant, Color, Scent, Localized } from '../../domain/entities/Product'

// Input type for create/update (es-only name handling at the UI layer)
export interface ProductInput {
  name: Localized            // e.g. { es: '...' }
  shortDescription: Localized | null
  longDescription: Localized | null
  basePrice: number
  images: string[]
  isActive: boolean
  isFeatured: boolean
}

const PRODUCT_SELECT =
  'id, name, short_description, long_description, base_price, images, is_active, ' +
  'product_variants(id, product_id, color_id, scent_id, price, stock, is_active, ' +
  'colors(id, name, hex_code), scents(id, name))'

type DbColor = {
  id: number
  name: Record<string, string>
  hex_code: string
}

type DbScent = {
  id: number
  name: Record<string, string>
}

type DbVariant = {
  id: number
  product_id: number
  color_id: number | null
  scent_id: number | null
  price: number | string | null
  stock: number
  is_active: boolean
  colors: DbColor | DbColor[] | null
  scents: DbScent | DbScent[] | null
}

type DbProduct = {
  id: number
  name: Record<string, string>
  short_description: Record<string, string> | null
  long_description: Record<string, string> | null
  base_price: number | string
  images: string[] | null
  is_active: boolean
  product_variants: DbVariant[] | null
}

function mapColor(raw: DbColor | DbColor[] | null): Color | null {
  const c = Array.isArray(raw) ? raw[0] : raw
  if (!c) return null
  return {
    id: c.id,
    name: c.name as Color['name'],
    hexCode: c.hex_code,
    isActive: true,
  }
}

function mapScent(raw: DbScent | DbScent[] | null): Scent | null {
  const s = Array.isArray(raw) ? raw[0] : raw
  if (!s) return null
  return {
    id: s.id,
    name: s.name as Scent['name'],
    isActive: true,
  }
}

function mapVariant(row: DbVariant): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    color: mapColor(row.colors),
    scent: mapScent(row.scents),
    price: row.price != null ? Number(row.price) : null,
    stock: Number(row.stock),
    isActive: row.is_active === true,
  }
}

function mapProduct(row: DbProduct): Product {
  const variants = (row.product_variants ?? [])
    .filter(v => v.is_active !== false)
    .map(mapVariant)

  return {
    id: row.id,
    name: row.name as Product['name'],
    shortDescription: (row.short_description as Product['shortDescription']) ?? null,
    longDescription: (row.long_description as Product['longDescription']) ?? null,
    basePrice: Number(row.base_price),
    images: row.images ?? [],
    isActive: row.is_active === true,
    variants,
  }
}

export class SupabaseProductRepository {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbProduct[]).map(mapProduct)
  }

  async getAllForAdmin(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbProduct[]).map(mapProduct)
  }

  async getById(id: number): Promise<Product | undefined> {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()
    if (error) return undefined
    return data ? mapProduct(data as unknown as DbProduct) : undefined
  }

  async create(input: ProductInput): Promise<{ id: number }> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name,
        short_description: input.shortDescription,
        long_description: input.longDescription,
        base_price: input.basePrice,
        images: input.images,
        is_active: input.isActive,
        is_featured: input.isFeatured,
      })
      .select('id')
      .single()
    if (error) throw error
    return { id: (data as { id: number }).id }
  }

  async update(id: number, input: ProductInput): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        name: input.name,
        short_description: input.shortDescription,
        long_description: input.longDescription,
        base_price: input.basePrice,
        images: input.images,
        is_active: input.isActive,
        is_featured: input.isFeatured,
      })
      .eq('id', id)
    if (error) throw error
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

export const productRepository = new SupabaseProductRepository()
