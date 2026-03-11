// src/hooks/useSLAMetrics.ts
import { useState, useEffect } from 'react'
import { supabase as _supabase } from '../lib/supabase'

const db = _supabase as unknown as { from(t: string): any }

export interface SLAMetrics {
  avgDeliveryDays:  number | null
  deliveryCount:    number
  avgApprovalHours: number | null
  approvalCount:    number
  loading:          boolean
  error:            string | null
}

export function useSLAMetrics(): SLAMetrics {
  const [metrics, setMetrics] = useState<Omit<SLAMetrics, 'loading' | 'error'>>({
    avgDeliveryDays:  null,
    deliveryCount:    0,
    avgApprovalHours: null,
    approvalCount:    0,
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // ── Métrica 1: Tempo médio de entrega ─────────────────────────
        const { data: projects, error: projErr } = await db
          .from('projects')
          .select('created_at, updated_at')
          .eq('status', 'concluido')

        if (projErr) throw new Error(projErr.message)

        const deliveryDays = (projects ?? []).map((p: { created_at: string; updated_at: string }) => {
          const ms = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()
          return ms / (1000 * 60 * 60 * 24)
        }).filter((d: number) => d >= 0)

        const avgDeliveryDays = deliveryDays.length > 0
          ? deliveryDays.reduce((a: number, b: number) => a + b, 0) / deliveryDays.length
          : null

        // ── Métrica 2: Tempo médio de aprovação do cliente ─────────────
        const { data: approvals, error: appErr } = await db
          .from('nexus_approvals')
          .select('created_at, file_id')
          .eq('action', 'aprovado')

        if (appErr) throw new Error(appErr.message)

        const fileIds = [...new Set((approvals ?? []).map((a: any) => a.file_id).filter(Boolean))]

        let fileCreatedAtMap: Record<string, string> = {}
        if (fileIds.length > 0) {
          const { data: filesData } = await db
            .from('nexus_files')
            .select('id, created_at')
            .in('id', fileIds)
          ;(filesData ?? []).forEach((f: { id: string; created_at: string }) => {
            fileCreatedAtMap[f.id] = f.created_at
          })
        }

        const approvalHours = (approvals ?? [])
          .filter((a: any) => fileCreatedAtMap[a.file_id])
          .map((a: any) => {
            const ms = new Date(a.created_at).getTime() - new Date(fileCreatedAtMap[a.file_id]).getTime()
            return ms / (1000 * 60 * 60)
          })
          .filter((h: number) => h >= 0)

        const avgApprovalHours = approvalHours.length > 0
          ? approvalHours.reduce((a: number, b: number) => a + b, 0) / approvalHours.length
          : null

        setMetrics({
          avgDeliveryDays,
          deliveryCount:   deliveryDays.length,
          avgApprovalHours,
          approvalCount:   approvalHours.length,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { ...metrics, loading, error }
}
