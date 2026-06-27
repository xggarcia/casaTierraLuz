import type { TeacherVideo } from '../../../domain/entities/Teacher'

interface Props {
  videos: TeacherVideo[]
  loading: boolean
  onSelect: (video: TeacherVideo) => void
  onClose: () => void
}

export function TeacherVideoPicker({ videos, loading, onSelect, onClose }: Props) {
  return (
    <div className="admin-picker-overlay" onClick={onClose}>
      <div className="admin-picker" onClick={e => e.stopPropagation()}>
        <div className="admin-picker-header">
          <span>Elegir vídeo del catálogo de profesores</span>
          <button type="button" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <p className="admin-images-loading">Cargando…</p>
        ) : (
          <div className="admin-picker-grid">
            {videos.map(video => (
              <button key={video.id} type="button" className="admin-picker-item admin-picker-item-video" onClick={() => onSelect(video)}>
                <video src={video.url} className="admin-picker-video-thumb" muted preload="metadata" />
                <span>{video.name.split('/').pop()}</span>
                <div className="admin-picker-tags">
                  {video.tags.map(t => <span key={t} className="admin-image-tag">{t}</span>)}
                </div>
              </button>
            ))}
            {videos.length === 0 && <p className="admin-images-empty">No hay vídeos en el catálogo.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
