import type { ICourseRepository } from '../ports/ICourseRepository'
import type { Category, UnrealArticle } from '../../domain/entities/Course'

export class GetUnrealArticle {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(category: Category): Promise<UnrealArticle | undefined> {
    return this.repo.getUnrealArticle(category)
  }
}
