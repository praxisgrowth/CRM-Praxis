import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FinancialTransaction, FinancialMRREntry, FinancialPayment } from '../lib/database.types'

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
  payments: FinancialPayment[]
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

/* ─── Hook ───────────────────────────────────────── */
export function useFinancial(): UseFinancialResult {
  const [kpis, setKpis]               = useState<FinancialKPIs>({
    mrrAtual: 0,
    mrrDelta: 0,
    churnRate: 0,
    churnDelta: 0,
    saldoCaixa: 0,
    ltvMedio: 0
  })
  const [mrrHistory, setMrrHistory]   = useState<FinancialMRREntry[]>([])
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [payments, setPayments]         = useState<FinancialPayment[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tick, setTick]               = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [mrrRes, txRes, clientRes, paymentsRes] = await Promise.all([
          supabase.from('mrr_history').select('*').order('recorded_at', { ascending: true }),
          supabase.from('financial_transactions').select('*').order('date', { ascending: false }),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('financial_payments').select('*').order('created_at', { ascending: false }).limit(20),
        ])

        if (mrrRes.error)    console.error('Error fetching MRR history:', mrrRes.error)
        if (txRes.error)     console.error('Error fetching transactions:', txRes.error)

        // mrr_history mapping
        const mrrData: FinancialMRREntry[] = ((mrrRes.data as any[]) ?? []).map(r => ({
          id:          r.id,
          month:       fmtMonth(r.month),
          mrr:         Number(r.mrr),
          churn_rate:  Number(r.churn_rate ?? 0),
          recorded_at: r.recorded_at,
        }))

        const txData = (txRes.data ?? []) as FinancialTransaction[]
        const nClients = clientRes.count ?? 0

        setMrrHistory(mrrData)
        setTransactions(txData)

        setKpis(computeKPIs(mrrData, txData, nClients))
        setPayments((paymentsRes.data ?? []) as FinancialPayment[])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar financeiro'
        setError(msg)
        console.error('[useFinancial] Erro crítico:', msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  return { kpis, mrrHistory, transactions, payments, loading, error, refetch }
}
