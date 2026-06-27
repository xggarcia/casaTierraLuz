import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Course } from '../../../domain/entities/Course'
import { courseRepository } from '../../../infrastructure/db'
import { GetPublicCatalog } from '../../../application/use-cases/GetPublicCatalog'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { Header } from '../../components/Header/Header'
import { Footer } from '../../components/Footer/Footer'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'
import { StoreCatalog } from '../../components/StoreCatalog/StoreCatalog'
import { CourseFilterBar } from '../../components/CourseFilterBar/CourseFilterBar'
import { AcquireModal } from '../../components/AcquireModal/AcquireModal'
import { InfoRequestForm } from '../../components/InfoRequestForm/InfoRequestForm'
import { AuthModal } from '../../components/AuthModal/AuthModal'

export function CoursesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLocale()
  const [courses, setCourses] = useState<Course[]>([])
  const [filtered, setFiltered] = useState<Course[]>([])
  const [acquireCourse, setAcquireCourse] = useState<Course | null>(null)
  const [infoRequestCourse, setInfoRequestCourse] = useState<Course | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    new GetPublicCatalog(courseRepository).execute().then(data => {
      setCourses(data)
      setFiltered(data)
    })
  }, [])

  const handleAdquirir = (course: Course) => {
    if (!user) { setAuthOpen(true); return }
    setAcquireCourse(course)
  }

  return (
    <>
      <ParticleBackground count={80} opacity={0.35} />
      <Header />
      <main className="courses-catalog-page">
        <div className="container">
          <div className="courses-catalog-header">
            <h1 className="courses-catalog-title">{t.allCourses}</h1>
            {user && (
              <button
                type="button"
                className="btn-primary courses-mis-cursos-btn"
                onClick={() => navigate('/mis-cursos')}
              >
                {t.myCourses} →
              </button>
            )}
          </div>

          <CourseFilterBar courses={courses} onFilter={setFiltered} />

          <StoreCatalog
            courses={filtered}
            total={courses.length}
            onSelectCourse={course => navigate(`/curso/${course.slug}`)}
            onAdquirir={handleAdquirir}
            onSolicitarInfo={setInfoRequestCourse}
          />

          <Footer />
        </div>
      </main>

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
