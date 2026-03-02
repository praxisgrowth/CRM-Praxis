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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(8, 12, 20, 0.92)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(16px)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#64748b', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
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
          <p className="text-xs text-slate-500 mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#6366f1' }} />
            Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#334155' }} />
            Meta
          </span>
        </div>
      </div>

      {loading ? <SkeletonBar /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#334155" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#334155" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
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
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }} />
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
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#mrrGrad)"
              dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#818cf8', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
