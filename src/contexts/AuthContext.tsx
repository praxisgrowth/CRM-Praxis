// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/database.types'

/* ─── Types ── */
interface AuthContextValue {
  user:    User | null
  profile: Profile | null
  loading: boolean
  /** true when user has role ADMIN (or when no auth session exists — backward compat) */
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  profile: null,
  loading: true,
  isAdmin: true,   // safe default while loading
  signOut: async () => {},
})

/* ─── Provider ── */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data as Profile | null)
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Live auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * isAdmin logic:
   * - If no Supabase Auth session exists (app running without auth setup),
   *   default to true so existing functionality isn't broken.
   * - Once a real session exists, respect the profile.role.
   */
  const isAdmin = user === null ? true : (profile?.role === 'ADMIN')

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
