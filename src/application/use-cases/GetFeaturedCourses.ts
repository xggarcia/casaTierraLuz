import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Course } from '../../domain/entities/Course'

export class GetFeaturedCourses {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(): Promise<Course[]> {
    return (await this.repo.getFeatured()).slice(0, 3)
  }
}
