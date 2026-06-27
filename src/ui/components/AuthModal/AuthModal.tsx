import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type Mode = 'login' | 'register'

function PasswordInput({ id, value, onChange, placeholder }: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="auth-password-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        required
        minLength={6}
      />
      <button
        type="button"
        className="auth-password-eye"
        onMouseDown={() => setShow(true)}
        onMouseUp={() => setShow(false)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(true)}
        onTouchEnd={() => setShow(false)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error)
      } else {
        onClose()
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        setError(error)
      } else {
        onClose()
      }
    }

    setLoading(false)
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError(null)
    setPassword('')
    setPassword2('')
  }

  return (
    <div className="auth-overlay">
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <h2 className="auth-title">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Contraseña</label>
            <PasswordInput id="auth-password" value={password} onChange={setPassword} />
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-password2">Repite la contraseña</label>
              <PasswordInput id="auth-password2" value={password2} onChange={setPassword2} />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-divider"><span>o</span></div>

        <button type="button" className="auth-google" onClick={signInWithGoogle}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width={18} height={18} />
          Continuar con Google
        </button>

        <p className="auth-switch">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
          {' '}
          <button type="button" onClick={switchMode}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}
