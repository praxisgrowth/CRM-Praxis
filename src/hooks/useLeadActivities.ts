import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeadActivity, ActivityType } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface NewActivityInput {
  type: ActivityType
  description: string
  metadata?: Record<string, unknown>
  created_by?: string
}

export interface UseLeadActivitiesResult {
  activities: LeadActivity[]
  loading: boolean
  error: string | null
  addActivity: (input: NewActivityInput) => Promise<void>
}

/* ─── Hook ───────────────────────────────────────── */
export function useLeadActivities(leadId: string): UseLeadActivitiesResult {
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leadId) { setLoading(false); return }

    setLoading(true)
    setError(null)

    supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .then(({ data, error: sbErr }) => {
        if (sbErr) {
          setError(sbErr.message)
          console.error('[useLeadActivities] Falha ao buscar atividades:', sbErr.message)
        } else {
          setActivities(data ?? [])
          console.info(`[useLeadActivities] ${(data ?? []).length} atividade(s) para lead ${leadId}`)
        }
        setLoading(false)
      })
  }, [leadId])

  /** Optimistic insert: exibe localmente antes de confirmar no banco */
  const addActivity = useCallback(async (input: NewActivityInput) => {
    const optimistic: LeadActivity = {
      id: `tmp-${Date.now()}`,
      lead_id: leadId,
      type: input.type,
      description: input.description,
      metadata: input.metadata ?? null,
      created_by: input.created_by ?? 'SDR',
      created_at: new Date().toISOString(),
    }
    setActivities(prev => [optimistic, ...prev])

    const { data, error: sbErr } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        type: input.type,
        description: input.description,
        metadata: input.metadata ?? null,
        created_by: input.created_by ?? 'SDR',
      })
      .select()
      .single()

    if (sbErr) {
      setActivities(prev => prev.filter(a => a.id !== optimistic.id))
      console.error('[useLeadActivities] Falha ao persistir, revertendo optimistic:', sbErr.message)
      throw sbErr
    }

    // Substitui o ID temporário pelo UUID definitivo do Supabase
    setActivities(prev => prev.map(a => a.id === optimistic.id ? data : a))
    console.info('[useLeadActivities] Atividade persistida:', data.id)
  }, [leadId])

  return { activities, loading, error, addActivity }
}
