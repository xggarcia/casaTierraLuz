import { supabase } from '../supabase/client'
import type { ProductVariant, Color, Scent } from '../../domain/entities/Product'

export interface VariantInput {
  productId: number
  colorId: number | null
  scentId: number | null
  price: number | null    // null = inherit base price
  stock: number
  isActive: boolean
}

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
  stock: number | string
  is_active: boolean
  colors: DbColor | DbColor[] | null
  scents: DbScent | DbScent[] | null
}

const VARIANT_SELECT =
  'id, product_id, color_id, scent_id, price, stock, is_active, ' +
  'colors(id, name, hex_code), scents(id, name)'

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
    isActive: row.is_active,
  }
}

export class SupabaseVariantRepository {
  async getByProductId(productId: number): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select(VARIANT_SELECT)
      .eq('product_id', productId)
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbVariant[]).map(mapVariant)
  }

  async create(input: VariantInput): Promise<void> {
    const { error } = await supabase
      .from('product_variants')
      .insert({
        product_id: input.productId,
        color_id: input.colorId,
        scent_id: input.scentId,
        price: input.price,
        stock: input.stock,
        is_active: input.isActive,
      })
    if (error) throw error
  }

  async update(id: number, input: Omit<VariantInput, 'productId'>): Promise<void> {
    const { error } = await supabase
      .from('product_variants')
      .update({
        color_id: input.colorId,
        scent_id: input.scentId,
        price: input.price,
        stock: input.stock,
        is_active: input.isActive,
      })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

export const variantRepository = new SupabaseVariantRepository()
