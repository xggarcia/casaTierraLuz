import { supabase } from '../supabase/client'
import type { IEnrollmentRepository, EnrollmentData } from '../../application/ports/IEnrollmentRepository'

export class SupabaseEnrollmentRepository implements IEnrollmentRepository {
  async submit(data: EnrollmentData): Promise<void> {
    const { error } = await supabase.from('enrollments').insert({
      course_id:  data.courseId,
      user_id:    data.userId,
      name:       data.name,
      surnames:   data.surnames,
      email:      data.email,
      phone:      data.phone,
    })
    if (error) throw error
  }

  async getEnrolledIds(userId: string): Promise<number[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', userId)
    if (error) throw error
    return (data ?? []).map((r: { course_id: number | string }) => Number(r.course_id))
  }
}
