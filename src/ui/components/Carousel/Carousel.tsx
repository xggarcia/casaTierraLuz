import { useEffect, useRef, useState } from 'react'
import type { Course } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'

interface CarouselProps {
  courses: Course[]
  onSelectCourse: (course: Course) => void
}

export function Carousel({ courses, onSelectCourse }: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const { t, loc } = useLocale()

  const total = courses.length

  const goTo = (index: number) => {
    setCurrentSlide(((index % total) + total) % total)
  }

  useEffect(() => {
    if (isPaused || total === 0) return
    const id = setInterval(() => goTo(currentSlide + 1), 5000)
    return () => clearInterval(id)
  }, [isPaused, currentSlide, total])

  if (total === 0) return null

  return (
    <section className="featured-carousel">
      <div
        className="carousel-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <button
          type="button"
          className="carousel-btn carousel-prev"
          aria-label="Anterior"
          onClick={() => goTo(currentSlide - 1)}
        >
          ‹
        </button>

        <div
          ref={trackRef}
          className="carousel-track"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          onTouchStart={e => { touchStartX.current = e.changedTouches[0].screenX }}
          onTouchEnd={e => {
            const diff = touchStartX.current - e.changedTouches[0].screenX
            if (Math.abs(diff) > 50) goTo(currentSlide + (diff > 0 ? 1 : -1))
          }}
        >
          {courses.map((course, i) => (
            <div
              key={course.id}
              className={`carousel-slide${i === currentSlide ? ' active' : ''}`}
            >
              <article
                className="featured-card"
                onClick={() => onSelectCourse(course)}
              >
                <div
                  className="featured-image"
                  style={{ backgroundImage: `url('${course.linkImagen}')` }}
                >
                  {course.certification && (
                    <div className={`certification-badge certification-${course.certification} featured-certification`}>
                      <img
                        src={course.certification === 'epic' ? `${import.meta.env.BASE_URL}certified-epic.png` : `${import.meta.env.BASE_URL}certified-unreal.png`}
                        alt={`Certified ${course.certification === 'epic' ? 'Epic' : 'Unreal'}`}
                      />
                    </div>
                  )}
                </div>
                <div className="featured-content">
                  <span className="featured-tag">{loc(course.tipoEtiqueta)}</span>
                  <h2>{loc(course.titulo)}</h2>
                  <p>{loc(course.descripcion)}</p>
                  <div className="featured-dates">
                    {course.fechaInicio && <span>{t.start}: {course.fechaInicio}</span>}
                    {course.fechaFin && <span>{t.end}: {course.fechaFin}</span>}
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="carousel-btn carousel-next"
          aria-label="Siguiente"
          onClick={() => goTo(currentSlide + 1)}
        >
          ›
        </button>
      </div>

      <div className="carousel-indicators">
        {courses.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`indicator${i === currentSlide ? ' active' : ''}`}
            aria-label={`${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  )
}
