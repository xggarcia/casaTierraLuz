import type { IInfoRequestRepository, InfoRequestData } from '../ports/IInfoRequestRepository'

export class SubmitInfoRequest {
  constructor(private readonly repo: IInfoRequestRepository) {}

  execute(data: InfoRequestData): Promise<void> {
    return this.repo.submit(data)
  }
}
