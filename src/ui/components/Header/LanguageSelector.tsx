import type { Language } from '../../contexts/LanguageContext'

export const LANGS: { code: Language; label: string }[] = [
  { code: 'ca', label: 'CA' },
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
]

interface Props {
  current: Language
  onChange: (lang: Language) => void
  onSelect?: () => void
}

/** Selector de idioma para escritorio: botón toggle + dropdown. */
export function LanguageSelector({ current, onChange, onSelect }: Props) {
  return (
    <div className="lang-selector nav-extra">
      <button type="button" className="lang-toggle">
        {current.toUpperCase()}
        <span className="lang-chevron" />
      </button>
      <div className="lang-dropdown">
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            className={`lang-option${current === code ? ' active' : ''}`}
            onClick={() => { onChange(code); onSelect?.() }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Selector de idioma para móvil: botones inline en fila. */
export function LanguageSelectorMobile({ current, onChange, onSelect }: Props) {
  return (
    <div className="header-mobile-langs">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`lang-option${current === code ? ' active' : ''}`}
          onClick={() => { onChange(code); onSelect?.() }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
