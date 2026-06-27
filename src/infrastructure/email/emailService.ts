import { supabase } from '../supabase/client'

const ADMIN_EMAIL = import.meta.env.VITE_EMAIL_ADMIN as string | undefined

export const emailService = {
  async send(template: string, to: string, data: Record<string, unknown>): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', { body: { template, to, data } })
    } catch {
      // Errores de email son no bloqueantes — el flujo principal ya completó
    }
  },

  async sendAdmin(template: string, data: Record<string, unknown>): Promise<void> {
    const admin = ADMIN_EMAIL
    if (!admin) return
    await emailService.send(template, admin, data)
  },
}
