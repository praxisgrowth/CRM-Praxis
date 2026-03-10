// src/hooks/useSectors.ts
import { useState, useEffect } from 'react'
import { supabase as _supabase } from '../lib/supabase'
import type { Sector } from '../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

export function useSectors(): Sector[] {
  const [sectors, setSectors] = useState<Sector[]>([])

  useEffect(() => {
    db.from('sectors')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }: { data: Sector[] | null }) => {
        setSectors(data ?? [])
      })
  }, [])

  return sectors
}
