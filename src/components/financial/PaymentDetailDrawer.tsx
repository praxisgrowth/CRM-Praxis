import { useState, useEffect } from 'react'
import { X, Edit2, Save, X as XIcon, ExternalLink, Send, RotateCcw, Loader2, Trash, CheckCircle2 } from 'lucide-react'
import type { FinanceTransaction } from '../../lib/database.types'
import { deletePayment } from '../../hooks/useBilling'
import { useFinancialActions } from '../../hooks/useFinancialActions'
import { supabase } from '../../lib/supabase'
import { useAudit } from '../../hooks/useAudit'

interface Props {
  payment: (FinanceTransaction & { clients?: { name: string } | null }) | null
  onClose: () => void
  onSuccess: (msg: string) => void
}

const FIELD_BASE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '10px 12px',
  color: '#f0f4ff',
  fontSize: 14,
  outline: 'none',
}

const FIELD_READONLY: React.CSSProperties = {
  ...FIELD_BASE,
  background: 'rgba(255,255,255,0.02)',
  color: '#94a3b8',
  cursor: 'default',
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PAGO:       { label: 'Pago',       color: '#10b981' },
  PENDENTE:   { label: 'Pendente',   color: '#f59e0b' },
  ATRASADO:   { label: 'Atrasado',   color: '#ef4444' },
  CANCELADO:  { label: 'Cancelado',  color: '#64748b' },
  PRORROGADA: { label: 'Prorrogada', color: '#8b5cf6' },
}

function fmtBRL(raw: string) {
  const n = parseInt(raw.replace(/\D/g, '') || '0', 10)
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function parseBRL(fmt: string): number {
  return parseInt(fmt.replace(/\D/g, '') || '0', 10) / 100
}

export function PaymentDetailDrawer({ payment, onClose, onSuccess }: Props) {
  const { logAction } = useAudit()
  const { execute } = useFinancialActions()
  const [editMode,   setEditMode]   = useState(false)
  const [desc,       setDesc]       = useState('')
  const [valueFmt,   setValueFmt]   = useState('R$ 0,00')
  const [dueDate,    setDueDate]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'cancel' | 'refund' | 'delete' | null>(null)

  useEffect(() => {
    if (!payment) return
    setDesc(payment.description)
    setValueFmt(payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    setDueDate(payment.vencimento ?? '')
    setEditMode(false); setError(null); setConfirming(null)
  }, [payment])

  if (!payment) return null

  // Captura como const não-null para que o TS narrow dentro das closures
  const p = payment

  const st        = STATUS_CFG[p.status] ?? { label: p.status, color: '#64748b' }
  const canCancel = !!p.reference && ['PENDENTE', 'ATRASADO'].includes(p.status)
  const canRefund = !!p.reference && ['PAGO'].includes(p.status)

  function resetEdit() {
    setDesc(p.description)
    setValueFmt(p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    setDueDate(p.vencimento ?? '')
    setEditMode(false); setError(null)
  }

  async function handleSave() {
    const value = parseBRL(valueFmt)
    if (value <= 0)     { setError('Valor inválido.'); return }
    if (!desc.trim())   { setError('Descrição obrigatória.'); return }
    if (!dueDate)       { setError('Data obrigatória.'); return }
    setLoading(true); setError(null)
    try {
      if (p.reference) {
        const ok = await execute('postpone', {
          asaas_id:     p.reference,
          payment_id:   p.id,
          due_date:     dueDate,
          value,
          description:  desc.trim(),
        })
        if (!ok) throw new Error('Falha ao atualizar no Asaas.')
      } else {
        const { error: upErr } = await (supabase as any)
          .from('finance_transactions')
          .update({ description: desc.trim(), amount: value, vencimento: dueDate })
          .eq('id', p.id)
        if (upErr) throw upErr
      }

      await logAction('Update Transaction', 'finance_transaction', String(p.id), {
        old: { description: p.description, amount: p.amount, vencimento: p.vencimento },
        new: { description: desc.trim(), amount: value, vencimento: dueDate }
      })

      onSuccess('Transação atualizada!'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  async function handleCancel() {
    if (!p.reference) return
    if (confirming !== 'cancel') { setConfirming('cancel'); return }
    setLoading(true); setError(null)

    try {
      if (p.reference === 'manual') {
        const { error: upErr } = await (supabase as any)
          .from('finance_transactions')
          .update({ status: 'CANCELADO' })
          .eq('id', p.id)
        if (upErr) throw upErr
        await logAction('Manual Cancel', 'finance_transaction', String(p.id), { old: p.status, new: 'CANCELADO' })
        onSuccess('Cobrança cancelada localmente!'); onClose()
      } else {
        const ok = await execute('cancel', { asaas_id: p.reference, payment_id: p.id })
        if (ok) {
          await logAction('Cancel Transaction', 'finance_transaction', String(p.id), { asaas_id: p.reference })
          onSuccess('Cobrança cancelada!'); onClose()
        } else {
          throw new Error('Erro ao cancelar no Asaas.')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar.')
      setConfirming(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleManualConfirm() {
    setLoading(true); setError(null)
    try {
      const { error: upErr } = await (supabase as any)
        .from('finance_transactions')
        .update({ 
          status: 'PAGO',
          payment_date: new Date().toISOString()
        })
        .eq('id', p.id)
      if (upErr) throw upErr

      await logAction('Manual Confirm', 'finance_transaction', String(p.id), { old: p.status, new: 'PAGO' })
      onSuccess('Pagamento confirmado manualmente!'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao confirmar.')
    } finally { setLoading(false) }
  }

  async function handleRefund() {
    if (!p.reference) return
    if (confirming !== 'refund') { setConfirming('refund'); return }
    setLoading(true); setError(null)

    try {
      if (p.reference === 'manual') {
        const { error: upErr } = await (supabase as any)
          .from('finance_transactions')
          .update({ status: 'CANCELADO' })
          .eq('id', p.id)
        if (upErr) throw upErr
        await logAction('Manual Refund', 'finance_transaction', String(p.id), { old: p.status, new: 'CANCELADO' })
        onSuccess('Cobrança estornada localmente!'); onClose()
      } else {
        const ok = await execute('refund', { asaas_id: p.reference, payment_id: p.id })
        if (ok) {
          await logAction('Refund Transaction', 'finance_transaction', String(p.id), { asaas_id: p.reference })
          onSuccess('Cobrança estornada!'); onClose()
        } else {
          throw new Error('Erro ao estornar no Asaas.')
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao estornar.')
      setConfirming(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (confirming !== 'delete') { setConfirming('delete'); return }
    setLoading(true); setError(null)
    try {
      await deletePayment(p.id)
      await logAction('Delete Transaction', 'finance_transaction', String(p.id), { description: p.description, amount: p.amount })
      onSuccess('Registro excluído!'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir.')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (!p.reference || p.reference === 'manual') return
    const ok = await execute('resend', { asaas_id: p.reference, payment_id: p.id })
    if (ok) {
      await logAction('Resend Transaction', 'finance_transaction', String(p.id), { asaas_id: p.reference })
      onSuccess('2ª via reenviada pelo Asaas!')
    } else {
      setError('Erro ao reenviar. Tente novamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0a0f1d] border-l border-white/10 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Detalhes da Transação
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ backgroundColor: st.color + '20', color: st.color, border: `1px solid ${st.color}40` }}>
                {st.label}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">ID: #{p.id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Section: Descrição */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
            {editMode ? (
              <input
                style={FIELD_BASE}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Ex: Consultoria Mensal"
              />
            ) : (
              <div style={FIELD_READONLY} className="text-lg font-medium text-white">{p.description}</div>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</label>
            <div style={FIELD_READONLY} className="text-white font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              {p.clients?.name || 'Cliente não identificado'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor</label>
              {editMode ? (
                <input
                  style={FIELD_BASE}
                  value={valueFmt}
                  onChange={e => setValueFmt(fmtBRL(e.target.value))}
                />
              ) : (
                <div style={FIELD_READONLY} className="font-bold text-emerald-400 text-xl">
                  {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              )}
            </div>

            {/* Vencimento */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vencimento</label>
              {editMode ? (
                <input
                  type="date"
                  style={{ ...FIELD_BASE, colorScheme: 'dark' }}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              ) : (
                <div style={FIELD_READONLY} className="text-white hover:text-sky-400 transition-colors">
                  {p.vencimento ? new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo</label>
              <div style={FIELD_READONLY} className="capitalize flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${p.kind === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {p.kind === 'income' ? 'Receita' : 'Despesa'}
              </div>
            </div>
            {p.reference && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asaas Reference</label>
                <div style={FIELD_READONLY} className="text-[10px] flex items-center justify-between font-mono bg-white/5">
                   {p.reference}
                   <a href={`https://www.asaas.com/customerCharge/show/${p.reference.replace('pay_', '')}`} target="_blank" rel="noreferrer" className="p-1 hover:bg-white/10 rounded text-sky-400 transition-colors">
                     <ExternalLink size={12} />
                   </a>
                </div>
              </div>
            )}
          </div>

          {p.installment_no && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parcelamento</label>
              <div style={FIELD_READONLY} className="text-white">
                Parcela <span className="text-sky-400 font-bold">{p.installment_no}</span> de <span className="text-slate-400">{p.installment_total}</span>
              </div>
            </div>
          )}

          {p.notes && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observações Internas</label>
              <div style={FIELD_READONLY} className="whitespace-pre-wrap text-xs leading-relaxed italic">{p.notes}</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
          {editMode ? (
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={resetEdit}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-all border border-white/10 text-sm"
              >
                Descartar
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-400 transition-all font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar Alterações
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setEditMode(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-all border border-white/10 text-xs font-semibold"
                >
                  <Edit2 size={14} />
                  Editar Registro
                </button>
                {p.reference && (
                  <button 
                    onClick={handleResend}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-all border border-sky-500/20 text-xs font-semibold"
                  >
                    <Send size={14} />
                    Reenviar 2ª Via
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                {p.reference === 'manual' && p.status !== 'PAGO' && (
                  <button 
                    onClick={handleManualConfirm}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Confirmar Recebimento Manual
                  </button>
                )}

                {canCancel && (
                  <button 
                    onClick={handleCancel}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider
                      ${confirming === 'cancel' 
                        ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' 
                        : 'bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10'}`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <XIcon size={16} />}
                    {confirming === 'cancel' ? 'Confirmar Cancelamento Agora' : 'Cancelar no Asaas'}
                  </button>
                )}

                {canRefund && (
                  <button 
                    onClick={handleRefund}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider
                      ${confirming === 'refund' 
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 animate-pulse' 
                        : 'bg-white/5 border-white/10 text-purple-400 hover:bg-purple-500/10'}`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    {confirming === 'refund' ? 'Confirmar Estorno Agora' : 'Estornar (Refund)'}
                  </button>
                )}

                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold
                    ${confirming === 'delete' 
                      ? 'bg-red-500/20 border-red-500/40 text-red-500' 
                      : 'bg-transparent border-transparent text-slate-600 hover:text-red-400 hover:bg-red-500/10'}`}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
                  {confirming === 'delete' ? 'Confirmar Exclusão do Banco' : 'Excluir Apenas Local'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
