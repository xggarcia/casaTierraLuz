const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_KEY = () => Deno.env.get('RESEND_API_KEY')!
const FROM = () => Deno.env.get('EMAIL_FROM') ?? 'NARA CAPMUS <onboarding@resend.dev>'
const ADMIN = () => Deno.env.get('EMAIL_ADMIN') ?? ''
const SITE_URL = () => Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

// ── Templates ────────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NARA CAMPUS</title>
</head>
<body style="margin:0;padding:0;background:#0b0d10;font-family:Arial,Helvetica,sans-serif;color:#f1f1ec;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d10;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#13171e;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
      <tr><td style="padding:32px 40px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0 0 24px;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#f1f1ec;">
          <span style="color:#FA7052;">NARA C</span>ampus
        </p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        ${content}
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0;font-size:12px;color:#7a8190;">
          <a href="${SITE_URL()}" style="color:#FA7052;text-decoration:none;">naracampus.es</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#FA7052;color:#fff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;">${text}</a>`
}

function tag(label: string): string {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:4px;background:rgba(250,112,82,0.15);color:#FA7052;font-size:12px;font-weight:600;margin-bottom:16px;">${label}</span>`
}

// ─── course-acquired ─────────────────────────────────────────────────────────
function templateCourseAcquired(d: Record<string, unknown>): { subject: string; html: string } {
  const isFree = d.isFree as boolean
  const price = isFree ? 'Gratis' : `${d.precio}€`
  const courseUrl = `${SITE_URL()}/curso/${d.courseSlug}`

  return {
    subject: `✅ ¡Curso adquirido! ${d.courseTitle}`,
    html: layout(`
      ${tag(isFree ? 'GRATIS' : `${d.precio}€`)}
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.02em;">¡Curso adquirido!</h1>
      <p style="margin:0 0 24px;color:#7a8190;font-size:15px;">Hola ${d.userName}, ya tienes acceso a:</p>
      <div style="padding:20px;background:#16191f;border-radius:8px;margin-bottom:8px;">
        <p style="margin:0;font-size:18px;font-weight:600;">${d.courseTitle}</p>
        <p style="margin:6px 0 0;color:#7a8190;font-size:14px;">Precio: ${price}</p>
      </div>
      ${btn('Ir al curso', courseUrl)}
      <p style="margin:24px 0 0;color:#7a8190;font-size:13px;">
        Puedes acceder a todos tus cursos en cualquier momento desde <a href="${SITE_URL()}/mis-cursos" style="color:#FA7052;">Mis Cursos</a>.
      </p>
    `),
  }
}

// ─── info-request-ack ────────────────────────────────────────────────────────
function templateInfoRequestAck(d: Record<string, unknown>): { subject: string; html: string } {
  return {
    subject: `Hemos recibido tu solicitud — ${d.courseTitle}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-0.02em;">Solicitud recibida</h1>
      <p style="margin:0 0 24px;color:#7a8190;font-size:15px;">Hola ${d.userName}, hemos recibido tu solicitud de información sobre:</p>
      <div style="padding:20px;background:#16191f;border-radius:8px;margin-bottom:24px;">
        <p style="margin:0;font-size:18px;font-weight:600;">${d.courseTitle}</p>
      </div>
      <p style="margin:0;color:#f1f1ec;font-size:15px;line-height:1.6;">
        Nos pondremos en contacto contigo a la mayor brevedad posible. Si tienes cualquier duda urgente puedes responder a este correo.
      </p>
    `),
  }
}

// ─── admin-new-enrollment ────────────────────────────────────────────────────
function templateAdminNewEnrollment(d: Record<string, unknown>): { subject: string; html: string } {
  const isFree = d.isFree as boolean
  const price = isFree ? 'Gratis' : `${d.precio}€`

  return {
    subject: `Nueva adquisición de: ${d.courseTitle}`,
    html: layout(`
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;">Nuevo enrollment</h1>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;width:120px;">Curso</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;font-weight:600;"><a href="${SITE_URL()}/curso/${d.courseSlug}" style="color:#FA7052;text-decoration:none;">${d.courseTitle}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;">Usuario</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;">${d.userName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;">${d.userEmail}</td></tr>
        <tr><td style="padding:10px 0;color:#7a8190;font-size:13px;">Precio</td>
            <td style="padding:10px 0;font-size:14px;color:${isFree ? '#29B97A' : '#FA7052'};font-weight:600;">${price}</td></tr>
      </table>
    `),
  }
}

// ─── admin-new-info-request ──────────────────────────────────────────────────
function templateAdminNewInfoRequest(d: Record<string, unknown>): { subject: string; html: string } {
  return {
    subject: `📩 Nueva solicitud de info — ${d.courseTitle}`,
    html: layout(`
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;">Nueva solicitud de información</h1>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;width:120px;">Curso</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;font-weight:600;">${d.courseTitle}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;">Nombre</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;">${d.userName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;">Email</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;">${d.userEmail}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#7a8190;font-size:13px;">Teléfono</td>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;">${d.phone ?? '—'}</td></tr>
        <tr><td style="padding:10px 0;color:#7a8190;font-size:13px;vertical-align:top;">Observaciones</td>
            <td style="padding:10px 0;font-size:14px;line-height:1.6;">${d.observations ?? '—'}</td></tr>
      </table>
    `),
  }
}

// ─── admin-reply-info-request ─────────────────────────────────────────────────
function templateAdminReplyInfoRequest(d: Record<string, unknown>): { subject: string; html: string } {
  return {
    subject: `Re: Tu solicitud sobre ${d.courseTitle}`,
    html: layout(`
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Hola ${d.userName}</h1>
      <p style="margin:0 0 20px;color:#7a8190;font-size:15px;">
        Gracias por tu interés en <strong style="color:#f1f1ec;">${d.courseTitle}</strong>. Aquí tienes nuestra respuesta:
      </p>
      <div style="padding:20px 24px;background:#16191f;border-left:3px solid #FA7052;border-radius:4px;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;line-height:1.7;white-space:pre-wrap;">${d.replyText}</p>
      </div>
      <p style="margin:0;color:#7a8190;font-size:13px;line-height:1.6;">
        Si tienes más dudas, puedes responder directamente a este correo.
      </p>
    `),
  }
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

function renderTemplate(template: string, data: Record<string, unknown>): { subject: string; html: string } {
  switch (template) {
    case 'course-acquired':            return templateCourseAcquired(data)
    case 'info-request-ack':           return templateInfoRequestAck(data)
    case 'admin-new-enrollment':       return templateAdminNewEnrollment(data)
    case 'admin-new-info-request':     return templateAdminNewInfoRequest(data)
    case 'admin-reply-info-request':   return templateAdminReplyInfoRequest(data)
    default: throw new Error(`Template desconocido: ${template}`)
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM(), to, reply_to: ADMIN(), subject, html }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.message ?? 'Resend error')
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { template, to, data } = await req.json()

    if (!template || !to) {
      return new Response(JSON.stringify({ error: 'Faltan template o to' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { subject, html } = renderTemplate(template, data ?? {})
    await sendEmail(to, subject, html)

    // Si es notificación de usuario y hay admin configurado, enviar copia admin
    // (solo para los templates de admin explícitos)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(String(err))
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
