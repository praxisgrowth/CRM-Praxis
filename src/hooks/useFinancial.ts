import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FinancialTransaction, FinancialMRREntry } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface FinancialKPIs {
  mrrAtual: number
  mrrDelta: number      // % vs mês anterior
  churnRate: number     // % atual
  churnDelta: number    // diferença vs mês anterior (positivo = pior)
  saldoCaixa: number    // receitas pagas - despesas pagas
  ltvMedio: number      // (mrrAtual / nClients) * 12
}

export interface UseFinancialResult {
  kpis: FinancialKPIs
  mrrHistory: FinancialMRREntry[]
  transactions: FinancialTransaction[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/* ─── Helpers ────────────────────────────────────── */
const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

/** Converte 'YYYY-MM' → 'Mmm/AA'. Passa strings já formatadas sem alteração. */
function fmtMonth(raw: string): string {
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-')
    return `${PT_MONTHS[+m - 1]}/${y.slice(2)}`
  }
  return raw
}

function computeKPIs(
  mrr: FinancialMRREntry[],
  txs: FinancialTransaction[],
  nClients: number,
): FinancialKPIs {
  const cur  = mrr.at(-1)
  const prev = mrr.at(-2)

  const mrrAtual  = cur?.mrr       ?? 0
  const mrrPrev   = prev?.mrr      ?? mrrAtual
  const mrrDelta  = mrrPrev ? ((mrrAtual - mrrPrev) / mrrPrev) * 100 : 0

  const churnRate  = cur?.churn_rate  ?? 0
  const churnPrev  = prev?.churn_rate ?? churnRate
  const churnDelta = churnRate - churnPrev

  const paid    = txs.filter(t => t.status === 'pago')
  const receita = paid.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0)
  const despesa = paid.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0)
  const saldoCaixa = receita - despesa

  const clients = nClients > 0 ? nClients : 1
  const ltvMedio = Math.round((mrrAtual / clients) * 12)

  return { mrrAtual, mrrDelta, churnRate, churnDelta, saldoCaixa, ltvMedio }
}

/* ─── Fallback ───────────────────────────────────── */
const FALLBACK_MRR: FinancialMRREntry[] = [
  { id: '1', month: 'Set/24', mrr: 42000, churn_rate: 1.2, recorded_at: '2024-09-01' },
  { id: '2', month: 'Out/24', mrr: 45500, churn_rate: 0.8, recorded_at: '2024-10-01' },
  { id: '3', month: 'Nov/24', mrr: 48200, churn_rate: 1.5, recorded_at: '2024-11-01' },
  { id: '4', month: 'Dez/24', mrr: 51000, churn_rate: 0.5, recorded_at: '2024-12-01' },
  { id: '5', month: 'Jan/25', mrr: 54800, churn_rate: 0.9, recorded_at: '2025-01-01' },
  { id: '6', month: 'Fev/25', mrr: 58200, churn_rate: 1.1, recorded_at: '2025-02-01' },
]

const FALLBACK_TXS: FinancialTransaction[] = [
  { id: '1',  description: 'Mensalidade TechVision',      amount: 18000, type: 'receita', category: 'Serviço',   status: 'pago',     date: '2025-02-03', client_id: null, created_at: '' },
  { id: '2',  description: 'Mensalidade Bioforma',         amount: 16000, type: 'receita', category: 'Serviço',   status: 'pago',     date: '2025-02-05', client_id: null, created_at: '' },
  { id: '3',  description: 'Mensalidade Nexus Corp',       amount: 14000, type: 'receita', category: 'Serviço',   status: 'pago',     date: '2025-02-07', client_id: null, created_at: '' },
  { id: '4',  description: 'Mensalidade DataFlow',         amount: 22000, type: 'receita', category: 'Serviço',   status: 'pendente', date: '2025-02-10', client_id: null, created_at: '' },
  { id: '5',  description: 'Mensalidade Retail Max',       amount:  9000, type: 'receita', category: 'Serviço',   status: 'atrasado', date: '2025-01-31', client_id: null, created_at: '' },
  { id: '6',  description: 'Patrocínio Evento Marketing',  amount:  5000, type: 'receita', category: 'Outros',    status: 'pendente', date: '2025-02-18', client_id: null, created_at: '' },
  { id: '7',  description: 'Aluguel do escritório',        amount:  3200, type: 'despesa', category: 'Estrutura', status: 'pago',     date: '2025-02-01', client_id: null, created_at: '' },
  { id: '8',  description: 'Cloud Services AWS',           amount:   850, type: 'despesa', category: 'Software',  status: 'pago',     date: '2025-02-10', client_id: null, created_at: '' },
  { id: '9',  description: 'Freelancer Design',            amount:  2500, type: 'despesa', category: 'Pessoal',   status: 'pago',     date: '2025-02-08', client_id: null, created_at: '' },
  { id: '10', description: 'Ferramentas SaaS (pacote)',    amount:  1200, type: 'despesa', category: 'Software',  status: 'pendente', date: '2025-02-15', client_id: null, created_at: '' },
]

const FALLBACK_KPIS = computeKPIs(FALLBACK_MRR, FALLBACK_TXS, 5)

/* ─── Hook ───────────────────────────────────────── */
export function useFinancial(): UseFinancialResult {
  const [kpis, setKpis]               = useState<FinancialKPIs>(FALLBACK_KPIS)
  const [mrrHistory, setMrrHistory]   = useState<FinancialMRREntry[]>(FALLBACK_MRR)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(FALLBACK_TXS)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tick, setTick]               = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [mrrRes, txRes, clientRes] = await Promise.all([
          supabase.from('mrr_history').select('*').order('recorded_at', { ascending: true }),
          supabase.from('financial_transactions').select('*').order('date', { ascending: false }),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
        ])

        if (mrrRes.error)    throw mrrRes.error
        if (txRes.error)     throw txRes.error

        // mrr_history pode ter coluna 'meta' (migration.sql) ou 'churn_rate' (financial schema)
        const mrrData: FinancialMRREntry[] = ((mrrRes.data as any[]) ?? []).map(r => ({
          id:          r.id,
          month:       fmtMonth(r.month),
          mrr:         Number(r.mrr),
          churn_rate:  Number(r.churn_rate ?? 0),
          recorded_at: r.recorded_at,
        }))

        const txData = (txRes.data ?? []) as FinancialTransaction[]
        const nClients = clientRes.count ?? 5

        if (mrrData.length)  setMrrHistory(mrrData)
        if (txData.length)   setTransactions(txData)

        setKpis(computeKPIs(
          mrrData.length ? mrrData : FALLBACK_MRR,
          txData.length  ? txData  : FALLBACK_TXS,
          nClients,
        ))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar financeiro'
        setError(msg)
        console.warn('[useFinancial] Usando dados fallback:', msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  return { kpis, mrrHistory, transactions, loading, error, refetch }
}
