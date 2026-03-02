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
        background: 'rgba(4, 8, 20, 0.95)',
        border: '1px solid rgba(6,182,212,0.15)',
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
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-white">Evolução do MRR</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#06b6d4', boxShadow: '0 0 6px rgba(6,182,212,0.6)' }} />
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
              {/* Gradiente violet → pink para área sob a linha */}
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#ec4899" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#334155" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#334155" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.05)" vertical={false} />
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
              cursor={{ stroke: 'rgba(6,182,212,0.2)', strokeWidth: 1 }}
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
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#mrrGrad)"
              dot={{ fill: '#06b6d4', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#67e8f9', strokeWidth: 0, filter: 'drop-shadow(0 0 6px #06b6d4)' }}
              style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.4))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
