import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Header() {
  const { user, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'

  const [scrolled, setScrolled] = useState(() => {
    if (typeof window === 'undefined') return false
    return !isHome || window.scrollY > 60
  })

  useEffect(() => {
    if (!isHome) {
      setScrolled(true)
      return
    }
    setScrolled(window.scrollY > 60)
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const variant = isHome && !scrolled ? 'site-header--transparent' : 'site-header--solid'

  return (
    <header className={`site-header ${variant}`}>
      <Link to="/" className="site-header__logo">
        Casa Tierra Luz
      </Link>
      <nav className="site-header__nav" aria-label="Navegación principal">
        <Link to="/productos" className="site-header__link">Colección</Link>
        <Link to="/contacto" className="site-header__link">Contacto</Link>
        {user ? (
          <>
            {isAdmin && (
              <Link to="/admin" className="site-header__link">Admin</Link>
            )}
            <button onClick={signOut} className="site-header__link">
              Salir
            </button>
          </>
        ) : (
          <Link to="/login" className="site-header__link">Acceder</Link>
        )}
      </nav>
    </header>
  )
}
