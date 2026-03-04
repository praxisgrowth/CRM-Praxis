import { useEffect, useState } from 'react'
import {
  DollarSign, X, RefreshCw, Clock, Send, CalendarDays, Loader2, CreditCard,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { FinancialPayment, AsaasPaymentStatus } from '../../lib/database.types'
import { useFinancialActions } from '../../hooks/useFinancialActions'
import { Toast } from './Toast'

// ─── Helpers ──────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Status config ─────────────────────────────────────────────
const STATUS_CFG: Record<AsaasPaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  CONFIRMED: { label: 'Confirmado',  color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  RECEIVED:  { label: 'Recebido',    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  OVERDUE:   { label: 'Atrasado',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  REFUNDED:  { label: 'Reembolsado', color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  CANCELLED: { label: 'Cancelado',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

// ─── Payment row ───────────────────────────────────────────────
interface PaymentRowProps {
  payment: FinancialPayment
}

function PaymentRow({ payment }: PaymentRowProps) {
  const { execute, isLoading } = useFinancialActions()
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [postponeDate, setPostponeDate] = useState('')
  const [showPostpone, setShowPostpone] = useState(false)

  const cfg     = STATUS_CFG[payment.status]
  const hasAsaas = !!payment.asaas_id

  async function runAction(action: Parameters<typeof execute>[0], extraDate?: string) {
    if (!payment.asaas_id) return
    const ok = await execute(action, {
      asaas_id:     payment.asaas_id,
      payment_id:   payment.id,
      new_due_date: extraDate,
    })
    setToast({
      message: ok
        ? `Ação "${action}" executada com sucesso.`
        : `Falha ao executar "${action}". Tente novamente.`,
      type: ok ? 'success' : 'error',
    })
    if (ok && action === 'postpone') setShowPostpone(false)
  }

  const canCancel   = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')
  const canRefund   = hasAsaas && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED')
  const canPostpone = hasAsaas && payment.status === 'PENDING'
  const canResend   = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
          >
            <CreditCard size={14} style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-snug truncate">{payment.description}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
              >
                {cfg.label}
              </span>
              <span className="text-[10px] text-slate-500">{payment.billing_type}</span>
              {payment.due_date && (
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <CalendarDays size={9} />
                  {fmtDate(payment.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="text-sm font-bold text-white flex-shrink-0 tabular-nums">
          {fmtCurrency(payment.value)}
        </span>
      </div>

      {/* Action buttons */}
      {(canCancel || canRefund || canPostpone || canResend) && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5">
          {canResend && (
            <ActionBtn
              label="Reenviar"
              icon={Send}
              color="#6366f1"
              loading={isLoading('resend', payment.id)}
              onClick={() => runAction('resend')}
            />
          )}
          {canPostpone && !showPostpone && (
            <ActionBtn
              label="Adiar"
              icon={Clock}
              color="#f59e0b"
              loading={false}
              onClick={() => setShowPostpone(true)}
            />
          )}
          {canRefund && (
            <ActionBtn
              label="Reembolsar"
              icon={RefreshCw}
              color="#10b981"
              loading={isLoading('refund', payment.id)}
              onClick={() => runAction('refund')}
            />
          )}
          {canCancel && (
            <ActionBtn
              label="Cancelar"
              icon={X}
              color="#ef4444"
              loading={isLoading('cancel', payment.id)}
              onClick={() => runAction('cancel')}
            />
          )}
        </div>
      )}

      {/* Postpone inline form */}
      {showPostpone && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-lg"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <CalendarDays size={13} className="text-amber-400 flex-shrink-0" />
          <input
            type="date"
            value={postponeDate}
            onChange={e => setPostponeDate(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-300 outline-none"
            min={new Date().toISOString().slice(0, 10)}
          />
          <button
            disabled={!postponeDate || isLoading('postpone', payment.id)}
            onClick={() => runAction('postpone', postponeDate)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-40"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            {isLoading('postpone', payment.id)
              ? <Loader2 size={10} className="animate-spin" />
              : <Clock size={10} />
            }
            Confirmar
          </button>
          <button
            onClick={() => { setShowPostpone(false); setPostponeDate('') }}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

// ─── Small action button helper ────────────────────────────────
interface ActionBtnProps {
  label: string
  icon: React.ElementType
  color: string
  loading: boolean
  onClick: () => void
}

function ActionBtn({ label, icon: Icon, color, loading, onClick }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40 hover:opacity-80 active:scale-95"
      style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}
    >
      {loading
        ? <Loader2 size={10} className="animate-spin" />
        : <Icon size={10} />
      }
      {label}
    </button>
  )
}

// ─── Main exported component ───────────────────────────────────
interface Props {
  clientId: string
}

export function FinancialCard({ clientId }: Props) {
  const [payments, setPayments] = useState<FinancialPayment[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!clientId) return

    async function load() {
      setLoading(true)
      const { data } = await (supabase as any)
        .from('financial_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('due_date', { ascending: false })

      setPayments((data ?? []) as FinancialPayment[])
      setLoading(false)
    }

    load()
  }, [clientId])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div
            key={i}
            className="h-20 rounded-xl animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
        ))}
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <DollarSign size={22} className="text-slate-700 mb-2" />
        <p className="text-xs text-slate-600">Nenhuma cobrança encontrada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {payments.map(p => <PaymentRow key={p.id} payment={p} />)}
    </div>
  )
}
