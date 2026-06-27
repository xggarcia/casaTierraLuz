import type { IEnrollmentRepository, EnrollmentData } from '../ports/IEnrollmentRepository'

export class SubmitEnrollment {
  constructor(private readonly repo: IEnrollmentRepository) {}

  execute(data: EnrollmentData): Promise<void> {
    return this.repo.submit(data)
  }
}
