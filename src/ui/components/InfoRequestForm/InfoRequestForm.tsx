import { useEffect, useState } from 'react'
import type { Course } from '../../../domain/entities/Course'
import { infoRequestRepository } from '../../../infrastructure/db'
import { SubmitInfoRequest } from '../../../application/use-cases/SubmitInfoRequest'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { emailService } from '../../../infrastructure/email/emailService'

interface Props {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

const submitInfoRequest = new SubmitInfoRequest(infoRequestRepository)

export function InfoRequestForm({ course, isOpen, onClose }: Props) {
  const { user } = useAuth()
  const { t, loc } = useLocale()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', correo: '', telefono: '', observaciones: '' })

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false); setSaving(false); setError(null)
      setForm({ nombre: '', apellidos: '', correo: '', telefono: '', observaciones: '' })
      return
    }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [isOpen, onClose])

  if (!course || !isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await submitInfoRequest.execute({
        courseId:      course.id,
        userId:        user?.id ?? null,
        name:          form.nombre,
        surnames:      form.apellidos,
        email:         form.correo,
        phone:         form.telefono || null,
        observaciones: form.observaciones || null,
      })
      setSubmitted(true)
      const courseTitle = loc(course.titulo)
      const userName = `${form.nombre} ${form.apellidos}`.trim()
      emailService.send('info-request-ack', form.correo, { userName, courseTitle })
      emailService.sendAdmin('admin-new-info-request', {
        userName, userEmail: form.correo, courseTitle,
        phone: form.telefono || null,
        observations: form.observaciones || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="form-inscripcion-overlay active" onClick={onClose} />
      <div className="form-inscripcion active">
        <form className="inscription-form" onSubmit={handleSubmit}>
          <div className="inscription-form-header">
            <h3 className="inscription-form-title">
              {submitted ? t.infoSent : `${t.requestInfo}: ${loc(course.titulo)}`}
            </h3>
            <button type="button" className="btn-form-close" onClick={onClose}>×</button>
          </div>

          {submitted ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <p>{t.infoThankYou}</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="ir-nombre">{t.name}</label>
                <input id="ir-nombre" type="text" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="ir-apellidos">{t.surname}</label>
                <input id="ir-apellidos" type="text" required value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="ir-correo">{t.email}</label>
                <input id="ir-correo" type="email" required value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="ir-telefono">{t.phone}</label>
                <input id="ir-telefono" type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="ir-obs">{t.observations}</label>
                <textarea id="ir-obs" rows={3} value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
              {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
              <div className="form-actions">
                <button type="submit" className="btn-form-submit" disabled={saving}>
                  {saving ? 'Enviando…' : t.send}
                </button>
                <button type="button" className="btn-form-cancel" onClick={onClose}>{t.cancel}</button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  )
}
