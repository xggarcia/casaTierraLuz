import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Teacher } from '../../../domain/entities/Teacher'
import { teacherRepository } from '../../../infrastructure/db'
import { Header } from '../../components/Header/Header'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

gsap.registerPlugin(ScrollTrigger)

type MediaItem = { type: 'image'; url: string } | { type: 'video'; url: string }

function interleaveMedia(images: string[], videos: string[]): MediaItem[] {
  const result: MediaItem[] = []
  let ii = 0, vi = 0
  while (ii < images.length || vi < videos.length) {
    if (ii < images.length) result.push({ type: 'image', url: images[ii++] })
    if (vi < videos.length) result.push({ type: 'video', url: videos[vi++] })
  }
  return result
}

export function TeacherDetailPage() {
  const { slug }    = useParams<{ slug: string }>()
  const navigate    = useNavigate()
  const [teacher, setTeacher]     = useState<Teacher | null>(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)

  const photoRef      = useRef<HTMLDivElement>(null)
  const identityRef   = useRef<HTMLDivElement>(null)
  const portfolioRef  = useRef<HTMLElement>(null)
  const stripRef      = useRef<HTMLDivElement>(null)
  const stripInnerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    teacherRepository.getBySlug(slug)
      .then(t => { if (!t) setNotFound(true); else setTeacher(t) })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedMedia(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedMedia ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedMedia])

  useEffect(() => {
    if (!teacher) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      if (photoRef.current) photoRef.current.style.opacity = '1'
      if (identityRef.current)
        Array.from(identityRef.current.children).forEach(c => { (c as HTMLElement).style.opacity = '1' })
      // In reduced motion: keep strip as manual scroll (overflow-x: auto via class)
      if (stripRef.current) stripRef.current.classList.add('tdp-media-strip--reduced')
      return
    }

    const ctx = gsap.context(() => {
      // Photo reveal
      if (photoRef.current) {
        gsap.fromTo(photoRef.current,
          { scale: 1.04, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }
        )
      }

      // Identity text stagger
      if (identityRef.current) {
        gsap.fromTo(
          Array.from(identityRef.current.children),
          { opacity: 0, x: 24 },
          { opacity: 1, x: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.18 }
        )
      }

      // Portfolio title reveal
      if (portfolioRef.current) {
        const title = portfolioRef.current.querySelector('.tdp-portfolio-title')
        if (title) {
          gsap.fromTo(title,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out',
              scrollTrigger: { trigger: title, start: 'top 90%', toggleActions: 'play none none none' } }
          )
        }
      }

      // Marquee: continuous auto-scroll of the inner strip
      if (stripRef.current && stripInnerRef.current) {
        const strip = stripRef.current
        const inner = stripInnerRef.current

        // Wait one frame so images have painted and scrollWidth is accurate
        requestAnimationFrame(() => {
          const halfWidth = inner.scrollWidth / 2
          if (halfWidth <= 0) return

          const tween = gsap.to(inner, {
            x: -halfWidth,
            duration: halfWidth / 80, // 80px/s — comfortable reading pace
            ease: 'none',
            repeat: -1,
            onRepeat: () => gsap.set(inner, { x: 0 }),
          })

          const pause = () => tween.pause()
          const play  = () => tween.play()
          strip.addEventListener('mouseenter', pause)
          strip.addEventListener('mouseleave', play)

          // Store cleanup on the element so ctx.revert() can't miss it
          ;(strip as HTMLElement & { _marqueeCleanup?: () => void })._marqueeCleanup = () => {
            strip.removeEventListener('mouseenter', pause)
            strip.removeEventListener('mouseleave', play)
            tween.kill()
          }
        })
      }
    })

    return () => {
      ctx.revert()
      const strip = stripRef.current as (HTMLElement & { _marqueeCleanup?: () => void }) | null
      strip?._marqueeCleanup?.()
    }
  }, [teacher])

  if (loading) return (
    <>
      <ParticleBackground count={250} opacity={0.55} />
      <Header />
      <div className="tdp">
        <div className="tdp-skeleton-hero">
          <div className="tdp-skeleton-identity">
            <div className="tdp-skeleton-line tdp-skeleton-line--name" />
            <div className="tdp-skeleton-line" />
            <div className="tdp-skeleton-line tdp-skeleton-line--short" />
          </div>
          <div className="tdp-skeleton-photo" />
        </div>
      </div>
    </>
  )

  if (notFound || !teacher) return (
    <>
      <ParticleBackground count={250} opacity={0.55} />
      <Header />
      <div className="container">
        <div className="tdp-notfound">
          <p className="auth-error">Instructor no encontrado.</p>
          <button type="button" className="btn-secondary" onClick={() => navigate('/profesorado')}>
            Volver al profesorado
          </button>
        </div>
      </div>
    </>
  )

  const mediaItems = interleaveMedia(teacher.portfolioImages, teacher.portfolioVideos)
  const hasPortfolio = mediaItems.length > 0

  return (
    <>
      <ParticleBackground count={250} opacity={0.55} />
      <Header />

      {selectedMedia && (
        <div
          className="tdp-lightbox"
          onClick={() => setSelectedMedia(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada"
        >
          <button
            type="button"
            className="tdp-lightbox-close"
            onClick={() => setSelectedMedia(null)}
            aria-label="Cerrar"
          >
            &#x2715;
          </button>
          <div className="tdp-lightbox-content" onClick={e => e.stopPropagation()}>
            {selectedMedia.type === 'image'
              ? <img src={selectedMedia.url} alt="Portfolio" className="tdp-lightbox-img" />
              : <video src={selectedMedia.url} controls autoPlay className="tdp-lightbox-video" />
            }
          </div>
        </div>
      )}

      <article className="tdp">

        <div className="tdp-hero">
          <button type="button" className="tdp-back" onClick={() => navigate('/profesorado')}>
            &larr; Profesorado
          </button>

          <div ref={identityRef} className="tdp-identity-col">
            <h1 className="tdp-name">{teacher.name}</h1>

            {teacher.tags.length > 0 && (
              <div className="tdp-tags">
                {teacher.tags.map(tag => (
                  <span key={tag} className="teacher-row-tag">{tag}</span>
                ))}
              </div>
            )}

            {(teacher.linkedinUrl || teacher.socialUrl || teacher.extraUrl) && (
              <div className="tdp-links">
                {teacher.linkedinUrl && (
                  <a href={teacher.linkedinUrl} target="_blank" rel="noopener noreferrer" className="tdp-link">
                    LinkedIn
                  </a>
                )}
                {teacher.socialUrl && (
                  <a href={teacher.socialUrl} target="_blank" rel="noopener noreferrer" className="tdp-link">
                    Social;
                  </a>
                )}
                {teacher.extraUrl && (
                  <a href={teacher.extraUrl} target="_blank" rel="noopener noreferrer" className="tdp-link">
                    Web;
                  </a>
                )}
              </div>
            )}
          </div>

          <div ref={photoRef} className="tdp-photo-col" style={{ opacity: 0 }}>
            {teacher.avatarUrl
              ? <img src={teacher.avatarUrl} alt={teacher.name} className="tdp-photo" referrerPolicy="no-referrer" />
              : <div className="tdp-photo-placeholder" aria-hidden="true">
                  {teacher.name[0]?.toUpperCase() ?? '?'}
                </div>
            }
          </div>
        </div>

        {teacher.bio && (
          <section className="tdp-bio">
            <p>{teacher.bio}</p>
          </section>
        )}

        {hasPortfolio && (
          <section ref={portfolioRef} className="tdp-portfolio">
            <h2 className="tdp-portfolio-title">Portfolio</h2>

            {/* Marquee strip — inner div is what GSAP translates */}
            <div ref={stripRef} className="tdp-media-strip">
              <div ref={stripInnerRef} className="tdp-media-inner">
                {/* Original items */}
                {mediaItems.map((item, i) => (
                  <button
                    key={`a-${i}`}
                    type="button"
                    className="tdp-media-item"
                    onClick={() => setSelectedMedia(item)}
                    aria-label={item.type === 'image' ? `Ver imagen ${i + 1}` : `Ver video ${i + 1}`}
                  >
                    {item.type === 'image'
                      ? <img src={item.url} alt={`Portfolio ${i + 1}`} className="tdp-media-img" loading="lazy" />
                      : <div className="tdp-media-video-thumb">
                          <video src={item.url} className="tdp-media-video-preview" muted playsInline preload="metadata" />
                          <span className="tdp-media-play" aria-hidden="true">&#9654;</span>
                        </div>
                    }
                  </button>
                ))}
                {/* Duplicate for seamless loop */}
                {mediaItems.map((item, i) => (
                  <button
                    key={`b-${i}`}
                    type="button"
                    className="tdp-media-item"
                    onClick={() => setSelectedMedia(item)}
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    {item.type === 'image'
                      ? <img src={item.url} alt="" className="tdp-media-img" loading="lazy" />
                      : <div className="tdp-media-video-thumb">
                          <video src={item.url} className="tdp-media-video-preview" muted playsInline preload="metadata" />
                          <span className="tdp-media-play" aria-hidden="true">&#9654;</span>
                        </div>
                    }
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

      </article>
    </>
  )
}
