import { useEffect, useRef, useState } from 'react'
import type { Organization } from '../../../domain/entities/Organization'
import type { CourseImage, CourseVideo } from '../../../application/ports/IAdminRepository'
import { adminRepository } from '../../../infrastructure/db'
import { storageService } from '../../../infrastructure/supabase/storageService'
import { ALL_TAGS, type AdminScope } from './formHelpers'

interface Props {
  orgNameById: Map<string, string>
  effectiveWritableOrgs: Organization[]
  showOrgColumn: boolean
  scope: AdminScope
}

export function TabCatalogo({ orgNameById, effectiveWritableOrgs, showOrgColumn, scope }: Props) {
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images')

  // ── Imágenes ──────────────────────────────────────────────────────────────
  const [catalogImages, setCatalogImages] = useState<CourseImage[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Vídeos ────────────────────────────────────────────────────────────────
  const [catalogVideos, setCatalogVideos] = useState<CourseVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null)
  const [pendingVideoTags, setPendingVideoTags] = useState<string[]>([])
  const videoInputRef = useRef<HTMLInputElement>(null)

  // ── Compartido ────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null)
  const [catalogTargetOrgId, setCatalogTargetOrgId] = useState<string>('')
  useEffect(() => {
    if (catalogTargetOrgId) return
    if (effectiveWritableOrgs.length > 0) setCatalogTargetOrgId(effectiveWritableOrgs[0].id)
  }, [effectiveWritableOrgs, catalogTargetOrgId])

  const [filterName, setFilterName] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterUsed, setFilterUsed] = useState<'all' | 'used' | 'unused'>('all')

  // ── Cargas ────────────────────────────────────────────────────────────────
  const loadImages = async () => {
    setLoadingImages(true); setError(null)
    try { setCatalogImages(await adminRepository.listAdminCourseImages(scope)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar imágenes') }
    finally { setLoadingImages(false) }
  }

  const loadVideos = async () => {
    setLoadingVideos(true); setError(null)
    try { setCatalogVideos(await adminRepository.listAdminCourseVideos(scope)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar vídeos') }
    finally { setLoadingVideos(false) }
  }

  useEffect(() => { loadImages() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab === 'videos' && catalogVideos.length === 0) loadVideos() }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtros ───────────────────────────────────────────────────────────────
  const applyFilters = <T extends { name: string; tags: string[]; is_used: boolean }>(items: T[]) =>
    items
      .filter(i => filterName === '' || i.name.toLowerCase().includes(filterName.toLowerCase()))
      .filter(i => filterTags.length === 0 || filterTags.every(t => i.tags.includes(t)))
      .filter(i => filterUsed === 'all' ? true : filterUsed === 'used' ? i.is_used : !i.is_used)

  // ── Upload imagen ─────────────────────────────────────────────────────────
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPendingFile(file); setPendingTags([]); e.target.value = ''
  }

  const handleImageUpload = async () => {
    if (!pendingFile || !catalogTargetOrgId) return
    setUploadingImage(true); setError(null)
    try {
      const stored = await storageService.upload(pendingFile, catalogTargetOrgId)
      await adminRepository.saveCourseImage({ name: stored.name, url: stored.url, tags: pendingTags, organization_id: catalogTargetOrgId })
      setPendingFile(null); setPendingTags([])
      await loadImages()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al subir') }
    finally { setUploadingImage(false) }
  }

  const handleDeleteImage = async (img: CourseImage) => {
    if (!window.confirm(`¿Borrar "${img.name}"?`)) return
    try { await adminRepository.deleteCourseImage(img.id, img.name); await loadImages() }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al borrar') }
  }

  // ── Upload vídeo ──────────────────────────────────────────────────────────
  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPendingVideoFile(file); setPendingVideoTags([]); e.target.value = ''
  }

  const handleVideoUpload = async () => {
    if (!pendingVideoFile || !catalogTargetOrgId) return
    setUploadingVideo(true); setError(null)
    try {
      const stored = await storageService.uploadVideo(pendingVideoFile, catalogTargetOrgId)
      await adminRepository.saveCourseVideo({ name: stored.name, url: stored.url, tags: pendingVideoTags, organization_id: catalogTargetOrgId })
      setPendingVideoFile(null); setPendingVideoTags([])
      await loadVideos()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al subir') }
    finally { setUploadingVideo(false) }
  }

  const handleDeleteVideo = async (video: CourseVideo) => {
    if (!window.confirm(`¿Borrar "${video.name}"?`)) return
    try { await adminRepository.deleteCourseVideo(video.id, video.name); await loadVideos() }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al borrar') }
  }

  return (
    <div className="admin-images-section">
      {/* Pestañas */}
      <div className="admin-catalog-tabs">
        <button
          type="button"
          className={`admin-catalog-tab${activeTab === 'images' ? ' active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          Imágenes
        </button>
        <button
          type="button"
          className={`admin-catalog-tab${activeTab === 'videos' ? ' active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          Vídeos
        </button>
      </div>

      {/* Toolbar compartida */}
      <div className="admin-images-toolbar">
        {effectiveWritableOrgs.length > 1 && (
          <select className="admin-role-select" value={catalogTargetOrgId} onChange={e => setCatalogTargetOrgId(e.target.value)}>
            {effectiveWritableOrgs.map(o => <option key={o.id} value={o.id}>Subir a: {o.name}</option>)}
          </select>
        )}
        {activeTab === 'images' ? (
          <>
            <button type="button" className="admin-btn-primary" disabled={uploadingImage || !catalogTargetOrgId} onClick={() => fileInputRef.current?.click()}>
              {uploadingImage ? 'Subiendo…' : '+ Subir imagen'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageFileSelect} />
          </>
        ) : (
          <>
            <button type="button" className="admin-btn-primary" disabled={uploadingVideo || !catalogTargetOrgId} onClick={() => videoInputRef.current?.click()}>
              {uploadingVideo ? 'Subiendo…' : '+ Subir vídeo'}
            </button>
            <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoFileSelect} />
          </>
        )}
      </div>

      {/* Pending upload — imagen */}
      {activeTab === 'images' && pendingFile && (
        <div className="admin-pending-upload">
          <p className="admin-pending-title">Imagen seleccionada: <strong>{pendingFile.name}</strong></p>
          <p className="admin-pending-label">Tags:</p>
          <div className="admin-tags">
            {ALL_TAGS.map(tag => (
              <label key={tag} className="admin-tag-option">
                <input type="checkbox" checked={pendingTags.includes(tag)} onChange={() => setPendingTags(ts => ts.includes(tag) ? ts.filter(t => t !== tag) : [...ts, tag])} />
                {tag}
              </label>
            ))}
          </div>
          <div className="admin-pending-actions">
            <button type="button" className="admin-btn-primary" disabled={uploadingImage} onClick={handleImageUpload}>
              {uploadingImage ? 'Subiendo…' : 'Confirmar subida'}
            </button>
            <button type="button" className="admin-btn-secondary" onClick={() => setPendingFile(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Pending upload — vídeo */}
      {activeTab === 'videos' && pendingVideoFile && (
        <div className="admin-pending-upload">
          <p className="admin-pending-title">Vídeo seleccionado: <strong>{pendingVideoFile.name}</strong></p>
          <p className="admin-pending-label">Tags:</p>
          <div className="admin-tags">
            {ALL_TAGS.map(tag => (
              <label key={tag} className="admin-tag-option">
                <input type="checkbox" checked={pendingVideoTags.includes(tag)} onChange={() => setPendingVideoTags(ts => ts.includes(tag) ? ts.filter(t => t !== tag) : [...ts, tag])} />
                {tag}
              </label>
            ))}
          </div>
          <div className="admin-pending-actions">
            <button type="button" className="admin-btn-primary" disabled={uploadingVideo} onClick={handleVideoUpload}>
              {uploadingVideo ? 'Subiendo…' : 'Confirmar subida'}
            </button>
            <button type="button" className="admin-btn-secondary" onClick={() => setPendingVideoFile(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}

      {/* Filtros */}
      <div className="admin-catalog-filters">
        <input type="text" className="admin-catalog-search" placeholder="Buscar por nombre…" value={filterName} onChange={e => setFilterName(e.target.value)} />
        <div className="admin-catalog-filter-tags">
          {ALL_TAGS.map(tag => (
            <label key={tag} className="admin-tag-option">
              <input type="checkbox" checked={filterTags.includes(tag)} onChange={() => setFilterTags(ts => ts.includes(tag) ? ts.filter(t => t !== tag) : [...ts, tag])} />
              {tag}
            </label>
          ))}
        </div>
        <select className="admin-catalog-used-filter" value={filterUsed} onChange={e => setFilterUsed(e.target.value as 'all' | 'used' | 'unused')}>
          <option value="all">Todos</option>
          <option value="used">Usados</option>
          <option value="unused">Libres</option>
        </select>
      </div>

      {/* Grid imágenes */}
      {activeTab === 'images' && (
        loadingImages ? <p className="admin-images-loading">Cargando…</p> : (
          <div className="admin-images-grid">
            {applyFilters(catalogImages).map(img => (
              <div key={img.id} className="admin-image-card">
                <img src={img.url} alt={img.name} />
                <span className="admin-image-name">{img.name}</span>
                <div className="admin-image-tags">{img.tags.map(t => <span key={t} className="admin-image-tag">{t}</span>)}</div>
                <span className={`admin-image-used ${img.is_used ? 'used' : 'free'}`}>{img.is_used ? 'Usada' : 'Libre'}</span>
                {showOrgColumn && <span className="admin-image-org">{orgNameById.get(img.organization_id) ?? '—'}</span>}
                <button type="button" className="admin-image-delete" onClick={() => handleDeleteImage(img)}>✕</button>
              </div>
            ))}
            {applyFilters(catalogImages).length === 0 && (
              <p className="admin-images-empty">{catalogImages.length === 0 ? 'No hay imágenes en el catálogo.' : 'Sin resultados.'}</p>
            )}
          </div>
        )
      )}

      {/* Grid vídeos */}
      {activeTab === 'videos' && (
        loadingVideos ? <p className="admin-images-loading">Cargando…</p> : (
          <div className="admin-images-grid">
            {applyFilters(catalogVideos).map(video => (
              <div key={video.id} className="admin-image-card admin-video-card">
                <video src={video.url} className="admin-video-thumb" muted preload="metadata" />
                <span className="admin-image-name">{video.name.split('/').pop()}</span>
                <div className="admin-image-tags">{video.tags.map(t => <span key={t} className="admin-image-tag">{t}</span>)}</div>
                <span className={`admin-image-used ${video.is_used ? 'used' : 'free'}`}>{video.is_used ? 'Usado' : 'Libre'}</span>
                {showOrgColumn && <span className="admin-image-org">{orgNameById.get(video.organization_id) ?? '—'}</span>}
                <button type="button" className="admin-image-delete" onClick={() => handleDeleteVideo(video)}>✕</button>
              </div>
            ))}
            {applyFilters(catalogVideos).length === 0 && (
              <p className="admin-images-empty">{catalogVideos.length === 0 ? 'No hay vídeos en el catálogo.' : 'Sin resultados.'}</p>
            )}
          </div>
        )
      )}
    </div>
  )
}
