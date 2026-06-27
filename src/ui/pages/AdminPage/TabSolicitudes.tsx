import { useEffect, useState } from 'react'
import type { AdminInfoRequest } from '../../../application/ports/IAdminRepository'
import { adminRepository } from '../../../infrastructure/db'
import { emailService } from '../../../infrastructure/email/emailService'
import { useAuth } from '../../contexts/AuthContext'
import type { AdminScope } from './formHelpers'

interface Props {
  scope: AdminScope
}

export function TabSolicitudes({ scope }: Props) {
  const { user } = useAuth()
  const [requests, setRequests] = useState<AdminInfoRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    adminRepository.listInfoRequests(scope)
      .then(setRequests)
      .catch(e => setError(e instanceof Error ? e.message : 'Error al cargar solicitudes'))
      .finally(() => setLoading(false))
  }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReply = async (r: AdminInfoRequest) => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      const repliedBy = user?.user_metadata?.display_name ?? user?.email ?? 'Admin'
      await emailService.send('admin-reply-info-request', r.email, {
        userName:    r.name,
        courseTitle: r.courseTitulo ?? `Curso #${r.courseId}`,
        replyText:   replyText.trim(),
      })
      await adminRepository.markInfoRequestReplied(r.id, repliedBy, replyText.trim())
      setRequests(prev => prev.map(req =>
        req.id === r.id
          ? { ...req, repliedAt: new Date().toISOString(), repliedBy, replyText: replyText.trim() }
          : req
      ))
      setSentTo(r.email)
      setReplyingTo(null)
      setReplyText('')
    } finally {
      setSending(false)
    }
  }

  const openReply = (id: string) => {
    setReplyingTo(id)
    setReplyText('')
    setSentTo(null)
  }

  return (
    <div className="admin-users-section">
      {error && <div className="admin-error">{error}</div>}
      {sentTo && (
        <div className="admin-success">Respuesta enviada a {sentTo}</div>
      )}

      {loading ? (
        <p className="admin-images-loading">Cargando solicitudes…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Nombre</th>
                <th>Apellidos</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Observaciones</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <>
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {r.courseTitulo ?? `#${r.courseId}`}
                    </td>
                    <td>{r.name}</td>
                    <td>{r.surnames}</td>
                    <td>{r.email}</td>
                    <td>{r.phone ?? '—'}</td>
                    <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {r.observaciones ?? '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.72rem' }}>
                      {new Date(r.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      {r.repliedAt ? (
                        <div>
                          <span className="admin-replied-badge" title={`Por ${r.repliedBy} · ${new Date(r.repliedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`}>
                            ✓ Respondido
                          </span>
                          {r.replyText && (
                            <p style={{ marginTop: 4, fontSize: '0.72rem', color: 'var(--muted)', maxWidth: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {r.replyText.length > 80 ? r.replyText.slice(0, 80) + '…' : r.replyText}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="admin-pending-badge">Pendiente</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          onClick={() => replyingTo === r.id ? setReplyingTo(null) : openReply(r.id)}
                        >
                          {replyingTo === r.id ? 'Cancelar' : 'Responder'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-delete"
                          onClick={async () => {
                            if (!window.confirm(`¿Borrar la solicitud de ${r.name}?`)) return
                            await adminRepository.deleteInfoRequest(r.id)
                            setRequests(prev => prev.filter(req => req.id !== r.id))
                          }}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>

                  {replyingTo === r.id && (
                    <tr key={`reply-${r.id}`}>
                      <td colSpan={9} style={{ padding: '0' }}>
                        <div className="admin-reply-panel">
                          <p className="admin-reply-to">
                            Respondiendo a <strong>{r.name}</strong> — <span style={{ color: 'var(--muted)' }}>{r.email}</span>
                          </p>
                          <textarea
                            className="admin-reply-textarea"
                            rows={5}
                            placeholder="Escribe tu respuesta…"
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            autoFocus
                          />
                          <div className="admin-reply-actions">
                            <button
                              type="button"
                              className="admin-btn-primary"
                              disabled={sending || !replyText.trim()}
                              onClick={() => handleReply(r)}
                            >
                              {sending ? 'Enviando…' : 'Enviar respuesta'}
                            </button>
                            <button
                              type="button"
                              className="admin-btn-secondary"
                              onClick={() => setReplyingTo(null)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No hay solicitudes de información.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
