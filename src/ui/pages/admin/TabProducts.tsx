import { useEffect, useState } from 'react'
import { productRepository } from '../../../infrastructure/repositories/SupabaseProductRepository'
import type { ProductInput } from '../../../infrastructure/repositories/SupabaseProductRepository'
import { variantRepository } from '../../../infrastructure/repositories/SupabaseVariantRepository'
import type { VariantInput } from '../../../infrastructure/repositories/SupabaseVariantRepository'
import { colorRepository } from '../../../infrastructure/repositories/SupabaseColorRepository'
import { scentRepository } from '../../../infrastructure/repositories/SupabaseScentRepository'
import { categoryRepository } from '../../../infrastructure/repositories/SupabaseCategoryRepository'
import type { Product, ProductVariant, Color, Scent } from '../../../domain/entities/Product'
import { t } from '../../../domain/entities/Product'
import type { Category } from '../../../domain/entities/Category'
import { es as i18n } from '../../../i18n/es'

export function TabProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  // Product form state
  const [formName, setFormName] = useState('')
  const [formShortDesc, setFormShortDesc] = useState('')
  const [formLongDesc, setFormLongDesc] = useState('')
  const [formBasePrice, setFormBasePrice] = useState('')
  const [formImages, setFormImages] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [formFeatured, setFormFeatured] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSaving, setFormSaving] = useState(false)

  // Variant state (only when editing an existing product)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [availableColors, setAvailableColors] = useState<Color[]>([])
  const [availableScents, setAvailableScents] = useState<Scent[]>([])
  const [variantEditing, setVariantEditing] = useState<ProductVariant | 'new' | null>(null)
  const [variantsLoading, setVariantsLoading] = useState(false)

  // Category state (only when editing an existing product)
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [categoriesSaving, setCategoriesSaving] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  // Variant form state
  const [vColorId, setVColorId] = useState('')
  const [vScentId, setVScentId] = useState('')
  const [vPrice, setVPrice] = useState('')
  const [vStock, setVStock] = useState('0')
  const [vActive, setVActive] = useState(true)
  const [vError, setVError] = useState<string | null>(null)
  const [vSaving, setVSaving] = useState(false)

  const loadProducts = () => {
    setLoading(true)
    setError(null)
    productRepository.getAllForAdmin()
      .then(setProducts)
      .catch(() => setError(i18n.error))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProducts() }, [])

  const loadVariantData = (productId: number) => {
    setVariantsLoading(true)
    Promise.all([
      variantRepository.getByProductId(productId),
      colorRepository.getAllForAdmin(),
      scentRepository.getAllForAdmin(),
      categoryRepository.getAllActive(),
      categoryRepository.getCategoryIdsForProduct(productId),
    ])
      .then(([v, c, s, cats, catIds]) => {
        setVariants(v)
        setAvailableColors(c)
        setAvailableScents(s)
        setAvailableCategories(cats)
        setSelectedCategoryIds(catIds)
      })
      .catch(() => {})
      .finally(() => setVariantsLoading(false))
  }

  const openNew = () => {
    setEditing('new')
    setFormName('')
    setFormShortDesc('')
    setFormLongDesc('')
    setFormBasePrice('')
    setFormImages('')
    setFormActive(true)
    setFormFeatured(false)
    setFormError(null)
    setVariantEditing(null)
    setVariants([])
    setAvailableCategories([])
    setSelectedCategoryIds([])
    setCategoriesError(null)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setFormName(t(p.name))
    setFormShortDesc(p.shortDescription ? t(p.shortDescription) : '')
    setFormLongDesc(p.longDescription ? t(p.longDescription) : '')
    setFormBasePrice(p.basePrice.toFixed(2))
    setFormImages(p.images.join('\n'))
    setFormActive(p.isActive)
    setFormFeatured(false)
    setFormError(null)
    setVariantEditing(null)
    setCategoriesError(null)
    loadVariantData(p.id)
  }

  const cancelEdit = () => {
    setEditing(null)
    setVariantEditing(null)
    setFormError(null)
    setCategoriesError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const price = parseFloat(formBasePrice)
    if (!Number.isFinite(price) || price < 0) {
      setFormError(i18n.admin.saveError)
      return
    }

    const images = formImages
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean)

    const name = editing !== 'new' && editing !== null
      ? { ...editing.name, es: formName.trim() }
      : { es: formName.trim() }

    const shortDesc = formShortDesc.trim()
      ? (editing !== 'new' && editing !== null && editing.shortDescription
        ? { ...editing.shortDescription, es: formShortDesc.trim() }
        : { es: formShortDesc.trim() })
      : null

    const longDesc = formLongDesc.trim()
      ? (editing !== 'new' && editing !== null && editing.longDescription
        ? { ...editing.longDescription, es: formLongDesc.trim() }
        : { es: formLongDesc.trim() })
      : null

    const input: ProductInput = {
      name,
      shortDescription: shortDesc,
      longDescription: longDesc,
      basePrice: price,
      images,
      isActive: formActive,
      isFeatured: formFeatured,
    }

    setFormSaving(true)
    try {
      if (editing === 'new') {
        const { id } = await productRepository.create(input)
        const updated = await productRepository.getAllForAdmin()
        setProducts(updated)
        const newProduct = updated.find(p => p.id === id)
        if (newProduct) {
          openEdit(newProduct)
        } else {
          setEditing(null)
        }
      } else if (editing !== null) {
        await productRepository.update(editing.id, input)
        loadProducts()
        setEditing(null)
      }
    } catch {
      setFormError(i18n.admin.saveError)
    } finally {
      setFormSaving(false)
    }
  }

  const handleToggleActive = async (p: Product) => {
    try {
      await productRepository.setActive(p.id, !p.isActive)
      loadProducts()
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  const handleDelete = async (p: Product) => {
    if (!window.confirm(i18n.admin.confirmDelete)) return
    try {
      await productRepository.remove(p.id)
      loadProducts()
    } catch {
      setError(i18n.admin.deleteError)
    }
  }

  const openVariantNew = () => {
    setVariantEditing('new')
    setVColorId('')
    setVScentId('')
    setVPrice('')
    setVStock('0')
    setVActive(true)
    setVError(null)
  }

  const openVariantEdit = (v: ProductVariant) => {
    setVariantEditing(v)
    setVColorId(v.color ? String(v.color.id) : '')
    setVScentId(v.scent ? String(v.scent.id) : '')
    setVPrice(v.price != null ? String(v.price) : '')
    setVStock(String(v.stock))
    setVActive(v.isActive)
    setVError(null)
  }

  const cancelVariantEdit = () => {
    setVariantEditing(null)
    setVError(null)
  }

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing === 'new' || editing === null) return
    setVError(null)

    const colorId = vColorId ? parseInt(vColorId, 10) : null
    const scentId = vScentId ? parseInt(vScentId, 10) : null

    let price: number | null = null
    if (vPrice.trim() !== '') {
      price = parseFloat(vPrice)
      if (!Number.isFinite(price)) {
        setVError(i18n.admin.saveError)
        return
      }
    }

    const stock = parseInt(vStock, 10)
    if (!Number.isFinite(stock) || stock < 0) {
      setVError(i18n.admin.saveError)
      return
    }

    const variantInput = {
      colorId: colorId ?? null,
      scentId: scentId ?? null,
      price,
      stock,
      isActive: vActive,
    }

    setVSaving(true)
    try {
      if (variantEditing === 'new') {
        const createInput: VariantInput = { productId: editing.id, ...variantInput }
        await variantRepository.create(createInput)
      } else if (variantEditing !== null) {
        await variantRepository.update(variantEditing.id, variantInput)
      }
      setVariantEditing(null)
      loadVariantData(editing.id)
    } catch {
      setVError(i18n.admin.saveError)
    } finally {
      setVSaving(false)
    }
  }

  const handleVariantDelete = async (v: ProductVariant) => {
    if (!window.confirm(i18n.admin.confirmDelete)) return
    if (editing === 'new' || editing === null) return
    try {
      await variantRepository.remove(v.id)
      loadVariantData(editing.id)
    } catch {
      setVError(i18n.admin.deleteError)
    }
  }

  const handleToggleCategory = (categoryId: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveCategories = async () => {
    if (editing === 'new' || editing === null) return
    setCategoriesError(null)
    setCategoriesSaving(true)
    try {
      await categoryRepository.setProductCategories(editing.id, selectedCategoryIds)
    } catch {
      setCategoriesError(i18n.admin.saveError)
    } finally {
      setCategoriesSaving(false)
    }
  }

  const editingProductId = editing !== 'new' && editing !== null ? editing.id : null

  // ---- LIST VIEW ----
  if (editing === null) {
    return (
      <div>
        {error && <div className="adm-alert adm-alert--error">{error}</div>}

        <div className="adm-section-header">
          <h2 className="adm-section-title">{i18n.admin.tabProducts}</h2>
          <button type="button" className="adm-btn adm-btn--primary" onClick={openNew}>
            + {i18n.admin.create}
          </button>
        </div>

        {loading ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{i18n.admin.colId}</th>
                  <th>{i18n.admin.colName}</th>
                  <th>{i18n.admin.colBasePrice}</th>
                  <th>{i18n.admin.colVariants}</th>
                  <th>{i18n.admin.colActive}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="adm-sk-row">
                    <td><div className="adm-sk-cell" style={{ width: '2rem' }} /></td>
                    <td><div className="adm-sk-cell" style={{ width: '55%' }} /></td>
                    <td><div className="adm-sk-cell" style={{ width: '4rem' }} /></td>
                    <td><div className="adm-sk-cell" style={{ width: '2rem' }} /></td>
                    <td><div className="adm-sk-cell" style={{ width: '4rem' }} /></td>
                    <td><div className="adm-sk-cell" style={{ width: '8rem' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : products.length === 0 ? (
          <p className="adm-empty">{i18n.admin.emptyList}</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{i18n.admin.colId}</th>
                  <th>{i18n.admin.colName}</th>
                  <th>{i18n.admin.colBasePrice}</th>
                  <th>{i18n.admin.colVariants}</th>
                  <th>{i18n.admin.colActive}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="adm-table__id">{p.id}</td>
                    <td>{t(p.name)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {p.basePrice.toFixed(2)} {i18n.products.currency}
                    </td>
                    <td>{p.variants.length}</td>
                    <td>
                      <span className={`adm-badge ${p.isActive ? 'adm-badge--active' : 'adm-badge--inactive'}`}>
                        {p.isActive ? i18n.admin.yes : i18n.admin.no}
                      </span>
                    </td>
                    <td>
                      <div className="adm-table__actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--sm"
                          onClick={() => openEdit(p)}
                        >
                          {i18n.admin.edit}
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost adm-btn--sm"
                          onClick={() => handleToggleActive(p)}
                        >
                          {p.isActive ? i18n.admin.deactivate : i18n.admin.activate}
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn--danger adm-btn--sm"
                          onClick={() => handleDelete(p)}
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

  // ---- EDIT VIEW ----
  return (
    <div>
      <button type="button" className="adm-back-btn" onClick={cancelEdit}>
        <span className="adm-back-btn__arrow">←</span>
        {i18n.admin.tabProducts}
      </button>

      <div className="adm-edit-header">
        <h2 className="adm-edit-title">
          {editing === 'new' ? i18n.admin.productNew : i18n.admin.productEdit}
        </h2>
      </div>

      <div className={`adm-edit-panel${editingProductId !== null ? ' adm-edit-panel--with-variants' : ''}`}>

        {/* Left column: product form */}
        <div className="adm-panel-card">
          <p className="adm-panel-card__title">Datos del producto</p>
          {formError && <div className="adm-alert adm-alert--error">{formError}</div>}
          <form onSubmit={handleSubmit} className="adm-form">
            <div className="adm-field">
              <label className="adm-label" htmlFor="pf-name">{i18n.admin.fieldName}</label>
              <input
                id="pf-name"
                type="text"
                className="adm-input"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                required
              />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pf-shortdesc">{i18n.admin.fieldShortDesc}</label>
              <textarea
                id="pf-shortdesc"
                className="adm-textarea"
                value={formShortDesc}
                onChange={e => setFormShortDesc(e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pf-longdesc">{i18n.admin.fieldLongDesc}</label>
              <textarea
                id="pf-longdesc"
                className="adm-textarea"
                style={{ minHeight: '120px' }}
                value={formLongDesc}
                onChange={e => setFormLongDesc(e.target.value)}
              />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pf-price">{i18n.admin.fieldBasePrice}</label>
              <input
                id="pf-price"
                type="number"
                step="0.01"
                min="0"
                className="adm-input"
                value={formBasePrice}
                onChange={e => setFormBasePrice(e.target.value)}
                required
              />
            </div>
            <div className="adm-field">
              <label className="adm-label" htmlFor="pf-images">{i18n.admin.fieldImages}</label>
              <span className="adm-label-helper">Una URL por línea</span>
              <textarea
                id="pf-images"
                className="adm-textarea"
                value={formImages}
                onChange={e => setFormImages(e.target.value)}
              />
            </div>
            <label className="adm-checkbox-field">
              <input
                type="checkbox"
                checked={formActive}
                onChange={e => setFormActive(e.target.checked)}
              />
              <span className="adm-label">{i18n.admin.fieldActive}</span>
            </label>
            <label className="adm-checkbox-field">
              <input
                type="checkbox"
                checked={formFeatured}
                onChange={e => setFormFeatured(e.target.checked)}
              />
              <span className="adm-label">{i18n.admin.fieldFeatured}</span>
            </label>
            <div className="adm-form-footer">
              <button type="submit" className="adm-btn adm-btn--primary" disabled={formSaving}>
                {formSaving ? i18n.admin.saving : i18n.admin.save}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={cancelEdit}>
                {i18n.admin.cancel}
              </button>
            </div>
          </form>
        </div>

        {/* Right column: categories + variants (existing products only) */}
        {editingProductId !== null && (
          <div>
          <div className="adm-panel-card">
            <div className="adm-variants-header">
              <p className="adm-panel-card__title" style={{ margin: 0 }}>{i18n.admin.categoriesTitle}</p>
            </div>

            {categoriesError && <div className="adm-alert adm-alert--error">{categoriesError}</div>}

            {variantsLoading ? (
              <p className="adm-loading">{i18n.loading}</p>
            ) : availableCategories.length === 0 ? (
              <p className="adm-empty">{i18n.admin.emptyList}</p>
            ) : (
              availableCategories.map(c => (
                <label key={c.id} className="adm-checkbox-field">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(c.id)}
                    onChange={() => handleToggleCategory(c.id)}
                  />
                  <span className="adm-label">{t(c.name)}</span>
                </label>
              ))
            )}

            <div className="adm-form-footer">
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                disabled={categoriesSaving}
                onClick={handleSaveCategories}
              >
                {categoriesSaving ? i18n.admin.saving : i18n.admin.categoriesSave}
              </button>
            </div>
          </div>

          <div className="adm-panel-card">
            <div className="adm-variants-header">
              <p className="adm-panel-card__title" style={{ margin: 0 }}>{i18n.admin.variantsTitle}</p>
              <button
                type="button"
                className="adm-btn adm-btn--ghost adm-btn--sm"
                onClick={openVariantNew}
              >
                + {i18n.admin.variantNew}
              </button>
            </div>

            {variantsLoading ? (
              <p className="adm-loading">{i18n.loading}</p>
            ) : variants.length === 0 ? (
              <p className="adm-empty" style={{ padding: 'var(--space-6) 0' }}>
                {i18n.admin.emptyList}
              </p>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table adm-table--nested">
                  <thead>
                    <tr>
                      <th>{i18n.admin.colColor}</th>
                      <th>{i18n.admin.colScent}</th>
                      <th>{i18n.admin.colPrice}</th>
                      <th>{i18n.admin.colStock}</th>
                      <th>{i18n.admin.colActive}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id}>
                        <td>
                          {v.color
                            ? t(v.color.name)
                            : <span style={{ color: 'var(--c-muted)' }}>—</span>}
                        </td>
                        <td>
                          {v.scent
                            ? t(v.scent.name)
                            : <span style={{ color: 'var(--c-muted)' }}>—</span>}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {v.price != null ? `${v.price.toFixed(2)} €` : '—'}
                        </td>
                        <td>{v.stock}</td>
                        <td>
                          <span className={`adm-badge ${v.isActive ? 'adm-badge--active' : 'adm-badge--inactive'}`}>
                            {v.isActive ? i18n.admin.yes : i18n.admin.no}
                          </span>
                        </td>
                        <td>
                          <div className="adm-table__actions">
                            <button
                              type="button"
                              className="adm-btn adm-btn--ghost adm-btn--sm"
                              onClick={() => openVariantEdit(v)}
                            >
                              {i18n.admin.edit}
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn--danger adm-btn--sm"
                              onClick={() => handleVariantDelete(v)}
                            >
                              {i18n.admin.variantDelete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {variantEditing !== null && (
              <div className="adm-inline-form">
                <p className="adm-inline-form-title">
                  {variantEditing === 'new' ? i18n.admin.variantNew : i18n.admin.variantEdit}
                </p>
                {vError && (
                  <div className="adm-alert adm-alert--error" style={{ marginBottom: 'var(--space-3)' }}>
                    {vError}
                  </div>
                )}
                <form onSubmit={handleVariantSubmit} className="adm-form">
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="vf-color">{i18n.admin.fieldColor}</label>
                    <select
                      id="vf-color"
                      className="adm-select"
                      value={vColorId}
                      onChange={e => setVColorId(e.target.value)}
                    >
                      <option value="">{i18n.admin.noColor}</option>
                      {availableColors.map(c => (
                        <option key={c.id} value={String(c.id)}>
                          {t(c.name)} ({c.hexCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="vf-scent">{i18n.admin.fieldScent}</label>
                    <select
                      id="vf-scent"
                      className="adm-select"
                      value={vScentId}
                      onChange={e => setVScentId(e.target.value)}
                    >
                      <option value="">{i18n.admin.noScent}</option>
                      {availableScents.map(s => (
                        <option key={s.id} value={String(s.id)}>
                          {t(s.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="vf-price">{i18n.admin.fieldPrice}</label>
                    <input
                      id="vf-price"
                      type="text"
                      className="adm-input"
                      value={vPrice}
                      onChange={e => setVPrice(e.target.value)}
                      placeholder="Hereda precio base"
                    />
                  </div>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor="vf-stock">{i18n.admin.fieldStock}</label>
                    <input
                      id="vf-stock"
                      type="number"
                      min="0"
                      className="adm-input"
                      value={vStock}
                      onChange={e => setVStock(e.target.value)}
                      required
                    />
                  </div>
                  <label className="adm-checkbox-field">
                    <input
                      type="checkbox"
                      checked={vActive}
                      onChange={e => setVActive(e.target.checked)}
                    />
                    <span className="adm-label">{i18n.admin.fieldActive}</span>
                  </label>
                  <div className="adm-form-footer">
                    <button type="submit" className="adm-btn adm-btn--primary" disabled={vSaving}>
                      {vSaving ? i18n.admin.saving : i18n.admin.variantSave}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      onClick={cancelVariantEdit}
                    >
                      {i18n.admin.variantCancel}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
