import ReactMarkdown from 'react-markdown'
import type { Course } from '../../../domain/entities/Course'
import { Footer } from '../../components/Footer/Footer'
import { CourseSectionsView } from '../../components/CourseSections/CourseSectionsView'
import { parseContent, blockKind } from '../../components/CourseSections/sectionTypes'
import { TrailerVideo, TrailerYouTube } from '../../components/CourseSections/Trailer'
import { useLocale } from '../../hooks/useLocale'
import { calcDuration } from '../../utils/dateUtils'

interface Props {
  course: Course
  /** Preview mode: hides footer/back, disables actions, shows an Edit button. */
  preview?: boolean
  acquired?: boolean
  instructorSlug?: string | null
  onAcquire?: () => void
  onRequestInfo?: () => void
  onShare?: () => void
  onInstructor?: (slug: string) => void
  onBack?: () => void
  onEdit?: () => void
}

export function CoursePageView({
  course, preview = false, acquired = false, instructorSlug = null,
  onAcquire, onRequestInfo, onShare, onInstructor, onBack, onEdit,
}: Props) {
  const { t, loc } = useLocale()
  const isFree = !course.precio || course.precio === '0'

  const ext = loc(course.descripcionExtendida)
  const blocks = parseContent(ext)

  // Legacy trailer (course field): rendered at the top of the column only when
  // the content isn't block-based, or has no video block of its own.
  const hasVideoBlock = blocks?.some(b => blockKind(b) === 'video') ?? false
  const showLegacyTrailer = Boolean(course.trailerVideoUrl || course.trailerYoutubeUrl) && !hasVideoBlock

  return (
    <main className={`course-page${preview ? ' course-page--preview' : ''}`}>
      <div
        className="course-page-hero"
        style={{ backgroundImage: `url('${course.linkImagen}')` }}
      >
        <div className="course-page-hero-overlay" />
        {!course.isPublic && (
          <div className="course-page-private-badge">PRIVADO</div>
        )}
        <div className="course-page-hero-content">
          <span className="modal-tag">{loc(course.tipoEtiqueta)}</span>
          <h1>{loc(course.titulo)}</h1>
        </div>
      </div>

      <div className="container">
        {preview ? (
          onEdit && (
            <button type="button" className="btn-primary course-page-edit" onClick={onEdit}>
              ✎ Editar
            </button>
          )
        ) : (
          <button type="button" className="btn-secondary course-page-back" onClick={onBack}>
            ← {loc({ ca: 'Tornar', es: 'Volver', en: 'Back' })}
          </button>
        )}

        <div className="course-page-body">
          {/* Blocks column — content flows in the admin-defined order */}
          <div className="course-page-main">
            {showLegacyTrailer && (
              course.trailerVideoUrl
                ? <TrailerVideo url={course.trailerVideoUrl} />
                : course.trailerYoutubeUrl ? <TrailerYouTube url={course.trailerYoutubeUrl} /> : null
            )}

            {blocks && blocks.length > 0 ? (
              <CourseSectionsView sections={blocks} />
            ) : ext ? (
              <div className="course-page-description course-page-description--md">
                <ReactMarkdown>{ext}</ReactMarkdown>
              </div>
            ) : (
              <p className="course-page-description">{loc(course.descripcion)}</p>
            )}
          </div>

          {/* Sticky sidebar — purchase card stays visible through the scroll */}
          <aside className="course-page-sidebar">
            <div className="course-page-sidebar-price">
              <span className={`course-page-sidebar-price-value${isFree ? ' is-free' : ''}`}>
                {isFree ? loc({ ca: 'Gratuït', es: 'Gratis', en: 'Free' }) : `${course.precio}€`}
              </span>
              {!isFree && <span className="course-page-sidebar-price-label">precio del programa</span>}
            </div>

            <div className="course-page-sidebar-cta">
              {acquired ? (
                <div className="course-acquired-notice">✓ {t.acquired}</div>
              ) : (
                <button type="button" className="btn-primary" onClick={onAcquire}>
                  {t.acquire}
                </button>
              )}
            </div>

            <div className="course-page-sidebar-meta">
              <div className="course-page-sidebar-meta-row">
                <span className="info-label">{t.duration}</span>
                <span className="info-value">
                  {course.horas
                    ? `${course.horas}h`
                    : (course.fechaInicio && course.fechaFin ? calcDuration(course.fechaInicio, course.fechaFin) : '') || t.tbd}
                </span>
              </div>
              <div className="course-page-sidebar-meta-row">
                <span className="info-label">{t.instructor}</span>
                <span className="info-value">
                  {course.instructor
                    ? instructorSlug
                      ? <button type="button" className="instructor-link" onClick={() => onInstructor?.(instructorSlug)}>{course.instructor}</button>
                      : course.instructor
                    : t.toConfirm}
                </span>
              </div>
              {course.fechaInicio && (
                <div className="course-page-sidebar-meta-row">
                  <span className="info-label">{t.start}</span>
                  <span className="info-value">{course.fechaInicio}</span>
                </div>
              )}
              {course.fechaFin && (
                <div className="course-page-sidebar-meta-row">
                  <span className="info-label">{t.end}</span>
                  <span className="info-value">{course.fechaFin}</span>
                </div>
              )}
            </div>

            <div className="course-page-sidebar-secondary">
              <button type="button" className="btn-secondary" onClick={onRequestInfo}>
                {t.requestInfo}
              </button>
              <button type="button" className="course-page-share-btn" onClick={onShare}>
                {t.share}
              </button>
            </div>
          </aside>
        </div>

        {!preview && <Footer />}
      </div>
    </main>
  )
}
