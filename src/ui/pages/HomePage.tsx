import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { productRepository } from '../../infrastructure/repositories/SupabaseProductRepository'
import type { Product } from '../../domain/entities/Product'
import { t } from '../../domain/entities/Product'
import '../styles/home.css'

gsap.registerPlugin(ScrollTrigger)

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    productRepository.getAll()
      .then(all => setProducts(all.slice(0, 6)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      // Hero: words arrive from below, staggered
      gsap.from('.home-hero__title-line', {
        y: 52,
        autoAlpha: 0,
        duration: 0.95,
        stagger: 0.14,
        ease: 'power4.out',
        delay: 0.15,
      })
      gsap.from('.home-hero__sub', {
        y: 22,
        autoAlpha: 0,
        duration: 0.7,
        ease: 'power3.out',
        delay: 0.6,
      })
      gsap.from('.home-hero__cta', {
        y: 18,
        autoAlpha: 0,
        duration: 0.6,
        ease: 'power3.out',
        delay: 0.88,
      })

      // Products: featured slides in, then grid items stagger
      gsap.fromTo(
        '.home-products__heading',
        { y: 24, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: '.home-products', start: 'top 82%' },
        }
      )
      gsap.fromTo(
        '.home-products__featured',
        { y: 40, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.85, ease: 'power3.out',
          scrollTrigger: { trigger: '.home-products__featured', start: 'top 85%' },
        }
      )
      gsap.fromTo(
        '.home-products__card-link',
        { y: 28, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.65, ease: 'power3.out',
          stagger: 0.07,
          scrollTrigger: { trigger: '.home-products__grid', start: 'top 82%' },
        }
      )

      // Story section: heading then body
      gsap.fromTo(
        '.home-story__heading',
        { y: 32, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: '.home-story', start: 'top 75%' },
        }
      )
      gsap.fromTo(
        '.home-story__text',
        { y: 24, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.75, ease: 'power3.out', delay: 0.12,
          scrollTrigger: { trigger: '.home-story', start: 'top 75%' },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [])

  const featured = products[0] ?? null
  const rest = products.slice(1)

  return (
    <div ref={containerRef}>
      {/* ---- Hero ---- */}
      <section className="home-hero" aria-label="Bienvenida">
        <div className="home-hero__glow" aria-hidden="true" />
        <div className="home-hero__content">
          <h1 className="home-hero__title">
            <span className="home-hero__title-line">Cada llama,</span>
            <span className="home-hero__title-line">una historia.</span>
          </h1>
          <p className="home-hero__sub">Velas artesanales hechas a mano</p>
          <Link to="/productos" className="home-hero__cta">
            Ver colección
          </Link>
        </div>
      </section>

      {/* ---- Products ---- */}
      <section className="home-products" aria-label="Nuestra colección">
        <div className="home-products__container">
          <h2 className="home-products__heading">Nuestra colección</h2>

          {products.length === 0 && (
            <p className="home-products__empty" aria-live="polite">
              Cargando colección…
            </p>
          )}

          {featured && (
            <article className="home-products__featured">
              <div className="home-products__featured-image">
                {featured.images[0] ? (
                  <img
                    src={featured.images[0]}
                    alt={t(featured.name)}
                    loading="eager"
                    width="800"
                    height="600"
                  />
                ) : (
                  <div className="home-products__image-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="home-products__featured-body">
                <h3 className="home-products__featured-name">{t(featured.name)}</h3>
                {featured.shortDescription && (
                  <p className="home-products__featured-desc">
                    {t(featured.shortDescription)}
                  </p>
                )}
                <p className="home-products__featured-price">
                  {featured.basePrice.toFixed(2)}&thinsp;€
                </p>
                <Link
                  to={`/producto/${featured.id}`}
                  className="home-products__featured-link"
                >
                  Ver producto
                </Link>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <div className="home-products__grid">
              {rest.map(p => (
                <article key={p.id}>
                  <Link to={`/producto/${p.id}`} className="home-products__card-link">
                    <div className="home-products__card-image">
                      {p.images[0] ? (
                        <img
                          src={p.images[0]}
                          alt={t(p.name)}
                          loading="lazy"
                          width="400"
                          height="533"
                        />
                      ) : (
                        <div
                          className="home-products__image-placeholder"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <h3 className="home-products__card-name">{t(p.name)}</h3>
                    <p className="home-products__card-price">
                      {p.basePrice.toFixed(2)}&thinsp;€
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="home-products__more">
              <Link to="/productos" className="home-products__more-link">
                Ver todos los productos
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---- Brand story ---- */}
      <section className="home-story" aria-label="Sobre Casa Tierra Luz">
        <div className="home-story__container">
          <div>
            <h2 className="home-story__heading">El oficio<br />de la luz</h2>
            <p className="home-story__text">
              Cada vela nace de una elección: el aroma, el color, la forma del
              recipiente. Las fabricamos a mano, sin prisa, con materia prima
              seleccionada. Para que el momento de encender la llama sea siempre tuyo.
            </p>
          </div>
          <div className="home-story__visual" aria-hidden="true">
            <time className="home-story__hour">19:42</time>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="home-footer">
        <div className="home-footer__container">
          <p className="home-footer__brand">Casa Tierra Luz</p>
          <p className="home-footer__copy">Velas artesanales · España</p>
        </div>
      </footer>
    </div>
  )
}
