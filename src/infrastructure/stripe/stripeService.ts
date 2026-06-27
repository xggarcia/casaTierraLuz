import { supabase } from '../supabase/client'

export const stripeService = {
  async startCheckout(courseId: number, courseSlug: string, userId: string, userEmail: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { courseId, courseSlug, userId, userEmail },
    })
    if (error) throw new Error(error.message ?? 'Error al iniciar el pago')
    if (!data?.url) throw new Error('No se recibió URL de pago')
    window.location.href = data.url
  },

  async verifyPayment(sessionId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { sessionId },
    })
    if (error) throw new Error(error.message ?? 'Error al verificar el pago')
    if (!data?.ok) throw new Error(data?.error ?? 'Pago no confirmado')
  },
}
