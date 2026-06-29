export interface Message {
  id: number
  userId: string
  email: string
  name: string
  title: string
  body: string
  isRead: boolean
  createdAt: string   // ISO timestamp from Supabase
}

// Input for creating a message (user_id / email come from auth at the repo call site)
export interface MessageInput {
  userId: string
  email: string
  name: string
  title: string
  body: string
}
