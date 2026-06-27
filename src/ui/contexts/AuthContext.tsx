import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../infrastructure/supabase/client'
import type { OrganizationMembership, OrganizationRole, OrganizationType, StaffRole } from '../../domain/entities/Organization'
import {
  isStaffRole,
  canEditCourses,
  canDeleteCourses,
  canSeeEnrollments,
  canManageMemberships,
  assignableRolesBy,
} from '../../domain/entities/Organization'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  memberships: OrganizationMembership[]
  organizationIds: string[]
  isSuperAdmin: boolean              // miembro de la org con type='admin'
  isAnyOrgStaff: boolean             // tiene cualquier StaffRole en alguna org (no USUARIO) → puede entrar a /admin
  isAnyOrgMembershipManager: boolean // admin_minor/admin_superior en alguna org → puede ver tab Usuarios
  roleInOrg: (organizationId: string) => OrganizationRole | null
  canEditCoursesInOrg: (organizationId: string) => boolean
  canDeleteCoursesInOrg: (organizationId: string) => boolean
  canSeeEnrollmentsInOrg: (organizationId: string) => boolean
  canManageMembershipsInOrg: (organizationId: string) => boolean
  assignableRolesInOrg: (organizationId: string) => StaffRole[]
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchMemberships(userId: string): Promise<OrganizationMembership[]> {
  try {
    const { data, error } = await supabase
      .from('user_organizations')
      .select('role, organizations(id, name, type, created_at)')
      .eq('user_id', userId)
    if (error || !data) return []
    type Row = {
      role: OrganizationRole
      organizations: {
        id: string
        name: string
        type: OrganizationType
        created_at: string
      } | { id: string; name: string; type: OrganizationType; created_at: string }[] | null
    }
    return (data as Row[]).flatMap(r => {
      const orgRaw = r.organizations
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
      if (!org) return []
      return [{
        role: r.role,
        organization: {
          id: org.id,
          name: org.name,
          type: org.type,
          createdAt: org.created_at,
        },
      }]
    })
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        // setTimeout para salir del lock interno de supabase-auth: llamar a
        // supabase.from() dentro del callback provoca un deadlock al recargar.
        setTimeout(async () => {
          setMemberships(await fetchMemberships(currentUser.id))
          setLoading(false)
        }, 0)
      } else {
        setMemberships([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const organizationIds = memberships.map(m => m.organization.id)
  const isSuperAdmin    = memberships.some(m => m.organization.type === 'admin')
  const isAnyOrgStaff   = memberships.some(m =>
    m.organization.type !== 'user' && isStaffRole(m.role)
  )
  const isAnyOrgMembershipManager = memberships.some(m =>
    m.organization.type !== 'user' && canManageMemberships(m.role)
  )
  const roleInOrg = (orgId: string): OrganizationRole | null =>
    memberships.find(m => m.organization.id === orgId)?.role ?? null

  const checkInOrg = (orgId: string, check: (r: OrganizationRole) => boolean): boolean => {
    if (isSuperAdmin) return true
    const role = roleInOrg(orgId)
    return role !== null && check(role)
  }
  const canEditCoursesInOrg       = (orgId: string) => checkInOrg(orgId, canEditCourses)
  const canDeleteCoursesInOrg     = (orgId: string) => checkInOrg(orgId, canDeleteCourses)
  const canSeeEnrollmentsInOrg    = (orgId: string) => checkInOrg(orgId, canSeeEnrollments)
  const canManageMembershipsInOrg = (orgId: string) => checkInOrg(orgId, canManageMemberships)
  const assignableRolesInOrg = (orgId: string): StaffRole[] => {
    if (isSuperAdmin) return assignableRolesBy('admin_superior')
    const role = roleInOrg(orgId)
    return role ? assignableRolesBy(role) : []
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    return { error: signInError?.message ?? null }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const updateDisplayName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { display_name: name } })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    setUser(null)
    setSession(null)
    setMemberships([])
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      memberships, organizationIds,
      isSuperAdmin, isAnyOrgStaff, isAnyOrgMembershipManager,
      roleInOrg,
      canEditCoursesInOrg, canDeleteCoursesInOrg,
      canSeeEnrollmentsInOrg, canManageMembershipsInOrg,
      assignableRolesInOrg,
      signIn, signUp, signInWithGoogle, updateDisplayName, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
