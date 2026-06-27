import { useEffect, useState } from 'react'
import type { Course } from '../../../domain/entities/Course'
import { enrollmentRepository } from '../../../infrastructure/db'
import { SubmitEnrollment } from '../../../application/use-cases/SubmitEnrollment'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'

interface InscriptionFormProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

const submitEnrollment = new SubmitEnrollment(enrollmentRepository)

export function InscriptionForm({ course, isOpen, onClose }: InscriptionFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', apellidos: '', correo: '', telefono: '' })
  const { t, loc } = useLocale()
  const { user } = useAuth()

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false)
      setSaving(false)
      setSaveError(null)
      setForm({ nombre: '', apellidos: '', correo: '', telefono: '' })
      return
    }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!course || !isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await submitEnrollment.execute({
        courseId:  course.id,
        userId:    user?.id ?? null,
        name:      form.nombre,
        surnames:  form.apellidos,
        email:     form.correo,
        phone:     form.telefono || null,
      })
      setSubmitted(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al enviar la inscripción')
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
              {submitted ? t.enrollSent : `${t.enroll}: ${loc(course.titulo)}`}
            </h3>
            <button type="button" className="btn-form-close" onClick={onClose}>×</button>
          </div>

          {submitted ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <p>{t.thankYou}, {form.nombre}. {t.confirmationAt} <strong style={{ color: 'var(--accent-2)' }}>{form.correo}</strong>.</p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="nombre">{t.name}</label>
                <input id="nombre" type="text" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="apellidos">{t.surname}</label>
                <input id="apellidos" type="text" required value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="correo">{t.email}</label>
                <input id="correo" type="email" required value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="telefono">{t.phone}</label>
                <input id="telefono" type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
              </div>
              {saveError && <p className="auth-error" style={{ marginTop: 8 }}>{saveError}</p>}
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
