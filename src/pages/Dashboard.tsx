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
  const deltaColor = stat.deltaUp === true ? '#10b981' : stat.deltaUp === false ? '#ef4444' : '#64748b'

  return (
    <div
      className="rounded-3xl p-6 cursor-default"
      style={{
        background: `linear-gradient(135deg, ${stat.color}14 0%, rgba(13,17,23,0.92) 65%)`,
        border: `1px solid ${stat.color}25`,
        backdropFilter: 'blur(20px)',
        boxShadow: `0 4px 32px rgba(0,0,0,0.55), inset 0 0 30px ${stat.color}06, inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'
        e.currentTarget.style.borderColor = `${stat.color}45`
        e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.6), 0 0 30px ${stat.color}18, inset 0 0 30px ${stat.color}0a, inset 0 1px 0 rgba(255,255,255,0.08)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)'
        e.currentTarget.style.borderColor = `${stat.color}25`
        e.currentTarget.style.boxShadow = `0 4px 32px rgba(0,0,0,0.55), inset 0 0 30px ${stat.color}06, inset 0 1px 0 rgba(255,255,255,0.05)`
      }}
    >
      {/* Value — dominant, neon glow */}
      {loading ? (
        <div className="h-12 w-28 rounded-xl animate-pulse mb-3" style={{ background: 'rgba(255,255,255,0.05)' }} />
      ) : (
        <span
          className="text-5xl font-black block leading-none mb-3"
          style={{ color: stat.color, textShadow: `0 0 24px ${stat.color}80, 0 0 48px ${stat.color}30` }}
        >
          {stat.value}
        </span>
      )}

      {/* Label */}
      <h4 className="text-sm font-medium mb-1.5" style={{ color: 'rgba(148,163,184,0.65)' }}>{stat.label}</h4>

      {/* Delta */}
      <p className="text-xs font-bold" style={{ color: deltaColor }}>{stat.delta}</p>
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
      icon: Users, color: '#00d2ff',
    },
    {
      label: 'MRR',
      value: loading ? '—' : `R$${Math.round(kpis.mrr / 1000)}k`,
      delta: '+8%', deltaUp: true,
      icon: DollarSign, color: '#9d50bb',
    },
    {
      label: 'Taxa Conversão',
      value: loading ? '—' : `${kpis.conversionRate}%`,
      delta: '+3%', deltaUp: true,
      icon: TrendingUp, color: '#f97316',
    },
    {
      label: 'SLA Operação',
      value: loading ? '—' : `${kpis.slaPercent}%`,
      delta: '+5%', deltaUp: true,
      icon: Zap, color: '#10b981',
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
