import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Course } from '../../domain/entities/Course'

export class GetPublicCourses {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(): Promise<Course[]> {
    return this.repo.getAllPublic()
  }
}
