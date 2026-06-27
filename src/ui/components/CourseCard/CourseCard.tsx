import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Course, Category } from '../../../domain/entities/Course'
import { CATEGORY_LABELS } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'
import { useUserCourses } from '../../contexts/UserCoursesContext'

gsap.registerPlugin(ScrollTrigger)

interface CourseCardProps {
  course: Course
  index?: number
  featured?: boolean
  onSelectCourse: (course: Course) => void
  onAdquirir: (course: Course) => void
  onSolicitarInfo: (course: Course) => void
}

const SPECIALTY_TAGS = ['realtime', 'produccion-audiovisual', 'arquitectura', 'automocion'] as const

export function CourseCard({ course, index = 0, featured = false, onSelectCourse, onAdquirir, onSolicitarInfo }: CourseCardProps) {
  const ref = useRef<HTMLElement>(null)
  const { t, loc, language } = useLocale()
  const { isEnrolled } = useUserCourses()
  const acquired = isEnrolled(course.id)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    gsap.fromTo(el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.65,
        ease: 'power3.out',
        delay: Math.min(index % 5, 4) * 0.08,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    )

    return () => { ScrollTrigger.getAll().forEach(t => t.vars.trigger === el && t.kill()) }
  }, [index])

  const isFree = !course.precio || course.precio === '0'

  const specialties = course.tags.filter(tag =>
    SPECIALTY_TAGS.includes(tag as (typeof SPECIALTY_TAGS)[number])
  )

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.btn-adquirir') || target.closest('.btn-info') || target.closest('.tag')) return
    onSelectCourse(course)
  }

  return (
    <article
      ref={ref}
      className={`card${featured ? ' bento-card--featured' : ''}`}
      data-tags={course.tags.join(' ')}
      data-course-slug={course.slug}
      onClick={handleCardClick}
    >
      <div
        className="card-image"
        style={{ backgroundImage: `url('${course.linkImagen}')`, height: featured ? 360 : undefined }}
      >
        {course.certification && (
          <div className={`certification-badge certification-${course.certification}`}>
            <img
              src={course.certification === 'epic' ? `${import.meta.env.BASE_URL}certified-epic.png` : `${import.meta.env.BASE_URL}certified-unreal.png`}
              alt={`Certified ${course.certification === 'epic' ? 'Epic' : 'Unreal'}`}
            />
          </div>
        )}
        {acquired && (
          <div className="card-acquired-badge">{t.acquired}</div>
        )}
        <div className="card-dates">
          {course.fechaInicio && <span>{course.fechaInicio}</span>}
          {course.fechaFin && course.fechaFin !== course.fechaInicio && (
            <span>→ {course.fechaFin}</span>
          )}
        </div>
      </div>

      <div className="card-content">
        <h3>{loc(course.titulo)}</h3>
        <p>{loc(course.descripcion)}</p>
        <div className="card-footer">
          <span className="tag tag-type">{loc(course.tipoEtiqueta)}</span>
          {specialties.map(specialty => (
            <span
              key={specialty}
              className={`tag tag-specialty tag-specialty-${specialty}`}
            >
              {CATEGORY_LABELS[language][specialty as Category] ?? specialty}
            </span>
          ))}
        </div>
        <div className="card-actions">
          {acquired ? (
            <button
              type="button"
              className="btn-adquirir btn-primary"
              style={{ flex: 1 }}
              onClick={e => { e.stopPropagation(); onSelectCourse(course) }}
            >
              {t.goToCourse}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-adquirir btn-primary"
                onClick={e => { e.stopPropagation(); onAdquirir(course) }}
              >
                {isFree ? loc({ ca: 'Gratuït', es: 'Gratis', en: 'Free' }) : `${course.precio} €`}
              </button>
              <button
                type="button"
                className="btn-info btn-secondary"
                onClick={e => { e.stopPropagation(); onSolicitarInfo(course) }}
              >
                {t.requestInfo}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
