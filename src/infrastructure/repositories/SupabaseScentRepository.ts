import { supabase } from '../supabase/client'
import type { Scent, Localized } from '../../domain/entities/Product'

export interface ScentInput { name: Localized; description: Localized | null }

type DbScent = {
  id: number
  name: Record<string, string>
  description: Record<string, string> | null
  is_active: boolean
}

function mapScent(row: DbScent): Scent {
  return {
    id: row.id,
    name: row.name as Scent['name'],
    description: (row.description as Scent['description']) ?? null,
    isActive: row.is_active,
  }
}

export class SupabaseScentRepository {
  async getAllForAdmin(): Promise<Scent[]> {
    const { data, error } = await supabase
      .from('scents')
      .select('id, name, description, is_active')
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbScent[]).map(mapScent)
  }

  async create(input: ScentInput): Promise<void> {
    const { error } = await supabase
      .from('scents')
      .insert({ name: input.name, description: input.description })
    if (error) throw error
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('scents')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('scents')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

export const scentRepository = new SupabaseScentRepository()
