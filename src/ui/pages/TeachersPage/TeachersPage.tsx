import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Teacher } from '../../../domain/entities/Teacher'
import { teacherRepository } from '../../../infrastructure/db'
import { Header } from '../../components/Header/Header'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

function TeacherRow({ teacher }: { teacher: Teacher }) {
  const navigate = useNavigate()

  return (
    <article
      className="teacher-row"
      onClick={() => navigate(`/profesorado/${teacher.slug}`)}
    >
      <div className="teacher-row-avatar-wrap">
        {teacher.avatarUrl
          ? <img src={teacher.avatarUrl} alt={teacher.name} className="teacher-row-avatar" referrerPolicy="no-referrer" />
          : <div className="teacher-row-avatar teacher-row-avatar--placeholder">{teacher.name[0]?.toUpperCase() ?? '?'}</div>
        }
      </div>

      <div className="teacher-row-body">
        <div className="teacher-row-top">
          <h2 className="teacher-row-name">{teacher.name}</h2>
          {teacher.tags.length > 0 && (
            <div className="teacher-row-tags">
              {teacher.tags.map(tag => <span key={tag} className="teacher-row-tag">{tag}</span>)}
            </div>
          )}
        </div>

        {teacher.bio && (
          <p className="teacher-row-bio">{teacher.bio}</p>
        )}
      </div>

      <div className="teacher-row-aside" onClick={e => e.stopPropagation()}>
        <div className="teacher-row-links">
          {teacher.linkedinUrl && (
            <a href={teacher.linkedinUrl} target="_blank" rel="noopener noreferrer" className="teacher-ext-link" aria-label="LinkedIn">
              LinkedIn
            </a>
          )}
          {teacher.socialUrl && (
            <a href={teacher.socialUrl} target="_blank" rel="noopener noreferrer" className="teacher-ext-link" aria-label="Red social">
              Social ↗
            </a>
          )}
          {teacher.extraUrl && (
            <a href={teacher.extraUrl} target="_blank" rel="noopener noreferrer" className="teacher-ext-link" aria-label="Web">
              Web ↗
            </a>
          )}
        </div>
        <button
          type="button"
          className="teacher-row-cta"
          onClick={() => navigate(`/profesorado/${teacher.slug}`)}
        >
          Ver perfil →
        </button>
      </div>
    </article>
  )
}

function TeacherRowSkeleton() {
  return (
    <div className="teacher-row teacher-row--skeleton" aria-hidden>
      <div className="teacher-row-avatar-wrap">
        <div className="teacher-skel-avatar" />
      </div>
      <div className="teacher-row-body">
        <div className="teacher-skel-name" />
        <div className="teacher-skel-line" />
        <div className="teacher-skel-line teacher-skel-line--short" />
      </div>
    </div>
  )
}

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    teacherRepository.listPublic()
      .then(setTeachers)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar profesores'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <ParticleBackground count={250} opacity={0.55} />
      <Header />
      <div className="container">
        <div className="teachers-page">
          <h1 className="teachers-page-title">Profesorado</h1>

          {error && <p className="auth-error">{error}</p>}

          <div className="teachers-roster">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <TeacherRowSkeleton key={i} />)
              : teachers.length === 0
                ? <p className="teachers-empty">Próximamente.</p>
                : teachers.map(t => <TeacherRow key={t.id} teacher={t} />)
            }
          </div>
        </div>
      </div>
    </>
  )
}
