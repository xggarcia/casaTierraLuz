import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { productRepository } from '../../infrastructure/repositories/SupabaseProductRepository'
import type { Product, ProductVariant } from '../../domain/entities/Product'
import { t } from '../../domain/entities/Product'
import '../styles/product.css'

function variantLabel(v: ProductVariant): string {
  const color = v.color ? t(v.color.name) : ''
  const scent = v.scent ? t(v.scent.name) : ''
  if (color && scent) return `${color} · ${scent}`
  return color || scent || 'Variante'
}

function variantPrice(v: ProductVariant, basePrice: number): number {
  return v.price ?? basePrice
}

function availabilityText(stock: number): string {
  if (stock === 0) return 'Agotado'
  if (stock === 1) return '1 disponible'
  return `${stock} disponibles`
}

// Split plain text into paragraphs — avoids react-markdown API uncertainty
function renderParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map((para, i) => <p key={i}>{para.trim()}</p>)
}

function Skeleton() {
  return (
    <div className="pdp-skeleton">
      <div className="pdp-skeleton__container">
        <div className="pdp-skeleton__image" />
        <div className="pdp-skeleton__text">
          <div className="pdp-skeleton__line pdp-skeleton__line--title" />
          <div className="pdp-skeleton__line pdp-skeleton__line--body" />
          <div className="pdp-skeleton__line pdp-skeleton__line--body2" />
          <div className="pdp-skeleton__line pdp-skeleton__line--price" />
        </div>
      </div>
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState<Product | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setProduct(undefined)
    setSelectedVariantId(null)
    setSelectedImageIndex(0)
    productRepository
      .getById(Number(id))
      .then(p => {
        setProduct(p)
        setSelectedVariantId(p?.variants[0]?.id ?? null)
      })
      .catch(() => setProduct(undefined))
      .finally(() => setLoading(false))
  }, [id])

  // Entrance animation fires after product data loads
  useEffect(() => {
    if (!product) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.pdp__image-col',
        { x: -24, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }
      )
      gsap.fromTo(
        '.pdp__details > *',
        { y: 22, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 0.65, ease: 'power3.out',
          stagger: 0.07, delay: 0.12,
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [product])

  // Update document title
  useEffect(() => {
    if (product) {
      document.title = `${t(product.name)} — Casa Tierra Luz`
    } else {
      document.title = 'Casa Tierra Luz — Velas artesanales'
    }
    return () => { document.title = 'Casa Tierra Luz — Velas artesanales' }
  }, [product])

  if (loading) return <Skeleton />

  if (!product) {
    return (
      <div className="pdp-error">
        <h1 className="pdp-error__title">Producto no encontrado</h1>
        <p className="pdp-error__sub">
          Es posible que este producto ya no esté disponible.
        </p>
        <Link to="/productos" className="pdp-error__back">
          ← Volver a la colección
        </Link>
      </div>
    )
  }

  const selectedVariant =
    product.variants.find(v => v.id === selectedVariantId) ?? null

  const displayPrice = selectedVariant
    ? variantPrice(selectedVariant, product.basePrice)
    : product.basePrice

  const isOutOfStock =
    selectedVariant !== null && selectedVariant.stock === 0

  const longDesc = t(product.longDescription)
  const shortDesc = t(product.shortDescription)
  const images = product.images
  const mainImage = images[selectedImageIndex] ?? images[0] ?? null

  return (
    <div ref={containerRef}>
      <section className="pdp">
        <div className="pdp__container">
          {/* Back navigation */}
          <Link to="/productos" className="pdp__back">
            <span className="pdp__back-arrow" aria-hidden="true">←</span>
            Colección
          </Link>

          {/* Main grid: image + details */}
          <div className="pdp__main">
            {/* ---- Image column ---- */}
            <div className="pdp__image-col">
              <div className="pdp__image-main">
                {mainImage ? (
                  <img
                    key={selectedImageIndex}
                    src={mainImage}
                    alt={t(product.name)}
                    width="800"
                    height="600"
                    loading="eager"
                  />
                ) : (
                  <div aria-hidden="true" />
                )}
              </div>

              {images.length > 1 && (
                <div className="pdp__thumbnails" role="list" aria-label="Imágenes del producto">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      role="listitem"
                      className={`pdp__thumb${i === selectedImageIndex ? ' pdp__thumb--active' : ''}`}
                      onClick={() => setSelectedImageIndex(i)}
                      aria-label={`Ver imagen ${i + 1}`}
                      aria-pressed={i === selectedImageIndex}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ---- Details column ---- */}
            <div className="pdp__details">
              <h1 className="pdp__name">{t(product.name)}</h1>

              {shortDesc && (
                <p className="pdp__short-desc">{shortDesc}</p>
              )}

              {/* Price */}
              <div className="pdp__price-block">
                <span className="pdp__price">
                  {displayPrice.toFixed(2)}&thinsp;€
                </span>
                {selectedVariant?.price != null &&
                  selectedVariant.price !== product.basePrice && (
                    <span className="pdp__price-note">precio de variante</span>
                  )}
              </div>

              {/* Variant selector */}
              {product.variants.length > 0 && (
                <div>
                  <span className="pdp__variants-label">
                    {product.variants.length === 1 ? 'Variante' : 'Elige tu variante'}
                  </span>
                  <ul className="pdp__variant-list">
                    {product.variants.map(v => {
                      const swatchColor = v.color?.hexCode ?? 'oklch(0.55 0.020 258)'
                      const isSelected = v.id === selectedVariantId
                      const isUnavailable = v.stock === 0

                      return (
                        <li key={v.id}>
                          <button
                            className={[
                              'pdp__variant-btn',
                              isSelected ? 'pdp__variant-btn--selected' : '',
                              isUnavailable ? 'pdp__variant-btn--unavailable' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => !isUnavailable && setSelectedVariantId(v.id)}
                            aria-pressed={isSelected}
                            disabled={isUnavailable}
                          >
                            <span
                              className="pdp__variant-swatch"
                              style={{ backgroundColor: swatchColor }}
                              aria-hidden="true"
                            />
                            <span className="pdp__variant-info">
                              <span className="pdp__variant-name">
                                {variantLabel(v)}
                              </span>
                              <span
                                className={`pdp__variant-availability${
                                  isUnavailable
                                    ? ' pdp__variant-availability--out'
                                    : ''
                                }`}
                              >
                                {availabilityText(v.stock)}
                              </span>
                            </span>
                            <span className="pdp__variant-price">
                              {variantPrice(v, product.basePrice).toFixed(2)}&thinsp;€
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* CTA — styled placeholder, no action */}
              <button
                className="pdp__cta"
                disabled={isOutOfStock}
                aria-disabled={isOutOfStock}
                type="button"
              >
                {isOutOfStock ? 'Agotado' : 'Añadir al carrito'}
              </button>
            </div>
          </div>

          {/* Long description — below the fold */}
          {longDesc && (
            <div className="pdp__long-desc">
              <div className="pdp__long-desc-prose">
                {renderParagraphs(longDesc)}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
