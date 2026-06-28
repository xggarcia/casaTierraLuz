import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { es as i18n } from '../../i18n/es'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signUp(email, password, displayName)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="ui-page">
      <h1>{i18n.auth.registerTitle}</h1>
      <form onSubmit={handleSubmit} className="ui-form">
        <div className="ui-field">
          <label>
            {i18n.auth.displayName}:{' '}
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="ui-field">
          <label>
            {i18n.auth.email}:{' '}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="ui-field">
          <label>
            {i18n.auth.password}:{' '}
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
        </div>
        {error && <p className="ui-error">{error}</p>}
        <button type="submit" disabled={loading}>{i18n.auth.registerButton}</button>
      </form>
      <p>
        <Link to="/login">{i18n.auth.hasAccount}</Link>
      </p>
    </div>
  )
}
