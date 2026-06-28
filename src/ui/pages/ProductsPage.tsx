import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { productRepository } from '../../infrastructure/repositories/SupabaseProductRepository'
import type { Product, Color } from '../../domain/entities/Product'
import { t } from '../../domain/entities/Product'
import '../styles/catalog.css'

const PAGE_SIZE = 12

// ---- Sub-components ----

function ProductCard({ product, statement = false }: { product: Product; statement?: boolean }) {
  const image = product.images[0] ?? null
  const name = t(product.name)
  const desc = product.shortDescription ? t(product.shortDescription) : null

  const uniqueSwatches = product.variants.reduce<Color[]>((acc, v) => {
    if (v.color && !acc.some(c => c.hexCode === v.color!.hexCode)) {
      acc.push(v.color)
    }
    return acc
  }, []).slice(0, 5)

  return (
    <Link
      to={`/producto/${product.id}`}
      className={`catalog__card${statement ? ' catalog__card--statement' : ''}`}
    >
      <div className="catalog__card-image">
        {image ? (
          <img
            src={image}
            alt={name}
            loading={statement ? 'eager' : 'lazy'}
            width={statement ? 800 : 400}
            height={statement ? 600 : 533}
          />
        ) : (
          <div aria-hidden="true" />
        )}
      </div>
      <div className="catalog__card-info">
        <h2 className="catalog__card-name">{name}</h2>
        {desc && <p className="catalog__card-desc">{desc}</p>}
        <div className="catalog__card-footer">
          <span className="catalog__card-price">{product.basePrice.toFixed(2)}&thinsp;€</span>
          {uniqueSwatches.length > 0 && (
            <ul className="catalog__card-swatches" aria-label="Variantes de color">
              {uniqueSwatches.map((c, i) => (
                <li key={i}>
                  <span
                    className="catalog__card-swatch"
                    style={{ backgroundColor: c.hexCode }}
                    title={t(c.name)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Link>
  )
}

function CatalogSkeleton() {
  return (
    <div>
      <div className="catalog-sk__masthead">
        <div className="catalog-sk__inner">
          <div className="catalog-sk__line catalog-sk__line--title" />
          <div className="catalog-sk__line catalog-sk__line--sub" />
        </div>
      </div>
      <div className="catalog-sk__section">
        <div className="catalog-sk__inner">
          <div className="catalog-sk__grid">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <div
                key={i}
                className={`catalog-sk__card${i === 0 ? ' catalog-sk__card--statement' : ''}`}
              >
                <div className="catalog-sk__image" />
                <div className="catalog-sk__info">
                  <div className="catalog-sk__text catalog-sk__text--name" />
                  <div className="catalog-sk__text catalog-sk__text--desc" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----

export function ProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevVisibleRef = useRef(PAGE_SIZE)

  // Fetch all products once
  useEffect(() => {
    productRepository
      .getAll()
      .then(setAllProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Document title
  useEffect(() => {
    document.title = 'Colección — Casa Tierra Luz'
    return () => { document.title = 'Casa Tierra Luz — Velas artesanales' }
  }, [])

  // Masthead entrance (fires once on mount)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.catalog__title, .catalog__subtitle',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.1, duration: 0.65, ease: 'power3.out', delay: 0.05 }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [])

  // Grid entrance when products first arrive
  useEffect(() => {
    if (!allProducts.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.catalog__card',
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.035, duration: 0.55, ease: 'power3.out', delay: 0.1 }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [allProducts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate newly revealed cards after "load more"
  useEffect(() => {
    if (visibleCount <= PAGE_SIZE) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      prevVisibleRef.current = visibleCount
      return
    }
    const grid = containerRef.current?.querySelector<HTMLElement>('.catalog__grid')
    if (!grid) return
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.catalog__card'))
    const newCards = cards.slice(prevVisibleRef.current, visibleCount)
    if (!newCards.length) return
    gsap.fromTo(
      newCards,
      { y: 18, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.04 }
    )
    prevVisibleRef.current = visibleCount
  }, [visibleCount])

  if (loading) return <CatalogSkeleton />

  if (error) {
    return (
      <div className="catalog-state">
        <p className="catalog-state__text">Algo fue mal al cargar la colección.</p>
        <button
          className="catalog-state__action"
          type="button"
          onClick={() => window.location.reload()}
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  if (allProducts.length === 0) {
    return (
      <div className="catalog-state">
        <p className="catalog-state__text">La colección está tomando forma.</p>
        <p className="catalog-state__sub">Vuelve pronto.</p>
      </div>
    )
  }

  const visibleProducts = allProducts.slice(0, visibleCount)
  const hasMore = visibleCount < allProducts.length
  const remaining = Math.min(PAGE_SIZE, allProducts.length - visibleCount)

  return (
    <div ref={containerRef}>
      {/* Masthead */}
      <header className="catalog__masthead">
        <div className="catalog__masthead-inner">
          <h1 className="catalog__title">Colección</h1>
          <p className="catalog__subtitle">Velas artesanales, hechas a mano</p>
        </div>
      </header>

      {/* Grid section */}
      <section className="catalog__section" aria-label="Catálogo de productos">
        <div className="catalog__container">
          <div className="catalog__grid">
            {visibleProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} statement={i === 0} />
            ))}
          </div>

          {hasMore && (
            <div className="catalog__load-more">
              <button
                className="catalog__load-more-btn"
                type="button"
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
              >
                Ver {remaining} más
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
