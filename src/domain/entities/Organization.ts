export type OrganizationType = 'admin' | 'user' | 'normal'

export type StaffRole =
  | 'admin_superior'
  | 'admin_minor'
  | 'profesor_todo'
  | 'profesor_simple'
  | 'secretaria'

export type UsuarioRole = 'usuario'

export type OrganizationRole = StaffRole | UsuarioRole

export const STAFF_ROLES: StaffRole[] = [
  'admin_superior',
  'admin_minor',
  'profesor_todo',
  'profesor_simple',
  'secretaria',
]

export interface Organization {
  id: string
  name: string
  type: OrganizationType
  createdAt: string
}

export interface OrganizationMembership {
  organization: Organization
  role: OrganizationRole
}

export function isStaffRole(role: OrganizationRole): role is StaffRole {
  return (STAFF_ROLES as string[]).includes(role)
}

const COURSE_EDIT_ROLES: StaffRole[] = ['admin_superior', 'admin_minor', 'profesor_todo', 'profesor_simple']
const COURSE_DELETE_ROLES: StaffRole[] = ['admin_superior', 'admin_minor', 'profesor_todo']
const ENROLLMENTS_READ_ROLES: StaffRole[] = ['admin_superior', 'admin_minor', 'profesor_todo', 'secretaria']
const MEMBERSHIP_MANAGE_ROLES: StaffRole[] = ['admin_superior', 'admin_minor']

export function canEditCourses(role: OrganizationRole): boolean {
  return (COURSE_EDIT_ROLES as string[]).includes(role)
}

export function canDeleteCourses(role: OrganizationRole): boolean {
  return (COURSE_DELETE_ROLES as string[]).includes(role)
}

export function canSeeEnrollments(role: OrganizationRole): boolean {
  return (ENROLLMENTS_READ_ROLES as string[]).includes(role)
}

export function canManageMemberships(role: OrganizationRole): boolean {
  return (MEMBERSHIP_MANAGE_ROLES as string[]).includes(role)
}

// Qué roles puede ASIGNAR alguien con `myRole`:
//   admin_superior → cualquier StaffRole
//   admin_minor    → cualquier StaffRole salvo admin_superior
//   resto          → ninguno
export function assignableRolesBy(myRole: OrganizationRole): StaffRole[] {
  if (myRole === 'admin_superior') return [...STAFF_ROLES]
  if (myRole === 'admin_minor')    return STAFF_ROLES.filter(r => r !== 'admin_superior')
  return []
}
