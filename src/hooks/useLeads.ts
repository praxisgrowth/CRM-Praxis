import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAudit } from './useAudit'
import type { Lead, Priority } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface NewLeadInput {
  name:      string
  email:     string | null
  phone:     string | null
  stage:     Lead['stage']
  score:     number
  source:    string | null
  // Optional pipeline fields
  title?:    string | null
  company?:  string | null
  value?:    number
  priority?: Priority | null
  tags?:     string[]
  client_id?: string | null
  // UTM tracking
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_content?:  string | null
  utm_term?:     string | null
}

export interface UseLeadsResult {
  leads:      Lead[]
  loading:    boolean
  error:      string | null
  refetch:    () => void
  addLead:    (data: NewLeadInput) => Promise<void>
  moveLead:   (id: string, stage: Lead['stage']) => Promise<void>
  deleteLead: (id: string) => Promise<void>
}

/* ─── Fallback ───────────────────────────────────── */
const FALLBACK_LEADS: Lead[] = [
  { id: '1', name: 'Construmax Engenharia', email: 'contato@construmax.com', phone: null, stage: 'proposta',    score: 94, source: 'LinkedIn',   title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2024-10-15T00:00:00Z', updated_at: '2024-10-15T00:00:00Z' },
  { id: '2', name: 'FinScale Ltda',         email: 'hello@finscale.io',      phone: null, stage: 'reuniao',     score: 88, source: 'Indicação',  title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2024-11-02T00:00:00Z', updated_at: '2024-11-02T00:00:00Z' },
  { id: '3', name: 'Agro Dinâmico',         email: 'adm@agrodinamico.com',   phone: null, stage: 'negociacao',  score: 82, source: 'Evento',     title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2024-12-10T00:00:00Z', updated_at: '2024-12-10T00:00:00Z' },
  { id: '4', name: 'Medbyte Health',        email: 'tech@medbyte.com',       phone: null, stage: 'prospeccao',  score: 71, source: 'Site',       title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
  { id: '5', name: 'LogiSmart',             email: 'ops@logismart.com',      phone: null, stage: 'proposta',    score: 67, source: 'LinkedIn',   title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z' },
  { id: '6', name: 'CityFin',               email: 'cfo@cityfin.com',        phone: null, stage: 'reuniao',     score: 59, source: 'Outbound',   title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z' },
  { id: '7', name: 'Ecopack Brasil',        email: 'eco@ecopack.com',        phone: null, stage: 'prospeccao',  score: 45, source: 'Site',       title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: '8', name: 'Rápido Express',        email: 'ti@rapidoexpress.com',   phone: null, stage: 'prospeccao',  score: 38, source: 'Cold Email', title: null, value: 0, priority: null, company: null, tags: [], faturamento: null, team_size: null, dores: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, client_id: null, created_at: '2025-02-10T00:00:00Z', updated_at: '2025-02-10T00:00:00Z' },
]

/* ─── Hook ───────────────────────────────────────── */
export function useLeads(): UseLeadsResult {
  const [leads, setLeads] = useState<Lead[]>(FALLBACK_LEADS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { logAction } = useAudit()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: sbErr } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false })

      if (sbErr) throw sbErr

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

  /** Optimistic insert */
  const addLead = useCallback(async (input: NewLeadInput) => {
    const optimistic: Lead = {
      id:          `tmp-${Date.now()}`,
      name:        input.name,
      email:       input.email,
      phone:       input.phone,
      stage:       input.stage,
      score:       input.score,
      source:      input.source,
      title:       input.title ?? null,
      value:       input.value ?? 0,
      priority:    input.priority ?? null,
      company:     input.company ?? null,
      tags:        input.tags ?? [],
      client_id:   input.client_id ?? null,
      faturamento: null,
      team_size:   null,
      dores:       null,
      utm_source:   input.utm_source   ?? null,
      utm_medium:   input.utm_medium   ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_content:  input.utm_content  ?? null,
      utm_term:     input.utm_term     ?? null,
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    }
    setLeads(prev => [optimistic, ...prev].sort((a, b) => b.score - a.score))

    const { data, error: sbErr } = await (supabase as any)
      .from('leads')
      .insert(input)
      .select()
      .single()

    if (sbErr) {
      console.error('[useLeads] Falha ao inserir lead, revertendo optimistic:', sbErr.message)
      setLeads(prev => prev.filter(l => l.id !== optimistic.id))
      throw sbErr
    }

    setLeads(prev => prev.map(l => l.id === optimistic.id ? data as Lead : l))
    console.info('[useLeads] Lead persistido com ID:', (data as any).id)
  }, [])

  /** Move lead to new stage — optimistic + persist */
  const moveLead = useCallback(async (id: string, stage: Lead['stage']) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
    const { error: err } = await (supabase as any)
      .from('leads')
      .update({ stage })
      .eq('id', id)
    if (err) {
      console.error('[moveLead]', err.message)
      fetchLeads()
    }
  }, [fetchLeads])

  /** Delete lead — optimistic + persist */
  const deleteLead = useCallback(async (id: string) => {
    const target = leads.find(l => l.id === id)
    setLeads(prev => prev.filter(l => l.id !== id))
    const { error: err } = await (supabase as any)
      .from('leads')
      .delete()
      .eq('id', id)
    if (err) {
      console.error('[deleteLead]', err.message)
      fetchLeads()
      return
    }
    logAction('Delete Lead', 'lead', id, { name: target?.name ?? id })
  }, [fetchLeads, logAction, leads])

  return { leads, loading, error, refetch: fetchLeads, addLead, moveLead, deleteLead }
}
