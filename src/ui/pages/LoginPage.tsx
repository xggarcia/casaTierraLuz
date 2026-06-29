import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import { es as i18n } from '../../i18n/es'
import '../styles/auth.css'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
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
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('No hemos podido verificar tus datos. Revisa tu correo y contraseña.')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-column" ref={colRef}>
        <h1 className="auth-heading auth-animate">
          {i18n.auth.loginTitle}
        </h1>
        <p className="auth-subheading auth-animate">
          Tu espacio en Casa Tierra Luz
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field auth-animate">
            <label className="auth-label" htmlFor="login-email">
              {i18n.auth.email}
            </label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="auth-field auth-animate">
            <label className="auth-label" htmlFor="login-password">
              {i18n.auth.password}
            </label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
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
            {loading ? 'Entrando…' : i18n.auth.loginButton}
          </button>
        </form>

        <footer className="auth-footer auth-animate">
          <p className="auth-footer-text">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="auth-footer-link">
              Regístrate
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
