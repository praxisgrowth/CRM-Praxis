import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Client, Trend } from '../../lib/database.types'

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
  if (s >= 80) return 'Excelente'
  if (s >= 60) return 'Atenção'
  return 'Crítico'
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <TrendingUp   size={12} className="text-emerald-400" />
  if (trend === 'down') return <TrendingDown  size={12} className="text-red-400" />
  return                       <Minus         size={12} className="text-slate-500" />
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="w-9 h-9 rounded-xl animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-2 w-32 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export function ClientHealthList({ clients, loading }: Props) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-white">Health Score · Clientes</p>
          <p className="text-xs text-slate-500 mt-0.5">Monitoramento em tempo real</p>
        </div>
        <button
          className="text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
        >
          Ver todos
        </button>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : clients.map(client => {
              const color = scoreColor(client.health_score)
              const mrrLabel = `R$${Math.round(client.mrr / 1000)}k`
              return (
                <div
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                  >
                    {client.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white truncate">{client.name}</p>
                      <TrendIcon trend={client.trend} />
                    </div>
                    <p className="text-xs text-slate-500">{client.segment} · {mrrLabel}/mês</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${color}20`, color }}
                      >
                        {scoreLabel(client.health_score)}
                      </span>
                      <span className="text-sm font-bold" style={{ color }}>{client.health_score}</span>
                    </div>
                    <div className="w-20 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-1 rounded-full"
                        style={{ width: `${client.health_score}%`, background: color }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
        }
      </div>
    </div>
  )
}
