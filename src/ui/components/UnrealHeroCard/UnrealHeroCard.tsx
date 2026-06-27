import { useEffect, useRef, useState } from 'react'
import type { UnrealArticle } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'

interface UnrealHeroCardProps {
  article: UnrealArticle
}

export function UnrealHeroCard({ article }: UnrealHeroCardProps) {
  const ref = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { loc } = useLocale()

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section ref={ref} className={`unreal-hero-card${isVisible ? ' visible' : ''}`}>
      <div className="unreal-hero-content">
        <div
          className="unreal-hero-image"
          style={{ backgroundImage: `url('${article.linkImagen}')` }}
        >
          <div className="unreal-hero-overlay" />
        </div>
        <div className="unreal-hero-text">
          <span className="unreal-hero-tag">{loc(article.tipoEtiqueta)}</span>
          <h2 className="unreal-hero-title">{loc(article.titulo)}</h2>
          <p className="unreal-hero-description">{loc(article.descripcionExtendida)}</p>
          <div className="unreal-hero-footer">
            <span className="unreal-hero-powered">Powered by Epic Games</span>
            <a
              href="https://www.unrealengine.com"
              target="_blank"
              rel="noopener noreferrer"
              className="unreal-hero-btn"
            >
              Explorar Unreal Engine →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
