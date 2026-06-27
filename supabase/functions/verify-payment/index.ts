const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_KEY = () => Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = () => Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = () => Deno.env.get('SUPABASE_ANON_KEY')!

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_KEY()}` },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? 'Stripe error')
  return json
}

async function supabaseQuery(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?${query}`, {
    headers: {
      'apikey': SUPABASE_KEY(),
      'Authorization': `Bearer ${SUPABASE_KEY()}`,
    },
  })
  return res.json()
}

async function supabaseInsert(table: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY(),
      'Authorization': `Bearer ${SUPABASE_KEY()}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err))
  }
}

async function supabaseGetUser(userId: string) {
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
    headers: {
      'apikey': SUPABASE_KEY(),
      'Authorization': `Bearer ${SUPABASE_KEY()}`,
    },
  })
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { sessionId } = await req.json()

    const session = await stripeGet(`/checkout/sessions/${sessionId}`)

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ ok: false, error: 'Pago no completado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const courseId = Number(session.metadata?.courseId)
    const userId = session.metadata?.userId

    if (!courseId || !userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Metadata inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Obtener datos del curso para el email
    const courses = await supabaseQuery('courses', `id=eq.${courseId}&select=title,slug,price&limit=1`)
    const course = courses?.[0]

    // Idempotencia: no insertar si ya existe
    const existing = await supabaseQuery('enrollments', `course_id=eq.${courseId}&user_id=eq.${userId}&select=id&limit=1`)
    if (!existing || existing.length === 0) {
      const userData = await supabaseGetUser(userId)
      const displayName = userData?.user_metadata?.display_name
        ?? userData?.user_metadata?.name
        ?? userData?.email?.split('@')[0]
        ?? ''

      try {
        await supabaseInsert('enrollments', {
          course_id:         courseId,
          user_id:           userId,
          name:              displayName,
          surnames:          '',
          email:             userData?.email ?? '',
          phone:             null,
          stripe_session_id: session.id,
        })
      } catch (insertErr) {
        // 23505 = ya existe el enrollment, el pago fue válido igualmente
        if (!String(insertErr).includes('23505')) throw insertErr
      }

      // Enviar emails (no bloqueante)
      const adminEmail = Deno.env.get('EMAIL_ADMIN')
      const supabaseUrl = SUPABASE_URL()
      const supabaseKey = SUPABASE_KEY()
      const courseTitle = course?.title?.es ?? course?.title?.en ?? 'Curso'
      const courseSlug = course?.slug ?? ''
      const precio = course?.price ?? 0

      const sendEmailFn = (to: string, template: string, data: Record<string, unknown>) =>
        fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY()}`,
            'apikey': SUPABASE_KEY(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ template, to, data }),
        }).catch((e) => { console.error('Email error:', String(e)) })

      const emailData = { userName: displayName, courseTitle, courseSlug, precio, isFree: false }
      sendEmailFn(userData?.email ?? '', 'course-acquired', emailData)
      if (adminEmail) sendEmailFn(adminEmail, 'admin-new-enrollment', {
        userName: displayName, userEmail: userData?.email, courseTitle, precio, isFree: false,
      })
    }

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
