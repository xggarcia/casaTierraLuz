import { useEffect, useState } from 'react'
import { messageRepository } from '../../../infrastructure/repositories/SupabaseMessageRepository'
import type { Message } from '../../../domain/entities/Message'
import { es as i18n } from '../../../i18n/es'

export function TabMessages() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected = messages.find(m => m.id === selectedId) ?? null

  const loadMessages = (currentView: 'active' | 'archived') => {
    setLoading(true)
    setError(null)
    setSelectedId(null)
    const fetch = currentView === 'active'
      ? messageRepository.getAll()
      : messageRepository.getArchived()
    fetch
      .then(setMessages)
      .catch(() => setError(i18n.error))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMessages(view) }, [view])

  const handleMarkAsRead = async (m: Message) => {
    try {
      await messageRepository.markAsRead(m.id)
      loadMessages(view)
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  const handleDelete = async (m: Message) => {
    try {
      await messageRepository.remove(m.id)
      loadMessages(view)
    } catch {
      setError(i18n.admin.saveError)
    }
  }

  return (
    <div>
      <div className="adm-section-header">
        <h2 className="adm-section-title">{i18n.admin.tabMessages}</h2>
        <div className="adm-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'active'}
            className={`adm-tab${view === 'active' ? ' adm-tab--active' : ''}`}
            onClick={() => setView('active')}
          >
            {i18n.admin.msgViewActive}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'archived'}
            className={`adm-tab${view === 'archived' ? ' adm-tab--active' : ''}`}
            onClick={() => setView('archived')}
          >
            {i18n.admin.msgViewArchived}
          </button>
        </div>
      </div>

      {error && <div className="adm-alert adm-alert--error">{error}</div>}

      <div className="adm-msg-split">
        {/* LEFT — list */}
        <div className="adm-msg-list">
          {loading ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{i18n.admin.colName}</th>
                    <th>{i18n.admin.msgColTitle}</th>
                    <th>{i18n.admin.msgColEmail}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(3)].map((_, i) => (
                    <tr key={i} className="adm-sk-row">
                      <td><div className="adm-sk-cell" style={{ width: '6rem' }} /></td>
                      <td><div className="adm-sk-cell" style={{ width: '8rem' }} /></td>
                      <td><div className="adm-sk-cell" style={{ width: '10rem' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : messages.length === 0 ? (
            <p className="adm-empty">{i18n.admin.emptyList}</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>{i18n.admin.colName}</th>
                    <th>{i18n.admin.msgColTitle}</th>
                    <th>{i18n.admin.msgColEmail}</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={m.id === selectedId ? 'adm-msg-row--selected' : undefined}
                    >
                      <td>{m.name}</td>
                      <td>{m.title}</td>
                      <td>{m.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT — detail */}
        <div className="adm-msg-detail">
          {selected === null ? (
            <div className="adm-msg-empty">{i18n.admin.msgSelectPrompt}</div>
          ) : (
            <div className="adm-panel-card">
              <div className="adm-msg-field">
                <span className="adm-msg-field__label">{i18n.admin.colName}</span>
                <span className="adm-msg-field__value">{selected.name}</span>
              </div>
              <div className="adm-msg-field">
                <span className="adm-msg-field__label">{i18n.admin.msgColEmail}</span>
                <span className="adm-msg-field__value">{selected.email}</span>
              </div>
              <div className="adm-msg-field">
                <span className="adm-msg-field__label">{i18n.admin.msgColTitle}</span>
                <span className="adm-msg-field__value">{selected.title}</span>
              </div>
              <div className="adm-msg-field">
                <span className="adm-msg-field__label">{i18n.admin.msgColBody}</span>
                <span className="adm-msg-field__value adm-msg-body">{selected.body}</span>
              </div>
              <div className="adm-msg-field">
                <span className="adm-msg-field__label">{i18n.admin.msgColDate}</span>
                <span className="adm-msg-field__value">{new Date(selected.createdAt).toLocaleString('es-ES')}</span>
              </div>
              <div className="adm-form-footer">
                {view === 'active' && (
                  <button
                    type="button"
                    className="adm-btn adm-btn--primary adm-btn--sm"
                    onClick={() => handleMarkAsRead(selected)}
                  >
                    {i18n.admin.msgMarkRead}
                  </button>
                )}
                {view === 'archived' && (
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger adm-btn--sm"
                    onClick={() => handleDelete(selected)}
                  >
                    {i18n.admin.msgDelete}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
