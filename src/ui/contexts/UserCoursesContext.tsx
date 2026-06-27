import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { enrollmentRepository } from '../../infrastructure/db'
import { GetEnrolledIds } from '../../application/use-cases/GetEnrolledIds'
import { useAuth } from './AuthContext'

interface UserCoursesContextValue {
  enrolledIds: Set<number>
  isEnrolled: (courseId: number) => boolean
  refresh: () => Promise<void>
}

const UserCoursesContext = createContext<UserCoursesContextValue | null>(null)

const getEnrolledIds = new GetEnrolledIds(enrollmentRepository)

export function UserCoursesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set())

  // Ref al user actual para que `refresh` (estable) lea siempre el valor vigente,
  // no el del closure del primer render (clave tras volver de Stripe con recarga).
  const userRef = useRef(user)
  userRef.current = user

  const refresh = useCallback(async () => {
    const u = userRef.current
    if (!u) { setEnrolledIds(new Set()); return }
    try {
      const ids = await getEnrolledIds.execute(u.id)
      setEnrolledIds(new Set(ids))
    } catch {
      // Error transitorio: mantener el estado previo, no vaciar.
    }
  }, [])

  useEffect(() => { refresh() }, [user?.id, refresh])

  return (
    <UserCoursesContext.Provider value={{
      enrolledIds,
      isEnrolled: (id) => enrolledIds.has(id),
      refresh,
    }}>
      {children}
    </UserCoursesContext.Provider>
  )
}

export function useUserCourses(): UserCoursesContextValue {
  const ctx = useContext(UserCoursesContext)
  if (!ctx) throw new Error('useUserCourses must be used inside UserCoursesProvider')
  return ctx
}
