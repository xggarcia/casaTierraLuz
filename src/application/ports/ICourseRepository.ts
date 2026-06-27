import type { Course, Category, UnrealArticle } from '../../domain/entities/Course'

export interface ICourseRepository {
  getAll(): Promise<Course[]>
  getAllPublic(): Promise<Course[]>         // is_public=true AND is_archived=false (web activa)
  getAllPublicCatalog(): Promise<Course[]>  // is_public=true, incluye archivados (página /cursos)
  getFeatured(): Promise<Course[]>
  getByCategory(category: Category): Promise<Course[]>
  getBySlug(slug: string): Promise<Course | undefined>
  getUnrealArticle(category: Category): Promise<UnrealArticle | undefined>
}
