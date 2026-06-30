import type { Localized } from './Product'

export interface Category {
  id: number
  name: Localized
  description: Localized | null
  isActive: boolean
}
