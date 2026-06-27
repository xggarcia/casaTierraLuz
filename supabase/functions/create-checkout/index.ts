const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_KEY = () => Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL = () => Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function stripePost(path: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_KEY()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json?.error?.message ?? 'Stripe error')
  return json
}

async function supabaseGet(table: string, query: string) {
  const res = await fetch(`${SUPABASE_URL()}/rest/v1/${table}?${query}`, {
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
    const { courseId, userId, userEmail, courseSlug } = await req.json()

    const courses = await supabaseGet('courses', `id=eq.${courseId}&select=id,title,price,slug&limit=1`)
    const course = courses?.[0]

    if (!course) {
      return new Response(JSON.stringify({ error: 'Curso no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!course.price || course.price <= 0) {
      return new Response(JSON.stringify({ error: 'Este curso es gratuito' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Guard: si ya está inscrito, no crear sesión de pago (evita doble cobro)
    const existing = await supabaseGet('enrollments', `course_id=eq.${courseId}&user_id=eq.${userId}&select=id&limit=1`)
    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Ya tienes este curso adquirido' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
    const courseName = course.title?.es ?? course.title?.en ?? 'Curso'

    const session = await stripePost('/checkout/sessions', {
      mode:                                                   'payment',
      customer_email:                                         userEmail,
      'line_items[0][price_data][currency]':                  'eur',
      'line_items[0][price_data][product_data][name]':        courseName,
      'line_items[0][price_data][unit_amount]':               String(Math.round(course.price * 100)),
      'line_items[0][quantity]':                              '1',
      success_url:                                            `${siteUrl}/pago-ok?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:                                             `${siteUrl}/curso/${course.slug ?? courseSlug}`,
      'metadata[courseId]':                                   String(courseId),
      'metadata[userId]':                                     userId,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(String(err))
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
