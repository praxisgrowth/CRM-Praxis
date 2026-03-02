import { TrendingUp, Users, DollarSign, Zap, AlertCircle, RefreshCw } from 'lucide-react'
import { MRRChart } from '../components/dashboard/MRRChart'
import { AgencyHealthScore } from '../components/dashboard/AgencyHealthScore'
import { ClientHealthList } from '../components/dashboard/ClientHealthList'
import { useDashboard } from '../hooks/useDashboard'

/* ─── KPI Card ───────────────────────────────────── */
interface KPIStat {
  label: string
  value: string
  delta: string
  deltaUp: boolean | null
  icon: React.ElementType
  color: string
}

function KPICard({ stat, loading }: { stat: KPIStat; loading: boolean }) {
  const Icon = stat.icon
  const deltaColor = stat.deltaUp === true ? '#10b981' : stat.deltaUp === false ? '#ef4444' : '#64748b'

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-300 cursor-default"
      style={{
        background: 'rgba(14, 20, 35, 0.72)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${stat.color}35`; e.currentTarget.style.boxShadow = `0 4px 32px rgba(0,0,0,0.55), 0 0 20px ${stat.color}14, inset 0 1px 0 rgba(255,255,255,0.06)` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      {/* Ícone + delta no topo */}
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}28` }}
        >
          <Icon size={15} style={{ color: stat.color, filter: `drop-shadow(0 0 6px ${stat.color})` }} />
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${deltaColor}18`, color: deltaColor }}
        >
          {stat.delta}
        </span>
      </div>

      {/* Valor principal — cor neon com glow */}
      {loading ? (
        <div className="h-10 w-24 rounded-xl animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
      ) : (
        <p
          className="text-4xl font-black leading-none"
          style={{ color: stat.color, textShadow: `0 0 20px ${stat.color}90, 0 0 40px ${stat.color}35` }}
        >
          {stat.value}
        </p>
      )}

      {/* Label */}
      <p className="text-xs font-medium mt-2.5" style={{ color: 'rgba(148,163,184,0.55)' }}>{stat.label}</p>
    </div>
  )
}

/* ─── Error Banner ───────────────────────────────── */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <span className="flex items-center gap-2 text-red-400">
        <AlertCircle size={14} />
        Supabase: {message} — exibindo dados de demonstração.
      </span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
      >
        <RefreshCw size={12} /> Tentar novamente
      </button>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function DashboardPage() {
  const { kpis, mrrHistory, clients, loading, error } = useDashboard()

  function handleRetry() { window.location.reload() }

  const stats: KPIStat[] = [
    {
      label: 'Leads Ativos',
      value: loading ? '—' : String(kpis.leadsAtivos),
      delta: '+12%', deltaUp: true,
      icon: Users, color: '#06b6d4',      // cyan
    },
    {
      label: 'MRR',
      value: loading ? '—' : `R$${Math.round(kpis.mrr / 1000)}k`,
      delta: '+8%', deltaUp: true,
      icon: DollarSign, color: '#a855f7', // purple
    },
    {
      label: 'Taxa Conversão',
      value: loading ? '—' : `${kpis.conversionRate}%`,
      delta: '+3%', deltaUp: true,
      icon: TrendingUp, color: '#f97316', // orange
    },
    {
      label: 'SLA Operação',
      value: loading ? '—' : `${kpis.slaPercent}%`,
      delta: '+5%', deltaUp: true,
      icon: Zap, color: '#10b981',        // green
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Visão geral do negócio em tempo real</p>
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={handleRetry} />}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => <KPICard key={s.label} stat={s} loading={loading} />)}
      </div>

      {/* MRR Chart + Health Score */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <MRRChart data={mrrHistory} loading={loading} />
        </div>
        <div>
          <AgencyHealthScore clients={clients} loading={loading} />
        </div>
      </div>

      {/* Client Health List */}
      <ClientHealthList clients={clients} loading={loading} />
    </div>
  )
}
