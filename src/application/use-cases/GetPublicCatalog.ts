import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Course } from '../../domain/entities/Course'

export class GetPublicCatalog {
  constructor(private readonly repo: ICourseRepository) {}

  execute(): Promise<Course[]> {
    return this.repo.getAllPublicCatalog()
  }
}
