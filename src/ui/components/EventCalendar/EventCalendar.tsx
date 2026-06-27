import type { Course } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'

interface EventCalendarProps {
  courses: Course[]
  onSelectCourse: (course: Course) => void
}

const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatISODate(iso: string): string {
  const [, mStr, dStr] = iso.split('-')
  const m = parseInt(mStr) - 1
  const d = parseInt(dStr)
  return `${d} ${MESES_LARGO[m]}`
}

type CourseWithDay = Course & { day: number }

export function EventCalendar({ courses, onSelectCourse }: EventCalendarProps) {
  const { t, loc } = useLocale()

  const byMonth: Record<number, CourseWithDay[]> = {}

  courses.forEach(course => {
    if (!course.fechaInicio) return
    const [, mStr, dStr] = course.fechaInicio.split('-')
    const monthIndex = parseInt(mStr) - 1
    if (isNaN(monthIndex)) return
    if (!byMonth[monthIndex]) byMonth[monthIndex] = []
    byMonth[monthIndex].push({ ...course, day: parseInt(dStr) })
  })

  const monthsWithEvents = t.months.map((name, i) => ({
    name,
    index: i,
    events: (byMonth[i] ?? []).sort((a, b) => a.day - b.day),
  })).filter(m => m.events.length > 0)

  if (monthsWithEvents.length === 0) return null

  return (
    <section className="calendar-section">
      <h2 className="calendar-title">{t.calendarTitle}</h2>
      <div id="event-calendar" className="event-calendar">
        {monthsWithEvents.map(month => (
          <div key={month.index} className="calendar-month">
            <div className="month-header">{month.name}</div>
            <div className="month-events">
              {month.events.map(event => {
                const type = event.tags.find(t => t === 'formacion' || t === 'demo') ?? 'formacion'
                return (
                  <div
                    key={event.id}
                    className={`calendar-event ${type}`}
                    onClick={() => onSelectCourse(event)}
                  >
                    <div className="event-date">
                      {formatISODate(event.fechaInicio!)}
                      {event.fechaFin && event.fechaFin !== event.fechaInicio
                        ? ` - ${formatISODate(event.fechaFin)}`
                        : ''}
                    </div>
                    <div className="event-title">{loc(event.titulo)}</div>
                    <div className="event-type">{loc(event.tipoEtiqueta)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
