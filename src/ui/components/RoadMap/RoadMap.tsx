import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Course, ISODate } from '../../../domain/entities/Course'
import { useLocale } from '../../hooks/useLocale'

interface RoadMapProps {
  courses: Course[]
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO  = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const ROW_H   = 44
const ROW_GAP = 8

// Paleta de duración: corto → claro, largo → oscuro
const DURATION_COLORS = ['#FA7052', '#D66147', '#AD4F39', '#853C2C', '#5C2A1E']

function durationColor(durationMs: number, minMs: number, maxMs: number): string {
  if (maxMs === minMs) return DURATION_COLORS[0]
  const norm = (durationMs - minMs) / (maxMs - minMs)
  return DURATION_COLORS[Math.min(4, Math.floor(norm * 5))]
}

function parseDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MESES_LARGO[m - 1]} ${y}`
}

type CourseWithDates = Course & { fechaInicio: ISODate; fechaFin: ISODate }

function assignLanes(sorted: CourseWithDates[]): { course: CourseWithDates; lane: number }[] {
  const ends1: number[] = []
  for (const course of sorted) {
    const start = parseDate(course.fechaInicio).getTime()
    const end   = parseDate(course.fechaFin).getTime()
    let lane = ends1.findIndex(e => e <= start)
    if (lane === -1) lane = ends1.length
    ends1[lane] = end
  }
  const totalLanes = ends1.length

  const ends2: number[] = new Array(totalLanes).fill(0)
  return sorted.map(course => {
    const start = parseDate(course.fechaInicio).getTime()
    const end   = parseDate(course.fechaFin).getTime()
    let lane = -1
    for (let i = totalLanes - 1; i >= 0; i--) {
      if (ends2[i] <= start) { lane = i; break }
    }
    if (lane === -1) lane = 0
    ends2[lane] = end
    return { course, lane }
  })
}

export function RoadMap({ courses }: RoadMapProps) {
  const { loc } = useLocale()
  const navigate = useNavigate()

  const scrollRef    = useRef<HTMLDivElement>(null)
  const isDragging   = useRef(false)
  const startX       = useRef(0)
  const startScroll  = useRef(0)
  const hasDragged   = useRef(false)

  // Slider: derecha = 7 días (zoom in), izquierda = 365 días (zoom out)
  // daysVisible = 372 - sliderValue  →  slider=7 ⟹ daysVisible=365, slider=365 ⟹ daysVisible=7
  const [daysVisible,    setDaysVisible]    = useState(180)  // ~6 meses por defecto
  const [containerWidth, setContainerWidth] = useState(800)
  const [tooltipState, setTooltipState] = useState<{ course: CourseWithDates; rect: DOMRect; mouseX: number } | null>(null)

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Drag invertido ────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current  = true
    hasDragged.current  = false
    startX.current      = e.clientX
    startScroll.current = scrollRef.current!.scrollLeft
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing'
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 3) {
      hasDragged.current = true
      setTooltipState(null)
    }
    scrollRef.current.scrollLeft = startScroll.current - delta
  }
  const onMouseUp = () => {
    isDragging.current = false
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab'
  }

  // ── Posición del label (clamp al viewport) ────────────────────────────────
  const updateLabelPositions = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const sl = el.scrollLeft
    el.querySelectorAll<HTMLElement>('.roadmap-bar').forEach(bar => {
      const label = bar.querySelector<HTMLElement>('.roadmap-bar-label')
      if (!label) return
      const barLeft  = parseFloat(bar.style.left)
      const barWidth = parseFloat(bar.style.width)
      const nudge    = Math.max(0, sl - barLeft)
      const left     = 8 + nudge
      const maxW     = Math.max(0, barWidth - left - 8)
      label.style.left     = `${left}px`
      label.style.maxWidth = `${maxW}px`
    })
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateLabelPositions, { passive: true })
    updateLabelPositions()
    return () => el.removeEventListener('scroll', updateLabelPositions)
  }, [updateLabelPositions])

  // ── Datos del timeline ────────────────────────────────────────────────────
  const filtered = [...courses].filter(c => c.fechaInicio && c.fechaFin) as (Course & { fechaInicio: ISODate; fechaFin: ISODate })[]

  const byStart = filtered.sort(
    (a, b) => parseDate(a.fechaInicio).getTime() - parseDate(b.fechaInicio).getTime()
  )

  const today   = new Date()
  const minYear = today.getFullYear() - 1
  const maxYear = filtered.length > 0
    ? Math.max(...filtered.map(c => parseDate(c.fechaFin).getFullYear()))
    : today.getFullYear()

  const timelineStart   = new Date(minYear, 0, 1)
  const timelineEnd     = new Date(maxYear + 1, 0, 1)
  const timelineStartMs = timelineStart.getTime()

  const dayPx    = containerWidth / daysVisible
  const dateToPx = (ms: number) => (ms - timelineStartMs) / 86_400_000 * dayPx

  const totalWidthPx = dateToPx(timelineEnd.getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayPx      = useMemo(() => dateToPx(Date.now()), [dayPx, timelineStartMs])

  // Al hacer zoom, preservar la fecha del centro actual en vez de volver a hoy
  const pendingCenterMs = useRef<number | null>(null)

  const handleZoomChange = (sliderValue: number) => {
    const el = scrollRef.current
    if (el) {
      const centerPx = el.scrollLeft + el.clientWidth / 2
      pendingCenterMs.current = timelineStartMs + centerPx / dayPx * 86_400_000
    }
    setDaysVisible(372 - sliderValue)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (pendingCenterMs.current !== null) {
      const newCenterPx = (pendingCenterMs.current - timelineStartMs) / 86_400_000 * dayPx
      el.scrollLeft = newCenterPx - el.clientWidth / 2
      pendingCenterMs.current = null
    } else {
      el.scrollLeft = todayPx - el.clientWidth / 2
    }
  }, [todayPx])

  // Re-calcular posiciones de labels tras zoom
  useEffect(() => { updateLabelPositions() }, [todayPx, updateLabelPositions])

  const packed     = assignLanes(byStart)
  const totalLanes = packed.length > 0 ? Math.max(...packed.map(p => p.lane)) + 1 : 1
  const canvasH    = totalLanes * (ROW_H + ROW_GAP) + 4

  const durations  = filtered.map(c => parseDate(c.fechaFin).getTime() - parseDate(c.fechaInicio).getTime())
  const minDur     = Math.min(...durations)
  const maxDur     = Math.max(...durations)

  // Ticks de meses
  const ticks: { year: number; month: number; px: number }[] = []
  for (let y = minYear; y <= maxYear; y++) {
    for (let m = 0; m < 12; m++) {
      ticks.push({ year: y, month: m, px: dateToPx(new Date(y, m, 1).getTime()) })
    }
  }

  // Ticks de días (solo cuando daysVisible < 100)
  const dayTicks: { px: number; dayNum: number }[] = []
  if (daysVisible < 100) {
    const cur = new Date(minYear, 0, 1)
    while (cur < timelineEnd) {
      if (cur.getDate() !== 1) {
        dayTicks.push({ px: dateToPx(cur.getTime()), dayNum: cur.getDate() })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  return (
    <>
      <div className="roadmap-wrapper">
        <div className="roadmap">

          <div className="roadmap-header">
            <span className="roadmap-range">{minYear} – {maxYear}</span>
            <span className="roadmap-title">CALENDAR</span>
            <div className="roadmap-zoom">
              <span className="roadmap-zoom-label">{daysVisible}d</span>
              <input
                type="range"
                min={7}
                max={365}
                step={1}
                value={372 - daysVisible}
                onChange={e => handleZoomChange(+e.target.value)}
                className="roadmap-zoom-slider"
              />
            </div>
          </div>

          <div className="roadmap-scroll-wrap">
            <div className="roadmap-center-overlay" aria-hidden />

            <div
              className="roadmap-scroll"
              ref={scrollRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
            <div className="roadmap-inner" style={{ width: totalWidthPx }}>

              <div className="roadmap-grid" aria-hidden>
                {ticks.map((tick, i) => (
                  <div key={i} className="roadmap-grid-line" style={{ left: tick.px }} />
                ))}
              </div>

              <div className="roadmap-today" style={{ left: todayPx }} aria-hidden />

              <div className="roadmap-canvas" style={{ height: canvasH }}>
                {packed.map(({ course, lane }) => {
                  const startMs = parseDate(course.fechaInicio).getTime()
                  const endMs   = parseDate(course.fechaFin).getTime()
                  const leftPx  = dateToPx(startMs)
                  const widthPx = Math.max(8, dateToPx(endMs) - leftPx)
                  const color   = durationColor(endMs - startMs, minDur, maxDur)
                  return (
                    <div
                      key={course.id}
                      className="roadmap-bar"
                      style={{
                        left:       leftPx,
                        width:      widthPx,
                        top:        lane * (ROW_H + ROW_GAP),
                        height:     ROW_H,
                        background: color,
                      }}
                      onClick={() => { if (!hasDragged.current) navigate(`/curso/${course.slug}`) }}
                      onMouseEnter={e => {
                        if (!isDragging.current)
                          setTooltipState({ course, rect: (e.currentTarget as HTMLElement).getBoundingClientRect(), mouseX: e.clientX })
                      }}
                      onMouseLeave={() => setTooltipState(null)}
                    >
                      <span className="roadmap-bar-label">{loc(course.titulo)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="roadmap-ruler">
                {ticks.map((tick, i) => (
                  <div key={i} className="roadmap-ruler-tick-wrap" style={{ left: tick.px }}>
                    <div className="roadmap-ruler-tick" />
                    {tick.month === 0
                      ? <span className="roadmap-ruler-year">{tick.year}</span>
                      : <span className="roadmap-ruler-month-label">{MESES_CORTOS[tick.month]}</span>
                    }
                  </div>
                ))}
                {dayTicks.map((tick, i) => (
                  <div key={'d' + i} className="roadmap-ruler-day-wrap" style={{ left: tick.px }}>
                    <div className="roadmap-ruler-day-tick" />
                    <span className="roadmap-ruler-day-label">{tick.dayNum}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          </div>
        </div>
      </div>

      {tooltipState && createPortal(
        <div
          className="roadmap-tooltip-portal"
          style={{
            position:  'fixed',
            left:      Math.max(134, Math.min(tooltipState.mouseX, window.innerWidth - 134)),
            top:       tooltipState.rect.top - 10,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <strong>{loc(tooltipState.course.titulo)}</strong>
          <span>
            {formatDate(tooltipState.course.fechaInicio)} → {formatDate(tooltipState.course.fechaFin)}
          </span>
        </div>,
        document.body
      )}
    </>
  )
}
