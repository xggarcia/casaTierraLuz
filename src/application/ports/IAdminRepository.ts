import type { ICourseRepository } from './ICourseRepository'
import type { Course } from '../../domain/entities/Course'
import type { LocalizedText } from '../../domain/entities/Language'
import type { Organization, OrganizationMembership, OrganizationRole, OrganizationType, StaffRole } from '../../domain/entities/Organization'
import type { Page, PageRequest } from '../../domain/entities/Pagination'
import type { InfoRequest } from '../../domain/entities/InfoRequest'

export interface AdminInfoRequest extends InfoRequest {
  courseTitulo: string | null
}

export interface UserFilters {
  search?: string   // filtra por email o display_name
  role?: StaffRole  // filtra por rol en cualquier org
}

export interface UserProfile {
  id: string
  email: string
  display_name: string | null
}

export interface UserWithMemberships extends UserProfile {
  memberships: OrganizationMembership[]
}

export interface Enrollment {
  id: string
  name: string
  surnames: string
  email: string
  phone: string | null
  created_at: string
}

export interface CourseImage {
  id: string
  name: string
  url: string
  tags: string[]
  is_used: boolean
  created_at: string
  organization_id: string
}

export interface CourseVideo {
  id: string
  name: string
  url: string
  tags: string[]
  is_used: boolean
  created_at: string
  organization_id: string
}

export interface AdminScope {
  organizationIds: string[]
  isSuperAdmin: boolean
}

export interface IAdminRepository extends ICourseRepository {
  // Cursos
  getAdminCourses(scope: AdminScope): Promise<Course[]>
  getCourseBySlugForAdmin(slug: string): Promise<Course | undefined>
  saveCourse(data: Partial<Course> & { titulo: LocalizedText }): Promise<Course>
  deleteCourse(id: number): Promise<void>
  moveUp(id: number): Promise<void>
  moveDown(id: number): Promise<void>
  archiveCourse(id: number, archive: boolean): Promise<void>

  // Usuarios + memberships
  listUsersWithMemberships(req: PageRequest, filters?: UserFilters): Promise<Page<UserWithMemberships>>
  addMembership(userId: string, organizationId: string, role: OrganizationRole): Promise<void>
  removeMembership(userId: string, organizationId: string): Promise<void>
  updateMembershipRole(userId: string, organizationId: string, role: OrganizationRole): Promise<void>

  // Enrollments + catálogo
  listEnrollments(courseId: number): Promise<Enrollment[]>
  getEnrollmentCounts(courseIds: number[]): Promise<Map<number, number>>
  listAdminCourseImages(scope: AdminScope): Promise<CourseImage[]>
  saveCourseImage(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<CourseImage>
  updateCourseImage(id: string, data: Pick<CourseImage, 'tags'>): Promise<void>   // is_used lo gestiona el trigger
  deleteCourseImage(id: string, name: string): Promise<void>
  listAdminCourseVideos(scope: AdminScope): Promise<CourseVideo[]>
  saveCourseVideo(data: { name: string; url: string; tags: string[]; organization_id: string }): Promise<CourseVideo>
  updateCourseVideo(id: string, data: Pick<CourseVideo, 'tags'>): Promise<void>
  deleteCourseVideo(id: string, name: string): Promise<void>

  // Organizaciones
  listOrganizations(): Promise<Organization[]>
  createOrganization(data: { name: string; type: OrganizationType }): Promise<Organization>
  deleteOrganization(id: string): Promise<void>

  // Solicitudes de información
  listInfoRequests(scope: AdminScope): Promise<AdminInfoRequest[]>
  markInfoRequestReplied(id: string, repliedBy: string, replyText: string): Promise<void>
  deleteInfoRequest(id: string): Promise<void>
}
