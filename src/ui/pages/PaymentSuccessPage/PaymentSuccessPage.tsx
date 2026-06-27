import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { stripeService } from '../../../infrastructure/stripe/stripeService'
import { useUserCourses } from '../../contexts/UserCoursesContext'
import { Header } from '../../components/Header/Header'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useUserCourses()
  const [status, setStatus] = useState<'verifying' | 'ok' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = params.get('session_id')
    if (!sessionId) { setStatus('error'); setErrorMsg('No se encontró la sesión de pago.'); return }

    let verifyError: string | null = null
    stripeService.verifyPayment(sessionId)
      .catch((err) => { verifyError = err instanceof Error ? err.message : 'Error al verificar el pago' })
      .then(() => refresh())
      .then(() => {
        // Si la verificación falló, lo informamos; el enrollment puede haberse
        // creado igualmente (el flujo es idempotente), pero damos feedback honesto.
        if (verifyError) {
          setErrorMsg(verifyError)
          setStatus('error')
        } else {
          setStatus('ok')
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ParticleBackground count={120} opacity={0.5} />
      <Header />
      <main className="payment-success-page">
        <div className="payment-success-card">
          {status === 'verifying' && (
            <>
              <div className="payment-success-spinner" />
              <p className="payment-success-msg">Verificando tu pago…</p>
            </>
          )}
          {status === 'ok' && (
            <>
              <div className="payment-success-icon">✓</div>
              <h1 className="payment-success-title">¡Pago completado!</h1>
              <p className="payment-success-msg">El curso ya está disponible en tu perfil.</p>
              <div className="payment-success-actions">
                <button type="button" className="btn-primary" onClick={() => navigate('/mis-cursos')}>
                  Ir a Mis Cursos
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="payment-success-icon error">!</div>
              <h1 className="payment-success-title">Algo fue mal</h1>
              <p className="payment-success-msg" style={{ color: 'var(--muted)' }}>{errorMsg}</p>
              <p className="payment-success-msg" style={{ fontSize: '0.85rem', marginTop: 8 }}>
                Si el cargo se realizó, contacta con soporte indicando tu email.
              </p>
              <div className="payment-success-actions">
                <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
                  Volver al inicio
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
