import type { IEnrollmentRepository } from '../ports/IEnrollmentRepository'

export class GetEnrolledIds {
  constructor(private readonly repo: IEnrollmentRepository) {}

  execute(userId: string): Promise<number[]> {
    return this.repo.getEnrolledIds(userId)
  }
}
