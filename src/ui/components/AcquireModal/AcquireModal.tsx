import { useEffect, useState } from 'react'
import type { Course } from '../../../domain/entities/Course'
import { enrollmentRepository } from '../../../infrastructure/db'
import { SubmitEnrollment } from '../../../application/use-cases/SubmitEnrollment'
import { stripeService } from '../../../infrastructure/stripe/stripeService'
import { emailService } from '../../../infrastructure/email/emailService'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { useUserCourses } from '../../contexts/UserCoursesContext'

interface Props {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

const submitEnrollment = new SubmitEnrollment(enrollmentRepository)

export function AcquireModal({ course, isOpen, onClose }: Props) {
  const { user } = useAuth()
  const { t, loc } = useLocale()
  const { refresh, isEnrolled } = useUserCourses()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) { setDone(false); setSaving(false); setError(null); return }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [isOpen, onClose])

  if (!course || !isOpen || !user) return null

  const isFree = !course.precio || course.precio === '0'
  const alreadyOwned = isEnrolled(course.id)
  const displayName = user.user_metadata?.display_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? ''

  const handleConfirmFree = async () => {
    setSaving(true)
    setError(null)
    try {
      await submitEnrollment.execute({
        courseId:  course.id,
        userId:    user.id,
        name:      displayName,
        surnames:  '',
        email:     user.email ?? '',
        phone:     null,
      })
      await refresh()
      setDone(true)
      const courseTitle = loc(course.titulo)
      emailService.send('course-acquired', user.email ?? '', {
        userName: displayName, courseTitle, courseSlug: course.slug, isFree: true,
      })
      emailService.sendAdmin('admin-new-enrollment', {
        userName: displayName, userEmail: user.email, courseTitle, isFree: true,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('23505') || msg.includes('duplicate')
        ? 'Ya tienes este curso adquirido.'
        : 'Error al adquirir el curso'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCheckout = async () => {
    setSaving(true)
    setError(null)
    try {
      await stripeService.startCheckout(course.id, course.slug, user.id, user.email ?? '')
      // startCheckout redirige, no vuelve aquí en caso de éxito
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago')
      setSaving(false)
    }
  }

  return (
    <>
      <div className="form-inscripcion-overlay active" onClick={onClose} />
      <div className="form-inscripcion active">
        <div className="inscription-form">
          <div className="inscription-form-header">
            <h3 className="inscription-form-title">
              {done ? t.acquireSuccess : `${t.acquire}: ${loc(course.titulo)}`}
            </h3>
            <button type="button" className="btn-form-close" onClick={onClose}>×</button>
          </div>

          {done ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <p>{t.acquireSuccess} {t.confirmationAt} <strong style={{ color: 'var(--accent)' }}>{user.email}</strong>.</p>
            </div>
          ) : alreadyOwned ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <p>✓ {t.acquired}</p>
            </div>
          ) : isFree ? (
            <>
              <p style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
                {t.acquireConfirmFree}
              </p>
              {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-form-submit" disabled={saving} onClick={handleConfirmFree}>
                  {saving ? '…' : t.acquire}
                </button>
                <button type="button" className="btn-form-cancel" onClick={onClose}>{t.cancel}</button>
              </div>
            </>
          ) : (
            <>
              <div className="acquire-price-display">
                <span className="acquire-price-label">Precio</span>
                <span className="acquire-price-value">{course.precio}€</span>
              </div>
              <p style={{ padding: '8px 0 16px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Serás redirigido a la página de pago seguro de Stripe.
              </p>
              {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-form-submit acquire-stripe-btn" disabled={saving} onClick={handleCheckout}>
                  {saving ? 'Redirigiendo…' : `Pagar ${course.precio}€`}
                </button>
                <button type="button" className="btn-form-cancel" onClick={onClose}>{t.cancel}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
