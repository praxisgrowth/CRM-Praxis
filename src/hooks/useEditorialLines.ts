// src/hooks/useEditorialLines.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EditorialLine } from '../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(t: string): any }

export function useEditorialLines() {
  const [lines,   setLines]   = useState<EditorialLine[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await db.from('editorial_lines').select('*').order('ord')
      if (error) throw error
      setLines((data ?? []) as EditorialLine[])
    } catch (err) {
      console.error('[useEditorialLines] load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addLine = useCallback(async (name: string, color: string) => {
    const maxOrd = lines.length ? Math.max(...lines.map(l => l.ord)) + 1 : 0
    const { error } = await db.from('editorial_lines').insert({ name, color, ord: maxOrd })
    if (error) throw new Error(error.message)
    load()
  }, [lines, load])

  const updateLine = useCallback(async (id: string, patch: Partial<Pick<EditorialLine, 'name' | 'color'>>) => {
    const { error } = await db.from('editorial_lines').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    load()
  }, [load])

  const deleteLine = useCallback(async (id: string) => {
    const { error } = await db.from('editorial_lines').delete().eq('id', id)
    if (error) throw new Error(error.message)
    load()
  }, [load])

  const reorder = useCallback(async (orderedIds: string[]) => {
    await Promise.all(
      orderedIds.map((id, idx) =>
        db.from('editorial_lines').update({ ord: idx }).eq('id', id)
      )
    )
    load()
  }, [load])

  return { lines, loading, addLine, updateLine, deleteLine, reorder, refetch: load }
}
