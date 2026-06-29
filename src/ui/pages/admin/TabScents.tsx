import { useEffect, useState } from 'react'
import { scentRepository } from '../../../infrastructure/repositories/SupabaseScentRepository'
import type { Scent } from '../../../domain/entities/Product'
import { t } from '../../../domain/entities/Product'
import { es as i18n } from '../../../i18n/es'

export function TabScents() {
  const [scents, setScents] = useState<Scent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadScents = () => {
    setLoading(true)
    setError(null)
    scentRepository.getAllForAdmin()
      .then(setScents)
      .catch(() => setError(i18n.error))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadScents() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreateError(null)
    setCreating(true)
    try {
      const description = newDescription.trim() ? { es: newDescription.trim() } : null
      await scentRepository.create({ name: { es: name }, description })
      setNewName('')
      setNewDescription('')
      loadScents()
    } catch {
      setCreateError(i18n.admin.saveError)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (s: Scent) => {
    try {
      await scentRepository.setActive(s.id, !s.isActive)
      loadScents()
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  const handleDelete = async (s: Scent) => {
    if (!window.confirm(i18n.admin.confirmDelete)) return
    try {
      await scentRepository.remove(s.id)
      loadScents()
    } catch {
      setError(i18n.admin.deleteError)
    }
  }

  return (
    <div>
      <div className="adm-create-card">
        <p className="adm-create-card__title">{i18n.admin.scentNew}</p>
        {createError && <div className="adm-alert adm-alert--error">{createError}</div>}
        <form onSubmit={handleCreate} className="adm-form">
          <div className="adm-field">
            <label className="adm-label" htmlFor="scent-name">{i18n.admin.fieldName}</label>
            <input
              id="scent-name"
              type="text"
              className="adm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="scent-description">{i18n.admin.fieldDescription}</label>
            <textarea
              id="scent-description"
              className="adm-textarea"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
            />
          </div>
          <div className="adm-form-footer">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>
              {creating ? i18n.admin.saving : i18n.admin.create}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="adm-alert adm-alert--error">{error}</div>}

      <div className="adm-section-header">
        <h2 className="adm-section-title">{i18n.admin.tabScents}</h2>
      </div>

      {loading ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{i18n.admin.colId}</th>
                <th>{i18n.admin.colName}</th>
                <th>{i18n.admin.colDescription}</th>
                <th>{i18n.admin.colActive}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={i} className="adm-sk-row">
                  <td><div className="adm-sk-cell" style={{ width: '2rem' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '50%' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '50%' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '4rem' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '6rem' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : scents.length === 0 ? (
        <p className="adm-empty">{i18n.admin.emptyList}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{i18n.admin.colId}</th>
                <th>{i18n.admin.colName}</th>
                <th>{i18n.admin.colDescription}</th>
                <th>{i18n.admin.colActive}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scents.map(s => (
                <tr key={s.id}>
                  <td className="adm-table__id">{s.id}</td>
                  <td>{t(s.name)}</td>
                  <td>{t(s.description)}</td>
                  <td>
                    <span className={`adm-badge ${s.isActive ? 'adm-badge--active' : 'adm-badge--inactive'}`}>
                      {s.isActive ? i18n.admin.yes : i18n.admin.no}
                    </span>
                  </td>
                  <td>
                    <div className="adm-table__actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        onClick={() => handleToggleActive(s)}
                      >
                        {s.isActive ? i18n.admin.silence : i18n.admin.unsilence}
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        onClick={() => handleDelete(s)}
                      >
                        {i18n.admin.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
