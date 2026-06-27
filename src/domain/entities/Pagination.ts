export interface PageRequest {
  page: number      // 1-based
  pageSize: number
}

export interface Page<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export const DEFAULT_PAGE_SIZE = 25

export function totalPages(total: number, pageSize: number): number {
  if (pageSize <= 0) return 0
  return Math.max(1, Math.ceil(total / pageSize))
}
