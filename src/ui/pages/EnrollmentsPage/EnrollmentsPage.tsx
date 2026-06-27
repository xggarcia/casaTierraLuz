import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Course } from '../../../domain/entities/Course'
import type { Enrollment } from '../../../application/ports/IAdminRepository'
import { adminRepository } from '../../../infrastructure/db'
import { useAuth } from '../../contexts/AuthContext'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

export function EnrollmentsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { canSeeEnrollmentsInOrg } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!slug) return
      setLoading(true)
      setError(null)
      try {
        const c = await adminRepository.getCourseBySlugForAdmin(slug)
        if (cancelled) return
        if (!c) { setError('Curso no encontrado'); setLoading(false); return }
        setCourse(c)
        const list = await adminRepository.listEnrollments(c.id)
        if (cancelled) return
        setEnrollments(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar inscritos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug])

  const canSee = course ? canSeeEnrollmentsInOrg(course.organizationId) : false

  return (
    <div className="admin-page">
      <ParticleBackground count={60} opacity={0.5} />

      <div className="admin-topbar">
        <button type="button" className="admin-logo-btn" onClick={() => navigate('/')} aria-label="Ir a la web">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Gestmusic" className="admin-logo-img" />
        </button>
        <span className="admin-brand">INSCRITOS</span>
        <button type="button" className="admin-btn-ghost" onClick={() => navigate('/admin')}>← Panel</button>
      </div>

      <div className="admin-enrollments-page">
        {loading && <p className="admin-images-loading">Cargando…</p>}
        {!loading && error && <div className="admin-error">{error}</div>}
        {!loading && !error && course && !canSee && (
          <div className="admin-error">No tienes permisos para ver los inscritos de este curso.</div>
        )}
        {!loading && !error && course && canSee && (
          <>
            <header className="admin-enrollments-header">
              <h1 className="admin-enrollments-title">{course.titulo.es}</h1>
              <p className="admin-enrollments-meta">
                {course.fechaInicio} → {course.fechaFin} · {enrollments.length} {enrollments.length === 1 ? 'inscrito' : 'inscritos'}
              </p>
            </header>

            <table className="admin-table">
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {enrollments.map(e => (
                  <tr key={e.id}>
                    <td>{e.name} {e.surnames}</td>
                    <td>{e.email}</td>
                    <td>{e.phone ?? '—'}</td>
                    <td>{new Date(e.created_at).toLocaleDateString('es-ES')}</td>
                  </tr>
                ))}
                {enrollments.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay inscritos todavía.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
