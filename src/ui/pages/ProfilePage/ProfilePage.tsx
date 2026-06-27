import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../hooks/useLocale'
import { useUserCourses } from '../../contexts/UserCoursesContext'
import { Header } from '../../components/Header/Header'
import { ParticleBackground } from '../../components/ParticleBackground/ParticleBackground'

export function ProfilePage() {
  const { user, loading, isAnyOrgStaff, isSuperAdmin, updateDisplayName, signOut } = useAuth()
  const { enrolledIds } = useUserCourses()
  const { t } = useLocale()
  const canSeeAdmin = isAnyOrgStaff || isSuperAdmin
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user === null) navigate('/')
  }, [user, loading, navigate])

  const currentName = user?.user_metadata?.display_name ?? user?.user_metadata?.name ?? ''
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <div className="page-loading">Cargando…</div>
  if (!user) return null

  const avatarSrc = user.user_metadata?.avatar_url ?? user.user_metadata?.picture
  const initials = (currentName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError(null)
    const { error } = await updateDisplayName(name.trim())
    if (error) {
      setError(error)
    } else {
      setSuccess(true)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <ParticleBackground count={80} opacity={0.35} />
      <Header />

      <div className="container">
        <div className="profile-page">

          <div className="profile-header">
            <div className="profile-identity">
              {avatarSrc
                ? <img src={avatarSrc} alt={currentName} className="profile-avatar" referrerPolicy="no-referrer" />
                : <div className="profile-avatar-placeholder">{initials}</div>
              }
              <div className="profile-identity-text">
                <h1 className="profile-title">{currentName || 'Mi perfil'}</h1>
                <p className="profile-email">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="profile-body">
            <section className="profile-section profile-section--account">
              <span className="profile-section-label">Cuenta</span>
              <form className="profile-form" onSubmit={handleSave}>
                <div className="profile-field">
                  <label htmlFor="profile-name">Nombre visible</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                  <span className="profile-field-hint">
                    Visible en la web y en el header.
                  </span>
                </div>

                {error && <p className="auth-error">{error}</p>}
                {success && <p className="auth-success">Nombre actualizado.</p>}

                <button type="submit" className="profile-save-btn" disabled={saving || !name.trim()}>
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </form>
            </section>

            <section className="profile-section profile-section--data">
              <span className="profile-section-label">{t.myCourses}</span>
              <div className="profile-courses-stat">
                <span className="profile-courses-count">{enrolledIds.size}</span>
                <span className="profile-courses-unit">
                  {enrolledIds.size === 1 ? 'curso adquirido' : 'cursos adquiridos'}
                </span>
              </div>
              <button
                type="button"
                className="profile-nav-btn"
                onClick={() => navigate('/mis-cursos')}
              >
                Ver mis cursos →
              </button>

              {canSeeAdmin && (
                <div className="profile-admin-block">
                  <span className="profile-section-label">Administración</span>
                  <button
                    type="button"
                    className="profile-nav-btn profile-nav-btn--accent"
                    onClick={() => navigate('/admin')}
                  >
                    Panel de administración →
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="profile-footer">
            <button type="button" className="profile-signout" onClick={handleSignOut}>
              Cerrar sesión
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
