import { useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { useLocale } from '../../hooks/useLocale'

interface Props {
  user: User | null
  onSelect?: () => void
}

export function CoursesDropdown({ user, onSelect }: Props) {
  const navigate = useNavigate()
  const { t } = useLocale()

  const go = (path: string) => { navigate(path); onSelect?.() }

  return (
    <div className="courses-nav nav-extra">
      <button type="button" className="lang-toggle">
        Cursos
        <span className="lang-chevron" />
      </button>
      <div className="lang-dropdown courses-nav-dropdown">
        <button type="button" className="lang-option" onClick={() => go('/cursos')}>
          {t.allCourses}
        </button>
        {user && (
          <button type="button" className="lang-option" onClick={() => go('/mis-cursos')}>
            {t.myCourses}
          </button>
        )}
      </div>
    </div>
  )
}
