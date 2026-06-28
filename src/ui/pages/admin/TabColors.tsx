import { useEffect, useState } from 'react'
import { colorRepository } from '../../../infrastructure/repositories/SupabaseColorRepository'
import type { Color } from '../../../domain/entities/Product'
import { t } from '../../../domain/entities/Product'
import { es as i18n } from '../../../i18n/es'

export function TabColors() {
  const [colors, setColors] = useState<Color[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newHex, setNewHex] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadColors = () => {
    setLoading(true)
    setError(null)
    colorRepository.getAllForAdmin()
      .then(setColors)
      .catch(() => setError(i18n.error))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadColors() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const hexCode = newHex.trim()
    if (!name || !hexCode) return
    setCreateError(null)
    setCreating(true)
    try {
      await colorRepository.create({ name: { es: name }, hexCode })
      setNewName('')
      setNewHex('')
      loadColors()
    } catch {
      setCreateError(i18n.admin.saveError)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (c: Color) => {
    try {
      await colorRepository.setActive(c.id, !c.isActive)
      loadColors()
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  const handleDelete = async (c: Color) => {
    if (!window.confirm(i18n.admin.confirmDelete)) return
    try {
      await colorRepository.remove(c.id)
      loadColors()
    } catch {
      setError(i18n.admin.deleteError)
    }
  }

  return (
    <div>
      <div className="adm-create-card">
        <p className="adm-create-card__title">{i18n.admin.colorNew}</p>
        {createError && <div className="adm-alert adm-alert--error">{createError}</div>}
        <form onSubmit={handleCreate} className="adm-form">
          <div className="adm-field">
            <label className="adm-label" htmlFor="color-name">{i18n.admin.fieldName}</label>
            <input
              id="color-name"
              type="text"
              className="adm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="color-hex">{i18n.admin.fieldHex}</label>
            <input
              id="color-hex"
              type="text"
              className="adm-input"
              value={newHex}
              onChange={e => setNewHex(e.target.value)}
              placeholder="#FFAA00"
              required
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
        <h2 className="adm-section-title">{i18n.admin.tabColors}</h2>
      </div>

      {loading ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{i18n.admin.colId}</th>
                <th>{i18n.admin.colName}</th>
                <th>{i18n.admin.colHex}</th>
                <th>{i18n.admin.colActive}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={i} className="adm-sk-row">
                  <td><div className="adm-sk-cell" style={{ width: '2rem' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '50%' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '6rem' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '4rem' }} /></td>
                  <td><div className="adm-sk-cell" style={{ width: '6rem' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : colors.length === 0 ? (
        <p className="adm-empty">{i18n.admin.emptyList}</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>{i18n.admin.colId}</th>
                <th>{i18n.admin.colName}</th>
                <th>{i18n.admin.colHex}</th>
                <th>{i18n.admin.colActive}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {colors.map(c => (
                <tr key={c.id}>
                  <td className="adm-table__id">{c.id}</td>
                  <td>{t(c.name)}</td>
                  <td>
                    <div className="adm-color-cell">
                      <span
                        className="adm-swatch"
                        style={{ backgroundColor: c.hexCode }}
                        aria-hidden="true"
                      />
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                        {c.hexCode}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`adm-badge ${c.isActive ? 'adm-badge--active' : 'adm-badge--inactive'}`}>
                      {c.isActive ? i18n.admin.yes : i18n.admin.no}
                    </span>
                  </td>
                  <td>
                    <div className="adm-table__actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        onClick={() => handleToggleActive(c)}
                      >
                        {c.isActive ? i18n.admin.silence : i18n.admin.unsilence}
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger adm-btn--sm"
                        onClick={() => handleDelete(c)}
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
