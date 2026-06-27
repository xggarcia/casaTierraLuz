import { supabase } from './client'

const BUCKET = 'courses_images'
const VIDEO_BUCKET = 'course_videos'
const TEACHER_BUCKET = 'teacher_media'
const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
const VIDEO_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${VIDEO_BUCKET}`
const TEACHER_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${TEACHER_BUCKET}`

export type StorageImage = { name: string; url: string }
export type StorageVideo = { name: string; url: string }

export const storageService = {
  async list(): Promise<StorageImage[]> {
    const { data, error } = await supabase.storage.from(BUCKET).list('', { sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    return (data ?? [])
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => ({ name: f.name, url: `${BASE_URL}/${f.name}` }))
  },

  // Sube al prefijo {organizationId}/ — el storage policy enforza que coincida con auth_org_id()
  async upload(file: File, organizationId: string): Promise<StorageImage> {
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, '_')
    const name = `${organizationId}/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from(BUCKET).upload(name, file, { upsert: false })
    if (error) throw error
    return { name, url: `${BASE_URL}/${name}` }
  },

  async remove(name: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([name])
    if (error) throw error
  },

  async uploadVideo(file: File, organizationId: string): Promise<StorageVideo> {
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, '_')
    const name = `${organizationId}/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(name, file, { upsert: false })
    if (error) throw error
    return { name, url: `${VIDEO_BASE_URL}/${name}` }
  },

  async removeVideo(name: string): Promise<void> {
    const { error } = await supabase.storage.from(VIDEO_BUCKET).remove([name])
    if (error) throw error
  },

  async uploadTeacherFile(file: File, organizationId: string): Promise<StorageImage> {
    const safe = file.name.replace(/[^a-z0-9.\-_]/gi, '_')
    const name = `${organizationId}/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from(TEACHER_BUCKET).upload(name, file, { upsert: false })
    if (error) throw error
    return { name, url: `${TEACHER_BASE_URL}/${name}` }
  },

  async removeTeacherFile(name: string): Promise<void> {
    const { error } = await supabase.storage.from(TEACHER_BUCKET).remove([name])
    if (error) throw error
  },
}
