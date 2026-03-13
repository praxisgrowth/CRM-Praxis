import { useState, useMemo } from 'react'
import {
  ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, DollarSign, BarChart2,
  AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
  Plus, Clock, ShoppingCart, CheckCircle2, XCircle, Trash2, Eye, EyeOff,
  Calendar, ChevronDown
} from 'lucide-react'
import { useFinancial } from '../hooks/useFinancial'
import { deleteSubscription } from '../hooks/useBilling'
import { useFinancialActions } from '../hooks/useFinancialActions'
import type { UseFinancialResult, FinancialHistoryEntry } from '../hooks/useFinancial'
import type { FinanceTransaction, FinanceTransactionStatus, FinanceRecurringContract } from '../lib/database.types'
import { BillingDrawer } from '../components/financial/BillingDrawer'
import { PaymentDetailDrawer } from '../components/financial/PaymentDetailDrawer'
import { PurchaseRequestDrawer } from '../components/financial/PurchaseRequestDrawer'
import { IndicatorsTab } from '../components/financial/IndicatorsTab'
import { Toast } from '../components/financial/Toast'

/* ─── Config ─────────────────────────────────────── */
type TxFilter = FinanceTransactionStatus | 'todos'

const STATUS_CFG: Record<FinanceTransactionStatus, { label: string; color: string }> = {
  PAGO:       { label: 'Pago',       color: '#10b981' },
  PENDENTE:   { label: 'Pendente',   color: '#f59e0b' },
  ATRASADO:   { label: 'Atrasado',   color: '#ef4444' },
  CANCELADO:  { label: 'Cancelado',  color: '#64748b' },
  PRORROGADA: { label: 'Prorrogada', color: '#8b5cf6' },
}

const TX_FILTER_CHIPS: { id: TxFilter; label: string; color: string }[] = [
  { id: 'todos',    label: 'Todas',    color: '#94a3b8' },
  { id: 'PAGO',     label: 'Pago',     color: '#10b981' },
  { id: 'PENDENTE', label: 'Pendente', color: '#f59e0b' },
  { id: 'ATRASADO', label: 'Atrasado', color: '#ef4444' },
]

const TABLE_HEADERS = ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Data']

/* ─── Formatters ─────────────────────────────────── */
function fmtBRL(v: number, compact = false) {
  if (compact) {
    if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `R$${(v / 1_000).toFixed(1)}k`
    return `R$${v}`
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─── KPI card ───────────────────────────────────── */
interface KPICardProps {
  icon: React.ReactNode
  label: string
  subLabel?: string
  value: string
  delta?: number
  deltaInverted?: boolean
  deltaLabel?: string
  color: string
  loading: boolean
}

function KPICard({ icon, label, subLabel, value, delta, deltaInverted, deltaLabel, color, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 animate-pulse" style={{ minHeight: 140 }}>
        <div className="h-4 rounded-md w-1/3 mb-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded-md w-1/2 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }} />
        <div className="h-8 rounded-md w-2/3"      style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
    )
  }

  const DeltaIcon = !delta
    ? Minus
    : deltaInverted
    ? delta > 0 ? ArrowDownRight : ArrowUpRight
    : delta > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
          {subLabel && <p className="text-[10px] text-slate-600 font-medium">{subLabel}</p>}
        </div>
        <div className="text-slate-400 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        {delta !== undefined && (
          <div className="flex items-center gap-1 text-xs font-bold tabular-nums" style={{ color: delta === 0 ? '#64748b' : delta > 0 ? '#10b981' : '#ef4444' }}>
            <DeltaIcon size={12} />
            {Math.abs(delta).toFixed(1)}% {deltaLabel && <span className="font-medium text-slate-500">{deltaLabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Financial History Chart ─────────────────────── */
interface ChartMetric {
  id: keyof Omit<FinancialHistoryEntry, 'month'>
  label: string
  color: string
  active: boolean
}

function FinancialHistoryChart({ data, loading }: { data: FinancialHistoryEntry[]; loading: boolean }) {
  const [metrics, setMetrics] = useState<ChartMetric[]>([
    { id: 'faturamento',        label: 'Faturamento',    color: '#00d2ff', active: true },
    { id: 'recebimentoPrevisto', label: 'Previsto',       color: '#f59e0b', active: false },
    { id: 'recebimentoEfetivo',  label: 'Recebido',       color: '#10b981', active: true },
    { id: 'despesas',            label: 'Despesas',       color: '#ef4444', active: false },
    { id: 'lucro',               label: 'Lucro Líquido',  color: '#8b5cf6', active: true },
  ])

  const toggleMetric = (id: string) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m))
  }

  if (loading) {
    return (
      <div
        className="w-full rounded-xl animate-pulse"
        style={{ height: 300, background: 'rgba(255,255,255,0.04)' }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {metrics.map(m => (
          <button
            key={m.id}
            onClick={() => toggleMetric(m.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-semibold"
            style={{
              background: m.active ? `${m.color}15` : 'transparent',
              borderColor: m.active ? `${m.color}40` : 'rgba(255,255,255,0.06)',
              color: m.active ? m.color : '#475569',
            }}
          >
            {m.active ? <Eye size={12} /> : <EyeOff size={12} />}
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            {metrics.map(m => (
              <linearGradient key={`grad-${m.id}`} id={`grad-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `R$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            content={<ChartTooltip metrics={metrics} />}
            cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          />

          {metrics.filter(m => m.active).map(m => (
            <Area
              key={m.id}
              type="monotone"
              dataKey={m.id}
              stroke={m.color}
              strokeWidth={2}
              fill={`url(#grad-${m.id})`}
              dot={{ fill: m.color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: m.color, strokeWidth: 0 }}
              animationDuration={500}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: { dataKey: string | number; value: number; color?: string; stroke?: string }[]
  label?: string
  metrics: ChartMetric[]
}

function ChartTooltip({ active, payload, label, metrics }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(8,12,20,0.96)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 12,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
      }}
    >
      <p style={{ color: '#64748b', marginBottom: 8, fontWeight: 500 }}>{label}</p>
      <div className="flex flex-col gap-2">
        {payload.map((p) => {
          const metric = (metrics as ChartMetric[]).find(m => m.id === p.dataKey)
          return (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-8">
              <span className="text-slate-500 font-medium">{metric?.label || String(p.dataKey)}</span>
              <span style={{ color: p.color ?? p.stroke, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {fmtBRL(Number(p.value))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Transaction row ────────────────────────────── */
function TxRow({ tx, onClick }: {
  tx: FinanceTransaction & { finance_categories?: { name: string } | null, clients?: { name: string } | null };
  onClick: () => void
}) {
  const st       = STATUS_CFG[tx.status] || { label: tx.status, color: '#64748b' }
  const isRec    = tx.kind === 'income'
  const amtColor = isRec ? '#10b981' : '#ef4444'

  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Descrição */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${amtColor}18` }}
          >
            {isRec
              ? <TrendingUp  size={11} style={{ color: amtColor }} />
              : <TrendingDown size={11} style={{ color: amtColor }} />
            }
          </div>
          <span className="text-sm text-white font-medium">{tx.description}</span>
        </div>
      </td>

      {/* Categoria */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
        >
          {tx.finance_categories?.name ?? 'Sem Cat.'}
        </span>
      </td>

      {/* Tipo */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
          style={{
            background: `${amtColor}18`,
            color: amtColor,
            border: `1px solid ${amtColor}35`,
          }}
        >
          {isRec ? 'Receita' : 'Despesa'}
        </span>
      </td>

      {/* Valor */}
      <td className="px-4 py-3 tabular-nums">
        <span className="text-sm font-semibold" style={{ color: amtColor }}>
          {isRec ? '+' : '-'}{fmtBRL(tx.amount)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{
            background: `${st.color}18`,
            color: st.color,
            border: `1px solid ${st.color}40`,
          }}
        >
          {st.label}
        </span>
      </td>

      {/* Data */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500">{fmtDate(tx.date)}</span>
      </td>
    </tr>
  )
}

/* ─── Payment row (income transactions) ──────────── */
function PaymentRow({ payment, onClick }: {
  payment: FinanceTransaction & { clients?: { name: string } | null };
  onClick: () => void
}) {
  const st = STATUS_CFG[payment.status] ?? { label: payment.status, color: '#64748b' }

  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Descrição */}
      <td className="px-4 py-3">
        <span className="text-sm text-white font-medium">{payment.description}</span>
      </td>

      {/* Cliente */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-400">{payment.clients?.name || '—'}</span>
      </td>

      {/* Tipo Parcela */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
          style={{
            background: 'rgba(0,210,255,0.1)',
            color: '#00d2ff',
            border: '1px solid rgba(0,210,255,0.25)',
          }}
        >
          {payment.installment_total && payment.installment_total > 1 ? `Parcela ${payment.installment_no}` : 'Única'}
        </span>
      </td>

      {/* Valor */}
      <td className="px-4 py-3 tabular-nums">
        <span className="text-sm font-semibold text-emerald-400">
          {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{
            background: `${st.color}18`,
            color: st.color,
            border: `1px solid ${st.color}40`,
          }}
        >
          {st.label}
        </span>
      </td>

      {/* Pendente Asaas / Data */}
      <td className="px-4 py-3">
        {payment.reference === 'manual' ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            Manual
          </span>
        ) : payment.reference === null ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: 'rgba(245,158,11,0.1)',
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <Clock size={10} />
            Pendente
          </span>
        ) : (
          <span className="text-xs text-slate-500">{fmtDate(payment.created_at)}</span>
        )}
      </td>
    </tr>
  )
}

/* ─── Contract row (recurring contracts) ──────────── */
function ContractRow({ contract, onDelete }: {
  contract: FinanceRecurringContract & { clients?: { name: string } | null };
  onDelete: (id: number) => void;
}) {
  const frequencyMap: Record<string, string> = {
    'weekly': 'Semanal',
    'monthly': 'Mensal',
    'yearly': 'Anual',
    'quarterly': 'Trimestral',
    'semiannual': 'Semestral'
  }

  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      <td className="px-4 py-3">
        <p className="text-sm text-white font-medium">{contract.title}</p>
        <p className="text-[10px] text-slate-500">{contract.clients?.name || 'Cliente'}</p>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
          {frequencyMap[contract.frequency] || contract.frequency}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-sm font-semibold text-white">
        {fmtBRL(contract.amount)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-slate-300 font-medium">{fmtDate(contract.next_due_date)}</span>
          <span className="text-[10px] text-slate-500">Próximo venc.</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            Ativa
          </span>
          <button
            onClick={() => onDelete(contract.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Excluir assinatura"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ─── Skeleton rows ──────────────────────────────── */
function SkeletonTxRow() {
  return (
    <tr>
      {[180, 80, 70, 90, 80, 60].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="animate-pulse rounded-md"
            style={{ height: 13, width: w, background: 'rgba(255,255,255,0.05)' }}
          />
        </td>
      ))}
    </tr>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function FinancialPage() {
  const { kpis, history, transactions, payments, recurringContracts, pendingPurchases, loading, error, refetch, setDateRange, dateRange } = useFinancial()
  const { approvePurchase, rejectPurchase } = useFinancialActions()

  const [activeTab,       setActiveTab]      = useState<'trans' | 'pending' | 'indicators'>('trans')
  const [txFilter,       setTxFilter]       = useState<TxFilter>('todos')
  const [drawerOpen,     setDrawerOpen]     = useState(false)
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<FinanceTransaction | null>(null)
  const [toast,          setToast]          = useState<{ message: string } | null>(null)

  /* Filtered transactions */
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => {
      // Filter by Status
      if (txFilter !== 'todos' && t.status !== txFilter) return false

      // Filter by Date Range
      // Se estiver pago, o que importa para o fluxo de caixa costuma ser quando o dinheiro entrou (payment_date)
      // Se não tiver payment_date ou não estiver pago, usamos o vencimento/date original
      const d = (t.status === 'PAGO' ? (t.payment_date || t.vencimento || t.date || '') : (t.vencimento || t.date || '')).slice(0, 10)
      if (dateRange.startDate && d < dateRange.startDate) return false
      if (dateRange.endDate && d > dateRange.endDate) return false
      
      return true
    })
  }, [transactions, txFilter, dateRange])

  /* Count per status */
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { todos: transactions.length }
    transactions.forEach(t => { map[t.status] = (map[t.status] ?? 0) + 1 })
    return map
  }, [transactions])

  /* KPI meta */
  const kpiCards = buildKPICards(kpis)

  const handleActionSuccess = (msg: string) => {
    setToast({ message: msg })
    refetch()
  }

  const handleDeleteSubscription = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta assinatura? Esta ação não pode ser desfeita.')) return
    try {
      await deleteSubscription(id)
      handleActionSuccess('Assinatura excluída com sucesso!')
    } catch {
      setToast({ message: 'Erro ao excluir assinatura.' })
    }
  }

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Financeiro</h2>
          <p className="text-sm text-slate-500 mt-1">MRR, churn, caixa e transações da agência</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRequestDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all bg-white/[0.03] border border-white/10 hover:bg-white/[0.08]"
          >
            <ShoppingCart size={13} />
            Lançar Despesa
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0,210,255,0.2) 0%, rgba(157,80,187,0.2) 100%)',
              border: '1px solid rgba(0,210,255,0.3)',
            }}
          >
            <Plus size={13} />
            Nova Cobrança
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveTab('trans')}
          className={`pb-2 px-1 text-sm font-medium transition-all relative ${activeTab === 'trans' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Fluxo de Caixa
          {activeTab === 'trans' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-2 px-1 text-sm font-medium transition-all relative ${activeTab === 'pending' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Aprovações
          {pendingPurchases.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold">
              {pendingPurchases.length}
            </span>
          )}
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('indicators')}
          className={`pb-2 px-1 text-sm font-medium transition-all relative ${activeTab === 'indicators' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Indicadores
          {activeTab === 'indicators' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />}
        </button>
      </div>

      <DateFilter dateRange={dateRange} onChange={setDateRange} />

      {activeTab === 'indicators' ? (
        <IndicatorsTab kpis={kpis} />
      ) : (
        <>
          {/* Error banner — DB */}
          {error && (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span className="flex items-center gap-2 text-red-400">
                <AlertCircle size={14} />
                {error} — exibindo dados de demonstração.
              </span>
              <button
                onClick={refetch}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 flex-shrink-0">
            {kpiCards.map(c => (
              <KPICard key={c.label} {...c} loading={loading} />
            ))}
          </div>
        </>
      )}

      {activeTab !== 'indicators' && (
        <>
          {/* Financial Chart */}
          <div className="glass rounded-2xl p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-base font-bold text-white tracking-tight">Evolução Financeira</p>
                <p className="text-xs text-slate-500 mt-1">Comparação de faturamento, recebimentos, despesas e lucro</p>
              </div>
            </div>
            <FinancialHistoryChart data={history} loading={loading} />
          </div>

          {/* Assinaturas Ativas & Últimos Recebimentos */}
          {recurringContracts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-shrink-0">
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-indigo-400" />
                    <p className="text-sm font-semibold text-white">Assinaturas Ativas</p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {recurringContracts.length} contrato{recurringContracts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-[#0d1422] z-10 shadow-sm">
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Assinatura', 'Ciclo', 'Valor', 'Vencimento', ''].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recurringContracts.map(c => <ContractRow key={c.id} contract={c} onDelete={handleDeleteSubscription} />)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <p className="text-sm font-semibold text-white">Últimos Recebimentos</p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Recentes</span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-[#0d1422] z-10 shadow-sm">
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Descrição', 'Valor', 'Status', 'Data'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 5).map(p => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedPayment(p)}>
                          <td className="px-4 py-3">
                            <p className="text-sm text-white font-medium line-clamp-1">{p.description}</p>
                          </td>
                          <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                            {fmtBRL(p.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: `${STATUS_CFG[p.status]?.color}15`, color: STATUS_CFG[p.status]?.color }}>
                              {STATUS_CFG[p.status]?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {fmtDate(p.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {recurringContracts.length === 0 && payments.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-sm font-semibold text-white">Cobranças Recentes</p>
                <span className="text-xs text-slate-500">{payments.length} cobrança{payments.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead style={{ background: 'rgba(13,20,34,0.96)' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Descrição', 'Cliente', 'Tipo', 'Valor', 'Status', 'Asaas'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider uppercase"
                        style={{ color: '#475569' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => <PaymentRow key={p.id} payment={p} onClick={() => setSelectedPayment(p)} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}


      {activeTab === 'trans' ? (
        <div className="flex flex-col flex-1 gap-3" style={{ minHeight: 0 }}>
          {/* Section header + filters */}
          <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
            <p className="text-sm font-semibold text-white">Transações Recentes</p>
            <div className="flex items-center gap-2">
              {TX_FILTER_CHIPS.map(chip => {
                const active = txFilter === chip.id
                const count  = countByStatus[chip.id] ?? 0
                return (
                  <button
                    key={chip.id}
                    onClick={() => setTxFilter(chip.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      background: active ? `${chip.color}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? chip.color + '50' : 'rgba(255,255,255,0.06)'}`,
                      color: active ? chip.color : '#64748b',
                    }}
                  >
                    {chip.label}
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{
                        background: active ? `${chip.color}30` : 'rgba(255,255,255,0.05)',
                        color: active ? chip.color : '#475569',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Table */}
          <div className="glass flex-1 rounded-xl overflow-auto" style={{ minHeight: 0 }}>
            <table className="w-full text-sm border-collapse">
              <thead
                className="sticky top-0 z-10"
                style={{ background: 'rgba(13,20,34,0.96)', backdropFilter: 'blur(12px)' }}
              >
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {TABLE_HEADERS.map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider uppercase"
                      style={{ color: '#475569' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonTxRow key={i} />)
                  : filteredTxs.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <BarChart2 size={32} className="text-slate-800" />
                            <p className="text-slate-500 text-sm">Nenhuma transação neste filtro.</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : filteredTxs.map(tx => (
                      <TxRow key={tx.id} tx={tx} onClick={() => setSelectedPayment(tx)} />
                    ))
                }
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          {!loading && (
            <p className="text-xs text-slate-700 flex-shrink-0 text-right mt-1">
              {filteredTxs.length} de {transactions.length} transaç{transactions.length !== 1 ? 'ões' : 'ão'}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 gap-3" style={{ minHeight: 0 }}>
          <div className="flex items-center justify-between flex-shrink-0">
            <p className="text-sm font-semibold text-white">Solicitações de Compra Pendentes</p>
          </div>

          <div className="glass flex-1 rounded-xl overflow-auto" style={{ minHeight: 0 }}>
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: 'rgba(13,20,34,0.96)', backdropFilter: 'blur(12px)' }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Data', 'Descrição', 'Valor', 'Cliente', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider uppercase text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Clock size={32} className="text-slate-800" />
                        <p className="text-slate-500 text-sm">Nenhuma solicitação aguardando aprovação.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingPurchases.map((req) => {
                    const d = req.dados_compra as { category_name?: string; description?: string; amount?: number; recipient_name?: string }
                    return (
                      <tr key={req.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4 text-slate-400 font-mono text-xs">
                          {new Date(req.data_criacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tight">{d?.category_name}</p>
                          <p className="text-white font-medium">{d?.description}</p>
                          {d?.recipient_name && <p className="text-[10px] text-slate-400 mt-0.5">Recebedor: {d.recipient_name}</p>}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-300">
                          {d?.amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-4 py-4 text-slate-400">
                          {(req.clients as { name: string } | null)?.name || 'N/A'}
                        </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={async () => {
                              if (await approvePurchase(req.id, req.dados_compra)) {
                                setToast({ message: 'Compra aprovada!' })
                                refetch()
                              }
                            }}
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                            title="Aprovar"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (await rejectPurchase(req.id)) {
                                setToast({ message: 'Compra rejeitada.' })
                                refetch()
                              }
                            }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Rejeitar"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaymentDetailDrawer
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onSuccess={msg => { setToast({ message: msg }); refetch() }}
      />

      <BillingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={msg => { setToast({ message: msg }); refetch() }}
      />

      <PurchaseRequestDrawer
        open={requestDrawerOpen}
        onClose={() => setRequestDrawerOpen(false)}
        onSuccess={msg => { setToast({ message: msg }); refetch() }}
      />

      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  )
}

/* ─── KPI card factory ───────────────────────────── */
function buildKPICards(kpis: UseFinancialResult['kpis']): Omit<KPICardProps, 'loading'>[] {
  return [
    {
      label:      'Vendas (faturamento)',
      subLabel:   `${kpis.numeroVendas} vendas`,
      value:      fmtBRL(kpis.faturamentoTotal),
      color:      '#10b981',
      icon:       <TrendingUp size={14} />
    },
    {
      label:      'Recebimento',
      subLabel:   `Previsto: ${fmtBRL(kpis.recebimentoPrevisto)}`,
      value:      fmtBRL(kpis.recebimentoEfetivo),
      color:      '#3b82f6',
      icon:       <Plus size={14} />
    },
    {
      label:      'Despesas',
      value:      fmtBRL(kpis.despesasTotal),
      color:      '#ef4444',
      icon:       <TrendingDown size={14} />
    },
    {
      label:      'Lucro Líquido',
      subLabel:   `${kpis.margemLucro.toFixed(0)}% Margem | ${kpis.percentualDespesas.toFixed(0)}% Desp.`,
      value:      fmtBRL(kpis.lucroLiquido),
      color:      '#8b5cf6',
      icon:       <DollarSign size={14} />
    },
  ]
}

/* ─── Date Filter Component ──────────────────────── */
interface DateRange {
  startDate: string | null
  endDate: string | null
}

function DateFilter({ dateRange, onChange }: { dateRange: DateRange, onChange: (r: DateRange) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  const presets = [
    { label: 'Esta semana',  get: () => {
      const d = new Date()
      const first = d.getDate() - d.getDay()
      const last = first + 6
      return { 
        startDate: new Date(new Date().setDate(first)).toISOString().slice(0, 10), 
        endDate: new Date(new Date().setDate(last)).toISOString().slice(0, 10) 
      }
    }},
    { label: 'Este mês',     get: () => {
      const now = new Date()
      return { 
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), 
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10) 
      }
    }},
    { label: 'Este ano',     get: () => {
      const now = new Date()
      return { 
        startDate: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), 
        endDate: new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10) 
      }
    }},
    { label: 'Ano passado',  get: () => ({ 
      startDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().slice(0, 10), 
      endDate: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().slice(0, 10) 
    })},
    { label: 'Todos os lançamentos', get: () => ({ startDate: null, endDate: null })},
  ]
  const currentLabel = useMemo(() => {
    if (!dateRange.startDate) return 'Todo o período'
    const start = new Date(dateRange.startDate)
    const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date()
    return `${start.toLocaleDateString('pt-BR')} — ${end.toLocaleDateString('pt-BR')}`
  }, [dateRange])

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white transition-all"
      >
        <Calendar size={13} />
        {currentLabel}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[#0d1422] border border-white/10 rounded-xl shadow-2xl z-50 p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {presets.slice(0, 4).map(p => (
              <button 
                key={p.label}
                onClick={() => { onChange(p.get()); setIsOpen(false) }}
                className="px-2 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-slate-300 font-medium transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => { onChange(presets[4].get()); setIsOpen(false) }}
            className="w-full px-2 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-slate-300 font-medium transition-all mb-4"
          >
            Todos os lançamentos
          </button>
          
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="date" 
              value={dateRange.startDate || ''}
              onChange={e => onChange({ ...dateRange, startDate: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-600">—</span>
            <input 
              type="date" 
              value={dateRange.endDate || ''}
              onChange={e => onChange({ ...dateRange, endDate: e.target.value })}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
