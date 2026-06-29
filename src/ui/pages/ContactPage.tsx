import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { messageRepository } from '../../infrastructure/repositories/SupabaseMessageRepository'
import { es as i18n } from '../../i18n/es'
import '../styles/auth.css'

export function ContactPage() {
  const { user, loading } = useAuth()

  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefilledRef = useRef(false)

  useEffect(() => {
    if (user && !prefilledRef.current) {
      setName(user.user_metadata?.display_name ?? '')
      prefilledRef.current = true
    }
  }, [user])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-column">
          <p>{i18n.loading}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-column">
          <h1 className="auth-heading">{i18n.contact.title}</h1>
          <p className="auth-subheading">{i18n.contact.loginRequired}</p>
          <footer className="auth-footer">
            <p className="auth-footer-text">
              <Link to="/login" className="auth-footer-link">
                {i18n.contact.goLogin}
              </Link>
              {' · '}
              <Link to="/registro" className="auth-footer-link">
                {i18n.contact.goRegister}
              </Link>
            </p>
          </footer>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedName || !trimmedTitle || !trimmedBody) return

    setSending(true)
    setError(null)
    setSuccess(false)

    try {
      await messageRepository.create({
        userId: user.id,
        email: user.email!,
        name: trimmedName,
        title: trimmedTitle,
        body: trimmedBody,
      })
      setName(user.user_metadata?.display_name ?? '')
      setTitle('')
      setBody('')
      setSuccess(true)
    } catch {
      setError(i18n.contact.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-column">
        <h1 className="auth-heading">{i18n.contact.title}</h1>
        <p className="auth-subheading">{i18n.contact.subtitle}</p>

        {success && (
          <p className="auth-success" role="status">
            {i18n.contact.success}
          </p>
        )}

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="contact-name">
              {i18n.contact.fieldName}
            </label>
            <input
              id="contact-name"
              className="auth-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="contact-title">
              {i18n.contact.fieldTitle}
            </label>
            <input
              id="contact-title"
              className="auth-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="contact-body">
              {i18n.contact.fieldMessage}
            </label>
            <textarea
              id="contact-body"
              className="auth-input"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={sending}
          >
            {sending ? i18n.contact.sending : i18n.contact.send}
          </button>
        </form>
      </div>
    </div>
  )
}
