import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, Percent, Wallet, BarChart2,
  AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { useFinancial } from '../hooks/useFinancial'
import type { FinancialKPIs, UseFinancialResult } from '../hooks/useFinancial'
import type { FinancialTransaction, TransactionStatus } from '../lib/database.types'

/* ─── Config ─────────────────────────────────────── */
type TxFilter = TransactionStatus | 'todos'

const STATUS_CFG: Record<TransactionStatus, { label: string; color: string }> = {
  pago:     { label: 'Pago',     color: '#10b981' },
  pendente: { label: 'Pendente', color: '#f59e0b' },
  atrasado: { label: 'Atrasado', color: '#ef4444' },
}

const TX_FILTER_CHIPS: { id: TxFilter; label: string; color: string }[] = [
  { id: 'todos',    label: 'Todas',    color: '#94a3b8' },
  { id: 'pago',     label: 'Pago',     color: '#10b981' },
  { id: 'pendente', label: 'Pendente', color: '#f59e0b' },
  { id: 'atrasado', label: 'Atrasado', color: '#ef4444' },
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

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─── KPI card ───────────────────────────────────── */
interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string
  delta?: number
  deltaInverted?: boolean   // true = queda é boa (churn)
  deltaLabel?: string
  color: string
  loading: boolean
}

function KPICard({ icon, label, value, delta, deltaInverted, deltaLabel, color, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="glass rounded-2xl p-5 animate-pulse" style={{ minHeight: 120 }}>
        <div className="w-9 h-9 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-6 rounded-md w-2/3 mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="h-3 rounded-md w-1/2"      style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    )
  }

  const isPositive = delta !== undefined
    ? (deltaInverted ? delta <= 0 : delta >= 0)
    : true

  const DeltaIcon = delta === undefined ? null
    : Math.abs(delta) < 0.05 ? Minus
    : delta > 0 ? ArrowUpRight
    : ArrowDownRight

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {delta !== undefined && DeltaIcon && (
          <span
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isPositive ? '#10b981' : '#ef4444',
            }}
          >
            <DeltaIcon size={11} />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {deltaLabel && <p className="text-[11px] text-slate-700 mt-1">{deltaLabel}</p>}
    </div>
  )
}

/* ─── MRR + Churn chart ──────────────────────────── */
function MRRChurnChart({ data, loading }: { data: UseFinancialResult['mrrHistory']; loading: boolean }) {
  if (loading) {
    return (
      <div
        className="w-full rounded-xl animate-pulse"
        style={{ height: 220, background: 'rgba(255,255,255,0.04)' }}
      />
    )
  }

  const hasChurn = data.some(d => d.churn_rate > 0)

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div
        style={{
          background: 'rgba(8,12,20,0.94)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(16px)',
          borderRadius: 12,
          padding: '10px 14px',
          fontSize: 12,
        }}
      >
        <p style={{ color: '#64748b', marginBottom: 6 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color ?? p.stroke, fontWeight: 600 }}>
            {p.dataKey === 'mrr'
              ? `MRR: ${fmtBRL(p.value, true)}`
              : `Churn: ${Number(p.value).toFixed(1)}%`
            }
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: hasChurn ? 32 : 4, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="finMrrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: '#475569', fontSize: 11 }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `R$${Math.round(v / 1000)}k`}
          domain={['dataMin - 4000', 'dataMax + 4000']}
        />
        {hasChurn && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#475569', fontSize: 11 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `${v}%`}
            domain={[0, 3]}
            width={36}
          />
        )}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="mrr"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#finMrrGrad)"
          dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
        />
        {hasChurn && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="churn_rate"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: '#f87171', strokeWidth: 0 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

/* ─── Transaction row ────────────────────────────── */
function TxRow({ tx }: { tx: FinancialTransaction }) {
  const st      = STATUS_CFG[tx.status]
  const isRec   = tx.type === 'receita'
  const amtColor = isRec ? '#10b981' : '#ef4444'

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
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
          {tx.category}
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
  const { kpis, mrrHistory, transactions, loading, error, refetch } = useFinancial()
  const [txFilter, setTxFilter] = useState<TxFilter>('todos')

  /* Filtered transactions */
  const filteredTxs = useMemo(() =>
    txFilter === 'todos' ? transactions : transactions.filter(t => t.status === txFilter),
    [transactions, txFilter]
  )

  /* Count per status */
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { todos: transactions.length }
    transactions.forEach(t => { map[t.status] = (map[t.status] ?? 0) + 1 })
    return map
  }, [transactions])

  /* KPI meta */
  const kpiCards = buildKPICards(kpis)

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Financeiro</h2>
          <p className="text-sm text-slate-500 mt-1">MRR, churn, caixa e transações da agência</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Fev / 2025
          </div>
        </div>
      </div>

      {/* Error banner */}
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

      {/* MRR chart */}
      <div className="glass rounded-2xl p-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-white">Evolução do MRR</p>
            <p className="text-xs text-slate-500 mt-0.5">Últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#6366f1' }} />
              MRR
            </span>
            {mrrHistory.some(d => d.churn_rate > 0) && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
                Churn %
              </span>
            )}
          </div>
        </div>
        <MRRChurnChart data={mrrHistory} loading={loading} />
      </div>

      {/* Transactions */}
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
                  : filteredTxs.map(tx => <TxRow key={tx.id} tx={tx} />)
              }
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <p className="text-xs text-slate-700 flex-shrink-0 text-right">
            {filteredTxs.length} de {transactions.length} transaç{transactions.length !== 1 ? 'ões' : 'ão'}
          </p>
        )}
      </div>

    </div>
  )
}

/* ─── KPI card factory ───────────────────────────── */
function buildKPICards(kpis: FinancialKPIs): Omit<KPICardProps, 'loading'>[] {
  return [
    {
      icon:       <DollarSign size={16} />,
      label:      'MRR Total',
      value:      fmtBRL(kpis.mrrAtual, true),
      delta:      kpis.mrrDelta,
      deltaLabel: 'vs mês anterior',
      color:      '#6366f1',
    },
    {
      icon:          <Percent size={16} />,
      label:         'Churn Rate',
      value:         `${kpis.churnRate.toFixed(1)}%`,
      delta:         Math.abs(kpis.churnDelta),
      deltaInverted: true,
      deltaLabel:    kpis.churnDelta === 0 ? 'estável' : kpis.churnDelta > 0 ? 'subiu vs anterior' : 'caiu vs anterior',
      color:         kpis.churnRate >= 2 ? '#ef4444' : kpis.churnRate >= 1 ? '#f59e0b' : '#10b981',
    },
    {
      icon:       <Wallet size={16} />,
      label:      'Saldo em Caixa',
      value:      fmtBRL(kpis.saldoCaixa, true),
      deltaLabel: 'transações pagas',
      color:      kpis.saldoCaixa >= 0 ? '#10b981' : '#ef4444',
    },
    {
      icon:       <BarChart2 size={16} />,
      label:      'LTV Médio / Cliente',
      value:      fmtBRL(kpis.ltvMedio, true),
      deltaLabel: 'receita anual estimada',
      color:      '#8b5cf6',
    },
  ]
}
