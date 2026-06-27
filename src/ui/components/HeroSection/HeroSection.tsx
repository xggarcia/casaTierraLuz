import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import type { HeroItem } from '../../i18n/hero'

const BASE = import.meta.env.BASE_URL

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  return match ? match[1] : null
}

interface HeroSectionProps {
  hero: HeroItem
  isActive: boolean
  onVideoPlayingChange?: (playing: boolean) => void
  onVideoEnded?: () => void
}

export function HeroSection({ hero, isActive, onVideoPlayingChange, onVideoEnded }: HeroSectionProps) {
  const navigate = useNavigate()
  const isExternalImage = hero.image.startsWith('http')
  const baseName = isExternalImage ? '' : hero.image.replace(/\.(jpg|png)$/i, '')
  const formats = isExternalImage ? [] : [`${BASE}${baseName}.jpg`, `${BASE}${baseName}.png`]

  const isYouTube = !!hero.video && (hero.video.includes('youtube.com') || hero.video.includes('youtu.be'))
  const youTubeId = isYouTube && hero.video ? getYouTubeId(hero.video) : null
  const isExternalVideo = !!hero.video && hero.video.startsWith('http') && !isYouTube
  const videoSrc = isExternalVideo ? hero.video : (!hero.video?.startsWith('http') && hero.video ? `${BASE}${hero.video}` : undefined)

  const [imgIndex, setImgIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  const heroBg = isExternalImage
    ? `url('${hero.image}')`
    : imgIndex < formats.length ? `url('${formats[imgIndex]}')` : undefined

  useEffect(() => {
    onVideoPlayingChange?.(playing)
  }, [playing, onVideoPlayingChange])

  // Autoplay native video when slide becomes active; pause/reset when inactive
  useEffect(() => {
    if (!videoSrc) return
    if (isActive) {
      setPlaying(true)
      videoRef.current?.play().catch(() => {})
    } else {
      setPlaying(false)
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
    }
  }, [isActive, videoSrc])

  useEffect(() => {
    if (!isActive) return
    const els = [labelRef.current, titleRef.current, descRef.current, ctaRef.current].filter(Boolean)
    if (tl.current) tl.current.kill()
    tl.current = gsap.timeline({ delay: 0.15 })
      .fromTo(els,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out' }
      )
    return () => { tl.current?.kill() }
  }, [isActive])

  const scrollToContent = () => {
    if (hero.courseSlug) { navigate(`/curso/${hero.courseSlug}`); return }
    document.querySelector('.featured-carousel')?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleVideo = () => {
    if (playing) {
      setPlaying(false)
      videoRef.current?.pause()
    } else {
      setPlaying(true)
      videoRef.current?.play().catch(() => {})
    }
  }

  const handleVideoEnded = () => {
    setPlaying(false)
    onVideoEnded?.()
  }

  const hasVideo = !!(youTubeId || videoSrc)

  return (
    <section
      className="hero-section"
      style={heroBg ? { backgroundImage: heroBg } : undefined}
    >
      {!isExternalImage && <img src={formats[imgIndex]} alt="" hidden onError={() => setImgIndex(i => i + 1)} />}

      {videoSrc && (
        <video
          ref={videoRef}
          className={`hero-video${playing ? ' playing' : ''}`}
          src={videoSrc}
          playsInline
          muted
          onEnded={handleVideoEnded}
        />
      )}

      {youTubeId && playing && (
        <iframe
          className="hero-video playing"
          src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&rel=0&modestbranding=1`}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      )}

      <div className="hero-overlay" />

      {hasVideo && (
        <div
          className={`hero-click-zone${playing ? ' playing' : ''}`}
          onClick={toggleVideo}
          aria-label={playing ? 'Parar vídeo' : 'Reproducir vídeo'}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggleVideo()}
        />
      )}

      <div className="hero-content">
        <span ref={labelRef} className="hero-label" style={{ opacity: 0 }}>{hero.label}</span>
        <h1 ref={titleRef} className="hero-title" style={{ opacity: 0 }}>{hero.title}</h1>
        <p ref={descRef} className="hero-description" style={{ opacity: 0 }}>{hero.description}</p>
        <button ref={ctaRef} type="button" className="hero-cta" style={{ opacity: 0 }} onClick={scrollToContent}>
          {hero.cta}
        </button>
      </div>

      <button type="button" className="hero-scroll" onClick={() => document.querySelector('.roadmap-wrapper')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Scroll down">
        ↓
      </button>
    </section>
  )
}
