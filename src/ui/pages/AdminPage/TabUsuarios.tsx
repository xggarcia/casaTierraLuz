import { useEffect, useState } from 'react'
import type { Organization, OrganizationMembership, OrganizationRole, StaffRole } from '../../../domain/entities/Organization'
import { STAFF_ROLES } from '../../../domain/entities/Organization'
import type { UserWithMemberships } from '../../../application/ports/IAdminRepository'
import { DEFAULT_PAGE_SIZE, totalPages } from '../../../domain/entities/Pagination'
import { adminRepository } from '../../../infrastructure/db'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_DRAFT_ROLE } from './formHelpers'

interface Props {
  organizations: Organization[]
}

export function TabUsuarios({ organizations }: Props) {
  const {
    user, isSuperAdmin, roleInOrg,
    canManageMembershipsInOrg, assignableRolesInOrg,
  } = useAuth()

  const [users, setUsers] = useState<UserWithMemberships[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [membershipDraft, setMembershipDraft] = useState<Record<string, { orgId: string; role: StaffRole }>>({})
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('')

  const pageSize = DEFAULT_PAGE_SIZE
  const numPages = totalPages(total, pageSize)

  const loadUsers = async (p: number, s: string, r: StaffRole | '') => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminRepository.listUsersWithMemberships(
        { page: p, pageSize },
        {
          search: s.trim() || undefined,
          role: r || undefined,
        }
      )
      setUsers(result.rows)
      setTotal(result.total)
      setPage(result.page)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers(page, search, roleFilter) }, [page, search, roleFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleRoleFilter = (value: StaffRole | '') => {
    setRoleFilter(value)
    setPage(1)
  }

  const canEditMembershipChip = (m: OrganizationMembership): boolean => {
    if (m.organization.type === 'user') return false
    if (isSuperAdmin) return true
    const myRole = roleInOrg(m.organization.id)
    if (myRole === 'admin_superior') return true
    if (myRole === 'admin_minor' && m.role !== 'admin_superior' && m.role !== 'admin_minor') return true
    return false
  }

  const handleAddMembership = async (userId: string) => {
    const draft = membershipDraft[userId]
    if (!draft?.orgId) return
    setError(null)
    try {
      await adminRepository.addMembership(userId, draft.orgId, draft.role)
      setMembershipDraft(d => ({ ...d, [userId]: { orgId: '', role: DEFAULT_DRAFT_ROLE } }))
      setExpandedUserId(null)
      await loadUsers(page, search, roleFilter)
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al añadir membership') }
  }

  const handleRemoveMembership = async (userId: string, organizationId: string) => {
    if (!window.confirm('¿Quitar a este usuario de la organización?')) return
    setError(null)
    try { await adminRepository.removeMembership(userId, organizationId); await loadUsers(page, search, roleFilter) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al quitar membership') }
  }

  const handleUpdateRole = async (userId: string, organizationId: string, role: OrganizationRole) => {
    setError(null)
    try { await adminRepository.updateMembershipRole(userId, organizationId, role); await loadUsers(page, search, roleFilter) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cambiar role') }
  }

  return (
    <div className="admin-users-section">
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-users-toolbar">
        <input
          type="text"
          className="admin-catalog-search"
          placeholder="Buscar por email o nombre…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        <select
          className="admin-catalog-used-filter"
          value={roleFilter}
          onChange={e => handleRoleFilter(e.target.value as StaffRole | '')}
        >
          <option value="">Todos los roles</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="admin-images-loading">Cargando usuarios…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-col-email">Email</th>
                <th className="admin-col-name">Nombre</th>
                <th className="admin-col-orgs">Organizaciones</th>
                <th className="admin-col-add">Añadir Org.</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const draft = membershipDraft[u.id] ?? { orgId: '', role: DEFAULT_DRAFT_ROLE }
                const userOrgIds = new Set(u.memberships.map(m => m.organization.id))
                const visibleMemberships = u.memberships.filter(m => m.organization.type !== 'user')
                const orgsICanAddTo = organizations.filter(o =>
                  o.type !== 'user' &&
                  !userOrgIds.has(o.id) &&
                  canManageMembershipsInOrg(o.id)
                )
                const draftRoleOptions: StaffRole[] = draft.orgId ? assignableRolesInOrg(draft.orgId) : []

                return (
                  <tr key={u.id}>
                    <td className="admin-col-email" title={u.email}>{u.email}</td>
                    <td className="admin-col-name">
                      {u.display_name ?? '—'}
                      {u.id === user?.id && <span className="admin-role-self"> (tú)</span>}
                    </td>
                    <td className="admin-col-orgs">
                      <div className="admin-membership-chips">
                        {visibleMemberships.length === 0 && <span className="admin-role-self">sin orgs</span>}
                        {visibleMemberships.map(m => {
                          const editable = canEditMembershipChip(m)
                          const roleOptions = editable ? assignableRolesInOrg(m.organization.id) : []
                          return (
                            <span key={m.organization.id} className="admin-membership-chip">
                              {m.organization.name}
                              {editable ? (
                                <select
                                  value={m.role}
                                  onChange={e => handleUpdateRole(u.id, m.organization.id, e.target.value as OrganizationRole)}
                                  className="admin-membership-role"
                                >
                                  {!(roleOptions as string[]).includes(m.role) && (
                                    <option value={m.role} disabled>{m.role}</option>
                                  )}
                                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              ) : (
                                <span className="admin-membership-role">{m.role}</span>
                              )}
                              {editable && (
                                <button
                                  type="button"
                                  className="admin-membership-remove"
                                  onClick={() => handleRemoveMembership(u.id, m.organization.id)}
                                  aria-label="Quitar"
                                >✕</button>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="admin-col-add">
                      {orgsICanAddTo.length === 0 ? (
                        <span className="admin-role-self">—</span>
                      ) : expandedUserId === u.id ? (
                        <div className="admin-membership-add">
                          <select
                            value={draft.orgId}
                            onChange={e => {
                              const orgId = e.target.value
                              const assignable = orgId ? assignableRolesInOrg(orgId) : []
                              const role: StaffRole = assignable.includes(draft.role)
                                ? draft.role
                                : (assignable[0] ?? DEFAULT_DRAFT_ROLE)
                              setMembershipDraft(d => ({ ...d, [u.id]: { orgId, role } }))
                            }}
                            className="admin-themed-select admin-add-org"
                          >
                            <option value="">— Org —</option>
                            {orgsICanAddTo.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                          <select
                            value={draft.role}
                            disabled={!draft.orgId || draftRoleOptions.length === 0}
                            onChange={e => setMembershipDraft(d => ({
                              ...d, [u.id]: { orgId: draft.orgId, role: e.target.value as StaffRole },
                            }))}
                            className="admin-themed-select admin-add-role"
                          >
                            {draftRoleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button
                            type="button"
                            className="admin-btn-primary admin-add-btn"
                            disabled={!draft.orgId || draftRoleOptions.length === 0}
                            onClick={() => handleAddMembership(u.id)}
                          >✓</button>
                          <button
                            type="button"
                            className="admin-membership-remove"
                            onClick={() => {
                              setExpandedUserId(null)
                              setMembershipDraft(d => ({ ...d, [u.id]: { orgId: '', role: DEFAULT_DRAFT_ROLE } }))
                            }}
                            aria-label="Cancelar"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn-add-expand"
                          onClick={() => {
                            setExpandedUserId(u.id)
                            setMembershipDraft(d => ({ ...d, [u.id]: { orgId: '', role: DEFAULT_DRAFT_ROLE } }))
                          }}
                          aria-label="Añadir organización"
                        >+</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    {search || roleFilter ? 'Sin resultados para este filtro.' : 'No hay usuarios.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >◀</button>
            <span className="admin-pagination-label">
              Página {page} de {numPages} · {total} usuarios
            </span>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={page >= numPages}
              onClick={() => setPage(p => Math.min(numPages, p + 1))}
            >▶</button>
          </div>
        </>
      )}
    </div>
  )
}
