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
  const deltaBg   = stat.deltaUp === true ? '#10b98120' : stat.deltaUp === false ? '#ef444420' : '#64748b20'

  return (
    <div className="glass rounded-2xl p-5 hover:border-white/[0.12] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${stat.color}1a`, border: `1px solid ${stat.color}30` }}
        >
          <Icon size={18} style={{ color: stat.color }} />
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: deltaBg, color: deltaColor }}
        >
          {stat.delta}
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      ) : (
        <p className="text-2xl font-bold text-white">{stat.value}</p>
      )}
      <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
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
      icon: Users, color: '#6366f1',
    },
    {
      label: 'MRR',
      value: loading ? '—' : `R$${Math.round(kpis.mrr / 1000)}k`,
      delta: '+8%', deltaUp: true,
      icon: DollarSign, color: '#10b981',
    },
    {
      label: 'Taxa Conversão',
      value: loading ? '—' : `${kpis.conversionRate}%`,
      delta: '+3%', deltaUp: true,
      icon: TrendingUp, color: '#f59e0b',
    },
    {
      label: 'SLA Operação',
      value: loading ? '—' : `${kpis.slaPercent}%`,
      delta: '→', deltaUp: null,
      icon: Zap, color: '#8b5cf6',
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
