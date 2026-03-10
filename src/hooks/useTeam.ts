// src/hooks/useTeam.ts
// Reads auth users from the `profiles` table and normalizes them
// to the existing TeamMember interface so the rest of the app
// needs no type changes.

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, TeamMember } from '../lib/database.types'

/* ─── Normalize Profile → TeamMember ── */
function profileToMember(p: Profile): TeamMember {
  const nameParts = (p.full_name ?? p.email ?? 'Usuário').trim().split(/\s+/)
  const initials  = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : (nameParts[0] ?? '?').slice(0, 2).toUpperCase()
  return {
    id:         p.id,
    name:       p.full_name ?? p.email ?? 'Usuário',
    role:       p.position,
    email:      p.email,
    initials,
    avatar_url: null,
    created_at: p.created_at,
  }
}

export interface UseTeamResult {
  members:  TeamMember[]   // normalized for use in dropdowns / maps
  profiles: Profile[]      // raw profiles (for admin UI / role management)
  loading:  boolean
  error:    string | null
  refetch:  () => void
}

export function useTeam(): UseTeamResult {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [tick,     setTick]     = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data, error: sbErr }) => {
        if (cancelled) return
        if (sbErr) {
          setError(sbErr.message)
        } else {
          setProfiles((data ?? []) as Profile[])
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  return {
    profiles,
    members: profiles.map(profileToMember),
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  }
}
