import { supabase } from '../supabase/client'
import type { Color, Localized } from '../../domain/entities/Product'

export interface ColorInput { name: Localized; hexCode: string }

type DbColor = {
  id: number
  name: Record<string, string>
  hex_code: string
  is_active: boolean
}

function mapColor(row: DbColor): Color {
  return {
    id: row.id,
    name: row.name as Color['name'],
    hexCode: row.hex_code,
    isActive: row.is_active,
  }
}

export class SupabaseColorRepository {
  async getAllForAdmin(): Promise<Color[]> {
    const { data, error } = await supabase
      .from('colors')
      .select('id, name, hex_code, is_active')
      .order('id', { ascending: true })
    if (error) throw error
    return (data as unknown as DbColor[]).map(mapColor)
  }

  async create(input: ColorInput): Promise<void> {
    const { error } = await supabase
      .from('colors')
      .insert({ name: input.name, hex_code: input.hexCode })
    if (error) throw error
  }

  async setActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('colors')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw error
  }

  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('colors')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}

export const colorRepository = new SupabaseColorRepository()
