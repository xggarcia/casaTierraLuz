import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { es as i18n } from '../../i18n/es'
import '../styles/auth.css'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const colRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || !colRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.auth-animate',
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          stagger: 0.07,
          duration: 0.65,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      )
    }, colRef)

    return () => ctx.revert()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password, displayName)
    setLoading(false)
    if (error) {
      setError('No hemos podido crear tu cuenta. Comprueba los datos e inténtalo de nuevo.')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-column" ref={colRef}>
        <h1 className="auth-heading auth-animate">
          {i18n.auth.registerTitle}
        </h1>
        <p className="auth-subheading auth-animate">
          Crea tu cuenta en Casa Tierra Luz
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field auth-animate">
            <label className="auth-label" htmlFor="register-name">
              {i18n.auth.displayName}
            </label>
            <input
              id="register-name"
              className="auth-input"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
              autoFocus
              required
            />
          </div>

          <div className="auth-field auth-animate">
            <label className="auth-label" htmlFor="register-email">
              {i18n.auth.email}
            </label>
            <input
              id="register-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field auth-animate">
            <label className="auth-label" htmlFor="register-password">
              {i18n.auth.password}
            </label>
            <input
              id="register-password"
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="auth-field-hint">Mínimo 6 caracteres</p>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit auth-animate"
            disabled={loading}
          >
            {loading ? 'Creando cuenta…' : i18n.auth.registerButton}
          </button>
        </form>

        <footer className="auth-footer auth-animate">
          <p className="auth-footer-text">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="auth-footer-link">
              Inicia sesión
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
