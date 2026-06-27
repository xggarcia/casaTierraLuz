import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Course } from '../../../domain/entities/Course'
import { adminRepository, courseRepository, teacherRepository } from '../../../infrastructure/db'
import { GetCourseBySlug } from '../../../application/use-cases/GetCourseBySlug'
import { Header } from '../../components/Header/Header'
import { AcquireModal } from '../../components/AcquireModal/AcquireModal'
import { InfoRequestForm } from '../../components/InfoRequestForm/InfoRequestForm'
import { AuthModal } from '../../components/AuthModal/AuthModal'
import { useAuth } from '../../contexts/AuthContext'
import { useUserCourses } from '../../contexts/UserCoursesContext'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'
import { CoursePageView } from './CoursePageView'

export function CoursePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, isSuperAdmin, canEditCoursesInOrg, organizationIds } = useAuth()
  const { isEnrolled } = useUserCourses()

  const [course, setCourse] = useState<Course | null | 'notfound'>(null)
  const [acquireCourse, setAcquireCourse] = useState<Course | null>(null)
  const [infoRequestCourse, setInfoRequestCourse] = useState<Course | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [instructorSlug, setInstructorSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) { setCourse('notfound'); return }
    window.scrollTo(0, 0)

    const load = async () => {
      let found = await new GetCourseBySlug(courseRepository).execute(slug)
      if (!found && user) {
        const candidate = await adminRepository.getCourseBySlugForAdmin(slug)
        if (candidate) {
          const hasAccess = isSuperAdmin
            || canEditCoursesInOrg(candidate.organizationId)
            || organizationIds.includes(candidate.organizationId)
          if (hasAccess) found = candidate
        }
      }
      setCourse(found ?? 'notfound')
      if (found?.instructor) {
        teacherRepository.listPublic()
          .then(teachers => {
            const match = teachers.find(t => t.name === found!.instructor)
            setInstructorSlug(match?.slug ?? null)
          })
          .catch(() => {})
      }
    }
    load()
  }, [slug, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (course === 'notfound') return <Navigate to="/" replace />
  if (course === null) return null

  const acquired = isEnrolled(course.id)

  const handleAdquirir = () => {
    if (!user) { setAuthOpen(true); return }
    setAcquireCourse(course)
  }

  return (
    <>
      <ParticleBackground count={120} opacity={0.5} />
      <Header />

      <CoursePageView
        course={course}
        acquired={acquired}
        instructorSlug={instructorSlug}
        onAcquire={handleAdquirir}
        onRequestInfo={() => setInfoRequestCourse(course)}
        onShare={() => navigator.share?.({ title: course.titulo.es, text: course.descripcion.es })}
        onInstructor={s => navigate(`/profesorado/${s}`)}
        onBack={() => navigate('/')}
      />

      <AcquireModal
        course={acquireCourse}
        isOpen={acquireCourse !== null}
        onClose={() => setAcquireCourse(null)}
      />
      <InfoRequestForm
        course={infoRequestCourse}
        isOpen={infoRequestCourse !== null}
        onClose={() => setInfoRequestCourse(null)}
      />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
