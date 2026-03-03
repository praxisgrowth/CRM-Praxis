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


export function useDashboard(): DashboardData {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    leadsAtivos: 0,
    mrr: 0,
    conversionRate: 0,
    slaPercent: 0
  })
  const [mrrHistory, setMrrHistory] = useState<MRRHistory[]>([])
  const [clients, setClients] = useState<Client[]>([])
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

        if (leadsRes.error) console.error('Error fetching leads count:', leadsRes.error)
        if (mrrRes.error) console.error('Error fetching MRR history:', mrrRes.error)
        if (clientsRes.error) console.error('Error fetching clients:', clientsRes.error)
        if (kpiRes.error) console.error('Error fetching KPI metrics:', kpiRes.error)

        // Leads ativos
        const leadsAtivos = leadsRes.count ?? 0

        // MRR history
        const mrrData = mrrRes.data as MRRHistory[] | null
        setMrrHistory(mrrData ?? [])

        // Clients
        const clientsData = clientsRes.data as Client[] | null
        setClients(clientsData ?? [])

        // KPI metrics
        const kpiData = kpiRes.data as KPIMetric[] | null
        const kpiMap = Object.fromEntries(
          (kpiData ?? []).map(m => [m.key, m.value])
        )

        // MRR atual = último valor do histórico
        const lastMRR = mrrData?.at(-1)?.mrr ?? 0

        setKpis({
          leadsAtivos,
          mrr: lastMRR,
          conversionRate: kpiMap['conversion_rate'] ?? 0,
          slaPercent: kpiMap['sla_percent'] ?? 0,
        })
        
        console.info('[useDashboard] Dados sincronizados com Supabase.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(msg)
        console.error('[useDashboard] Erro crítico:', msg)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  return { kpis, mrrHistory, clients, loading, error }
}
