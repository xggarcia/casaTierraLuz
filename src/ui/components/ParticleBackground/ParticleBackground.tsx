import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  count?:   number
  color?:   string
  opacity?: number
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  age: number       // frames vividos
  sizeRadius: number      
  maxAge: number    // lifetime en frames (aleatorio)
}

const SPEED      = 0.4
const MAX_DOT_SIZE = 3.5
const MIN_DOT_SIZE = 1
const MAX_DIST   = 160
const MOUSE_DIST = 220
const MIN_LIFE   = 180   // mínimo ~3s a 60fps
const MAX_LIFE   = 600   // máximo ~10s a 60fps
const FADE       = 40    // frames de fade in / fade out

function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx, dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

/** Alpha de una partícula según su edad (fade in + fade out) */
function lifeAlpha(age: number, maxAge: number): number {
  if (age < FADE)             return age / FADE
  if (age > maxAge - FADE)    return (maxAge - age) / FADE
  return 1
}

export function ParticleBackground({
  count   = 90,
  color   = '250, 112, 82',
  opacity = 1,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.getBoundingClientRect().width || window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    const getDocH = () => Math.max(document.documentElement.scrollHeight, H)
    let docH = getDocH()

    const mouse  = { x: -9999, y: -9999 }
    const client = { x: -9999, y: -9999 }

    const make = (): Particle => ({
      x:      Math.random() * W,
      y:      Math.random() * docH,
      vx:     (Math.random() - 0.5) * SPEED * 2,
      vy:     (Math.random() - 0.5) * SPEED * 2,
      age:    0,
      sizeRadius: (MIN_DOT_SIZE + Math.random()* (MAX_DOT_SIZE - MIN_DOT_SIZE)),
      maxAge: MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE),
    })

    // Las partículas arrancan en edades aleatorias para que no mueran todas a la vez
    const makeScattered = (): Particle => {
      const p = make()
      p.age = Math.random() * p.maxAge
      return p
    }

    let particles: Particle[] = Array.from({ length: count }, makeScattered)

    const onMove = (e: MouseEvent) => {
      client.x = e.clientX; client.y = e.clientY
      mouse.x  = e.clientX; mouse.y  = e.clientY
    }
    const onScroll = () => {
      // canvas es fixed — no necesita ajuste de scroll
    }
    const onLeave = () => {
      mouse.x = -9999; mouse.y = -9999
      client.x = -9999; client.y = -9999
    }
    const onResize = () => {
      W = canvas.getBoundingClientRect().width || window.innerWidth
      H = window.innerHeight
      canvas.width = W; canvas.height = H
      docH = getDocH()
      particles = Array.from({ length: count }, makeScattered)
    }

    const ro = new ResizeObserver(() => { docH = getDocH() })
    ro.observe(document.documentElement)

    window.addEventListener('mousemove',  onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('scroll',     onScroll, { passive: true })
    window.addEventListener('resize',     onResize)

    let id: number

    function draw() {
      ctx!.clearRect(0, 0, W, H)
      ctx!.save()
      ctx!.translate(0, -window.scrollY)

      // Envejecer partículas y renacer las muertas
      for (const p of particles) {
        p.age++
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W)    p.vx *= -1
        if (p.y < 0 || p.y > docH) p.vy *= -1

        if (p.age >= p.maxAge) {
          // Renace en posición nueva (docH ya es correcto aquí)
          Object.assign(p, make())
        }
      }

      // Líneas entre partículas
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i]
        const ai = lifeAlpha(pi.age, pi.maxAge)

        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j]
          const d  = dist(pi.x, pi.y, pj.x, pj.y)
          if (d < MAX_DIST) {
            const a = (1 - d / MAX_DIST) * 0.35 * ai * lifeAlpha(pj.age, pj.maxAge)
            ctx!.beginPath()
            ctx!.moveTo(pi.x, pi.y)
            ctx!.lineTo(pj.x, pj.y)
            ctx!.strokeStyle = `rgba(${color}, ${a})`
            ctx!.lineWidth = 1
            ctx!.stroke()
          }
        }

        // Línea al ratón — convertir clientY a coordenadas de documento para comparar
        const mouseDocY = mouse.y + window.scrollY
        const dm = dist(mouse.x, mouseDocY, pi.x, pi.y)
        if (dm < MOUSE_DIST) {
          const a = (1 - dm / MOUSE_DIST) * 0.8 * ai
          ctx!.beginPath()
          ctx!.moveTo(mouse.x, mouseDocY)
          ctx!.lineTo(pi.x, pi.y)
          ctx!.strokeStyle = `rgba(${color}, ${a})`
          ctx!.lineWidth = 1.2
          ctx!.stroke()
        }
      }

      // Puntos
      for (const p of particles) {
        const a = lifeAlpha(p.age, p.maxAge) * 0.6
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.sizeRadius, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${color}, ${a})`
        ctx!.fill()
      }

      ctx!.restore()

      // Punto del ratón — fuera del translate, en coordenadas de pantalla (clientX/Y)
      if (mouse.x > 0) {
        ctx!.beginPath()
        ctx!.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${color}, 0.9)`
        ctx!.fill()
      }
      id = requestAnimationFrame(draw)
    }

    id = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
      window.removeEventListener('mousemove',  onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('scroll',     onScroll)
      window.removeEventListener('resize',     onResize)
    }
  }, [count, color])

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
        zIndex: -1,
      }}
    />,
    document.body
  )
}
