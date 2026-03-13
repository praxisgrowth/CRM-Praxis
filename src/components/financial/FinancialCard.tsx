import { useEffect, useState } from 'react'
import { DollarSign, X, RefreshCw, Clock, Send, CalendarDays, Loader2, CreditCard, Copy, Trash, Edit2, Save } from 'lucide-react'
import { BillingOnboardingModal } from '../pipeline/BillingOnboardingModal'
import { supabase } from '../../lib/supabase'
import type { FinanceTransaction } from '../../lib/database.types'
import { useFinancialActions, type FinancialAction } from '../../hooks/useFinancialActions'
import { deletePayment } from '../../hooks/useBilling'
import { useAudit } from '../../hooks/useAudit'
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
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDENTE:  { label: 'Pendente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  PAGO:      { label: 'Recebido',    color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  ATRASADO:  { label: 'Atrasado',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  CANCELADO: { label: 'Cancelado',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  PRORROGADA: { label: 'Prorrogada', color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
}

// ─── Payment row ───────────────────────────────────────────────
interface PaymentRowProps {
  payment: any
  client: { phone?: string | null; email?: string | null; name?: string | null } | null
}

function PaymentRow({ payment, client }: PaymentRowProps) {
  const { logAction } = useAudit()
  const { execute, isLoading: isExecuting } = useFinancialActions()
  const [toast, setToast]           = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [postponeDate, setPostponeDate] = useState('')
  const [showPostpone, setShowPostpone] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [desc, setDesc] = useState(payment.description)
  const [val, setVal] = useState((payment.amount || 0).toString())
  const [dueDate, setDueDate] = useState(payment.vencimento ?? '')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const cfg     = STATUS_CFG[payment.status] || { label: payment.status, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
  const hasAsaas = !!payment.reference // Na nova tabela, reference ou asaas_id podem ser usados

  const isLoading = (action: string, id: string) => isExecuting(action as FinancialAction, id) || (loading && id === payment.id)

  async function runAction(action: FinancialAction, extraDate?: string) {
    if (!payment.asaas_id) return
    const ok = await execute(action, {
      asaas_id:   payment.reference || '',
      payment_id: payment.id,
      ...(action === 'postpone' ? {
        due_date:     extraDate,
        value:        payment.amount,
        description:  payment.description,
        client_name:  client?.name ?? undefined,
        client_phone: client?.phone ? client.phone.replace(/\D/g, '') : undefined,
        client_email: client?.email ?? undefined,
      } : { due_date: extraDate }),
    })
    setToast({
      message: ok
        ? `Ação "${action}" executada com sucesso.`
        : `Falha ao executar "${action}". Tente novamente.`,
      type: ok ? 'success' : 'error',
    })
    if (ok) {
       await logAction(`${action.charAt(0).toUpperCase() + action.slice(1)} Payment`, 'financial_payment', payment.id, { asaas_id: payment.asaas_id })
    }
    if (ok && action === 'postpone') { setShowPostpone(false); setPostponeDate('') }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setLoading(true)
    try {
      await deletePayment(payment.id)
      await logAction('Delete Payment', 'financial_payment', payment.id, { description: payment.description, value: payment.value })
      setToast({ message: 'Registro excluído com sucesso.', type: 'success' })
    } catch {
      setToast({ message: 'Erro ao excluir.', type: 'error' })
    } finally { setLoading(false) }
  }

  async function handleSaveLocal() {
    setLoading(true)
    try {
      const numVal = parseFloat(val.replace(',', '.'))
      const { error } = await (supabase as any)
        .from('finance_transactions')
        .update({ description: desc, amount: numVal, vencimento: dueDate })
        .eq('id', payment.id)
      
      if (error) throw error

      await logAction('Update Payment (Local)', 'finance_transactions', payment.id, { 
        old: { description: payment.description, amount: payment.amount, vencimento: payment.vencimento },
        new: { description: desc, amount: numVal, vencimento: dueDate }
      })

      setToast({ message: 'Cobrança atualizada!', type: 'success' })
      setEditMode(false)
    } catch {
      setToast({ message: 'Erro ao salvar.', type: 'error' })
    } finally { setLoading(false) }
  }

  const canCancel   = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')
  const canRefund   = hasAsaas && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED')
  const canPostpone = hasAsaas && payment.status === 'PENDING'
  const canResend   = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')
  const canDuplicate = hasAsaas && (payment.status === 'PENDING' || payment.status === 'OVERDUE')

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25` }}
          >
            <CreditCard size={14} style={{ color: cfg.color }} />
          </div>
          <div className="min-w-0 flex-1">
            {editMode ? (
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/50"
                  placeholder="Descrição"
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={val} 
                    onChange={e => setVal(e.target.value)}
                    className="w-24 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/50"
                    placeholder="Valor"
                  />
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400/50 [color-scheme:dark]"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-white leading-snug truncate">{payment.description}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{payment.forma_pagamento}</span>
                  {payment.vencimento && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                      <CalendarDays size={9} />
                      {fmtDate(payment.vencimento)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {editMode ? (
            <div className="flex gap-1">
              <button 
                onClick={() => setEditMode(false)}
                className="p-1.5 rounded hover:bg-white/5 text-slate-400"
              ><X size={14} /></button>
              <button 
                onClick={handleSaveLocal}
                disabled={loading}
                className="p-1.5 rounded bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-50"
              >{loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}</button>
            </div>
          ) : (
            <>
              <span className="text-sm font-bold text-white tabular-nums">
                {fmtCurrency(payment.amount)}
              </span>
              <div className="flex gap-1 mt-1">
                <button 
                  onClick={() => setEditMode(true)}
                  className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-cyan-400 transition-colors"
                  title="Editar registro local"
                ><Edit2 size={12} /></button>
                <button 
                  onClick={handleDelete}
                  className={`p-1 rounded hover:bg-white/5 transition-colors ${confirmDelete ? 'text-red-400 bg-red-400/10' : 'text-slate-500 hover:text-red-400'}`}
                  title={confirmDelete ? 'Confirmar exclusão' : 'Excluir registro'}
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash size={12} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {(canCancel || canRefund || canPostpone || canResend || canDuplicate) && !editMode && (
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
          {canDuplicate && (
            <ActionBtn
              label="2ª Via"
              icon={Copy}
              color="#00d2ff"
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
  const [client,   setClient]   = useState<any>(null)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (!clientId) return

    async function load() {
      setLoading(true)
      const [payRes, cliRes] = await Promise.all([
        (supabase as any).from('finance_transactions').select('*').eq('cliente_id', clientId).eq('kind', 'income').order('vencimento', { ascending: false }),
        (supabase as any).from('clients').select('*').eq('id', clientId).single()
      ])

      setPayments((payRes.data ?? []) as any[])
      setClient(cliRes.data)
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <DollarSign size={14} />
          Histórico de Cobranças
        </h3>
        <button
          onClick={() => setShowEdit(true)}
          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400/5 border border-cyan-400/20"
        >
          <CreditCard size={12} />
          Editar Faturamento
        </button>
      </div>

      <div className="space-y-3">
        {payments.map(p => <PaymentRow key={p.id} payment={p} client={client} />)}
      </div>

      {showEdit && client && (
        <BillingOnboardingModal
          clientId={clientId}
          companyName={client.name}
          initialData={client}
          onClose={() => setShowEdit(false)}
          onSave={async () => {
            setShowEdit(false)
            // O modal já salva, mas se houver mudança visual, refetch
          }}
        />
      )}
    </div>
  )
}
