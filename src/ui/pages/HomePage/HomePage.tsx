import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Course } from '../../../domain/entities/Course'
import { courseRepository } from '../../../infrastructure/db'
import { GetPublicCourses } from '../../../application/use-cases/GetPublicCourses'
import { GetFeaturedCourses } from '../../../application/use-cases/GetFeaturedCourses'
import { useAuth } from '../../contexts/AuthContext'
import { Header } from '../../components/Header/Header'
import { HeroCarousel } from '../../components/HeroCarousel/HeroCarousel'
import { CourseGrid } from '../../components/CourseGrid/CourseGrid'
import { EventCalendar } from '../../components/EventCalendar/EventCalendar'
import { AcquireModal } from '../../components/AcquireModal/AcquireModal'
import { InfoRequestForm } from '../../components/InfoRequestForm/InfoRequestForm'
import { AuthModal } from '../../components/AuthModal/AuthModal'
import { RoadMap } from '../../components/RoadMap/RoadMap'
import { NewsSection } from '../../components/NewsSection/NewsSection'
import { Footer } from '../../components/Footer/Footer'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

gsap.registerPlugin(ScrollTrigger)

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [heroReady, setHeroReady] = useState(false)
  const [acquireCourse, setAcquireCourse] = useState<Course | null>(null)
  const [infoRequestCourse, setInfoRequestCourse] = useState<Course | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const revealRefs = useRef<HTMLElement[]>([])

  useEffect(() => {
    new GetPublicCourses(courseRepository).execute().then(setAllCourses)
    new GetFeaturedCourses(courseRepository).execute().then(data => {
      setFeaturedCourses(data)
      setHeroReady(true)
    })
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      revealRefs.current.forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        )
      })
    })
    return () => ctx.revert()
  }, [allCourses])

  const addRevealRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el)
  }

  const gridCourses = allCourses.filter(c => !c.featured)

  const handleAdquirir = (course: Course) => {
    if (!user) { setAuthOpen(true); return }
    setAcquireCourse(course)
  }

  return (
    <>
      <ParticleBackground count={300} opacity={0.6} />
      <Header />

      <HeroCarousel featuredCourses={featuredCourses} loading={!heroReady} />

      <div className="container">
        <div ref={addRevealRef}>
          <RoadMap courses={allCourses} />
        </div>

        <div className="home-section-gap" />
        <CourseGrid
          courses={gridCourses}
          onSelectCourse={course => navigate(`/curso/${course.slug}`)}
          onAdquirir={handleAdquirir}
          onSolicitarInfo={setInfoRequestCourse}
        />

        <div className="home-section-gap home-section-gap--lg" />
        <div ref={addRevealRef}>
          <NewsSection />
        </div>

        <div className="home-section-gap" />
        <div ref={addRevealRef}>
          <EventCalendar courses={allCourses} onSelectCourse={course => navigate(`/curso/${course.slug}`)} />
        </div>

        <Footer />
      </div>

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
