import { UNREAL_ARTICLES } from '../../../data/unrealArticles'
import { useLocale } from '../../hooks/useLocale'

const ARTICLES = Object.values(UNREAL_ARTICLES)

export function NewsSection() {
  const { loc } = useLocale()

  return (
    <section className="news-section">
      <h2 className="news-title">Noticias del sector</h2>
      <div className="news-grid">
        {ARTICLES.map((article, i) => (
          <div
            key={i}
            className="news-card"
            style={{ backgroundImage: `url('${article.linkImagen}')` }}
          >
            <div className="news-card-overlay" />
            <div className="news-card-body">
              <span className="news-card-tag">{loc(article.tipoEtiqueta)}</span>
              <h3 className="news-card-title">{loc(article.titulo)}</h3>
              <p className="news-card-desc">{loc(article.descripcion)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
