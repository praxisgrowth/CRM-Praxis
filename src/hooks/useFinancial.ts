import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { FinanceTransaction, FinancialKPIs, FinanceRecurringContract, CompraPendente } from '../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
export interface FinanceDateRange {
  startDate: string | null
  endDate: string | null
}

export interface FinancialKPIsExtended extends FinancialKPIs {
  recebimentoPrevisto: number
  recebimentoEfetivo: number
  faturamentoTotal: number
  numeroVendas: number
  despesasTotal: number
  lucroLiquido: number
  margemLucro: number
  percentualDespesas: number
  // Extended Indicators
  baseAtiva: number
  movimentacaoNovos: number
  movimentacaoCancelados: number
  lifespanReal: number
  taxaRenovacao: number
  ltvHistoricoReal: number
  ltvProjetado: number
  cac: number
  investimentoTotal: number
}

export interface FinancialHistoryEntry {
  id: string
  month: string
  faturamento: number
  recebimentoPrevisto: number
  recebimentoEfetivo: number
  despesas: number
  lucro: number
}

export interface UseFinancialResult {
  kpis: FinancialKPIsExtended
  history: FinancialHistoryEntry[]
  transactions: (FinanceTransaction & { finance_categories: { name: string } | null, clients: { name: string } | null })[]
  payments: (FinanceTransaction & { finance_categories: { name: string } | null, clients: { name: string } | null })[]
  recurringContracts: (FinanceRecurringContract & { clients: { name: string } | null })[]
  pendingPurchases: (CompraPendente & { clients: { name: string } | null })[]
  loading: boolean
  error: string | null
  refetch: () => void
  setDateRange: (range: FinanceDateRange) => void
  dateRange: FinanceDateRange
}

/* ─── Helpers ────────────────────────────────────── */
export const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${PT_MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
  } catch {
    return dateStr
  }
}

function computeKPIs(
  txs: FinanceTransaction[],
  contracts: FinanceRecurringContract[],
  nClients: number,
  dateRange: FinanceDateRange
): { kpis: FinancialKPIsExtended, history: FinancialHistoryEntry[] } {
  const now = new Date()
  
  // 1. Multi-line History
  const historyMap: Record<string, FinancialHistoryEntry> = {}
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.toISOString().slice(0, 7)
    historyMap[m] = {
      id: m,
      month: fmtMonth(m + '-10'),
      faturamento: 0,
      recebimentoPrevisto: 0,
      recebimentoEfetivo: 0,
      despesas: 0,
      lucro: 0
    }
  }

  txs.forEach(t => {
    if (!t.vencimento && !t.date) return
    const dateStr = t.vencimento || t.date || ''
    const m = dateStr.slice(0, 7)
    
    if (historyMap[m]) {
      if (t.kind === 'income' && t.status !== 'CANCELADO') {
        historyMap[m].faturamento += t.amount
        historyMap[m].recebimentoPrevisto += t.amount
        if (t.status === 'PAGO') {
          historyMap[m].recebimentoEfetivo += t.amount
        }
      } else if (t.kind === 'expense' && t.status !== 'CANCELADO') {
        historyMap[m].despesas += t.amount
      }
      historyMap[m].lucro = historyMap[m].faturamento - historyMap[m].despesas
    }
  })

  const history = Object.values(historyMap).sort((a, b) => a.id.localeCompare(b.id))

  // 2. Period KPIs
  const isWithinRange = (dateStr: string | null) => {
    if (!dateStr) return false
    if (!dateRange.startDate && !dateRange.endDate) return true
    const d = dateStr.slice(0, 10)
    if (dateRange.startDate && d < dateRange.startDate) return false
    if (dateRange.endDate && d > dateRange.endDate) return false
    return true
  }

  const periodTxs = txs.filter(t => isWithinRange(t.vencimento || t.date))
  
  // Para Caixa (Recebimento Efetivo), se tiver payment_date, usamos ela para o filtro, caso contrário usamos vencimento/date
  const recebimentoEfetivo = txs
    .filter(t => t.kind === 'income' && t.status === 'PAGO')
    .filter(t => isWithinRange(t.payment_date || t.vencimento || t.date))
    .reduce((sum, t) => sum + t.amount, 0)

  const faturamentoTotal = periodTxs.filter(t => t.kind === 'income' && t.status !== 'CANCELADO').reduce((sum, t) => sum + t.amount, 0)
  const numeroVendas = periodTxs.filter(t => t.kind === 'income' && t.status !== 'CANCELADO').length
  
  const recebimentoPrevisto = periodTxs.filter(t => t.kind === 'income' && t.status !== 'CANCELADO').reduce((sum, t) => sum + t.amount, 0)
  
  const despesasTotal = periodTxs.filter(t => t.kind === 'expense' && t.status !== 'CANCELADO').reduce((sum, t) => sum + t.amount, 0)
  const lucroLiquido = faturamentoTotal - despesasTotal
  const margemLucro = faturamentoTotal > 0 ? (lucroLiquido / faturamentoTotal) * 100 : 0
  const percentualDespesas = faturamentoTotal > 0 ? (despesasTotal / faturamentoTotal) * 100 : 0

  // MRR (Always current context or normalized)
  const calculateMRR = (cArr: FinanceRecurringContract[]) => {
    return cArr.reduce((sum, c) => {
      let div = 1
      const freq = c.frequency || 'MONTHLY'
      if (freq === 'QUARTERLY') div = 3
      if (freq === 'SEMIANNUALLY') div = 6
      if (freq === 'YEARLY') div = 12
      if (freq === 'WEEKLY') div = 0.25
      if (freq === 'BIMONTHLY') div = 2
      if (freq === 'BIWEEKLY') div = 0.5
      return sum + (c.amount / div)
    }, 0)
  }
  const mrrAtual = calculateMRR(contracts.filter(c => c.is_active))

  // Saldo Caixa (Total Paid ever)
  const paid = txs.filter(t => t.status === 'PAGO')
  const receitaAbs = paid.filter(t => t.kind === 'income').reduce((sum, t) => sum + t.amount, 0)
  const despesaAbs = paid.filter(t => t.kind === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const saldoCaixa = receitaAbs - despesaAbs

  const ltvMedio = nClients > 0 ? receitaAbs / nClients : 0

  const baseAtiva = contracts.filter(c => c.is_active).length
  const movimentacaoNovos = txs.filter(t => t.kind === 'income' && t.status !== 'CANCELADO' && isWithinRange(t.created_at)).length
  const movimentacaoCancelados = txs.filter(t => t.kind === 'income' && t.status === 'CANCELADO' && isWithinRange(t.updated_at)).length
  
  // Lifespan & Renewal (Simplificado para agora)
  const lifespanReal = 12.0 // meses
  const taxaRenovacao = 85.0 // %
  
  const ltvHistoricoReal = nClients > 0 ? faturamentoTotal / nClients : 0
  const ltvProjetado = mrrAtual > 0 ? (mrrAtual * 12) : 0 
  
  // CAC
  const investimentoTotal = txs.filter(t => t.kind === 'expense' && t.category_id === 1 /* MKT/comercial placeholder */).reduce((sum, t) => sum + t.amount, 0)
  const cac = movimentacaoNovos > 0 ? investimentoTotal / movimentacaoNovos : 0

  return { 
    kpis: { 
      mrrAtual, mrrDelta: 4.2, churnRate: 2.1, churnDelta: -0.5, saldoCaixa, ltvMedio,
      faturamentoTotal, numeroVendas, recebimentoPrevisto, recebimentoEfetivo,
      despesasTotal, lucroLiquido, margemLucro, percentualDespesas,
      baseAtiva, movimentacaoNovos, movimentacaoCancelados, lifespanReal, taxaRenovacao,
      ltvHistoricoReal, ltvProjetado, cac, investimentoTotal
    },
    history
  }
}

/* ─── Hook ───────────────────────────────────────── */
export function useFinancial(): UseFinancialResult {
  const [dateRange, setDateRange] = useState<FinanceDateRange>(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    return { startDate: firstDay, endDate: lastDay }
  })

  const [kpis, setKpis] = useState<FinancialKPIsExtended>({
    mrrAtual: 0,
    mrrDelta: 0,
    churnRate: 0,
    churnDelta: 0,
    saldoCaixa: 0,
    ltvMedio: 0,
    faturamentoTotal: 0,
    numeroVendas: 0,
    recebimentoPrevisto: 0,
    recebimentoEfetivo: 0,
    despesasTotal: 0,
    lucroLiquido: 0,
    margemLucro: 0,
    percentualDespesas: 0,
    baseAtiva: 0,
    movimentacaoNovos: 0,
    movimentacaoCancelados: 0,
    lifespanReal: 0,
    taxaRenovacao: 0,
    ltvHistoricoReal: 0,
    ltvProjetado: 0,
    cac: 0,
    investimentoTotal: 0,
  })
  
  const [history, setHistory]           = useState<FinancialHistoryEntry[]>([])
  const [transactions, setTransactions] = useState<(FinanceTransaction & { finance_categories: { name: string } | null, clients: { name: string } | null })[]>([])
  const [payments, setPayments]         = useState<(FinanceTransaction & { finance_categories: { name: string } | null, clients: { name: string } | null })[]>([])
  const [recurringContracts, setRecurringContracts] = useState<(FinanceRecurringContract & { clients: { name: string } | null })[]>([])
  const [pendingPurchases, setPendingPurchases] = useState<(CompraPendente & { clients: { name: string } | null })[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tick, setTick]               = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [txRes, clientRes, pendingRes, contractRes] = await Promise.all([
          supabase.from('finance_transactions').select('*, finance_categories(name), clients(name)').order('date', { ascending: false }),
          supabase.from('clients').select('id', { count: 'exact', head: true }).neq('status', 'Cancelado'),
          supabase.from('compra_pendente').select('*, clients(name)').eq('status', 'pendente').order('data_criacao', { ascending: false }),
          supabase.from('finance_recurring_contracts').select('*, clients(name)').order('created_at', { ascending: false })
        ])

        if (txRes.error) throw txRes.error
        if (pendingRes.error) throw pendingRes.error
        if (contractRes.error) throw contractRes.error

        const txData = (txRes.data ?? []) as (FinanceTransaction & { finance_categories: { name: string } | null, clients: { name: string } | null })[]
        const contractData = (contractRes.data ?? []) as FinanceRecurringContract[]
        const nClients = clientRes.count ?? 0

        const { kpis: calculatedKpis, history: hist } = computeKPIs(txData, contractData, nClients, dateRange)

        setHistory(hist)
        setTransactions(txData as any)
        setPendingPurchases(pendingRes.data as any || [])
        setRecurringContracts((contractRes.data || []) as any)
        setKpis(calculatedKpis)
        
        setPayments(txData.filter(t => t.kind === 'income').slice(0, 20) as any)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar financeiro'
        setError(msg)
        console.error('[useFinancial] Erro:', msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick, dateRange]) 

  return { kpis, history, transactions, payments, recurringContracts, pendingPurchases, loading, error, refetch, setDateRange, dateRange }
}
