export function calcDuration(start: string, end: string): string {
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)
  if (days <= 0) return ''
  if (days < 14) return `${days} día${days !== 1 ? 's' : ''}`
  const weeks = Math.round(days / 7)
  if (weeks < 8) return `${weeks} semana${weeks !== 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  return `${months} mes${months !== 1 ? 'es' : ''}`
}
