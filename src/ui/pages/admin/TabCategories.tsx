import { useEffect, useState } from 'react'
import { categoryRepository } from '../../../infrastructure/repositories/SupabaseCategoryRepository'
import { productRepository } from '../../../infrastructure/repositories/SupabaseProductRepository'
import type { Category } from '../../../domain/entities/Category'
import type { Product } from '../../../domain/entities/Product'
import { t } from '../../../domain/entities/Product'
import { es as i18n } from '../../../i18n/es'

export function TabCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)

  // Assign view state
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSaving, setAssignSaving] = useState(false)

  const loadCategories = () => {
    setLoading(true)
    setError(null)
    categoryRepository.getAllForAdmin()
      .then(setCategories)
      .catch(() => setError(i18n.error))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCategories() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreateError(null)
    setCreating(true)
    try {
      const description = newDescription.trim() ? { es: newDescription.trim() } : null
      const { id } = await categoryRepository.create({ name: { es: name }, description })
      setNewName('')
      setNewDescription('')
      const updated = await categoryRepository.getAllForAdmin()
      setCategories(updated)
      const newCategory = updated.find(c => c.id === id)
      if (newCategory) {
        openEdit(newCategory)
      }
    } catch {
      setCreateError(i18n.admin.saveError)
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setAssignError(null)
    setAssignLoading(true)
    setProducts([])
    setSelectedIds([])
    Promise.all([
      productRepository.getAllForAdmin(),
      categoryRepository.getProductIds(c.id),
    ])
      .then(([prods, ids]) => {
        setProducts(prods)
        setSelectedIds(ids)
      })
      .catch(() => setAssignError(i18n.admin.saveError))
      .finally(() => setAssignLoading(false))
  }

  const backToList = () => {
    setEditing(null)
    setAssignError(null)
  }

  const handleToggleProduct = (productId: number) => {
    setSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSaveAssign = async () => {
    if (!editing) return
    setAssignError(null)
    setAssignSaving(true)
    try {
      await categoryRepository.setProducts(editing.id, selectedIds)
      backToList()
    } catch {
      setAssignError(i18n.admin.saveError)
    } finally {
      setAssignSaving(false)
    }
  }

  const handleToggleActive = async (c: Category) => {
    try {
      await categoryRepository.setActive(c.id, !c.isActive)
      loadCategories()
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  const handleDelete = async (c: Category) => {
    if (!window.confirm(i18n.admin.confirmDelete)) return
    try {
      await categoryRepository.remove(c.id)
      loadCategories()
    } catch {
      setError(i18n.admin.deleteError)
    }
  }

  // ---- ASSIGN / EDIT VIEW ----
  if (editing !== null) {
    return (
      <div>
        <button type="button" className="adm-back-btn" onClick={backToList}>
          <span className="adm-back-btn__arrow">←</span>
          {i18n.admin.tabCategories}
        </button>

        <div className="adm-edit-header">
          <h2 className="adm-edit-title">{i18n.admin.categoryAssignTitle}</h2>
        </div>

        {assignError && <div className="adm-alert adm-alert--error">{assignError}</div>}

        {assignLoading ? (
          <p className="adm-loading">{i18n.loading}</p>
        ) : products.length === 0 ? (
          <p className="adm-empty">{i18n.admin.emptyList}</p>
        ) : (
          <div>
            {products.map(p => (
              <label key={p.id} className="adm-checkbox-field">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => handleToggleProduct(p.id)}
                />
                <span className="adm-label">{t(p.name)}</span>
                {!p.isActive && (
                  <span className="adm-badge adm-badge--inactive">{i18n.admin.no}</span>
                )}
              </label>
            ))}
          </div>
        )}

        <div className="adm-form-footer">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={assignSaving || assignLoading}
            onClick={handleSaveAssign}
          >
            {assignSaving ? i18n.admin.saving : i18n.admin.save}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={backToList}
          >
            {i18n.admin.cancel}
          </button>
        </div>
      </div>
    )
  }

  // ---- LIST VIEW ----
  return (
    <div>
      <div className="adm-create-card">
        <p className="adm-create-card__title">{i18n.admin.categoryNew}</p>
        {createError && <div className="adm-alert adm-alert--error">{createError}</div>}
        <form onSubmit={handleCreate} className="adm-form">
          <div className="adm-field">
            <label className="adm-label" htmlFor="cat-name">{i18n.admin.fieldName}</label>
            <input
              id="cat-name"
              type="text"
              className="adm-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <label className="adm-label" htmlFor="cat-description">{i18n.admin.fieldDescription}</label>
            <textarea
              id="cat-description"
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
        <h2 className="adm-section-title">{i18n.admin.tabCategories}</h2>
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
      ) : categories.length === 0 ? (
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
              {categories.map(c => (
                <tr key={c.id}>
                  <td className="adm-table__id">{c.id}</td>
                  <td>{t(c.name)}</td>
                  <td>{t(c.description)}</td>
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
                        onClick={() => openEdit(c)}
                      >
                        {i18n.admin.assign}
                      </button>
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
