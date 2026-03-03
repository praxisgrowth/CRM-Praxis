import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface NewLeadInput {
  name: string
  email: string | null
  phone: string | null
  stage: Lead['stage']
  score: number
  source: string | null
}

export interface UseLeadsResult {
  leads: Lead[]
  loading: boolean
  error: string | null
  refetch: () => void
  addLead: (data: NewLeadInput) => Promise<void>
}

/* ─── Fallback ───────────────────────────────────── */
const FALLBACK_LEADS: Lead[] = [
  { id: '1', name: 'Construmax Engenharia', email: 'contato@construmax.com', phone: null, stage: 'proposta',    score: 94, source: 'LinkedIn',   created_at: '2024-10-15T00:00:00Z', updated_at: '2024-10-15T00:00:00Z' },
  { id: '2', name: 'FinScale Ltda',         email: 'hello@finscale.io',      phone: null, stage: 'qualificado', score: 88, source: 'Indicação',  created_at: '2024-11-02T00:00:00Z', updated_at: '2024-11-02T00:00:00Z' },
  { id: '3', name: 'Agro Dinâmico',         email: 'adm@agrodinamico.com',   phone: null, stage: 'negociacao',  score: 82, source: 'Evento',     created_at: '2024-12-10T00:00:00Z', updated_at: '2024-12-10T00:00:00Z' },
  { id: '4', name: 'Medbyte Health',        email: 'tech@medbyte.com',       phone: null, stage: 'novo',        score: 71, source: 'Site',       created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
  { id: '5', name: 'LogiSmart',             email: 'ops@logismart.com',      phone: null, stage: 'proposta',    score: 67, source: 'LinkedIn',   created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z' },
  { id: '6', name: 'CityFin',               email: 'cfo@cityfin.com',        phone: null, stage: 'qualificado', score: 59, source: 'Outbound',   created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z' },
  { id: '7', name: 'Ecopack Brasil',        email: 'eco@ecopack.com',        phone: null, stage: 'novo',        score: 45, source: 'Site',       created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: '8', name: 'Rápido Express',        email: 'ti@rapidoexpress.com',   phone: null, stage: 'novo',        score: 38, source: 'Cold Email', created_at: '2025-02-10T00:00:00Z', updated_at: '2025-02-10T00:00:00Z' },
]

/* ─── Hook ───────────────────────────────────────── */
export function useLeads(): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>(FALLBACK_LEADS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: sbErr } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false })

      if (sbErr) throw sbErr

      // Banco tem precedência total: mesmo com 0 resultados, substitui o fallback
      setLeads((data ?? []) as Lead[])
      console.info(`[useLeads] ${(data ?? []).length} leads carregados do Supabase.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      console.error('[useLeads] Falha ao buscar leads, mantendo fallback:', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  /** Optimistic insert — tipagem correta via createClient<Database> */
  const addLead = useCallback(async (input: NewLeadInput) => {
    const optimistic: Lead = {
      ...input,
      id: `tmp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLeads(prev => [optimistic, ...prev].sort((a, b) => b.score - a.score))

    const { data, error: sbErr } = await supabase
      .from('leads')
      .insert(input)
      .select()
      .single()

    if (sbErr) {
      console.error('[useLeads] Falha ao inserir lead, revertendo optimistic:', sbErr.message)
      setLeads(prev => prev.filter(l => l.id !== optimistic.id))
      throw sbErr
    }

    // Substitui o registro temporário pelo retorno real do Supabase (UUID definitivo)
    setLeads(prev => prev.map(l => l.id === optimistic.id ? data : l))
    console.info('[useLeads] Lead persistido com ID:', data.id)
  }, [])

  return { leads, loading, error, refetch: fetchLeads, addLead }
}
