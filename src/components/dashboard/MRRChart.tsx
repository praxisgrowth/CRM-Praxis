import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MRRHistory } from '../../lib/database.types'

interface Props {
  data: MRRHistory[]
  loading?: boolean
}

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(13, 17, 23, 0.95)',
        border: '1px solid rgba(0,210,255,0.18)',
        backdropFilter: 'blur(16px)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#607090', marginBottom: 6 }}>{label}</p>
      {payload.map((p: TooltipPayload) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.dataKey === 'mrr' ? 'MRR' : 'Meta'}: R${(p.value / 1000).toFixed(0)}k
        </p>
      ))}
    </div>
  )
}

function SkeletonBar() {
  return <div className="h-[200px] rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
}

export function MRRChart({ data, loading }: Props) {
  return (
    <div className="glass rounded-3xl p-6 relative overflow-hidden group">
      {/* Ambient glow blob — top-right, intensifica no hover */}
      <div
        className="absolute -top-8 -right-8 w-64 h-64 pointer-events-none transition-all duration-700 opacity-60 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle, rgba(0,210,255,0.10) 0%, rgba(157,80,187,0.06) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="flex items-center justify-between mb-6 relative">
        <div>
          <p className="text-sm font-semibold text-white">MRR Evolution — Last 6 Months</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Receita recorrente mensal</p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#00d2ff', boxShadow: '0 0 8px rgba(0,210,255,0.8)' }} />
            Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#334155' }} />
            Meta
          </span>
        </div>
      </div>

      {loading ? <SkeletonBar /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              {/* Gradiente neon cyan → violet para área sob a linha */}
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d2ff" stopOpacity={0.5} />
                <stop offset="50%" stopColor="#9d50bb" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#9d50bb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#334155" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#334155" stopOpacity={0} />
              </linearGradient>
              {/* Filter para glow na linha */}
              <filter id="mrrGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `R$${Math.round(v / 1000)}k`}
              domain={['dataMin - 5000', 'dataMax + 5000']}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(0,210,255,0.25)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="meta"
              stroke="#334155"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#metaGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="mrr"
              stroke="#00d2ff"
              strokeWidth={3}
              fill="url(#mrrGrad)"
              dot={{ fill: '#00d2ff', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 6, fill: '#7ff8ff', strokeWidth: 0, filter: 'drop-shadow(0 0 10px #00d2ff)' }}
              style={{ filter: 'drop-shadow(0 0 14px rgba(0,210,255,0.7))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
