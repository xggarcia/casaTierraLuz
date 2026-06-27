export interface InfoRequestData {
  courseId: number
  userId: string | null
  name: string
  surnames: string
  email: string
  phone: string | null
  observaciones: string | null
}

export interface IInfoRequestRepository {
  submit(data: InfoRequestData): Promise<void>
}
