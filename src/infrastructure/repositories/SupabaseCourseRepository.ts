import { supabase } from '../supabase/client'
import { storageService } from '../supabase/storageService'
import type { IAdminRepository, UserWithMemberships, Enrollment, CourseImage, CourseVideo, AdminScope, UserFilters, AdminInfoRequest } from '../../application/ports/IAdminRepository'
import type { Course, Category, UnrealArticle } from '../../domain/entities/Course'
import type { LocalizedText } from '../../domain/entities/Language'
import type { Organization, OrganizationRole, OrganizationType } from '../../domain/entities/Organization'
import type { Page, PageRequest } from '../../domain/entities/Pagination'

// URLs de imagen y vídeo vienen via JOIN
const COURSE_SELECT = '*, course_images!image_id(url), hero_video:course_videos!hero_video_id(url), trailer_video:course_videos!trailer_video_id(url)' as const

type DbCourse = {
  id: number
  slug: string
  title: { ca: string; es: string; en: string }
  description: { ca: string; es: string; en: string }
  extended_description: { ca: string; es: string; en: string }
  type_label: { ca: string; es: string; en: string }
  tags: string[]
  hours: number | null
  start_date: string | null
  end_date: string | null
  image_id: string | null
  course_images: { url: string } | null
  hero_video_id: string | null
  hero_video: { url: string } | null
  trailer_video_id: string | null
  trailer_video: { url: string } | null
  trailer_youtube_url: string | null
  featured: boolean
  price: number | null
  instructor: string | null
  order: number
  certification: string | null
  organization_id: string
  is_public: boolean
  is_archived: boolean
}

type DbOrganization = {
  id: string
  name: string
  type: OrganizationType
  created_at: string
}

function mapCourse(row: DbCourse): Course {
  return {
    id:                   row.id,
    slug:                 row.slug,
    titulo:               row.title,
    descripcion:          row.description,
    descripcionExtendida: row.extended_description,
    tipoEtiqueta:         row.type_label,
    tags:                 row.tags ?? [],
    horas:                row.hours ?? undefined,
    fechaInicio:          (row.start_date || undefined) as Course['fechaInicio'],
    fechaFin:             (row.end_date || undefined) as Course['fechaFin'],
    linkImagen:           row.course_images?.url ?? '',
    imageId:              row.image_id ?? undefined,
    featured:             row.featured ?? false,
    precio:               row.price != null ? String(row.price) : '',
    instructor:           row.instructor ?? '',
    orden:                row.order ?? 0,
    certification:        (row.certification as Course['certification']) ?? undefined,
    organizationId:       row.organization_id,
    isPublic:             row.is_public ?? false,
    isArchived:           row.is_archived ?? false,
    heroVideoId:          row.hero_video_id ?? undefined,
    heroVideoUrl:         row.hero_video?.url ?? undefined,
    trailerVideoId:       row.trailer_video_id ?? undefined,
    trailerVideoUrl:      row.trailer_video?.url ?? undefined,
    trailerYoutubeUrl:    row.trailer_youtube_url ?? undefined,
  }
}

function mapOrganization(row: DbOrganization): Organization {
  return {
    id:        row.id,
    name:      row.name,
    type:      row.type,
    createdAt: row.created_at,
  }
}

function courseToDbRow(data: Partial<Course> & { titulo: LocalizedText }, order?: number) {
  return {
    slug:                 data.slug ?? '',
    title:                data.titulo,
    description:          data.descripcion          ?? { ca: '', es: '', en: '' },
    extended_description: data.descripcionExtendida ?? { ca: '', es: '', en: '' },
    type_label:           data.tipoEtiqueta          ?? { ca: '', es: '', en: '' },
    tags:                 data.tags ?? [],
    hours:                data.horas ?? null,
    start_date:           data.fechaInicio || null,
    end_date:             data.fechaFin || null,
    image_id:             data.imageId ?? null,
    hero_video_id:        data.heroVideoId ?? null,
    trailer_video_id:     data.trailerVideoId ?? null,
    trailer_youtube_url:  data.trailerYoutubeUrl ?? null,
    featured:             data.featured ?? false,
    price:                data.precio ? (parseFloat(data.precio) || null) : null,
    instructor:           data.instructor || null,
    certification:        data.certification ?? null,
    is_public:            data.isPublic ?? false,
    is_archived:          data.isArchived ?? false,
    ...(data.organizationId ? { organization_id: data.organizationId } : {}),
    ...(order !== undefined ? { order } : {}),
  }
}

export class SupabaseCourseRepository implements IAdminRepository {
  // ── Reads públicas ─────────────────────────────────────────────────────────

  async getAll(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getAllPublic(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('is_public', true)
      .eq('is_archived', false)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getAllPublicCatalog(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('is_public', true)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getFeatured(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('featured', true)
      .eq('is_public', true)
      .eq('is_archived', false)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getByCategory(category: Category): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .contains('tags', [category])
      .eq('is_public', true)
      .eq('is_archived', false)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getBySlug(slug: string): Promise<Course | undefined> {
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('slug', slug)
      .eq('is_public', true)
      .limit(1)
      .maybeSingle()
    if (error) return undefined
    return data ? mapCourse(data as DbCourse) : undefined
  }

  async getUnrealArticle(_category: Category): Promise<UnrealArticle | undefined> {
    return undefined
  }

  // ── Reads de admin (scope estricto) ────────────────────────────────────────

  async getAdminCourses(scope: AdminScope): Promise<Course[]> {
    if (scope.isSuperAdmin) return this.getAll()
    if (scope.organizationIds.length === 0) return []
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .in('organization_id', scope.organizationIds)
      .order('order', { ascending: true })
    if (error) throw error
    return (data as DbCourse[]).map(mapCourse)
  }

  async getCourseBySlugForAdmin(slug: string): Promise<Course | undefined> {
    // No filtra is_public — la RLS ya restringe a cursos visibles para el admin.
    const { data, error } = await supabase
      .from('courses')
      .select(COURSE_SELECT)
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (error) return undefined
    return data ? mapCourse(data as DbCourse) : undefined
  }

  async listAdminCourseImages(scope: AdminScope): Promise<CourseImage[]> {
    let query = supabase
      .from('course_images')
      .select('*')
      .order('created_at', { ascending: false })
    if (!scope.isSuperAdmin) {
      if (scope.organizationIds.length === 0) return []
      query = query.in('organization_id', scope.organizationIds)
    }
    const { data, error } = await query
    if (error) throw error
    return data as CourseImage[]
  }

  // ── Writes cursos ──────────────────────────────────────────────────────────

  async saveCourse(data: Partial<Course> & { titulo: LocalizedText }): Promise<Course> {
    if (data.id !== undefined) {
      const { data: updated, error } = await supabase
        .from('courses')
        .update(courseToDbRow(data))
        .eq('id', data.id)
        .select(COURSE_SELECT)
        .single()
      if (error) throw error
      return mapCourse(updated as DbCourse)
    }

    const { data: existing } = await supabase
      .from('courses')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .single()
    const nextOrder = existing ? (existing as { order: number }).order + 1 : 1

    const { data: inserted, error } = await supabase
      .from('courses')
      .insert(courseToDbRow(data, nextOrder))
      .select(COURSE_SELECT)
      .single()
    if (error) throw error
    return mapCourse(inserted as DbCourse)
  }

  async deleteCourse(id: number): Promise<void> {
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) throw error
  }

  async moveUp(id: number): Promise<void> {
    const courses = await this.getAll()
    const idx = courses.findIndex(c => c.id === id)
    if (idx <= 0) return
    const a = courses[idx]
    const b = courses[idx - 1]
    await Promise.all([
      supabase.from('courses').update({ order: b.orden }).eq('id', a.id),
      supabase.from('courses').update({ order: a.orden }).eq('id', b.id),
    ])
  }

  async archiveCourse(id: number, archive: boolean): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .update({ is_archived: archive })
      .eq('id', id)
    if (error) throw error
  }

  async moveDown(id: number): Promise<void> {
    const courses = await this.getAll()
    const idx = courses.findIndex(c => c.id === id)
    if (idx < 0 || idx >= courses.length - 1) return
    const a = courses[idx]
    const b = courses[idx + 1]
    await Promise.all([
      supabase.from('courses').update({ order: b.orden }).eq('id', a.id),
      supabase.from('courses').update({ order: a.orden }).eq('id', b.id),
    ])
  }

  // ── Usuarios + memberships ────────────────────────────────────────────────

  async listUsersWithMemberships(req: PageRequest, filters?: UserFilters): Promise<Page<UserWithMemberships>> {
    const page     = Math.max(1, Math.floor(req.page))
    const pageSize = Math.max(1, Math.floor(req.pageSize))
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1

    // Filtro por rol: obtener IDs de usuarios que tienen ese rol en alguna org
    let allowedIds: string[] | null = null
    if (filters?.role) {
      const { data: roleRows } = await supabase
        .from('user_organizations')
        .select('user_id')
        .eq('role', filters.role)
      allowedIds = (roleRows ?? []).map((r: { user_id: string }) => r.user_id)
      if (allowedIds.length === 0) return { rows: [], total: 0, page, pageSize }
    }

    let profilesQuery = supabase
      .from('profiles')
      .select('id, email, display_name', { count: 'exact' })
      .order('email')

    if (filters?.search?.trim()) {
      const s = filters.search.trim()
      profilesQuery = profilesQuery.or(`email.ilike.%${s}%,display_name.ilike.%${s}%`)
    }

    if (allowedIds !== null) {
      profilesQuery = profilesQuery.in('id', allowedIds)
    }

    const profilesRes = await profilesQuery.range(from, to)
    if (profilesRes.error) throw profilesRes.error

    type ProfileRow = { id: string; email: string; display_name: string | null }
    const profiles = (profilesRes.data ?? []) as ProfileRow[]
    const ids = profiles.map(p => p.id)

    type MembershipRow = {
      user_id: string
      role: OrganizationRole
      organizations: DbOrganization | DbOrganization[] | null
    }
    let memberships: MembershipRow[] = []
    if (ids.length > 0) {
      const membershipsRes = await supabase
        .from('user_organizations')
        .select('user_id, role, organizations(id, name, type, created_at)')
        .in('user_id', ids)
      if (membershipsRes.error) throw membershipsRes.error
      memberships = (membershipsRes.data ?? []) as MembershipRow[]
    }

    const byUser = new Map<string, { role: OrganizationRole; organization: Organization }[]>()
    for (const m of memberships) {
      const orgRaw = m.organizations
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
      if (!org) continue
      const arr = byUser.get(m.user_id) ?? []
      arr.push({ role: m.role, organization: mapOrganization(org) })
      byUser.set(m.user_id, arr)
    }

    return {
      rows: profiles.map(p => ({
        id: p.id,
        email: p.email,
        display_name: p.display_name,
        memberships: byUser.get(p.id) ?? [],
      })),
      total: profilesRes.count ?? profiles.length,
      page,
      pageSize,
    }
  }

  async addMembership(userId: string, organizationId: string, role: OrganizationRole): Promise<void> {
    const { error } = await supabase
      .from('user_organizations')
      .insert({ user_id: userId, organization_id: organizationId, role })
    if (error) throw error
  }

  async removeMembership(userId: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_organizations')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
    if (error) throw error
  }

  async updateMembershipRole(userId: string, organizationId: string, role: OrganizationRole): Promise<void> {
    const { error } = await supabase
      .from('user_organizations')
      .update({ role })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
    if (error) throw error
  }

  // ── Enrollments + catálogo ────────────────────────────────────────────────

  async listEnrollments(courseId: number): Promise<Enrollment[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, name, surnames, email, phone, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Enrollment[]
  }

  async getEnrollmentCounts(courseIds: number[]): Promise<Map<number, number>> {
    if (courseIds.length === 0) return new Map()
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseIds)
    if (error) throw error
    const counts = new Map<number, number>()
    for (const row of data as { course_id: number }[]) {
      counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1)
    }
    return counts
  }

  async saveCourseImage(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<CourseImage> {
    const { data: row, error } = await supabase
      .from('course_images')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return row as CourseImage
  }

  async updateCourseImage(id: string, data: Pick<CourseImage, 'tags'>): Promise<void> {
    const { error } = await supabase
      .from('course_images')
      .update(data)
      .eq('id', id)
    if (error) throw error
  }

  async deleteCourseImage(id: string, name: string): Promise<void> {
    await storageService.remove(name)
    const { error } = await supabase
      .from('course_images')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  // ── Course videos ─────────────────────────────────────────────────────────

  async listAdminCourseVideos(scope: AdminScope): Promise<CourseVideo[]> {
    let query = supabase.from('course_videos').select('*').order('created_at', { ascending: false })
    if (!scope.isSuperAdmin) {
      if (scope.organizationIds.length === 0) return []
      query = query.in('organization_id', scope.organizationIds)
    }
    const { data, error } = await query
    if (error) throw error
    return data as CourseVideo[]
  }

  async saveCourseVideo(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<CourseVideo> {
    const { data: row, error } = await supabase
      .from('course_videos')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return row as CourseVideo
  }

  async updateCourseVideo(id: string, data: Pick<CourseVideo, 'tags'>): Promise<void> {
    const { error } = await supabase
      .from('course_videos')
      .update(data)
      .eq('id', id)
    if (error) throw error
  }

  async deleteCourseVideo(id: string, name: string): Promise<void> {
    await storageService.removeVideo(name)
    const { error } = await supabase
      .from('course_videos')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  // ── Organizations ─────────────────────────────────────────────────────────

  async listOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return (data as DbOrganization[]).map(mapOrganization)
  }

  async createOrganization(data: { name: string; type: OrganizationType }): Promise<Organization> {
    const { data: row, error } = await supabase
      .from('organizations')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return mapOrganization(row as DbOrganization)
  }

  async deleteOrganization(id: string): Promise<void> {
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) throw error
  }

  // ── Solicitudes de información ────────────────────────────────────────────

  async listInfoRequests(scope: AdminScope): Promise<AdminInfoRequest[]> {
    let courseIds: number[] | null = null

    if (!scope.isSuperAdmin) {
      if (scope.organizationIds.length === 0) return []
      const { data: courseData } = await supabase
        .from('courses')
        .select('id')
        .in('organization_id', scope.organizationIds)
      courseIds = (courseData ?? []).map((c: { id: number }) => c.id)
      if (courseIds.length === 0) return []
    }

    let query = supabase
      .from('information_requests')
      .select('*, courses!course_id(slug, title)')
      .order('created_at', { ascending: false })

    if (courseIds !== null) {
      query = query.in('course_id', courseIds)
    }

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: {
      id: string; course_id: number; user_id: string | null
      name: string; surnames: string; email: string
      phone: string | null; observaciones: string | null; created_at: string
      replied_at: string | null; replied_by: string | null; reply_text: string | null
      courses: { slug: string; title: { es?: string } } | null
    }) => ({
      id:            row.id,
      courseId:      row.course_id,
      userId:        row.user_id,
      name:          row.name,
      surnames:      row.surnames,
      email:         row.email,
      phone:         row.phone,
      observaciones: row.observaciones,
      createdAt:     row.created_at,
      repliedAt:     row.replied_at,
      repliedBy:     row.replied_by,
      replyText:     row.reply_text,
      courseTitulo:  row.courses?.title?.es ?? null,
    }))
  }

  async deleteInfoRequest(id: string): Promise<void> {
    const { error } = await supabase.from('information_requests').delete().eq('id', id)
    if (error) throw error
  }

  async markInfoRequestReplied(id: string, repliedBy: string, replyText: string): Promise<void> {
    const { error } = await supabase
      .from('information_requests')
      .update({ replied_at: new Date().toISOString(), replied_by: repliedBy, reply_text: replyText })
      .eq('id', id)
    if (error) throw error
  }
}
