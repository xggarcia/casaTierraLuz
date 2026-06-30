import { supabase } from '../supabase/client'
import type { Category } from '../../domain/entities/Category'
import type { Localized } from '../../domain/entities/Product'

export interface CategoryInput { name: Localized; description: Localized | null }

type DbCategory = {
  id: number
  name: Record<string, string>
  description: Record<string, string> | null
  is_active: boolean
}

function mapCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name as Category['name'],
    description: (row.description as Category['description']) ?? null,
    isActive: row.is_active,
  }
}

class SupabaseCategoryRepository {
  async getAllForAdmin(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, is_active')
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbCategory[]).map(mapCategory)
  }

  async create(input: CategoryInput): Promise<{ id: number }> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: input.name, description: input.description })
      .select('id')
      .single()
    if (error) throw error
    return { id: (data as { id: number }).id }
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async getProductIds(categoryId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', categoryId)
    if (error) throw error
    return (data as { product_id: number }[]).map(r => r.product_id)
  }

  async setProducts(categoryId: number, productIds: number[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', categoryId)
    if (deleteError) throw deleteError

    if (productIds.length > 0) {
      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(productIds.map(pid => ({ product_id: pid, category_id: categoryId })))
      if (insertError) throw insertError
    }
  }

  async getAllActive(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbCategory[]).map(mapCategory)
  }

  async getCategoryIdsForProduct(productId: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', productId)
    if (error) throw error
    return (data as { category_id: number }[]).map(r => r.category_id)
  }

  async setProductCategories(productId: number, categoryIds: number[]): Promise<void> {
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('product_id', productId)
    if (deleteError) throw deleteError

    if (categoryIds.length > 0) {
      const { error: insertError } = await supabase
        .from('product_categories')
        .insert(categoryIds.map(cid => ({ product_id: productId, category_id: cid })))
      if (insertError) throw insertError
    }
  }

  async getProductCategoryMap(): Promise<Record<number, number[]>> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('product_id, category_id')
    if (error) throw error
    return (data as { product_id: number; category_id: number }[]).reduce<Record<number, number[]>>(
      (acc, row) => {
        if (!acc[row.product_id]) acc[row.product_id] = []
        acc[row.product_id].push(row.category_id)
        return acc
      },
      {}
    )
  }
}

export const categoryRepository = new SupabaseCategoryRepository()
