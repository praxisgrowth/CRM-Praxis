import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { PipelineStage, Priority } from '../../lib/database.types'
import type { NewDealInput } from '../../hooks/usePipeline'

interface Props {
  onClose: () => void
  onSave: (data: NewDealInput) => Promise<void>
}

const SERVICES = [
  'Gestão de Tráfego',
  'Social Media',
  'SEO',
  'Landing Page',
  'Automação de Chatbot',
  'Automação de Chatbot com IA',
  'Assessoria Comercial Google',
  'Consultoria Estratégica',
  'Branding',
  'Outros',
]

const STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'reuniao',    label: 'Reunião' },
  { value: 'proposta',   label: 'Proposta' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado',    label: 'Fechado' },
]

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'alta',  label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

const FIELD = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
const FIELD_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}
const FIELD_FOCUS = {
  border: '1px solid rgba(99,102,241,0.5)',
  background: 'rgba(99,102,241,0.06)',
}

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  )
}

export function NewDealModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState<NewDealInput>({
    title: '',
    company: '',
    contact_name: '',
    value: 0,
    stage: 'prospeccao',
    priority: 'media',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [focusField, setFocusField] = useState('')

  function set<K extends keyof NewDealInput>(key: K, val: NewDealInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.company.trim()) {
      setErr('Serviço e Empresa são obrigatórios.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar negócio.')
      setSaving(false)
    }
  }

  const inputStyle = (name: string) =>
    focusField === name ? { ...FIELD_STYLE, ...FIELD_FOCUS } : FIELD_STYLE

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,12,20,0.97)',
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.07)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Novo Negócio</p>
            <p className="text-xs text-slate-500 mt-0.5">Adicionar card ao pipeline</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Serviço *">
            <select
              className={FIELD}
              style={inputStyle('title')}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onFocus={() => setFocusField('title')}
              onBlur={() => setFocusField('')}
            >
              <option value="" style={{ background: '#0d1422' }}>Selecionar serviço…</option>
              {SERVICES.map(s => (
                <option key={s} value={s} style={{ background: '#0d1422' }}>{s}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa *">
              <input
                className={FIELD}
                style={inputStyle('company')}
                placeholder="Nome da empresa"
                value={form.company}
                onChange={e => set('company', e.target.value)}
                onFocus={() => setFocusField('company')}
                onBlur={() => setFocusField('')}
              />
            </Field>
            <Field label="Contato">
              <input
                className={FIELD}
                style={inputStyle('contact')}
                placeholder="Nome do contato"
                value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                onFocus={() => setFocusField('contact')}
                onBlur={() => setFocusField('')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input
                type="number"
                min={0}
                className={FIELD}
                style={inputStyle('value')}
                placeholder="0"
                value={form.value || ''}
                onChange={e => set('value', Number(e.target.value))}
                onFocus={() => setFocusField('value')}
                onBlur={() => setFocusField('')}
              />
            </Field>
            <Field label="Prioridade">
              <select
                className={FIELD}
                style={inputStyle('priority')}
                value={form.priority}
                onChange={e => set('priority', e.target.value as Priority)}
                onFocus={() => setFocusField('priority')}
                onBlur={() => setFocusField('')}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value} style={{ background: '#0d1422' }}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Coluna inicial">
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('stage', s.value)}
                  className="px-2 py-2 rounded-lg text-[11px] font-medium transition-all duration-150"
                  style={
                    form.stage === s.value
                      ? { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          {err && (
            <p className="text-xs text-red-400 px-1">{err}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Criar Negócio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
