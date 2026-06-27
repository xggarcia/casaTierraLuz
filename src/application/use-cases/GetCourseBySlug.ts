import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Course } from '../../domain/entities/Course'

export class GetCourseBySlug {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(slug: string): Promise<Course | undefined> {
    return this.repo.getBySlug(slug)
  }
}
