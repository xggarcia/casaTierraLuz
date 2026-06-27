import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Organization } from '../../../domain/entities/Organization'
import { adminRepository } from '../../../infrastructure/db'
import { useAuth } from '../../contexts/AuthContext'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'
import { TabCursos } from './TabCursos'
import { TabCatalogo } from './TabCatalogo'
import { TabUsuarios } from './TabUsuarios'
import { TabOrganizaciones } from './TabOrganizaciones'
import { TabSolicitudes } from './TabSolicitudes'
import { TabProfesores } from './TabProfesores'

type Tab = 'cursos' | 'catalogo' | 'usuarios' | 'organizaciones' | 'solicitudes' | 'profesores'

export function AdminPage() {
  const navigate = useNavigate()
  const {
    memberships, organizationIds, isSuperAdmin,
    isAnyOrgMembershipManager, isAnyOrgStaff, canEditCoursesInOrg,
  } = useAuth()

  const [tab, setTab] = useState<Tab>('cursos')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgError, setOrgError] = useState<string | null>(null)

  const loadOrganizations = async () => {
    setOrgError(null)
    try { setOrganizations(await adminRepository.listOrganizations()) }
    catch (e) { setOrgError(e instanceof Error ? e.message : 'Error al cargar organizaciones') }
  }

  useEffect(() => { loadOrganizations() }, [])

  const scope = useMemo(() => ({ organizationIds, isSuperAdmin }), [organizationIds, isSuperAdmin])

  const writableOrgs = useMemo(() => {
    if (isSuperAdmin) return null
    return memberships
      .filter(m => m.organization.type !== 'user' && canEditCoursesInOrg(m.organization.id))
      .map(m => m.organization)
  }, [memberships, isSuperAdmin, canEditCoursesInOrg])

  const effectiveWritableOrgs: Organization[] = writableOrgs ?? organizations
  const orgNameById = useMemo(() => new Map(organizations.map(o => [o.id, o.name])), [organizations])
  const showOrgColumn = isSuperAdmin || memberships.length > 1
  const canCreateCourses = effectiveWritableOrgs.length > 0

  return (
    <div className="admin-page">
      <div className="admin-topbar">
        <button type="button" className="admin-logo-btn" onClick={() => navigate('/')} aria-label="Ir a la web">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Gestmusic" className="admin-logo-img" />
        </button>
        <span className="admin-brand">ADMIN</span>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'cursos'    ? 'active' : ''} onClick={() => setTab('cursos')}>Cursos</button>
        <button className={tab === 'catalogo'  ? 'active' : ''} onClick={() => setTab('catalogo')}>Catálogo</button>
        {(isSuperAdmin || isAnyOrgMembershipManager) && (
          <button className={tab === 'usuarios' ? 'active' : ''} onClick={() => setTab('usuarios')}>Usuarios</button>
        )}
        {isSuperAdmin && (
          <button className={tab === 'organizaciones' ? 'active' : ''} onClick={() => setTab('organizaciones')}>Organizaciones</button>
        )}
        {(isSuperAdmin || isAnyOrgStaff) && (
          <button className={tab === 'solicitudes' ? 'active' : ''} onClick={() => setTab('solicitudes')}>Solicitudes</button>
        )}
        {(isSuperAdmin || isAnyOrgMembershipManager) && (
          <button className={tab === 'profesores' ? 'active' : ''} onClick={() => setTab('profesores')}>Profesores</button>
        )}
      </div>

      {orgError && <div className="admin-error">{orgError}</div>}

      {tab === 'cursos' && (
        <TabCursos
          organizations={organizations}
          orgNameById={orgNameById}
          effectiveWritableOrgs={effectiveWritableOrgs}
          showOrgColumn={showOrgColumn}
          canCreateCourses={canCreateCourses}
          scope={scope}
        />
      )}

      {tab === 'catalogo' && (
        <TabCatalogo
          orgNameById={orgNameById}
          effectiveWritableOrgs={effectiveWritableOrgs}
          showOrgColumn={showOrgColumn}
          scope={scope}
        />
      )}

      {tab === 'usuarios' && (isSuperAdmin || isAnyOrgMembershipManager) && (
        <TabUsuarios organizations={organizations} />
      )}

      {tab === 'organizaciones' && isSuperAdmin && (
        <TabOrganizaciones organizations={organizations} onReload={loadOrganizations} />
      )}

      {tab === 'solicitudes' && (isSuperAdmin || isAnyOrgStaff) && (
        <TabSolicitudes scope={scope} />
      )}

      {tab === 'profesores' && (isSuperAdmin || isAnyOrgMembershipManager) && (
        <TabProfesores scope={scope} effectiveWritableOrgs={effectiveWritableOrgs} />
      )}
    </div>
  )
}
