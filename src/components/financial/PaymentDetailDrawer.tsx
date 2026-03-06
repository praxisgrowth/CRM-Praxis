import { useState, useEffect } from 'react'
import { X, Edit2, Save, X as XIcon, ExternalLink, Send, Trash2, RotateCcw, Loader2 } from 'lucide-react'
import type { FinancialPayment } from '../../lib/database.types'
import { updatePayment, cancelPayment, refundPayment, resendPayment } from '../../hooks/useBilling'

interface Props {
  payment: FinancialPayment | null
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
  PENDING:   { label: 'Pendente',   color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmado', color: '#10b981' },
  RECEIVED:  { label: 'Recebido',   color: '#10b981' },
  OVERDUE:   { label: 'Atrasado',   color: '#ef4444' },
  REFUNDED:  { label: 'Estornado',  color: '#8b5cf6' },
  CANCELLED: { label: 'Cancelado',  color: '#64748b' },
}

function fmtBRL(raw: string) {
  const n = parseInt(raw.replace(/\D/g, '') || '0', 10)
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function parseBRL(fmt: string): number {
  return parseInt(fmt.replace(/\D/g, '') || '0', 10) / 100
}

function getClientContact(p: FinancialPayment) {
  const phone = p.clients?.phone ?? (p as any).client_phone ?? ''
  const email = p.clients?.email ?? (p as any).client_email ?? ''
  return { phone: String(phone).replace(/\D/g, ''), email: String(email) }
}

export function PaymentDetailDrawer({ payment, onClose, onSuccess }: Props) {
  const [editMode,   setEditMode]   = useState(false)
  const [desc,       setDesc]       = useState('')
  const [valueFmt,   setValueFmt]   = useState('R$ 0,00')
  const [dueDate,    setDueDate]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'cancel' | 'refund' | null>(null)

  useEffect(() => {
    if (!payment) return
    setDesc(p.description)
    setValueFmt(p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    setDueDate(p.due_date ?? '')
    setEditMode(false); setError(null); setConfirming(null)
  }, [payment])

  if (!payment) return null

  // Captura como const não-null para que o TS narrow dentro das closures
  const p = payment

  const st        = STATUS_CFG[p.status] ?? { label: p.status, color: '#64748b' }
  const canEdit   = !!p.asaas_id && ['PENDING', 'OVERDUE'].includes(p.status)
  const canCancel = !!p.asaas_id && ['PENDING', 'OVERDUE'].includes(p.status)
  const canRefund = !!p.asaas_id && ['CONFIRMED', 'RECEIVED'].includes(p.status)
  const { phone, email } = getClientContact(p)

  function resetEdit() {
    setDesc(p.description)
    setValueFmt(p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
    setDueDate(p.due_date ?? '')
    setEditMode(false); setError(null)
  }

  async function handleSave() {
    const value = parseBRL(valueFmt)
    if (value <= 0)     { setError('Valor inválido.'); return }
    if (!desc.trim())   { setError('Descrição obrigatória.'); return }
    if (!dueDate)       { setError('Data obrigatória.'); return }
    if (!p.asaas_id)   return
    setLoading(true); setError(null)
    try {
      await updatePayment({
        asaas_id:     p.asaas_id,
        payment_id:   p.id,
        due_date:     dueDate,
        value,
        description:  desc.trim(),
        client_name:  p.client_name ?? '',
        client_phone: phone,
        client_email: email,
      })
      onSuccess('Cobrança atualizada! WhatsApp e email enviados.'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  async function handleCancel() {
    if (!p.asaas_id) return
    if (confirming !== 'cancel') { setConfirming('cancel'); return }
    setLoading(true); setError(null)
    try {
      await cancelPayment(p.asaas_id, p.id, p.client_name ?? '', phone, email, p.description)
      onSuccess('Cobrança cancelada! Cliente notificado.'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar.')
    } finally { setLoading(false) }
  }

  async function handleRefund() {
    if (!p.asaas_id) return
    if (confirming !== 'refund') { setConfirming('refund'); return }
    setLoading(true); setError(null)
    try {
      await refundPayment(p.asaas_id, p.id, p.client_name ?? '', phone, email, p.description)
      onSuccess('Cobrança estornada! Cliente notificado.'); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao estornar.')
    } finally { setLoading(false) }
  }

  function handleResend() {
    if (!p.asaas_id) return
    resendPayment(p.asaas_id)
    onSuccess('2ª via reenviada pelo Asaas!')
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col" style={{ width: 420, background: 'rgba(8,12,20,0.98)', borderLeft: '1px solid rgba(0,210,255,0.18)', boxShadow: '-32px 0 80px rgba(0,0,0,0.6)', animation: 'slide-in-right 0.22s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="text-base font-semibold text-white">Detalhe da Cobrança</h3>
            <p className="text-xs text-slate-500 mt-0.5">{p.client_name ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}40` }}>{st.label}</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}><X size={15} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-y-auto px-5 py-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
            {editMode
              ? <input type="text" value={desc} onChange={e => setDesc(e.target.value)} style={FIELD_BASE} />
              : <div style={FIELD_READONLY}>{p.description}</div>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Valor</label>
            {editMode
              ? <input type="text" inputMode="numeric" value={valueFmt} onChange={e => setValueFmt(fmtBRL(e.target.value))} onFocus={e => e.target.select()} style={FIELD_BASE} />
              : <div style={FIELD_READONLY}>{p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Vencimento</label>
            {editMode
              ? <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...FIELD_BASE, colorScheme: 'dark' }} />
              : <div style={FIELD_READONLY}>{p.due_date ? new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tipo</label>
            <div style={FIELD_READONLY}>{p.type === 'ONE_OFF' ? 'Cobrança Única' : 'Assinatura Recorrente'}</div>
          </div>
          {p.payment_link && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Link de Pagamento</label>
              <a href={p.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: '#00d2ff' }}>
                <ExternalLink size={13} /> Abrir link de pagamento
              </a>
            </div>
          )}
          {p.asaas_id && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">ID Asaas</label>
              <div style={{ ...FIELD_READONLY, fontSize: 12 }}>{p.asaas_id}</div>
            </div>
          )}
          {error && <p className="text-xs text-red-400">⚠ {error}</p>}

          {/* Confirmação de ação destrutiva */}
          {confirming && (
            <div className="px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-red-400 font-semibold mb-1">Confirmar {confirming === 'cancel' ? 'cancelamento' : 'estorno'}?</p>
              <p className="text-slate-500">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setConfirming(null)} className="flex-1 py-1.5 rounded-lg text-slate-400 text-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>Voltar</button>
                <button onClick={confirming === 'cancel' ? handleCancel : handleRefund} disabled={loading} className="flex-1 py-1.5 rounded-lg text-red-400 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : confirming === 'cancel' ? 'Confirmar Cancelamento' : 'Confirmar Estorno'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex flex-col gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {editMode ? (
            <div className="flex gap-2">
              <button onClick={resetEdit} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <XIcon size={13} /> Descartar
              </button>
              <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #00d2ff 0%, #9d50bb 100%)', boxShadow: '0 0 20px rgba(0,210,255,0.2)' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={13} />}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {p.asaas_id && (
                  <button onClick={handleResend} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-400 transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Send size={11} /> 2ª Via
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => setEditMode(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.3)', color: '#00d2ff' }}>
                    <Edit2 size={11} /> Editar
                  </button>
                )}
              </div>
              {canCancel && !confirming && (
                <button onClick={handleCancel} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Trash2 size={11} /> Cancelar Cobrança
                </button>
              )}
              {canRefund && !confirming && (
                <button onClick={handleRefund} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <RotateCcw size={11} /> Estornar Cobrança
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
