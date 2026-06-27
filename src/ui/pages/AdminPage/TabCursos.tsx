import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Course } from '../../../domain/entities/Course'
import type { Organization } from '../../../domain/entities/Organization'
import { adminRepository } from '../../../infrastructure/db'
import { useAuth } from '../../contexts/AuthContext'
import { type AdminScope } from './formHelpers'
import { CourseForm } from './CourseForm.tsx'

interface Props {
  organizations: Organization[]
  orgNameById: Map<string, string>
  effectiveWritableOrgs: Organization[]
  showOrgColumn: boolean
  canCreateCourses: boolean
  scope: AdminScope
}

export function TabCursos({ orgNameById, effectiveWritableOrgs, showOrgColumn, canCreateCourses, scope }: Props) {
  const navigate = useNavigate()
  const { canEditCoursesInOrg, canDeleteCoursesInOrg, canSeeEnrollmentsInOrg } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [enrollmentCounts, setEnrollmentCounts] = useState<Map<number, number>>(new Map())
  // null = form cerrado | Course = editando | 'new' = creando
  const [editing, setEditing] = useState<Course | 'new' | null>(null)

  const refresh = async () => {
    const data = await adminRepository.getAdminCourses(scope)
    setCourses(data)
    const counts = await adminRepository.getEnrollmentCounts(data.map(c => c.id))
    setEnrollmentCounts(counts)
  }

  useEffect(() => { refresh() }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

  const editingId = editing === 'new' || editing === null ? null : editing.id

  // Mientras se crea/edita, solo se muestra el formulario (la tabla estorba).
  if (editing !== null) {
    return (
      <CourseForm
        course={editing === 'new' ? null : editing}
        effectiveWritableOrgs={effectiveWritableOrgs}
        scope={scope}
        onDone={() => { refresh(); setEditing(null) }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <>
      <div className="admin-toolbar">
        <button type="button" className="admin-btn-primary" onClick={() => setEditing('new')} disabled={!canCreateCourses}>
          + Añadir curso
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Orden</th><th>Título</th><th>Tipo</th><th>Duración</th><th>Fechas</th>
              <th>★</th><th>Público</th><th>Arch.</th>
              {showOrgColumn && <th>Organización</th>}
              <th>Inscritos</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, i) => {
              const editable     = canEditCoursesInOrg(course.organizationId)
              const deletable    = canDeleteCoursesInOrg(course.organizationId)
              const seeInscritos = canSeeEnrollmentsInOrg(course.organizationId)
              return (
                <tr
                  key={course.id}
                  className={[
                    editingId === course.id ? 'admin-row-active' : '',
                    course.isPublic ? 'admin-row-public' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <td className="admin-col-order">
                    <div className="admin-order-btns">
                      <button
                        type="button"
                        disabled={i === 0 || !editable}
                        onClick={async () => { await adminRepository.moveUp(course.id); refresh() }}
                        aria-label="Subir"
                      >↑</button>
                      <button
                        type="button"
                        disabled={i === courses.length - 1 || !editable}
                        onClick={async () => { await adminRepository.moveDown(course.id); refresh() }}
                        aria-label="Bajar"
                      >↓</button>
                    </div>
                  </td>
                  <td className="admin-col-title">
                    <button type="button" className="admin-course-link" onClick={() => navigate(`/curso/${course.slug}`)}>
                      {course.titulo.es}
                    </button>
                  </td>
                  <td className="admin-col-type">{course.tipoEtiqueta.es}</td>
                  <td className="admin-col-hours">{course.horas != null ? `${course.horas}h` : '—'}</td>
                  <td className="admin-col-dates">
                    {course.fechaInicio || course.fechaFin
                      ? `${course.fechaInicio ?? '?'} → ${course.fechaFin ?? '?'}`
                      : '—'}
                  </td>
                  <td className="admin-col-featured">
                    <button
                      type="button"
                      disabled={!editable}
                      className={`admin-featured-toggle ${course.featured ? 'on' : 'off'}`}
                      onClick={async () => { await adminRepository.saveCourse({ ...course, featured: !course.featured }); refresh() }}
                    >{course.featured ? '★' : '☆'}</button>
                  </td>
                  <td className="admin-col-public">
                    <button
                      type="button"
                      disabled={!editable}
                      className={`admin-visibility-toggle${course.isPublic ? ' is-public' : ''}`}
                      onClick={async () => {
                        await adminRepository.saveCourse({ ...course, isPublic: !course.isPublic })
                        refresh()
                      }}
                    >
                      <span className="vis-label">PÚBLICO</span>
                      <span className="vis-track" />
                      <span className="vis-label">PRIVADO</span>
                    </button>
                  </td>
                  <td className="admin-col-archived">
                    {course.isArchived
                      ? <span className="admin-image-used free">arch.</span>
                      : <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>—</span>}
                  </td>
                  {showOrgColumn && (
                    <td className="admin-col-org">{orgNameById.get(course.organizationId) ?? '—'}</td>
                  )}
                  <td className="admin-col-inscriptions">
                    <button
                      type="button"
                      disabled={!seeInscritos}
                      className="admin-btn-secondary"
                      onClick={() => navigate(`/admin/inscritos/${course.slug}`)}
                    >
                      {enrollmentCounts.get(course.id) ?? 0} ALUMNOS
                    </button>
                  </td>
                  <td className="admin-col-actions">
                    <div className="admin-actions-wrap">
                      {editable && <button type="button" className="admin-btn-edit" onClick={() => setEditing(course)}>Editar</button>}
                      {editable && (
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={async () => { await adminRepository.archiveCourse(course.id, !course.isArchived); refresh() }}
                        >
                          {course.isArchived ? 'Restaurar' : 'Archivar'}
                        </button>
                      )}
                      {deletable && (
                        <button
                          type="button"
                          className="admin-btn-delete"
                          onClick={async () => {
                            if (!window.confirm('¿Borrar este curso?')) return
                            await adminRepository.deleteCourse(course.id)
                            refresh()
                          }}
                        >Borrar</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
