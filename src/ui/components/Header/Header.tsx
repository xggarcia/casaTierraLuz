import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useLocale } from '../../hooks/useLocale'
import { useAuth } from '../../contexts/AuthContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { AuthModal } from '../AuthModal/AuthModal'
import { LanguageSelector, LanguageSelectorMobile } from './LanguageSelector'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const { language, setLanguage } = useLanguage()
  const { t } = useLocale()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useClickOutside(headerRef, () => setMenuOpen(false), menuOpen)

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  const scrollToCalendar = () => {
    document.querySelector('.calendar-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header ref={headerRef} className={isScrolled ? 'scrolled' : ''}>
        <div className="header-content">
          <div className="header-bar">
            <button type="button" className="logo-container" onClick={handleLogoClick} aria-label="Inicio">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Gestmusic" className="logo-image" />
            </button>

            <nav className="header-nav">
              <a
                href="https://barcelonaxrlab.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-btn nav-extra"
              >
                XRLAB
              </a>

              <button type="button" className="nav-btn nav-extra" onClick={() => navigate('/cursos')}>
                {t.allCourses}
              </button>

              <button type="button" className="nav-btn nav-extra" onClick={() => navigate('/profesorado')}>
                Profesores
              </button>

              <button type="button" className="nav-btn nav-extra" onClick={scrollToCalendar}>
                {t.calendar}
              </button>

              {user ? (
                <button type="button" className="nav-btn nav-btn-user" onClick={() => navigate('/perfil')}>
                  {(user.user_metadata?.avatar_url ?? user.user_metadata?.picture)
                    ? <img src={user.user_metadata.avatar_url ?? user.user_metadata.picture} alt="" className="nav-avatar" referrerPolicy="no-referrer" />
                    : <div className="nav-avatar nav-avatar-placeholder">
                        {(user.user_metadata?.display_name ?? user.user_metadata?.name ?? user.email ?? '?')[0].toUpperCase()}
                      </div>
                  }
                  <span className="header-user-name">
                    {user.user_metadata.display_name ?? user.user_metadata.name ?? user.email?.split('@')[0]}
                  </span>
                </button>
              ) : (
                <button type="button" className="nav-btn" onClick={() => setAuthOpen(true)}>
                  {t.login}
                </button>
              )}

              <LanguageSelector current={language} onChange={setLanguage} />

              <button
                type="button"
                className={`header-menu-btn${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                aria-expanded={menuOpen}
              >
                <span /><span /><span />
              </button>
            </nav>
          </div>

          <div className={`header-mobile-menu${menuOpen ? ' open' : ''}`}>
            <a
              href="https://barcelonaxrlab.com/en/about-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-btn"
              onClick={() => setMenuOpen(false)}
            >
              XRLAB
            </a>
            <button
              type="button"
              className="nav-btn"
              onClick={() => { navigate('/cursos'); setMenuOpen(false) }}
            >
              {t.allCourses}
            </button>
            {user && (
              <button
                type="button"
                className="nav-btn"
                onClick={() => { navigate('/mis-cursos'); setMenuOpen(false) }}
              >
                {t.myCourses}
              </button>
            )}
            <button
              type="button"
              className="nav-btn"
              onClick={() => { scrollToCalendar(); setMenuOpen(false) }}
            >
              {t.calendar}
            </button>
            <LanguageSelectorMobile
              current={language}
              onChange={setLanguage}
              onSelect={() => setMenuOpen(false)}
            />
          </div>
        </div>
      </header>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
