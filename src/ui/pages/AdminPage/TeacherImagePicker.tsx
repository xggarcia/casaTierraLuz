import type { TeacherImage } from '../../../domain/entities/Teacher'

interface Props {
  images: TeacherImage[]
  loading: boolean
  onSelect: (img: TeacherImage) => void
  onClose: () => void
}

export function TeacherImagePicker({ images, loading, onSelect, onClose }: Props) {
  return (
    <div className="admin-picker-overlay" onClick={onClose}>
      <div className="admin-picker" onClick={e => e.stopPropagation()}>
        <div className="admin-picker-header">
          <span>Elegir imagen del catálogo de profesores</span>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <p className="admin-images-loading">Cargando…</p>
        ) : (
          <div className="admin-picker-grid">
            {images.map(img => (
              <button key={img.id} type="button" className="admin-picker-item" onClick={() => onSelect(img)}>
                <img src={img.url} alt={img.name} />
                <span>{img.name.split('/').pop()}</span>
                <div className="admin-picker-tags">
                  {img.tags.map(t => <span key={t} className="admin-image-tag">{t}</span>)}
                </div>
              </button>
            ))}
            {images.length === 0 && <p className="admin-images-empty">No hay imágenes en el catálogo.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
