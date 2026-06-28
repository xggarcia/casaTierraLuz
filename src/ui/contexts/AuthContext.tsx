import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../../infrastructure/supabase/client'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        // setTimeout para salir del lock interno de supabase-auth: llamar a
        // supabase.from() dentro del callback provoca un deadlock al recargar.
        setTimeout(async () => {
          const { data } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .maybeSingle()
          setIsAdmin(data?.is_admin === true)
          setLoading(false)
        }, 0)
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) return { error: error.message }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    return { error: signInError?.message ?? null }
  }

  const signOut = async () => {
    setUser(null)
    setSession(null)
    setIsAdmin(false)
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, isAdmin,
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
