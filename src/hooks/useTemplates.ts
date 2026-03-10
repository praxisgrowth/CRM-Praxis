// src/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase as _supabase } from '../lib/supabase'
import type { ProjectTemplate } from '../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

export type NewTemplateInput = Omit<ProjectTemplate, 'id' | 'created_at'>

export interface UseTemplatesResult {
  templates: ProjectTemplate[]
  loading: boolean
  error: string | null
  saving: boolean
  refetch: () => void
  addTemplate: (data: NewTemplateInput) => Promise<void>
  updateTemplate: (id: string, data: Partial<NewTemplateInput>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  reorder: (ordered: ProjectTemplate[]) => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [tick, setTick]           = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    db.from('project_templates')
      .select('*')
      .order('task_number', { ascending: true })
      .then(({ data, error: err }: { data: ProjectTemplate[] | null; error: any }) => {
        if (err) setError(err.message)
        else { setTemplates(data ?? []); setError(null) }
        setLoading(false)
      })
  }, [tick])

  const addTemplate = useCallback(async (data: NewTemplateInput) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').insert(data)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const updateTemplate = useCallback(async (id: string, data: Partial<NewTemplateInput>) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').update(data).eq('id', id)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const deleteTemplate = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').delete().eq('id', id)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  /**
   * Reorder: recalculate task_number (1..N) for all templates and batch-update.
   * Uses optimistic local state update; on error reverts to previous order.
   */
  const reorder = useCallback(async (ordered: ProjectTemplate[]) => {
    const previous = templates
    // Optimistic update
    setTemplates(ordered.map((t, i) => ({ ...t, task_number: i + 1 })))
    setSaving(true)

    try {
      await Promise.all(
        ordered.map((t, i) =>
          db.from('project_templates')
            .update({ task_number: i + 1 })
            .eq('id', t.id)
        )
      )
    } catch (e: any) {
      // Revert on failure
      setTemplates(previous)
      setError(e.message ?? 'Erro ao reordenar')
    } finally {
      setSaving(false)
    }
  }, [templates])

  return { templates, loading, error, saving, refetch, addTemplate, updateTemplate, deleteTemplate, reorder }
}
