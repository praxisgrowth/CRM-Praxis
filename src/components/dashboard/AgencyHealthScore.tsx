import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
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
  if (s >= 80) return 'Excelente'
  if (s >= 60) return 'Bom'
  if (s >= 40) return 'Atenção'
  return 'Crítico'
}

const PILLARS = [
  { label: 'Retenção',    key: 'retention'    },
  { label: 'Entrega',     key: 'delivery'     },
  { label: 'Satisfação',  key: 'satisfaction' },
  { label: 'Financeiro',  key: 'financial'    },
]

function computeScore(clients: Client[]) {
  if (!clients.length) return 0
  return Math.round(clients.reduce((s, c) => s + c.health_score, 0) / clients.length)
}

function computePillars(clients: Client[]) {
  const avg = computeScore(clients)
  // Distribuição simulada baseada no score médio dos clientes reais
  return [
    { label: 'Retenção',    value: Math.min(100, Math.round(avg * 1.1)) },
    { label: 'Entrega',     value: Math.min(100, Math.round(avg * 1.06)) },
    { label: 'Satisfação',  value: Math.min(100, Math.round(avg * 0.96)) },
    { label: 'Financeiro',  value: Math.min(100, Math.round(avg * 0.90)) },
  ]
}

function SkeletonPillar() {
  return <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
}

export function AgencyHealthScore({ clients, loading }: Props) {
  const score = computeScore(clients)
  const pillars = computePillars(clients)
  const color = scoreColor(score)
  const radialData = [{ value: score, fill: color }]

  return (
    <div className="glass rounded-2xl p-6 flex flex-col">
      <div className="mb-4">
        <p className="text-sm font-semibold text-white">Health Score da Agência</p>
        <p className="text-xs text-slate-500 mt-0.5">Média consolidada dos clientes</p>
      </div>

      {/* Gauge */}
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        {loading ? (
          <div className="w-32 h-32 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <RadialBarChart
                cx="50%" cy="80%"
                innerRadius="70%" outerRadius="100%"
                startAngle={180} endAngle={0}
                data={radialData}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: 'rgba(255,255,255,0.04)' }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 32 }}>
              <span className="text-3xl font-bold" style={{ color }}>{score}</span>
              <span className="text-[10px] text-slate-500 mt-0.5">/ 100</span>
              <span
                className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full"
                style={{ background: `${color}20`, color }}
              >
                {scoreLabel(score)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pillars */}
      <div className="mt-4 space-y-2.5">
        {loading
          ? PILLARS.map(p => (
              <div key={p.key} className="space-y-1">
                <SkeletonPillar />
              </div>
            ))
          : pillars.map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{p.label}</span>
                  <span style={{ color: scoreColor(p.value) }} className="font-medium">{p.value}%</span>
                </div>
                <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${p.value}%`, background: scoreColor(p.value) }}
                  />
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}
