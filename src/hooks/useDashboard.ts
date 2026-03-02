import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Client, KPIMetric, MRRHistory } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface DashboardKPIs {
  leadsAtivos: number
  mrr: number          // valor em reais
  conversionRate: number
  slaPercent: number
}

export interface DashboardData {
  kpis: DashboardKPIs
  mrrHistory: MRRHistory[]
  clients: Client[]
  loading: boolean
  error: string | null
}

/* ─── Fallback (usado enquanto tabelas não existirem) */
const FALLBACK_KPIS: DashboardKPIs = {
  leadsAtivos: 248,
  mrr: 84000,
  conversionRate: 24,
  slaPercent: 97,
}

const FALLBACK_MRR: MRRHistory[] = [
  { id: '1', month: 'Ago', mrr: 62000, meta: 60000, recorded_at: '2024-08-01' },
  { id: '2', month: 'Set', mrr: 67000, meta: 65000, recorded_at: '2024-09-01' },
  { id: '3', month: 'Out', mrr: 71000, meta: 70000, recorded_at: '2024-10-01' },
  { id: '4', month: 'Nov', mrr: 76000, meta: 74000, recorded_at: '2024-11-01' },
  { id: '5', month: 'Dez', mrr: 79000, meta: 78000, recorded_at: '2024-12-01' },
  { id: '6', month: 'Jan', mrr: 84000, meta: 82000, recorded_at: '2025-01-01' },
]

const FALLBACK_CLIENTS: Client[] = [
  { id: '1', name: 'TechVision', segment: 'SaaS',      mrr: 18000, health_score: 92, trend: 'up',   avatar: 'TV', created_at: '', updated_at: '' },
  { id: '2', name: 'Nexus Corp', segment: 'Indústria', mrr: 14000, health_score: 78, trend: 'up',   avatar: 'NC', created_at: '', updated_at: '' },
  { id: '3', name: 'DataFlow',   segment: 'Fintech',   mrr: 22000, health_score: 65, trend: 'flat', avatar: 'DF', created_at: '', updated_at: '' },
  { id: '4', name: 'Retail Max', segment: 'Varejo',    mrr:  9000, health_score: 43, trend: 'down', avatar: 'RM', created_at: '', updated_at: '' },
  { id: '5', name: 'Bioforma',   segment: 'HealthTech',mrr: 16000, health_score: 88, trend: 'up',   avatar: 'BF', created_at: '', updated_at: '' },
]

/* ─── Hook ───────────────────────────────────────── */
export function useDashboard(): DashboardData {
  const [kpis, setKpis] = useState<DashboardKPIs>(FALLBACK_KPIS)
  const [mrrHistory, setMrrHistory] = useState<MRRHistory[]>(FALLBACK_MRR)
  const [clients, setClients] = useState<Client[]>(FALLBACK_CLIENTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError(null)

      try {
        const [leadsRes, mrrRes, clientsRes, kpiRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).neq('stage', 'fechado'),
          supabase.from('mrr_history').select('*').order('recorded_at', { ascending: true }),
          supabase.from('clients').select('*').order('health_score', { ascending: false }),
          supabase.from('kpi_metrics').select('*'),
        ] as const)

        // Leads ativos
        const leadsAtivos = leadsRes.count ?? FALLBACK_KPIS.leadsAtivos

        // MRR history
        const mrrData = mrrRes.data as MRRHistory[] | null
        if (mrrData?.length) setMrrHistory(mrrData)

        // Clients
        const clientsData = clientsRes.data as Client[] | null
        if (clientsData?.length) setClients(clientsData)

        // KPI metrics
        const kpiData = kpiRes.data as KPIMetric[] | null
        const kpiMap = Object.fromEntries(
          (kpiData ?? []).map(m => [m.key, m.value])
        )

        // MRR atual = último valor do histórico
        const lastMRR = mrrData?.at(-1)?.mrr ?? FALLBACK_KPIS.mrr

        setKpis({
          leadsAtivos,
          mrr: lastMRR,
          conversionRate: kpiMap['conversion_rate'] ?? FALLBACK_KPIS.conversionRate,
          slaPercent: kpiMap['sla_percent'] ?? FALLBACK_KPIS.slaPercent,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(msg)
        console.warn('[useDashboard] Usando dados fallback:', msg)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  return { kpis, mrrHistory, clients, loading, error }
}
