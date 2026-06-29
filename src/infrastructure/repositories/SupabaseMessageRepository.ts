import { supabase } from '../supabase/client'
import type { Message, MessageInput } from '../../domain/entities/Message'

type DbMessage = {
  id: number
  user_id: string
  email: string
  name: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

function mapMessage(row: DbMessage): Message {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export class SupabaseMessageRepository {
  // active messages (is_read = false), newest first
  async getAll(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, user_id, email, name, title, body, is_read, created_at')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as DbMessage[]).map(mapMessage)
  }

  // archived messages (is_read = true), newest first
  async getArchived(): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('id, user_id, email, name, title, body, is_read, created_at')
      .eq('is_read', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as DbMessage[]).map(mapMessage)
  }

  // sets is_read = true (archives the message)
  async markAsRead(id: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id)
    if (error) throw error
  }

  // hard delete (permanently removes the message)
  async remove(id: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  // insert a new message (used by the contact form)
  async create(input: MessageInput): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .insert({
        user_id: input.userId,
        email: input.email,
        name: input.name,
        title: input.title,
        body: input.body,
      })
    if (error) throw error
  }
}

export const messageRepository = new SupabaseMessageRepository()
