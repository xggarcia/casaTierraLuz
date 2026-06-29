import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { es as i18n } from '../../i18n/es'
import { TabProducts } from './admin/TabProducts'
import { TabScents } from './admin/TabScents'
import { TabColors } from './admin/TabColors'
import { TabMessages } from './admin/TabMessages'

type AdminTab = 'products' | 'scents' | 'colors' | 'messages'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'products', label: i18n.admin.tabProducts },
  { id: 'scents',   label: i18n.admin.tabScents },
  { id: 'colors',   label: i18n.admin.tabColors },
  { id: 'messages', label: i18n.admin.tabMessages },
]

export function AdminPage() {
  const { loading: authLoading, isAdmin } = useAuth()
  const [tab, setTab] = useState<AdminTab>('products')

  if (authLoading) {
    return (
      <div className="adm-page">
        <div className="adm-content">
          <p className="adm-loading">{i18n.loading}</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="adm-page">
        <div className="adm-content">
          <p className="adm-empty">{i18n.notAuthorized}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <div className="adm-masthead">
        <div className="adm-masthead__inner">
          <h1 className="adm-masthead__title">{i18n.admin.title}</h1>
          <div className="adm-tabs" role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`adm-tab${tab === t.id ? ' adm-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="adm-content">
        {tab === 'products' && <TabProducts />}
        {tab === 'scents'   && <TabScents />}
        {tab === 'colors'   && <TabColors />}
        {tab === 'messages' && <TabMessages />}
      </div>
    </div>
  )
}
