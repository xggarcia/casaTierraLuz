import { useState } from 'react'
import type { Organization } from '../../../domain/entities/Organization'
import { adminRepository } from '../../../infrastructure/db'

interface Props {
  organizations: Organization[]
  onReload: () => Promise<void>
}

export function TabOrganizaciones({ organizations, onReload }: Props) {
  const [newOrgName, setNewOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newOrgName.trim()) return
    setError(null)
    try {
      await adminRepository.createOrganization({ name: newOrgName.trim(), type: 'normal' })
      setNewOrgName('')
      await onReload()
    } catch (e) { setError(e instanceof Error ? e.message : 'Error al crear organización') }
  }

  const handleDelete = async (org: Organization) => {
    if (org.type !== 'normal') { setError('Solo se pueden borrar organizaciones normales'); return }
    if (!window.confirm(`¿Borrar la organización "${org.name}"? Sus cursos quedarán sin propietario.`)) return
    setError(null)
    try { await adminRepository.deleteOrganization(org.id); await onReload() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al borrar') }
  }

  return (
    <div className="admin-users-section">
      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Nombre de la nueva organización"
          value={newOrgName}
          onChange={e => setNewOrgName(e.target.value)}
          className="admin-catalog-search"
        />
        <button
          type="button"
          className="admin-btn-primary"
          onClick={handleCreate}
          disabled={!newOrgName.trim()}
        >
          + Crear organización
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr><th>Nombre</th><th>Tipo</th><th>Creada</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {organizations.map(o => (
            <tr key={o.id}>
              <td>{o.name}</td>
              <td>{o.type}</td>
              <td>{new Date(o.createdAt).toLocaleDateString('es-ES')}</td>
              <td>
                {o.type === 'normal' ? (
                  <button type="button" className="admin-btn-delete" onClick={() => handleDelete(o)}>
                    Borrar
                  </button>
                ) : (
                  <span className="admin-role-self">protegida</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
