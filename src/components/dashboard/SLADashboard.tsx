// src/components/dashboard/SLADashboard.tsx
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSLAMetrics } from '../../hooks/useSLAMetrics'

function SLACard({
  label,
  value,
  unit,
  count,
  color,
  icon: Icon,
  loading,
  empty,
}: {
  label:   string
  value:   number | null
  unit:    string
  count:   number
  color:   string
  icon:    React.ElementType
  loading: boolean
  empty:   boolean
}) {
  return (
    <div
      className="rounded-2xl p-5 cursor-default transition-all duration-300"
      style={{
        background:     `linear-gradient(135deg, ${color}12 0%, rgba(13,17,23,0.92) 65%)`,
        border:         `1px solid ${color}22`,
        backdropFilter: 'blur(20px)',
        boxShadow:      `0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        {!loading && !empty && count > 0 && (
          <span className="text-[10px] text-slate-600 font-medium">n={count}</span>
        )}
      </div>

      {loading ? (
        <div className="h-9 w-24 rounded-xl animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
      ) : empty || value === null ? (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle size={13} className="text-slate-600" />
          <span className="text-sm text-slate-600">Sem dados</span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className="text-3xl font-black leading-none"
            style={{ color, textShadow: `0 0 20px ${color}60` }}
          >
            {Math.round(value * 10) / 10}
          </span>
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
      )}

      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  )
}

export function SLADashboard() {
  const { avgDeliveryDays, deliveryCount, avgApprovalHours, approvalCount, loading, error } = useSLAMetrics()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={14} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-400">Performance & SLA</h3>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3 px-1">Erro ao carregar métricas: {error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SLACard
          label="Tempo médio de entrega (agência)"
          value={avgDeliveryDays}
          unit="dias"
          count={deliveryCount}
          color="#00d2ff"
          icon={Clock}
          loading={loading}
          empty={deliveryCount === 0 && !loading}
        />
        <SLACard
          label="Tempo médio de aprovação (cliente)"
          value={avgApprovalHours}
          unit="horas"
          count={approvalCount}
          color="#a855f7"
          icon={CheckCircle2}
          loading={loading}
          empty={approvalCount === 0 && !loading}
        />
      </div>
    </div>
  )
}
