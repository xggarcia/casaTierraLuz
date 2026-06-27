export interface InfoRequest {
  id: string
  courseId: number
  userId: string | null
  name: string
  surnames: string
  email: string
  phone: string | null
  observaciones: string | null
  createdAt: string
  repliedAt: string | null
  repliedBy: string | null
  replyText: string | null
}
