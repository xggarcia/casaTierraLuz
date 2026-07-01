import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { productRepository } from '../../infrastructure/repositories/SupabaseProductRepository'
import type { Product, ProductVariant } from '../../domain/entities/Product'
import { t } from '../../domain/entities/Product'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { es as i18n } from '../../i18n/es'
import '../styles/product.css'

function variantPrice(v: ProductVariant, basePrice: number): number {
  return v.price ?? basePrice
}

function availabilityText(stock: number): string {
  if (stock === 0) return 'Agotado'
  if (stock === 1) return '1 disponible'
  return `${stock} disponibles`
}

function uniqueById<T extends { id: number }>(list: T[]): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const item of list) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

// Resolves the single variant matching a (color, scent) pair. Either side
// can be null — a product may not vary by color, by scent, or (rarely) by
// either at all, in which case there's exactly one variant to find.
function findVariant(
  variants: ProductVariant[],
  colorId: number | null,
  scentId: number | null
): ProductVariant | null {
  return (
    variants.find(
      v => (v.color?.id ?? null) === colorId && (v.scent?.id ?? null) === scentId
    ) ?? null
  )
}

// A color is pickable if at least one of its scent combinations has stock —
// switching to it never strands the shopper on a fully sold-out color.
function colorHasStock(variants: ProductVariant[], colorId: number): boolean {
  return variants.some(v => v.color?.id === colorId && v.stock > 0)
}

// Mirrors colorHasStock so both axes gate the same way: an option is only
// disabled when it's sold out everywhere, never merely because it doesn't
// pair with whatever is currently selected on the other axis. Clicking any
// enabled option always succeeds and reflows the other axis to a valid
// pairing (see handleSelectColor/handleSelectScent) — nothing is ever a
// dead end, which is the point: two independently-gated axes would strand
// the shopper on options that look pickable but silently don't combine.
function scentHasStock(variants: ProductVariant[], scentId: number): boolean {
  return variants.some(v => v.scent?.id === scentId && v.stock > 0)
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
  const { user } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null)
  const [selectedScentId, setSelectedScentId] = useState<number | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setProduct(undefined)
    setSelectedColorId(null)
    setSelectedScentId(null)
    setSelectedImageIndex(0)
    productRepository
      .getById(Number(id))
      .then(p => {
        setProduct(p)
        const first = p?.variants[0] ?? null
        setSelectedColorId(first?.color?.id ?? null)
        setSelectedScentId(first?.scent?.id ?? null)
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

  const variants = product.variants
  const selectedVariant = findVariant(variants, selectedColorId, selectedScentId)

  const displayPrice = selectedVariant
    ? variantPrice(selectedVariant, product.basePrice)
    : product.basePrice

  const isOutOfStock =
    selectedVariant !== null && selectedVariant.stock === 0

  const colors = uniqueById(
    variants
      .map(v => v.color)
      .filter((c): c is NonNullable<typeof c> => c !== null)
  )
  const scents = uniqueById(
    variants
      .map(v => v.scent)
      .filter((s): s is NonNullable<typeof s> => s !== null)
  )
  const selectedColorName = colors.find(c => c.id === selectedColorId)?.name

  function handleSelectColor(colorId: number) {
    if (colorId === selectedColorId) return
    setSelectedColorId(colorId)
    // Keep the current scent if this color still offers it; otherwise fall
    // back to whatever scent that color's first variant carries, so picking
    // a color never lands on a nonexistent combination.
    if (findVariant(variants, colorId, selectedScentId) === null) {
      const fallback = variants.find(v => v.color?.id === colorId)
      setSelectedScentId(fallback?.scent?.id ?? null)
    }
  }

  function handleSelectScent(scentId: number) {
    if (scentId === selectedScentId) return
    setSelectedScentId(scentId)
    if (findVariant(variants, selectedColorId, scentId) === null) {
      const fallback = variants.find(v => v.scent?.id === scentId)
      setSelectedColorId(fallback?.color?.id ?? null)
    }
  }

  const longDesc = t(product.longDescription)
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

              {longDesc && (
                <div className="pdp__long-desc-prose">
                  {renderParagraphs(longDesc)}
                </div>
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

              {/* Color picker — swatches, since color is the visual attribute */}
              {colors.length > 0 && (
                <div className="pdp__attr">
                  <div className="pdp__attr-head">
                    <span className="pdp__attr-label">
                      {colors.length === 1 ? 'Color' : 'Elige tu color'}
                    </span>
                    {selectedColorName && (
                      <span className="pdp__attr-value">{t(selectedColorName)}</span>
                    )}
                  </div>
                  <div className="pdp__swatch-row" role="radiogroup" aria-label="Color">
                    {colors.map(c => {
                      const disabled = !colorHasStock(variants, c.id)
                      const isSelected = c.id === selectedColorId
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={t(c.name)}
                          title={t(c.name)}
                          className={[
                            'pdp__swatch',
                            isSelected ? 'pdp__swatch--selected' : '',
                            disabled ? 'pdp__swatch--unavailable' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ backgroundColor: c.hexCode }}
                          onClick={() => !disabled && handleSelectColor(c.id)}
                          disabled={disabled}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Scent picker — text chips, since scent isn't visual */}
              {scents.length > 0 && (
                <div className="pdp__attr">
                  <div className="pdp__attr-head">
                    <span className="pdp__attr-label">
                      {scents.length === 1 ? 'Aroma' : 'Elige tu aroma'}
                    </span>
                  </div>
                  <div className="pdp__chip-row" role="radiogroup" aria-label="Aroma">
                    {scents.map(s => {
                      const disabled = !scentHasStock(variants, s.id)
                      const isSelected = s.id === selectedScentId
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={[
                            'pdp__chip',
                            isSelected ? 'pdp__chip--selected' : '',
                            disabled ? 'pdp__chip--unavailable' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => !disabled && handleSelectScent(s.id)}
                          disabled={disabled}
                        >
                          {t(s.name)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Resolved combination's availability */}
              {selectedVariant && (
                <p
                  className={`pdp__availability${
                    selectedVariant.stock === 0 ? ' pdp__availability--out' : ''
                  }`}
                >
                  {availabilityText(selectedVariant.stock)}
                </p>
              )}

              {/* CTA */}
              <button
                className="pdp__cta"
                disabled={isOutOfStock}
                aria-disabled={isOutOfStock}
                type="button"
                onClick={async () => {
                  if (!user) {
                    navigate('/login')
                    return
                  }
                  if (!selectedVariant || isOutOfStock) return
                  await addToCart(selectedVariant.id, 1)
                }}
              >
                {isOutOfStock
                  ? 'Agotado'
                  : !user
                    ? i18n.cart.loginToAdd
                    : 'Añadir al carrito'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
