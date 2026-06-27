import { useEffect, useRef, useState } from 'react'
import type { Course } from '../../../domain/entities/Course'
import { CourseCard } from '../CourseCard/CourseCard'

interface CourseGridProps {
  courses: Course[]
  onSelectCourse: (course: Course) => void
  onAdquirir: (course: Course) => void
  onSolicitarInfo: (course: Course) => void
}

const ITEMS_PER_PAGE = 10

// Cards at positions 0 and 5 per page are wide bento featured cards
const FEATURED_POSITIONS = new Set([0, 5])

function CourseCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <article className={`card card-skeleton${featured ? ' bento-card--featured' : ''}`}>
      <div className="card-skeleton-image" style={featured ? { height: 360 } : undefined} />
      <div className="card-skeleton-body">
        <div className="card-skeleton-line card-skeleton-title" />
        <div className="card-skeleton-line card-skeleton-desc" />
        <div className="card-skeleton-line card-skeleton-desc short" />
        <div className="card-skeleton-actions">
          <div className="card-skeleton-btn" />
          <div className="card-skeleton-btn" />
        </div>
      </div>
    </article>
  )
}

export function CourseGrid({ courses, onSelectCourse, onAdquirir, onSolicitarInfo }: CourseGridProps) {
  const [page, setPage] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const shouldScroll = useRef(false)

  useEffect(() => { setPage(0) }, [courses])

  useEffect(() => {
    if (shouldScroll.current && wrapperRef.current) {
      const top = wrapperRef.current.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
      shouldScroll.current = false
    }
  }, [page])

  const totalPages = Math.ceil(courses.length / ITEMS_PER_PAGE)
  const paginated  = courses.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)

  const goTo = (p: number) => {
    shouldScroll.current = true
    setPage(p)
  }

  if (courses.length === 0) {
    return (
      <div className="grid-wrapper">
        <section className="bento-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} featured={FEATURED_POSITIONS.has(i)} />
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className="grid-wrapper" ref={wrapperRef}>
      <section className="bento-grid">
        {paginated.map((course, i) => (
          <CourseCard
            key={course.id}
            index={i}
            course={course}
            featured={FEATURED_POSITIONS.has(i)}
            onSelectCourse={onSelectCourse}
            onAdquirir={onAdquirir}
            onSolicitarInfo={onSolicitarInfo}
          />
        ))}
      </section>

      {totalPages > 1 && (
        <div className="grid-pagination">
          <button
            type="button"
            className="grid-page-btn"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
          >
            ← Anterior
          </button>
          <span className="grid-page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="grid-page-btn"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages - 1}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
