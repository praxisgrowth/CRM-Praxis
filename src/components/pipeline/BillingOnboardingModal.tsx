import { useState } from 'react'
import { X, Loader2, CreditCard, MapPin, Mail, Phone, Hash, Briefcase, Users, TrendingUp } from 'lucide-react'
import type { Client } from '../../lib/database.types'

interface Props {
  clientId?: string
  companyName?: string
  initialData?: Partial<Client>
  isNew?: boolean
  onClose: () => void
  onSave: (data: Partial<Client>) => Promise<void>
}

const FIELD = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
const FIELD_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}
const FIELD_FOCUS = {
  border: '1px solid rgba(0,210,255,0.5)',
  background: 'rgba(0,210,255,0.06)',
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Icon size={12} className="text-slate-600" />
        {label}
      </label>
      {children}
    </div>
  )
}

export function BillingOnboardingModal({ companyName, initialData, isNew, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Client>>({
    name:       initialData?.name || companyName || '',
    email:      initialData?.email || '',
    phone:      initialData?.phone || '',
    segment:    initialData?.segment || '',
    mrr:        initialData?.mrr || 0,
    cpf_cnpj:   initialData?.cpf_cnpj || '',
    cep:        initialData?.cep || '',
    logradouro: initialData?.logradouro || '',
    numero:     initialData?.numero || '',
    complemento: initialData?.complemento || '',
    bairro:     initialData?.bairro || '',
    cidade:     initialData?.cidade || '',
    uf:         initialData?.uf || '',
  })
  
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [focusField, setFocusField] = useState('')
  const [showRequired, setShowRequired] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState('')

  function update(key: keyof Client, val: string | number | null) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.cpf_cnpj || !form.email) {
      setShowRequired(true)
      setErr('Nome, CPF/CNPJ e Email são obrigatórios.')
      return
    }
    setShowRequired(false)
    if (form.phone && (form.phone as string).replace(/\D/g, '').length < 10) {
      setErr('Telefone inválido — informe o DDD + número (mínimo 10 dígitos).')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao processar conversão.')
      setSaving(false)
    }
  }

  const FIELD_ERROR = {
    border: '1px solid rgba(239,68,68,0.6)',
    background: 'rgba(239,68,68,0.06)',
  }

  const inputStyle = (name: string) => {
    if (showRequired && (name === 'cpf_cnpj' || name === 'email')) {
      const isEmpty = name === 'cpf_cnpj' ? !form.cpf_cnpj : !form.email
      if (isEmpty) return focusField === name ? { ...FIELD_ERROR, ...FIELD_FOCUS } : FIELD_ERROR
    }
    return focusField === name ? { ...FIELD_STYLE, ...FIELD_FOCUS } : FIELD_STYLE
  }

  async function fetchCep(raw: string) {
    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    setCepError('')
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) { setCepError('CEP não encontrado.'); return }
      setForm(f => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro:     data.bairro     || f.bairro,
        cidade:     data.localidade || f.cidade,
        uf:         data.uf         || f.uf,
      }))
    } catch {
      setCepError('Erro ao buscar CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200"
        style={{
          background: 'rgba(8,12,20,0.98)',
          border: '1px solid rgba(0,210,255,0.2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 bg-cyan-500/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{isNew ? 'Novo Cliente' : 'Configurar Faturamento'}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {isNew ? 'Cadastro completo de novo cliente' : (
                <>Finalizando a conversão de <span className="text-cyan-400 font-semibold">{form.name || companyName}</span></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
          {/* Sessão 0: Identidade (se novo) */}
          {(isNew || !companyName) && (
            <div className="space-y-4 pb-4 border-b border-white/5">
              <Field label="Nome da Empresa / Cliente *" icon={Briefcase}>
                <input 
                  className={FIELD}
                  style={inputStyle('name')}
                  placeholder="ex: Praxis Growth"
                  value={form.name || ''}
                  onChange={e => update('name', e.target.value)}
                  onFocus={() => setFocusField('name')}
                  onBlur={() => setFocusField('')}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Segmento" icon={Users}>
                  <input 
                    className={FIELD}
                    style={inputStyle('segment')}
                    placeholder="SaaS, E-commerce..."
                    value={form.segment || ''}
                    onChange={e => update('segment', e.target.value)}
                  />
                </Field>
                <Field label="MRR (Valor Mensal)" icon={TrendingUp}>
                  <input 
                    className={FIELD}
                    style={inputStyle('mrr')}
                    type="number"
                    placeholder="0.00"
                    value={form.mrr || ''}
                    onChange={e => update('mrr', parseFloat(e.target.value) || 0)}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Sessão 1: Fiscal */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="CPF ou CNPJ *" icon={CreditCard}>
              <input 
                className={FIELD}
                style={inputStyle('cpf_cnpj')}
                placeholder="000.000.000-00"
                value={form.cpf_cnpj ?? ''}
                onChange={e => update('cpf_cnpj', e.target.value)}
                onFocus={() => setFocusField('cpf_cnpj')}
                onBlur={() => setFocusField('')}
              />
            </Field>
            <Field label="Email de Cobrança *" icon={Mail}>
              <input 
                className={FIELD}
                style={inputStyle('email')}
                placeholder="financeiro@empresa.com"
                value={form.email || ''}
                onChange={e => update('email', e.target.value)}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField('')}
              />
            </Field>
          </div>

          {/* Sessão 2: Endereço */}
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="CEP" icon={Hash}>
                <div className="relative">
                  <input
                    className={FIELD}
                    style={inputStyle('cep')}
                    placeholder="00000-000"
                    value={form.cep || ''}
                    onChange={e => { update('cep', e.target.value); setCepError('') }}
                    onFocus={() => setFocusField('cep')}
                    onBlur={e => { setFocusField(''); fetchCep(e.target.value) }}
                  />
                  {cepLoading && (
                    <Loader2
                      size={12}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-cyan-400"
                    />
                  )}
                </div>
                {cepError && (
                  <p className="text-[10px] text-amber-400 mt-1">{cepError}</p>
                )}
              </Field>
              <div className="col-span-2">
                <Field label="Logradouro" icon={MapPin}>
                  <input 
                    className={FIELD}
                    style={inputStyle('logradouro')}
                    placeholder="Rua, Avenida, etc."
                    value={form.logradouro || ''}
                    onChange={e => update('logradouro', e.target.value)}
                    onFocus={() => setFocusField('logradouro')}
                    onBlur={() => setFocusField('')}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <Field label="Número" icon={Hash}>
                <input 
                  className={FIELD}
                  style={inputStyle('numero')}
                  placeholder="123"
                  value={form.numero || ''}
                  onChange={e => update('numero', e.target.value)}
                  onFocus={() => setFocusField('numero')}
                  onBlur={() => setFocusField('')}
                />
              </Field>
              <div className="col-span-2">
                <Field label="Complemento" icon={MapPin}>
                  <input 
                    className={FIELD}
                    style={inputStyle('complemento')}
                    placeholder="Apt, Bloco, etc."
                    value={form.complemento || ''}
                    onChange={e => update('complemento', e.target.value)}
                    onFocus={() => setFocusField('complemento')}
                    onBlur={() => setFocusField('')}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Field label="Bairro" icon={MapPin}>
                  <input 
                    className={FIELD}
                    style={inputStyle('bairro')}
                    placeholder="Centro"
                    value={form.bairro || ''}
                    onChange={e => update('bairro', e.target.value)}
                    onFocus={() => setFocusField('bairro')}
                    onBlur={() => setFocusField('')}
                  />
                </Field>
              </div>
              <Field label="UF" icon={MapPin}>
                <input 
                  className={FIELD}
                  style={inputStyle('uf')}
                  placeholder="SP"
                  maxLength={2}
                  value={form.uf || ''}
                  onChange={e => update('uf', e.target.value.toUpperCase())}
                  onFocus={() => setFocusField('uf')}
                  onBlur={() => setFocusField('')}
                />
              </Field>
            </div>
            
            <Field label="Cidade" icon={MapPin}>
              <input 
                className={FIELD}
                style={inputStyle('cidade')}
                placeholder="Cidade"
                value={form.cidade || ''}
                onChange={e => update('cidade', e.target.value)}
                onFocus={() => setFocusField('cidade')}
                onBlur={() => setFocusField('')}
              />
            </Field>
          </div>

          <Field label="WhatsApp / Telefone" icon={Phone}>
            <input 
              className={FIELD}
              style={inputStyle('phone')}
              placeholder="(00) 00000-0000"
              value={form.phone || ''}
              onChange={e => update('phone', e.target.value)}
              onFocus={() => setFocusField('phone')}
              onBlur={() => setFocusField('')}
            />
          </Field>

          {err && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">{err}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-white/5 transition-all outline-none"
            >
              Agora não
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-2 py-3 px-8 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 group"
              style={{
                background: saving ? 'rgba(0,210,255,0.4)' : 'linear-gradient(135deg, #00d2ff, #7a5af8)',
                boxShadow: saving ? 'none' : '0 4px 15px rgba(0,210,255,0.3)',
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} className="group-hover:scale-110 transition-transform" />}
              {saving ? 'Processando...' : 'Confirmar e Converter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
