import { useState, useEffect, useRef } from 'react'
import {
  X, Search, ChevronDown, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createPayment, createSubscription } from '../../hooks/useBilling'
import type { AsaasBillingType, SubscriptionCycle } from '../../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
interface ClientOption { id: string; name: string; asaas_id: string | null }
type Tab = 'unica' | 'assinatura'

interface BillingDrawerProps {
  open:      boolean
  onClose:   () => void
  onSuccess: (message: string) => void
}

/* ─── Constants ──────────────────────────────────── */
const CYCLES: { value: SubscriptionCycle; label: string }[] = [
  { value: 'WEEKLY',       label: 'Semanal'    },
  { value: 'BIWEEKLY',     label: 'Quinzenal'  },
  { value: 'MONTHLY',      label: 'Mensal'     },
  { value: 'QUARTERLY',    label: 'Trimestral' },
  { value: 'SEMIANNUALLY', label: 'Semestral'  },
  { value: 'YEARLY',       label: 'Anual'      },
]

const PAYMENT_METHODS: { value: AsaasBillingType; label: string }[] = [
  { value: 'PIX',         label: 'PIX'    },
  { value: 'BOLETO',      label: 'Boleto' },
  { value: 'CREDIT_CARD', label: 'Cartão' },
]

/* ─── Helpers ────────────────────────────────────── */
const FIELD: React.CSSProperties = {
  width:        '100%',
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding:      '10px 12px',
  color:        '#f0f4ff',
  fontSize:     14,
  outline:      'none',
}

function fmtBRL(raw: string): string {
  const n = parseInt(raw.replace(/\D/g, '') || '0', 10)
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(fmt: string): number {
  return parseInt(fmt.replace(/\D/g, '') || '0', 10) / 100
}

/* ─── Component ──────────────────────────────────── */
export function BillingDrawer({ open, onClose, onSuccess }: BillingDrawerProps) {
  const [tab,             setTab]             = useState<Tab>('unica')
  const [clients,         setClients]         = useState<ClientOption[]>([])
  const [clientQuery,     setClientQuery]     = useState('')
  const [clientDropdown,  setClientDropdown]  = useState(false)
  const [selectedClient,  setSelectedClient]  = useState<ClientOption | null>(null)
  const [valueFmt,        setValueFmt]        = useState('R$ 0,00')
  const [description,     setDescription]     = useState('')
  const [paymentMethod,   setPaymentMethod]   = useState<AsaasBillingType>('PIX')
  const [dueDate,         setDueDate]         = useState('')
  const [cycle,           setCycle]           = useState<SubscriptionCycle>('MONTHLY')
  const [loading,         setLoading]         = useState(false)
  const [formError,       setFormError]       = useState<string | null>(null)
  const [asaasSync,       setAsaasSync]       = useState(true)

  const comboRef = useRef<HTMLDivElement>(null)

  /* Load clients when drawer opens */
  useEffect(() => {
    if (!open) return
    supabase
      .from('clients')
      .select('id, name, asaas_id')
      .order('name')
      .then(({ data }) => { if (data) setClients(data as ClientOption[]) })
  }, [open])

  /* Reset on close */
  useEffect(() => {
    if (!open) {
      setTab('unica')
      setClientQuery('')
      setSelectedClient(null)
      setValueFmt('R$ 0,00')
      setDescription('')
      setPaymentMethod('PIX')
      setDueDate('')
      setCycle('MONTHLY')
      setFormError(null)
      setAsaasSync(true)
    }
  }, [open])

  /* Close combobox on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()))
    .slice(0, 8)

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValueFmt(fmtBRL(e.target.value))
  }

  function selectClient(c: ClientOption) {
    setSelectedClient(c)
    setClientQuery(c.name)
    setClientDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseBRL(valueFmt)

    if (!selectedClient)      { setFormError('Selecione um cliente.');               return }
    if (value <= 0)            { setFormError('Informe um valor maior que zero.');    return }
    if (!description.trim())   { setFormError('Informe uma descrição.');              return }
    if (tab === 'unica' && !dueDate) { setFormError('Informe a data de vencimento.'); return }

    setLoading(true)
    setFormError(null)

    try {
      if (tab === 'unica') {
        await createPayment({
          client_id:   selectedClient.id,
          client_name: selectedClient.name,
          description: description.trim(),
          value,
          billing_type: paymentMethod,
          due_date:    dueDate,
          asaas_sync:  asaasSync,
        })
        onSuccess(asaasSync
          ? 'Cobrança enviada! O n8n irá processar em instantes.'
          : 'Cobrança salva localmente (sem sincronização com Asaas).')
      } else {
        await createSubscription({
          client_id:   selectedClient.id,
          client_name: selectedClient.name,
          description: description.trim(),
          value,
          billing_type: paymentMethod,
          cycle,
          asaas_sync:  asaasSync,
        })
        onSuccess(asaasSync
          ? 'Assinatura criada! O n8n irá ativar em instantes.'
          : 'Assinatura salva localmente (sem sincronização com Asaas).')
      }
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width:      420,
          background: 'rgba(8,12,20,0.98)',
          borderLeft: '1px solid rgba(0,210,255,0.18)',
          boxShadow:  '-32px 0 80px rgba(0,0,0,0.6)',
          animation:  'slide-in-right 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h3 className="text-base font-semibold text-white">Nova Cobrança</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cobrança única ou assinatura recorrente</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['unica', 'assinatura'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.03)',
                color:      tab === t ? '#00d2ff' : '#64748b',
                border:     `1px solid ${tab === t ? 'rgba(0,210,255,0.3)' : 'transparent'}`,
              }}
            >
              {t === 'unica' ? 'Cobrança Única' : 'Assinatura Recorrente'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">

            {/* Cliente — Combobox */}
            <div ref={comboRef} className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cliente</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientQuery}
                  onChange={e => { setClientQuery(e.target.value); setSelectedClient(null) }}
                  onFocus={() => setClientDropdown(true)}
                  style={{ ...FIELD, paddingLeft: 32 }}
                />
              </div>
              {clientDropdown && filteredClients.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(13,20,34,0.98)',
                    border:     '1px solid rgba(255,255,255,0.1)',
                    boxShadow:  '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseDown={() => selectClient(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && !selectedClient.asaas_id && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-lg -mt-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <span className="text-amber-400 text-xs leading-snug">
                  ⚠ <strong>Sem Asaas ID</strong> — este cliente ainda não tem cadastro no Asaas.
                  A cobrança será salva e processada automaticamente pelo n8n quando o cliente
                  for sincronizado.
                </span>
              </div>
            )}

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Valor</label>
              <input
                type="text"
                inputMode="numeric"
                value={valueFmt}
                onChange={handleValueChange}
                onFocus={e => e.target.select()}
                style={FIELD}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Gestão de tráfego — Março 2026"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={FIELD}
              />
            </div>

            {/* Meio de Pagamento */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Meio de Pagamento</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: paymentMethod === m.value ? 'rgba(0,210,255,0.1)'       : 'rgba(255,255,255,0.04)',
                      border:     `1px solid ${paymentMethod === m.value ? 'rgba(0,210,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      color:      paymentMethod === m.value ? '#00d2ff' : '#475569',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condicional: Data de Vencimento (Única) */}
            {tab === 'unica' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ ...FIELD, colorScheme: 'dark' }}
                />
              </div>
            )}

            {/* Condicional: Ciclo de Recorrência (Assinatura) */}
            {tab === 'assinatura' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Ciclo de Recorrência</label>
                <div className="relative">
                  <select
                    value={cycle}
                    onChange={e => setCycle(e.target.value as SubscriptionCycle)}
                    style={{ ...FIELD, appearance: 'none', paddingRight: 32 }}
                  >
                    {CYCLES.map(c => (
                      <option key={c.value} value={c.value} style={{ background: '#0d1117' }}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Sincronizar com Asaas */}
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-xs font-medium text-slate-300">Sincronizar com Asaas</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {asaasSync ? 'Cobrança será enviada ao Asaas via n8n' : 'Salvar apenas localmente'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAsaasSync(v => !v)}
                className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none"
                style={{
                  background: asaasSync
                    ? 'linear-gradient(135deg, #00d2ff, #0099cc)'
                    : 'rgba(255,255,255,0.1)',
                  boxShadow: asaasSync ? '0 0 10px rgba(0,210,255,0.4)' : 'none',
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
                  style={{
                    left: asaasSync ? 'calc(100% - 22px)' : '2px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>

            {/* Erro de formulário */}
            {formError && (
              <p className="text-xs text-red-400">⚠ {formError}</p>
            )}

          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #00d2ff 0%, #9d50bb 100%)',
                boxShadow:  loading ? 'none' : '0 0 20px rgba(0,210,255,0.25)',
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading
                ? 'Salvando...'
                : tab === 'unica' ? 'Criar Cobrança' : 'Criar Assinatura'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
