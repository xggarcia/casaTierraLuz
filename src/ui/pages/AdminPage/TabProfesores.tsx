import { useEffect, useRef, useState } from 'react'
import type { Organization } from '../../../domain/entities/Organization'
import type { Teacher, TeacherImage, TeacherUserOption, TeacherVideo } from '../../../domain/entities/Teacher'
import { teacherRepository } from '../../../infrastructure/db'
import { storageService } from '../../../infrastructure/supabase/storageService'
import { useAuth } from '../../contexts/AuthContext'
import { ALL_TAGS, toSlug, type AdminScope } from './formHelpers'
import { TeacherImagePicker } from './TeacherImagePicker'
import { TeacherVideoPicker } from './TeacherVideoPicker'

const TEACHER_TAGS = ALL_TAGS

interface Props {
  scope: AdminScope
  effectiveWritableOrgs: Organization[]
}

type TeacherForm = {
  userId: string
  organizationId: string
  slug: string
  name: string
  bio: string
  tags: string[]
  avatarUrl: string
  avatarStorageName: string   // storage path for deletion
  linkedinUrl: string
  socialUrl: string
  extraUrl: string
  portfolioImages: string[]
  portfolioVideos: string[]
  isPublic: boolean
}

const emptyForm = (defaultOrgId: string): TeacherForm => ({
  userId: '', organizationId: defaultOrgId,
  slug: '', name: '', bio: '', tags: [],
  avatarUrl: '', avatarStorageName: '',
  linkedinUrl: '', socialUrl: '', extraUrl: '',
  portfolioImages: [], portfolioVideos: [],
  isPublic: true,
})

function teacherToForm(t: Teacher): TeacherForm {
  return {
    userId:           t.userId ?? '',
    organizationId:   t.organizationId,
    slug:             t.slug,
    name:             t.name,
    bio:              t.bio,
    tags:             [...t.tags],
    avatarUrl:        t.avatarUrl,
    avatarStorageName: '',
    linkedinUrl:      t.linkedinUrl,
    socialUrl:        t.socialUrl,
    extraUrl:         t.extraUrl,
    portfolioImages:  [...t.portfolioImages],
    portfolioVideos:  [...t.portfolioVideos],
    isPublic:         t.isPublic,
  }
}

export function TabProfesores({ scope, effectiveWritableOrgs }: Props) {
  const { canEditCoursesInOrg } = useAuth()

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Teacher | 'new' | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyForm(effectiveWritableOrgs[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  // Catalog data
  const [catalogImages, setCatalogImages] = useState<TeacherImage[]>([])
  const [catalogVideos, setCatalogVideos] = useState<TeacherVideo[]>([])
  const [catalogImagesLoading, setCatalogImagesLoading] = useState(false)
  const [catalogVideosLoading, setCatalogVideosLoading] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [showVideoPicker, setShowVideoPicker] = useState(false)

  // Users with profesor role
  const [profesorUsers, setProfesorUsers] = useState<TeacherUserOption[]>([])

  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingPortfolioImage, setUploadingPortfolioImage] = useState(false)
  const [uploadingPortfolioVideo, setUploadingPortfolioVideo] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const portfolioImageInputRef = useRef<HTMLInputElement>(null)
  const portfolioVideoInputRef = useRef<HTMLInputElement>(null)

  const canCreate = effectiveWritableOrgs.length > 0

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      setTeachers(await teacherRepository.listByScope(scope.organizationIds, scope.isSuperAdmin))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar profesores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [scope])

  const loadCatalogImages = async () => {
    setCatalogImagesLoading(true)
    try { setCatalogImages(await teacherRepository.listImages(scope.organizationIds, scope.isSuperAdmin)) }
    finally { setCatalogImagesLoading(false) }
  }

  const loadCatalogVideos = async () => {
    setCatalogVideosLoading(true)
    try { setCatalogVideos(await teacherRepository.listVideos(scope.organizationIds, scope.isSuperAdmin)) }
    finally { setCatalogVideosLoading(false) }
  }

  const loadProfesorUsers = async () => {
    try { setProfesorUsers(await teacherRepository.listUsersWithProfesorRole(scope.organizationIds, scope.isSuperAdmin)) }
    catch { setProfesorUsers([]) }
  }

  const openNew = () => {
    setForm(emptyForm(effectiveWritableOrgs[0]?.id ?? ''))
    setFormError(null)
    setSlugTouched(false)
    loadProfesorUsers()
    setEditing('new')
  }

  const openEdit = (t: Teacher) => {
    setForm(teacherToForm(t))
    setFormError(null)
    setSlugTouched(true)
    loadProfesorUsers()
    setEditing(t)
  }

  const cancel = () => setEditing(null)

  const setField = <K extends keyof TeacherForm>(k: K, v: TeacherForm[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (name: string) => {
    setField('name', name)
    if (!slugTouched) setField('slug', toSlug(name))
  }

  const handleSlugChange = (slug: string) => {
    setSlugTouched(true)
    setField('slug', toSlug(slug))
  }

  const toggleTag = (tag: string) =>
    setField('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])

  // ── Avatar upload ────────────────────────────────────────────────────────
  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const stored = await storageService.uploadTeacherFile(file, form.organizationId)
      setForm(f => ({ ...f, avatarUrl: stored.url, avatarStorageName: stored.name }))
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al subir avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Portfolio image upload ───────────────────────────────────────────────
  const handlePortfolioImageUpload = async (file: File) => {
    setUploadingPortfolioImage(true)
    try {
      const stored = await storageService.uploadTeacherFile(file, form.organizationId)
      const saved = await teacherRepository.saveImage({
        name: stored.name, url: stored.url, tags: [], organization_id: form.organizationId,
      })
      setField('portfolioImages', [...form.portfolioImages, saved.url])
      await loadCatalogImages()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al subir imagen')
    } finally {
      setUploadingPortfolioImage(false)
    }
  }

  // ── Portfolio video upload ───────────────────────────────────────────────
  const handlePortfolioVideoUpload = async (file: File) => {
    setUploadingPortfolioVideo(true)
    try {
      const stored = await storageService.uploadTeacherFile(file, form.organizationId)
      const saved = await teacherRepository.saveVideo({
        name: stored.name, url: stored.url, tags: [], organization_id: form.organizationId,
      })
      setField('portfolioVideos', [...form.portfolioVideos, saved.url])
      await loadCatalogVideos()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al subir vídeo')
    } finally {
      setUploadingPortfolioVideo(false)
    }
  }

  // ── Pickers ──────────────────────────────────────────────────────────────
  const openImagePicker = () => { loadCatalogImages(); setShowImagePicker(true) }
  const openVideoPicker = () => { loadCatalogVideos(); setShowVideoPicker(true) }

  const removePortfolioImage = (i: number) =>
    setField('portfolioImages', form.portfolioImages.filter((_, idx) => idx !== i))

  const removePortfolioVideo = (i: number) =>
    setField('portfolioVideos', form.portfolioVideos.filter((_, idx) => idx !== i))

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('El nombre es obligatorio'); return }
    if (!form.slug.trim()) { setFormError('El slug es obligatorio'); return }
    if (!form.organizationId) { setFormError('Selecciona una organización'); return }
    setFormError(null)
    setSaving(true)
    try {
      await teacherRepository.save({
        ...(editing !== 'new' && editing !== null ? { id: editing.id } : {}),
        userId:          form.userId || null,
        organizationId:  form.organizationId,
        slug:            form.slug,
        name:            form.name.trim(),
        bio:             form.bio.trim(),
        tags:            form.tags,
        avatarUrl:       form.avatarUrl.trim(),
        linkedinUrl:     form.linkedinUrl.trim(),
        socialUrl:       form.socialUrl.trim(),
        extraUrl:        form.extraUrl.trim(),
        portfolioImages: form.portfolioImages,
        portfolioVideos: form.portfolioVideos,
        isPublic:        form.isPublic,
        sortOrder:       editing !== 'new' && editing !== null ? editing.sortOrder : 0,
      })
      setEditing(null)
      refresh()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: Teacher) => {
    if (!window.confirm(`¿Borrar al profesor "${t.name}"?`)) return
    try { await teacherRepository.delete(t.id); refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al borrar') }
  }

  return (
    <div className="admin-teachers-section">
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <button type="button" className="admin-btn-primary" onClick={openNew} disabled={!canCreate}>
          + Añadir profesor
        </button>
      </div>

      {editing !== null && (
        <form className="admin-teacher-form" onSubmit={handleSave}>
          <h3 className="admin-form-title">{editing === 'new' ? 'Nuevo profesor' : `Editar: ${(editing as Teacher).name}`}</h3>
          {formError && <div className="admin-error">{formError}</div>}

          <div className="admin-form-grid">
            {/* Organización */}
            {effectiveWritableOrgs.length > 1 && (
              <div className="admin-field">
                <label>Organización</label>
                <select className="admin-themed-select" value={form.organizationId} onChange={e => setField('organizationId', e.target.value)}>
                  {effectiveWritableOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            )}

            {/* Nombre */}
            <div className="admin-field admin-field-wide">
              <label>Nombre *</label>
              <input type="text" value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Nombre del profesor" />
            </div>

            {/* Slug */}
            <div className="admin-field admin-field-wide">
              <label>Slug (URL) *</label>
              <input type="text" value={form.slug} onChange={e => handleSlugChange(e.target.value)} placeholder="nombre-del-profesor" />
              <span className="admin-field-hint">/profesorado/<strong>{form.slug || '…'}</strong></span>
            </div>

            {/* Usuario vinculado */}
            <div className="admin-field admin-field-wide">
              <label>Usuario vinculado</label>
              <select className="admin-themed-select" value={form.userId} onChange={e => setField('userId', e.target.value)}>
                <option value="">— Sin usuario vinculado —</option>
                {profesorUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName ? `${u.displayName} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
              <span className="admin-field-hint">Solo usuarios con rol profesor_simple o profesor_todo</span>
            </div>

            {/* Bio */}
            <div className="admin-field admin-field-wide">
              <label>Biografía</label>
              <textarea value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Descripción del profesor" rows={4} />
            </div>

            {/* Avatar */}
            <div className="admin-field admin-field-wide">
              <label>Avatar</label>
              <div className="admin-teacher-avatar-row">
                {form.avatarUrl && (
                  <img src={form.avatarUrl} alt="" className="admin-teacher-avatar-preview" referrerPolicy="no-referrer" />
                )}
                <div className="admin-teacher-avatar-actions">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                  />
                  <button type="button" className="admin-btn-secondary" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? 'Subiendo…' : '↑ Subir imagen'}
                  </button>
                  <span className="admin-field-hint">O introduce una URL:</span>
                  <input type="url" value={form.avatarUrl} onChange={e => setField('avatarUrl', e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="admin-field admin-field-wide">
              <label>Tags</label>
              <div className="admin-tags-row">
                {TEACHER_TAGS.map(tag => (
                  <label key={tag} className={`admin-tag-option${form.tags.includes(tag) ? ' selected' : ''}`}>
                    <input type="checkbox" checked={form.tags.includes(tag)} onChange={() => toggleTag(tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {/* URLs sociales */}
            <div className="admin-field">
              <label>LinkedIn URL</label>
              <input type="url" value={form.linkedinUrl} onChange={e => setField('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
            <div className="admin-field">
              <label>Red Social URL</label>
              <input type="url" value={form.socialUrl} onChange={e => setField('socialUrl', e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            <div className="admin-field">
              <label>URL Extra</label>
              <input type="url" value={form.extraUrl} onChange={e => setField('extraUrl', e.target.value)} placeholder="https://portfolio.com/…" />
            </div>

            {/* Portfolio imágenes */}
            <div className="admin-field admin-field-wide">
              <label>Portfolio — Imágenes</label>
              <div className="admin-portfolio-grid">
                {form.portfolioImages.map((url, i) => (
                  <div key={i} className="admin-portfolio-thumb">
                    <img src={url} alt="" />
                    <button type="button" className="admin-portfolio-remove" onClick={() => removePortfolioImage(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="admin-teacher-upload-row">
                <input
                  ref={portfolioImageInputRef}
                  type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handlePortfolioImageUpload(e.target.files[0])}
                />
                <button type="button" className="admin-btn-secondary" onClick={() => portfolioImageInputRef.current?.click()} disabled={uploadingPortfolioImage}>
                  {uploadingPortfolioImage ? 'Subiendo…' : '↑ Subir imagen'}
                </button>
                <button type="button" className="admin-btn-secondary" onClick={openImagePicker}>
                  Seleccionar del catálogo
                </button>
              </div>
            </div>

            {/* Portfolio vídeos */}
            <div className="admin-field admin-field-wide">
              <label>Portfolio — Vídeos</label>
              <div className="admin-url-list">
                {form.portfolioVideos.map((url, i) => (
                  <div key={i} className="admin-url-list-item">
                    <span className="admin-url-list-text" title={url}>{url.split('/').pop()}</span>
                    <button type="button" className="admin-membership-remove" onClick={() => removePortfolioVideo(i)}>✕</button>
                  </div>
                ))}
              </div>
              <div className="admin-teacher-upload-row">
                <input
                  ref={portfolioVideoInputRef}
                  type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handlePortfolioVideoUpload(e.target.files[0])}
                />
                <button type="button" className="admin-btn-secondary" onClick={() => portfolioVideoInputRef.current?.click()} disabled={uploadingPortfolioVideo}>
                  {uploadingPortfolioVideo ? 'Subiendo…' : '↑ Subir vídeo'}
                </button>
                <button type="button" className="admin-btn-secondary" onClick={openVideoPicker}>
                  Seleccionar del catálogo
                </button>
              </div>
            </div>

            {/* Visible */}
            <div className="admin-field">
              <label>Visibilidad</label>
              <label className="admin-tag-option" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={form.isPublic} onChange={e => setField('isPublic', e.target.checked)} />
                &nbsp;Público
              </label>
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" className="admin-btn-secondary" onClick={cancel}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Pickers */}
      {showImagePicker && (
        <TeacherImagePicker
          images={catalogImages}
          loading={catalogImagesLoading}
          onSelect={img => { setField('portfolioImages', [...form.portfolioImages, img.url]); setShowImagePicker(false) }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
      {showVideoPicker && (
        <TeacherVideoPicker
          videos={catalogVideos}
          loading={catalogVideosLoading}
          onSelect={video => { setField('portfolioVideos', [...form.portfolioVideos, video.url]); setShowVideoPicker(false) }}
          onClose={() => setShowVideoPicker(false)}
        />
      )}

      {/* Lista */}
      {loading ? (
        <p className="admin-images-loading">Cargando profesores…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Avatar</th><th>Nombre</th><th>Slug</th><th>Tags</th><th>Público</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(t => {
                const editable = canEditCoursesInOrg(t.organizationId)
                return (
                  <tr key={t.id}>
                    <td>
                      {t.avatarUrl
                        ? <img src={t.avatarUrl} alt="" className="admin-teacher-list-avatar" referrerPolicy="no-referrer" />
                        : <div className="admin-teacher-list-avatar admin-teacher-avatar-placeholder">{t.name[0]?.toUpperCase() ?? '?'}</div>
                      }
                    </td>
                    <td className="admin-col-title">{t.name}</td>
                    <td><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{t.slug}</span></td>
                    <td>
                      <div className="admin-tags-chips">
                        {t.tags.map(tag => <span key={tag} className="admin-tag-chip">{tag}</span>)}
                      </div>
                    </td>
                    <td>{t.isPublic ? '✓' : '—'}</td>
                    <td>
                      <div className="admin-actions-wrap">
                        {editable && <button type="button" className="admin-btn-edit" onClick={() => openEdit(t)}>Editar</button>}
                        {editable && <button type="button" className="admin-btn-delete" onClick={() => handleDelete(t)}>Borrar</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {teachers.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay profesores.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
