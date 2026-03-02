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
  const upPoints  = '0,28 8,22 16,24 24,14 32,16 40,8  48,4'
  const downPoints= '0,4  8,8  16,6  24,16 32,14 40,22 48,28'
  const flatPoints= '0,16 8,14 16,18 24,12 32,16 40,15 48,16'
  const pts = trend === 'up' ? upPoints : trend === 'down' ? downPoints : flatPoints

  return (
    <svg width="52" height="32" viewBox="0 0 52 32" fill="none">
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

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-2 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      </div>
      <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export function ClientHealthList({ clients, loading }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-5">
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

      {/* Grid 3 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : clients.map(client => {
              const color = scoreColor(client.health_score)
              const label = scoreLabel(client.health_score)
              const mrrLabel = `R$${Math.round(client.mrr / 1000)}k/mês`

              return (
                <div
                  key={client.id}
                  className="rounded-2xl p-4 transition-all duration-200 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = `${color}30`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Topo: avatar + nome + nicho */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                    >
                      {client.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-white truncate">{client.name}</p>
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {client.segment} · {mrrLabel}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé: status badge + sparkline + score */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
                    >
                      {label}
                    </span>

                    <Sparkline color={color} trend={client.trend} />

                    <span
                      className="text-xl font-black"
                      style={{ color, textShadow: `0 0 16px ${color}60` }}
                    >
                      {client.health_score}
                    </span>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
