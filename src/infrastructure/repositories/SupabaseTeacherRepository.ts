import { supabase } from '../supabase/client'
import { storageService } from '../supabase/storageService'
import type { ITeacherRepository, TeacherSave } from '../../application/ports/ITeacherRepository'
import type { Teacher, TeacherImage, TeacherVideo, TeacherUserOption } from '../../domain/entities/Teacher'

function rowToTeacher(r: Record<string, unknown>): Teacher {
  return {
    id:               r.id as string,
    userId:           (r.user_id as string | null) ?? null,
    organizationId:   r.organization_id as string,
    slug:             (r.slug as string) ?? '',
    name:             (r.name as string) ?? '',
    bio:              (r.bio as string) ?? '',
    tags:             (r.tags as string[]) ?? [],
    avatarUrl:        (r.avatar_url as string) ?? '',
    linkedinUrl:      (r.linkedin_url as string) ?? '',
    socialUrl:        (r.social_url as string) ?? '',
    extraUrl:         (r.extra_url as string) ?? '',
    portfolioImages:  (r.portfolio_images as string[]) ?? [],
    portfolioVideos:  (r.portfolio_videos as string[]) ?? [],
    isPublic:         (r.is_public as boolean) ?? true,
    sortOrder:        (r.sort_order as number) ?? 0,
    createdAt:        (r.created_at as string) ?? '',
  }
}

function rowToImage(r: Record<string, unknown>): TeacherImage {
  return {
    id:              r.id as string,
    name:            r.name as string,
    url:             r.url as string,
    tags:            (r.tags as string[]) ?? [],
    organization_id: r.organization_id as string,
    created_at:      r.created_at as string,
  }
}

function rowToVideo(r: Record<string, unknown>): TeacherVideo {
  return {
    id:              r.id as string,
    name:            r.name as string,
    url:             r.url as string,
    tags:            (r.tags as string[]) ?? [],
    organization_id: r.organization_id as string,
    created_at:      r.created_at as string,
  }
}

export class SupabaseTeacherRepository implements ITeacherRepository {
  async listPublic(): Promise<Teacher[]> {
    const { data, error } = await supabase
      .from('teachers').select('*').eq('is_public', true).order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map(rowToTeacher)
  }

  async listByScope(organizationIds: string[], isSuperAdmin: boolean): Promise<Teacher[]> {
    let q = supabase.from('teachers').select('*').order('sort_order', { ascending: true })
    if (!isSuperAdmin) q = q.in('organization_id', organizationIds)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToTeacher)
  }

  async getBySlug(slug: string): Promise<Teacher | null> {
    const { data, error } = await supabase
      .from('teachers').select('*').eq('slug', slug).single()
    if (error) return null
    return rowToTeacher(data)
  }

  async save(data: TeacherSave): Promise<Teacher> {
    const payload = {
      user_id:          data.userId,
      organization_id:  data.organizationId,
      slug:             data.slug,
      name:             data.name,
      bio:              data.bio,
      tags:             data.tags,
      avatar_url:       data.avatarUrl,
      linkedin_url:     data.linkedinUrl,
      social_url:       data.socialUrl,
      extra_url:        data.extraUrl,
      portfolio_images: data.portfolioImages,
      portfolio_videos: data.portfolioVideos,
      is_public:        data.isPublic,
      sort_order:       data.sortOrder,
    }
    if (data.id) {
      const { data: row, error } = await supabase
        .from('teachers').update(payload).eq('id', data.id).select().single()
      if (error) throw error
      return rowToTeacher(row)
    }
    const { data: row, error } = await supabase
      .from('teachers').insert(payload).select().single()
    if (error) throw error
    return rowToTeacher(row)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('teachers').delete().eq('id', id)
    if (error) throw error
  }

  // ── Images ──────────────────────────────────────────────────────────────

  async listImages(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherImage[]> {
    let q = supabase.from('teacher_images').select('*').order('created_at', { ascending: false })
    if (!isSuperAdmin) q = q.in('organization_id', organizationIds)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToImage)
  }

  async saveImage(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<TeacherImage> {
    const { data: row, error } = await supabase
      .from('teacher_images').insert(data).select().single()
    if (error) throw error
    return rowToImage(row)
  }

  async deleteImage(id: string, name: string): Promise<void> {
    await storageService.removeTeacherFile(name)
    const { error } = await supabase.from('teacher_images').delete().eq('id', id)
    if (error) throw error
  }

  // ── Videos ──────────────────────────────────────────────────────────────

  async listVideos(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherVideo[]> {
    let q = supabase.from('teacher_videos').select('*').order('created_at', { ascending: false })
    if (!isSuperAdmin) q = q.in('organization_id', organizationIds)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).map(rowToVideo)
  }

  async saveVideo(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<TeacherVideo> {
    const { data: row, error } = await supabase
      .from('teacher_videos').insert(data).select().single()
    if (error) throw error
    return rowToVideo(row)
  }

  async deleteVideo(id: string, name: string): Promise<void> {
    await storageService.removeTeacherFile(name)
    const { error } = await supabase.from('teacher_videos').delete().eq('id', id)
    if (error) throw error
  }

  // ── Users with profesor role ─────────────────────────────────────────────

  async listUsersWithProfesorRole(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherUserOption[]> {
    let q = supabase
      .from('user_organizations')
      .select('user_id, role, profiles(id, email, display_name)')
      .in('role', ['profesor_todo', 'profesor_simple'])
    if (!isSuperAdmin) q = q.in('organization_id', organizationIds)
    const { data, error } = await q
    if (error) throw error

    const seen = new Set<string>()
    const result: TeacherUserOption[] = []
    for (const row of data ?? []) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      if (!profile || seen.has(profile.id)) continue
      seen.add(profile.id)
      result.push({ id: profile.id, email: profile.email, displayName: profile.display_name ?? null })
    }
    return result
  }
}
