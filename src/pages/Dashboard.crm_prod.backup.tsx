import { TrendingUp, Users, DollarSign, Zap, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react'
import { MRRChart } from '../components/dashboard/MRRChart'
import { ClientHealthList } from '../components/dashboard/ClientHealthList'
import { useDashboard } from '../hooks/useDashboard'
import { useAuth } from '../contexts/AuthContext'
import { SLADashboard } from '../components/dashboard/SLADashboard'
import clsx from 'clsx'

/* ─── Circular Gauge (New Design) ───────────────────── */
function CircularGauge({ value, loading }: { value: number; loading: boolean }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  if (loading) return <div className="w-48 h-48 rounded-full border-4 border-white/5 animate-pulse" />

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background track */}
        <circle
          cx="96" cy="96" r={radius}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="12"
          fill="transparent"
        />
        {/* Progress track */}
        <circle
          cx="96" cy="96" r={radius}
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
          style={{ filter: 'drop-shadow(0 0 8px rgba(0, 210, 255, 0.5))' }}
        />
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d2ff" />
            <stop offset="100%" stopColor="#9d50bb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-white neon-text-cyan">{value}</span>
        <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Score</span>
      </div>
    </div>
  )
}

/* ─── KPI Card (New Design) ────────────────────────── */
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
  
  return (
    <div className="glass-panel rounded-2xl p-6 border-t-2 relative group hover:scale-[1.02] transition-transform duration-300" 
         style={{ borderTopColor: stat.color }}>
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-2 rounded-lg bg-opacity-10", `bg-[${stat.color}]`)} style={{ backgroundColor: `${stat.color}15` }}>
          <Icon size={20} style={{ color: stat.color }} />
        </div>
        {!loading && (
          <div className={clsx("flex items-center gap-1 text-xs font-bold", stat.deltaUp ? "text-emerald-400" : "text-rose-400")}>
            {stat.deltaUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {stat.delta}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
          <div className="h-4 w-16 bg-white/5 animate-pulse rounded" />
        </div>
      ) : (
        <>
          <h3 className="text-3xl font-black text-white mb-1">{stat.value}</h3>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</p>
        </>
      )}
      
      {/* Meta Badge */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400">Meta: 105%</span>
      </div>
    </div>
  )
}

/* ─── Error Banner ───────────────────────────────── */
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle size={18} />
        <span>Ocorreu um erro ao carregar os dados reais: {message}. Exibindo dados de cache/demo.</span>
      </div>
      <button onClick={onRetry} className="flex items-center gap-2 hover:underline font-bold">
        <RefreshCw size={14} /> Tentar Novamente
      </button>
    </div>
  )
}

/* ─── Dashboard Page ────────────────────────────── */
export function DashboardPage() {
  const { kpis, mrrHistory, clients, loading, error } = useDashboard()
  const { profile } = useAuth()
  const showSLA = profile?.role === 'ADMIN' || profile?.role === 'MEMBER'

  function handleRetry() { window.location.reload() }

  const stats: KPIStat[] = [
    {
      label: 'Leads Ativos',
      value: loading ? '—' : String(kpis.leadsAtivos),
      delta: '+12.5%', deltaUp: true,
      icon: Users, color: '#00d2ff',
    },
    {
      label: 'MRR Atual',
      value: loading ? '—' : `R$${Math.round(kpis.mrr / 1000)}k`,
      delta: '+8.2%', deltaUp: true,
      icon: DollarSign, color: '#9d50bb',
    },
    {
      label: 'Taxa Conversão',
      value: loading ? '—' : `${kpis.conversionRate}%`,
      delta: '-2.1%', deltaUp: false,
      icon: TrendingUp, color: '#f97316',
    },
    {
      label: 'SLA Geral',
      value: loading ? '—' : `${kpis.slaPercent}%`,
      delta: '+4.3%', deltaUp: true,
      icon: Zap, color: '#10b981',
    },
  ]

  return (
    <div className="py-2 space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1 font-medium">Bem-vindo de volta, <span className="text-praxis-cyan">{profile?.full_name?.split(' ')[0] || 'Usuário'}</span>. Aqui está o resumo da sua operação.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/5">
          <button className="px-4 py-2 text-xs font-bold bg-praxis-cyan text-black rounded-lg shadow-[0_0_15px_rgba(0,210,255,0.4)]">Real-time</button>
          <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">Histórico</button>
        </div>
      </div>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onRetry={handleRetry} />}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map(s => <KPICard key={s.label} stat={s} loading={loading} />)}
      </div>

      {/* Middle Section: Chart + Health */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass-panel rounded-3xl p-8 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-praxis-cyan/5 blur-[80px] rounded-full -mr-32 -mt-32" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">MRR Evolution</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Receita Mensal Recorrente</p>
            </div>
            <div className="mt-4 sm:mt-0 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              + R$ 12.450 este mês
            </div>
          </div>
          <div className="h-[300px] w-full mt-4">
            <MRRChart data={mrrHistory} loading={loading} />
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-praxis-purple/5 blur-[60px] rounded-full -ml-16 -mt-16" />
          <h2 className="text-xl font-bold text-white mb-2">Agency Health Score</h2>
          <p className="text-xs text-gray-500 mb-8 uppercase tracking-widest font-bold">Saúde Geral da Carteira</p>
          
          <CircularGauge value={loading ? 0 : 88} loading={loading} />
          
          <div className="mt-8 pt-8 border-t border-white/5 w-full grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-black text-white">24</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Clientes Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">02</p>
              <p className="text-[10px] text-rose-500 font-bold uppercase">Em Atenção</p>
            </div>
          </div>
        </div>
      </div>

      {/* Client List */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Client Health List</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Performance e Satisfação por Cliente</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-white/5 rounded-lg border border-white/10 hover:border-praxis-cyan/50 transition-colors">
              <Search size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
        <ClientHealthList clients={clients} loading={loading} />
      </div>

      {/* Performance & SLA */}
      {showSLA && (
        <div className="animate-in slide-in-from-bottom-4 duration-1000">
           <SLADashboard />
        </div>
      )}
    </div>
  )
}
