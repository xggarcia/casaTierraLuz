import { useEffect, useRef } from 'react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number   // velocidad horizontal
  vy: number   // velocidad vertical
  radius: number
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const PARTICLE_COUNT   = 200      // cuántos nodos hay en pantalla
const MAX_DIST         = 160     // distancia máxima para dibujar línea entre partículas
const MOUSE_DIST       = 220     // el ratón tiene más radio de atracción
const SPEED            = 0.5     // velocidad máxima de cada partícula
const DOT_RADIUS       = 1.5     // tamaño del punto
const COLOR            = '250, 112, 82'  // RGB del acento (--accent del proyecto)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Crea una partícula aleatoria dentro del canvas */
function createParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    // velocidad aleatoria entre -SPEED y +SPEED en cada eje
    vx: (Math.random() - 0.5) * SPEED * 2,
    vy: (Math.random() - 0.5) * SPEED * 2,
    radius: DOT_RADIUS,
  }
}

/** Distancia euclidiana entre dos puntos: √((x2-x1)² + (y2-y1)²) */
function dist(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return Math.sqrt(dx * dx + dy * dy)
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function PruebasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ajustamos el canvas al tamaño real de la ventana
    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    // Posición del ratón — empieza fuera de pantalla
    const mouse = { x: -9999, y: -9999 }

    // Creamos todas las partículas de golpe
    let particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(W, H)
    )

    // ── Handlers ──────────────────────────────────────────────────────────

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const onMouseLeave = () => {
      // Cuando el ratón sale de la ventana, lo mandamos lejos
      mouse.x = -9999
      mouse.y = -9999
    }

    const onResize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
      // Recreamos las partículas para que se distribuyan en el nuevo tamaño
      particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(W, H))
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)
    window.addEventListener('resize', onResize)

    // ── Loop de animación ─────────────────────────────────────────────────

    let animId: number

    function draw() {
      // 1. Borramos el frame anterior
      ctx!.clearRect(0, 0, W, H)

      // 2. Movemos cada partícula y hacemos que rebote en los bordes
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        // Si sale por un lado, rebota (invertimos la velocidad)
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }

      // 3. Dibujamos líneas entre partículas cercanas
      //    Comparamos cada par una sola vez: j empieza en i+1 para no repetir
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const d = dist(particles[i].x, particles[i].y, particles[j].x, particles[j].y)

          if (d < MAX_DIST) {
            // La opacidad va de 1 (muy cerca) a 0 (en el límite)
            const alpha = 1 - d / MAX_DIST

            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(${COLOR}, ${alpha * 0.4})`
            ctx!.lineWidth = 1
            ctx!.stroke()
          }
        }

        // 4. Líneas desde el ratón a cada partícula (radio mayor)
        const dm = dist(mouse.x, mouse.y, particles[i].x, particles[i].y)
        if (dm < MOUSE_DIST) {
          const alpha = 1 - dm / MOUSE_DIST

          ctx!.beginPath()
          ctx!.moveTo(mouse.x, mouse.y)
          ctx!.lineTo(particles[i].x, particles[i].y)
          ctx!.strokeStyle = `rgba(${COLOR}, ${alpha * 0.8})`
          ctx!.lineWidth = 1.2
          ctx!.stroke()
        }
      }

      // 5. Dibujamos los puntos encima de las líneas
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${COLOR}, 0.7)`
        ctx!.fill()
      }

      // 6. Punto del ratón
      if (mouse.x > 0) {
        ctx!.beginPath()
        ctx!.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${COLOR}, 0.9)`
        ctx!.fill()
      }

      // Pedimos el siguiente frame
      animId = requestAnimationFrame(draw)
    }

    // Arrancamos el loop
    animId = requestAnimationFrame(draw)

    // Limpieza al desmontar el componente
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0d10' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Texto informativo superpuesto */}
      <div style={{
        position: 'absolute',
        top: 32,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'rgba(255,255,255,0.15)',
        fontSize: '0.8rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
      }}>
        Mueve el ratón
      </div>
    </div>
  )
}
