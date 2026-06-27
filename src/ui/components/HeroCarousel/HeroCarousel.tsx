import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useLocale } from '../../hooks/useLocale'
import type { Course } from '../../../domain/entities/Course'
import { HERO_CONTENT, type HeroItem } from '../../i18n/hero'
import { HeroSection } from '../HeroSection/HeroSection'

interface Props {
  featuredCourses?: Course[]
  loading?: boolean
}

const CTA: Record<string, string> = { ca: 'Veure curs', es: 'Ver curso', en: 'View course' }

export function HeroCarousel({ featuredCourses = [], loading = false }: Props) {
  const { language } = useLanguage()
  const { loc } = useLocale()

  const heroes: HeroItem[] = (!loading && featuredCourses.length > 0)
    ? featuredCourses.map(c => ({
        label:       loc(c.tipoEtiqueta),
        title:       loc(c.titulo),
        description: loc(c.descripcion),
        cta:         CTA[language] ?? 'Ver curso',
        image:       c.linkImagen,
        video:       c.heroVideoUrl,
        courseSlug:  c.slug,
      }))
    : loading ? [] : HERO_CONTENT[language]

  const total = heroes.length
  const [current, setCurrent] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const touchStartX = useRef(0)
  const videoEndedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = (i: number) => setCurrent(((i % total) + total) % total)

  useEffect(() => {
    setCurrent(0)
  }, [featuredCourses])

  // Normal auto-advance when no video is playing
  useEffect(() => {
    if (videoPlaying || total <= 1) return
    const id = setInterval(() => goTo(current + 1), 7000)
    return () => clearInterval(id)
  }, [current, videoPlaying, total])

  const handleVideoEnded = () => {
    if (videoEndedTimer.current) clearTimeout(videoEndedTimer.current)
    videoEndedTimer.current = setTimeout(() => goTo(current + 1), 2000)
  }

  useEffect(() => () => {
    if (videoEndedTimer.current) clearTimeout(videoEndedTimer.current)
  }, [])

  if (loading) return (
    <div className="hero-carousel-skeleton" aria-hidden="true">
      <div className="hero-carousel-skeleton-inner">
        <div className="hero-carousel-skeleton-line hero-carousel-skeleton-line--label" />
        <div className="hero-carousel-skeleton-line hero-carousel-skeleton-line--title" />
        <div className="hero-carousel-skeleton-line hero-carousel-skeleton-line--title hero-carousel-skeleton-line--title2" />
        <div className="hero-carousel-skeleton-line hero-carousel-skeleton-line--sub" />
        <div className="hero-carousel-skeleton-line hero-carousel-skeleton-line--cta" />
      </div>
    </div>
  )

  if (total === 0) return null

  return (
    <section className="hero-carousel">
      <div
        id="arriba"
        className="hero-carousel-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={e => { touchStartX.current = e.changedTouches[0].screenX }}
        onTouchEnd={e => {
          const diff = touchStartX.current - e.changedTouches[0].screenX
          if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1))
        }}
      >
        {heroes.map((h, i) => (
          <div key={i} className="hero-carousel-slide">
            <HeroSection
              hero={h}
              isActive={i === current}
              onVideoPlayingChange={setVideoPlaying}
              onVideoEnded={i === current ? handleVideoEnded : undefined}
            />
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="hero-nav hero-nav-prev"
            aria-label="Anterior"
            onClick={() => goTo(current - 1)}
          />
          <button
            type="button"
            className="hero-nav hero-nav-next"
            aria-label="Siguiente"
            onClick={() => goTo(current + 1)}
          />
        </>
      )}
    </section>
  )
}
