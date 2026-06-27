import { supabase } from '../supabase/client'
import type { IInfoRequestRepository, InfoRequestData } from '../../application/ports/IInfoRequestRepository'

export class SupabaseInfoRequestRepository implements IInfoRequestRepository {
  async submit(data: InfoRequestData): Promise<void> {
    const { error } = await supabase.from('information_requests').insert({
      course_id:     data.courseId,
      user_id:       data.userId,
      name:          data.name,
      surnames:      data.surnames,
      email:         data.email,
      phone:         data.phone,
      observaciones: data.observaciones,
    })
    if (error) throw error
  }
}
