import { useEffect, useRef, useState } from 'react'
import { SectionsEditor } from '../../components/CourseSections/SectionsEditor'
import { CoursePageView } from '../CoursePage/CoursePageView'
import type { Course, Certification } from '../../../domain/entities/Course'
import type { ISODate } from '../../../domain/entities/Course'
import type { Organization } from '../../../domain/entities/Organization'
import type { CourseImage, CourseVideo } from '../../../application/ports/IAdminRepository'
import type { Teacher } from '../../../domain/entities/Teacher'
import { adminRepository, teacherRepository } from '../../../infrastructure/db'
import { storageService } from '../../../infrastructure/supabase/storageService'
import { useAuth } from '../../contexts/AuthContext'
import {
  ALL_TAGS, emptyForm, courseToForm, toSlug, loc, formToCourse,
  type AdminScope, type FormState,
} from './formHelpers'
import { CatalogImagePicker } from './CatalogImagePicker'
import { CatalogVideoPicker } from './CatalogVideoPicker'

interface Props {
  course: Course | null
  effectiveWritableOrgs: Organization[]
  scope: AdminScope
  onDone: () => void
  onCancel: () => void
}

export function CourseForm({ course, effectiveWritableOrgs, scope, onDone, onCancel }: Props) {
  const { isSuperAdmin } = useAuth()
  const editingId = course?.id ?? null

  const [form, setForm] = useState<FormState>(() =>
    course ? courseToForm(course) : emptyForm(effectiveWritableOrgs[0]?.id ?? '')
  )
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [slugTouched, setSlugTouched] = useState(editingId !== null)
  const [newTag, setNewTag] = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [showPreview, setShowPreview] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [catalogImages, setCatalogImages] = useState<CourseImage[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)

  const [teachers, setTeachers] = useState<Teacher[]>([])

  // Al abrir el formulario (crear/editar), ir al inicio.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [])

  useEffect(() => {
    if (!form.organizationId) return
    teacherRepository.listByScope([form.organizationId], scope.isSuperAdmin)
      .then(setTeachers)
      .catch(() => setTeachers([]))
  }, [form.organizationId])

  const [showHeroVideoPicker, setShowHeroVideoPicker] = useState(false)
  const [showTrailerVideoPicker, setShowTrailerVideoPicker] = useState(false)
  const [catalogVideos, setCatalogVideos] = useState<CourseVideo[]>([])
  const [videosLoading, setVideosLoading] = useState(false)

  // When set, the image picker resolves to this callback (used by sections)
  // instead of the course's hero image.
  const imageTarget = useRef<((url: string) => void) | null>(null)

  const openPicker = async () => {
    setShowPicker(true)
    setCatalogLoading(true)
    try { setCatalogImages(await adminRepository.listAdminCourseImages(scope)) }
    finally { setCatalogLoading(false) }
  }

  // Open the catalog picker targeting a section image.
  const pickImageForSection = (cb: (url: string) => void) => {
    imageTarget.current = cb
    openPicker()
  }

  // Immediate upload for a section image (vs the hero's deferred upload).
  const uploadImageForSection = async (file: File, cb: (url: string) => void) => {
    try {
      const stored = await storageService.upload(file, form.organizationId)
      await adminRepository.saveCourseImage({
        name: stored.name, url: stored.url, tags: form.tags,
        organization_id: form.organizationId,
      })
      cb(stored.url)
    } catch (err) {
      setFormErrors([err instanceof Error ? err.message : 'Error al subir la imagen'])
    }
  }

  const openVideoPicker = async (target: 'hero' | 'trailer') => {
    if (target === 'hero') setShowHeroVideoPicker(true)
    else setShowTrailerVideoPicker(true)
    if (catalogVideos.length === 0) {
      setVideosLoading(true)
      try { setCatalogVideos(await adminRepository.listAdminCourseVideos(scope)) }
      finally { setVideosLoading(false) }
    }
  }

  // When set, the trailer video picker resolves to this callback (section video block).
  const videoTarget = useRef<((url: string) => void) | null>(null)
  const pickVideoForSection = (cb: (url: string) => void) => {
    videoTarget.current = cb
    openVideoPicker('trailer')
  }

  const handleTitleChange = (v: string) => {
    setForm(f => ({ ...f, titulo: v, slug: slugTouched ? f.slug : toSlug(v) }))
  }

  const handleTagToggle = (tag: string) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || form.tags.includes(tag)) return
    setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    setNewTag('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    const preview = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingPreview(preview)
    setForm(f => ({ ...f, linkImagen: preview, selectedImageId: null }))
    e.target.value = ''
  }

  const clearImage = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    setForm(f => ({ ...f, linkImagen: '', selectedImageId: null }))
  }

  const handleSave = async () => {
    const errors: string[] = []
    if (!form.titulo.trim()) errors.push('El título es obligatorio')
    if (!form.slug.trim()) errors.push('El slug es obligatorio')
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio)
      errors.push('La fecha de fin debe ser posterior a la de inicio')
    if (!form.organizationId) errors.push('La organización es obligatoria')
    if (errors.length > 0) { setFormErrors(errors); return }
    setFormErrors([])

    let imageId: string | undefined = form.selectedImageId ?? undefined
    if (pendingFile) {
      setUploading(true)
      try {
        const stored = await storageService.upload(pendingFile, form.organizationId)
        const saved = await adminRepository.saveCourseImage({
          name: stored.name, url: stored.url, tags: form.tags,
          organization_id: form.organizationId,
        })
        imageId = saved.id
        if (pendingPreview) URL.revokeObjectURL(pendingPreview)
        setPendingFile(null)
        setPendingPreview(null)
      } catch (err) {
        setFormErrors([err instanceof Error ? err.message : 'Error al subir la imagen'])
        setUploading(false)
        return
      }
      setUploading(false)
    }

    await adminRepository.saveCourse({
      ...(editingId !== null ? { id: editingId } : {}),
      slug:                 form.slug,
      titulo:               loc(form.titulo),
      descripcion:          loc(form.descripcion),
      descripcionExtendida: loc(form.descripcionExtendida),
      tipoEtiqueta:         loc(form.tipoEtiqueta),
      tags:                 form.tags,
      horas:                form.horas ? parseInt(form.horas, 10) : undefined,
      fechaInicio:          (form.fechaInicio || undefined) as ISODate | undefined,
      fechaFin:             (form.fechaFin || undefined) as ISODate | undefined,
      imageId,
      heroVideoId:          form.selectedHeroVideoId ?? undefined,
      trailerVideoId:       form.selectedTrailerVideoId ?? undefined,
      trailerYoutubeUrl:    form.trailerYoutubeUrl || undefined,
      featured:             form.featured,
      precio:               form.precio,
      instructor:           form.instructor,
      certification:        (form.certification || undefined) as Certification | undefined,
      isPublic:             form.isPublic,
      isArchived:           form.isArchived,
      organizationId:       form.organizationId,
    })
    if (imageId) await adminRepository.updateCourseImage(imageId, { tags: form.tags })
    onDone()
  }

  return (
    <>
      <div className={`admin-form-layout${showPreview ? ' admin-form-layout--split' : ''}`}>
      <div className="admin-form-panel">
        <h2 className="admin-form-title">{editingId !== null ? 'Editar curso' : 'Nuevo curso'}</h2>

        {formErrors.length > 0 && (
          <div className="admin-form-errors">
            {formErrors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        <div className="admin-form-grid">
          <div className="admin-field admin-field-wide">
            <label>Título</label>
            <input type="text" value={form.titulo} onChange={e => handleTitleChange(e.target.value)} placeholder="Título del curso" />
          </div>

          <div className="admin-field">
            <label>Slug (URL)</label>
            <input
              type="text"
              value={form.slug}
              readOnly={editingId !== null}
              onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })) }}
              placeholder="mi-curso-slug"
            />
          </div>

          <div className="admin-field">
            <label>Tipo de etiqueta</label>
            <input
              type="text"
              value={form.tipoEtiqueta}
              onChange={e => setForm(f => ({ ...f, tipoEtiqueta: e.target.value }))}
              placeholder="Máster, Formación, Workshop…"
            />
          </div>

          <div className="admin-field admin-field-wide">
            <label>Descripción corta</label>
            <textarea rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>

          <div className="admin-field admin-field-wide">
            <label>Descripción extendida <span className="admin-field-optional">(por secciones)</span></label>
            <SectionsEditor
              value={form.descripcionExtendida}
              onChange={v => setForm(f => ({ ...f, descripcionExtendida: v }))}
              onPickImage={pickImageForSection}
              onUploadImage={uploadImageForSection}
              onPickVideo={pickVideoForSection}
            />
          </div>

          <div className="admin-field">
            <label>Horas totales</label>
            <input type="number" min="1" step="1" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))} placeholder="Ej: 40" />
          </div>

          <div className="admin-field">
            <label>Fecha inicio <span className="admin-field-optional">(opcional)</span></label>
            <input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
          </div>

          <div className="admin-field">
            <label>Fecha fin <span className="admin-field-optional">(opcional)</span></label>
            <input type="date" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))} />
          </div>

          <div className="admin-field">
            <label>Precio (€)</label>
            <input type="number" min="0" step="1" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="0" />
          </div>

          <div className="admin-field">
            <label>Instructor</label>
            <select className="admin-themed-select" value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))}>
              <option value="">— Sin instructor —</option>
              {form.instructor && !teachers.find(t => t.name === form.instructor) && (
                <option value={form.instructor}>{form.instructor}</option>
              )}
              {teachers.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label>Certificación</label>
            <select value={form.certification} onChange={e => setForm(f => ({ ...f, certification: e.target.value as Certification | '' }))}>
              <option value="">Sin certificación</option>
              <option value="epic">Epic</option>
              <option value="unreal">Unreal</option>
            </select>
          </div>

          {(effectiveWritableOrgs.length > 1 || isSuperAdmin) && (
            <div className="admin-field">
              <label>Organización propietaria</label>
              <select value={form.organizationId} onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))}>
                {effectiveWritableOrgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="admin-field admin-field-wide">
            <label>Tags</label>
            <div className="admin-tags">
              {ALL_TAGS.map(tag => (
                <label key={tag} className="admin-tag-option">
                  <input type="checkbox" checked={form.tags.includes(tag)} onChange={() => handleTagToggle(tag)} />
                  {tag}
                </label>
              ))}
              {form.tags.filter(t => !ALL_TAGS.includes(t)).map(tag => (
                <label key={tag} className="admin-tag-option admin-tag-custom">
                  <input type="checkbox" checked onChange={() => handleTagToggle(tag)} />
                  {tag}
                </label>
              ))}
            </div>
            <div className="admin-tag-creator">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Nuevo tag…"
                className="admin-tag-input"
              />
              <button type="button" className="admin-btn-secondary" onClick={handleAddTag}>+ Añadir</button>
            </div>
          </div>

          <div className="admin-field admin-field-wide">
            <label>Imagen</label>
            <div className="admin-image-field">
              <button type="button" className="admin-btn-secondary" onClick={openPicker}>
                Elegir del catálogo
              </button>
              <button type="button" className="admin-btn-secondary" disabled={uploading} onClick={() => imageInputRef.current?.click()}>
                {uploading ? 'Subiendo…' : 'Subir nueva'}
              </button>
              <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleFileSelect} />
              {(form.selectedImageId || pendingFile) && (
                <button type="button" className="admin-btn-ghost" onClick={clearImage}>✕ Quitar</button>
              )}
            </div>
            {form.linkImagen ? (
              <>
                <img src={form.linkImagen} alt="preview" className="admin-img-preview" />
                {pendingFile && <p className="admin-img-pending">⏳ Se subirá al guardar el curso</p>}
              </>
            ) : (
              <p className="admin-img-empty">Sin imagen — elige del catálogo o sube una nueva</p>
            )}
          </div>

          <div className="admin-field admin-field-wide">
            <label>Vídeo Hero (fondo de cabecera)</label>
            <div className="admin-image-field">
              <button type="button" className="admin-btn-secondary" onClick={() => openVideoPicker('hero')}>
                Elegir del catálogo
              </button>
              {form.selectedHeroVideoId && (
                <button type="button" className="admin-btn-ghost" onClick={() => setForm(f => ({ ...f, selectedHeroVideoId: null, heroVideoUrl: '' }))}>✕ Quitar</button>
              )}
            </div>
            {form.heroVideoUrl
              ? <video src={form.heroVideoUrl} className="admin-img-preview admin-video-preview" muted controls preload="metadata" />
              : <p className="admin-img-empty">Sin vídeo hero — opcional</p>
            }
          </div>

          <div className="admin-field admin-field-wide">
            <label>Trailer</label>
            <div className="admin-trailer-options">
              <div className="admin-trailer-option">
                <p className="admin-trailer-option-label">Vídeo del catálogo</p>
                <div className="admin-image-field">
                  <button type="button" className="admin-btn-secondary" onClick={() => openVideoPicker('trailer')}>
                    Elegir del catálogo
                  </button>
                  {form.selectedTrailerVideoId && (
                    <button type="button" className="admin-btn-ghost" onClick={() => setForm(f => ({ ...f, selectedTrailerVideoId: null, trailerVideoUrl: '' }))}>✕ Quitar</button>
                  )}
                </div>
                {form.trailerVideoUrl && (
                  <video src={form.trailerVideoUrl} className="admin-img-preview admin-video-preview" muted controls preload="metadata" />
                )}
              </div>
              <div className="admin-trailer-option">
                <p className="admin-trailer-option-label">O link de YouTube</p>
                <input
                  type="url"
                  value={form.trailerYoutubeUrl}
                  onChange={e => setForm(f => ({ ...f, trailerYoutubeUrl: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-featured-label">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
              Destacado (aparece en el Hero)
            </label>
          </div>

          <div className="admin-field">
            <label className="admin-featured-label">
              <input type="checkbox" checked={form.isArchived} onChange={e => setForm(f => ({ ...f, isArchived: e.target.checked }))} />
              Archivado (ocultar de la web activa, visible en /cursos)
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-primary" onClick={handleSave}>Guardar</button>
          <button type="button" className="admin-btn-secondary" onClick={() => setShowPreview(p => !p)}>
            {showPreview ? 'Ocultar preview' : 'Previsualizar'}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={onCancel}>Cancelar</button>
        </div>
      </div>

      {/* Live preview pane — la página real del curso, en vivo */}
      {showPreview && (
        <div className="admin-form-preview">
          <div className="admin-form-preview-bar">
            <span>Vista previa en vivo</span>
            <button type="button" onClick={() => setShowPreview(false)}>✕</button>
          </div>
          <div className="admin-form-preview-frame">
            <CoursePageView course={formToCourse(form)} preview />
          </div>
        </div>
      )}
      </div>

      {/* Overlay: picker de catálogo de imágenes */}
      {showPicker && (
        <CatalogImagePicker
          images={catalogImages}
          loading={catalogLoading}
          onSelect={img => {
            if (imageTarget.current) {
              imageTarget.current(img.url)
              imageTarget.current = null
            } else {
              setForm(f => ({ ...f, linkImagen: img.url, selectedImageId: img.id }))
            }
            setShowPicker(false)
          }}
          onClose={() => { imageTarget.current = null; setShowPicker(false) }}
        />
      )}

      {/* Overlay: picker de vídeo hero */}
      {showHeroVideoPicker && (
        <CatalogVideoPicker
          videos={catalogVideos}
          loading={videosLoading}
          onSelect={video => {
            setForm(f => ({ ...f, heroVideoUrl: video.url, selectedHeroVideoId: video.id }))
            setShowHeroVideoPicker(false)
          }}
          onClose={() => setShowHeroVideoPicker(false)}
        />
      )}

      {/* Overlay: picker de vídeo trailer (también sirve a bloques de vídeo) */}
      {showTrailerVideoPicker && (
        <CatalogVideoPicker
          videos={catalogVideos}
          loading={videosLoading}
          onSelect={video => {
            if (videoTarget.current) {
              videoTarget.current(video.url)
              videoTarget.current = null
            } else {
              setForm(f => ({ ...f, trailerVideoUrl: video.url, selectedTrailerVideoId: video.id, trailerYoutubeUrl: '' }))
            }
            setShowTrailerVideoPicker(false)
          }}
          onClose={() => { videoTarget.current = null; setShowTrailerVideoPicker(false) }}
        />
      )}
    </>
  )
}
