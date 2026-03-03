import type { Client } from '../../lib/database.types'

interface Props {
  clients: Client[]
  loading?: boolean
}

function scoreColor(s: number) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent'
  if (s >= 60) return 'Attention'
  if (s >= 40) return 'Attention'
  return 'Critical'
}

/* Mini sparkline SVG */
function Sparkline({ color, trend }: { color: string; trend: string }) {
  const upPoints   = '0,28 8,22 16,24 24,14 32,16 40,8  48,4'
  const downPoints = '0,4  8,8  16,6  24,16 32,14 40,22 48,28'
  const flatPoints  = '0,16 8,14 16,18 24,12 32,16 40,15 48,16'
  const pts = trend === 'up' ? upPoints : trend === 'down' ? downPoints : flatPoints

  return (
    <svg width="52" height="32" viewBox="0 0 52 32" fill="none" className="flex-shrink-0">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-2 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-5 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-6 w-12 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-5 w-6 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

function ClientRow({ client }: { client: Client }) {
  const color = scoreColor(client.health_score)
  const label = scoreLabel(client.health_score)
  const mrrLabel = `R$${Math.round(client.mrr / 1000)}k/mês`

  return (
    <div
      className="flex items-center justify-between p-4 rounded-2xl transition-colors cursor-pointer"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Left: avatar + name + sub */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}
        >
          {client.avatar}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{client.name}</h4>
          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
            {client.segment} · {mrrLabel}
          </p>
        </div>
      </div>

      {/* Right: status badge + sparkline + score */}
      <div className="flex items-center gap-5 flex-shrink-0 ml-4">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
        >
          {label}
        </span>
        <Sparkline color={color} trend={client.trend} />
        <span
          className="text-lg font-black w-8 text-right"
          style={{ color, textShadow: `0 0 14px ${color}65` }}
        >
          {client.health_score}
        </span>
      </div>
    </div>
  )
}

export function ClientHealthList({ clients, loading }: Props) {
  return (
    <div className="glass rounded-3xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-white">Client Health Score</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Monitoramento em tempo real</p>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
          style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
        >
          Ver todos
        </button>
      </div>

      {/* 2-col row list */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-0.5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          : clients.map(client => <ClientRow key={client.id} client={client} />)
        }
      </div>
    </div>
  )
}
