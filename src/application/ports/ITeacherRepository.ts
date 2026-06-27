import type { Teacher, TeacherImage, TeacherVideo, TeacherUserOption } from '../../domain/entities/Teacher'

export type TeacherSave = Omit<Teacher, 'id' | 'createdAt'> & { id?: string }

export interface ITeacherRepository {
  listPublic(): Promise<Teacher[]>
  listByScope(organizationIds: string[], isSuperAdmin: boolean): Promise<Teacher[]>
  getBySlug(slug: string): Promise<Teacher | null>
  save(data: TeacherSave): Promise<Teacher>
  delete(id: string): Promise<void>

  listImages(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherImage[]>
  saveImage(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<TeacherImage>
  deleteImage(id: string, name: string): Promise<void>

  listVideos(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherVideo[]>
  saveVideo(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<TeacherVideo>
  deleteVideo(id: string, name: string): Promise<void>

  listUsersWithProfesorRole(organizationIds: string[], isSuperAdmin: boolean): Promise<TeacherUserOption[]>
}
