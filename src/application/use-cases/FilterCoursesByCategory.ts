import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Course, Category } from '../../domain/entities/Course'

export class FilterCoursesByCategory {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(category: Category): Promise<Course[]> {
    return this.repo.getByCategory(category)
  }
}
