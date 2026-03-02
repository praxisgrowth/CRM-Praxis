import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Project } from '../../lib/database.types'
import type { NewProjectInput } from '../../hooks/useOperations'

/* ─── Config ─────────────────────────────────────── */
const STATUSES: { value: Project['status']; label: string; color: string }[] = [
  { value: 'ativo',     label: 'Ativo',     color: '#10b981' },
  { value: 'pausado',   label: 'Pausado',   color: '#f59e0b' },
  { value: 'atrasado',  label: 'Atrasado',  color: '#ef4444' },
  { value: 'concluido', label: 'Concluído', color: '#6366f1' },
]

const SERVICE_TYPES = [
  'Gestão de Tráfego',
  'Social Media',
  'SEO',
  'Landing Page',
  'Automação de Chatbot com IA',
  'Assessoria Comercial Google',
  'Consultoria Estratégica',
  'Branding',
  'Outros',
]

const FIELD = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
const BASE_STYLE  = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
const FOCUS_STYLE = { background: 'rgba(16,185,129,0.06)',  border: '1px solid rgba(16,185,129,0.5)' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  )
}

/* ─── Modal ──────────────────────────────────────── */
interface Props {
  onClose: () => void
  onSave: (data: NewProjectInput) => Promise<void>
}

export function NewProjectModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState<NewProjectInput>({
    name: '', client_name: '', status: 'ativo',
    service_type: null, sla_percent: 100, due_date: null,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const [focus, setFocus]   = useState('')

  function set<K extends keyof NewProjectInput>(key: K, val: NewProjectInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim())        { setErr('O nome do projeto é obrigatório.'); return }
    if (!form.client_name.trim()) { setErr('O nome do cliente é obrigatório.'); return }
    setSaving(true); setErr('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar projeto.')
      setSaving(false)
    }
  }

  const s = (name: string) => focus === name ? { ...BASE_STYLE, ...FOCUS_STYLE } : BASE_STYLE

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,12,20,0.97)',
          border: '1px solid rgba(16,185,129,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(16,185,129,0.07)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Novo Projeto</p>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar projeto na operação</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nome do Projeto *">
            <input
              className={FIELD} style={s('name')} autoFocus
              placeholder="ex: Gestão de Tráfego Full"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
            />
          </Field>

          <Field label="Cliente *">
            <input
              className={FIELD} style={s('client')}
              placeholder="ex: TechVision Ltda"
              value={form.client_name}
              onChange={e => set('client_name', e.target.value)}
              onFocus={() => setFocus('client')} onBlur={() => setFocus('')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de Serviço">
              <select
                className={FIELD} style={s('service')}
                value={form.service_type ?? ''}
                onChange={e => set('service_type', e.target.value || null)}
                onFocus={() => setFocus('service')} onBlur={() => setFocus('')}
              >
                <option value="" style={{ background: '#0d1422' }}>Selecionar…</option>
                {SERVICE_TYPES.map(st => (
                  <option key={st} value={st} style={{ background: '#0d1422' }}>{st}</option>
                ))}
              </select>
            </Field>

            <Field label="SLA (0–100%)">
              <input
                type="number" min={0} max={100}
                className={FIELD} style={s('sla')}
                value={form.sla_percent}
                onChange={e => set('sla_percent', Math.min(100, Math.max(0, Number(e.target.value))))}
                onFocus={() => setFocus('sla')} onBlur={() => setFocus('')}
              />
            </Field>
          </div>

          <Field label="Prazo de Entrega">
            <input
              type="date"
              className={FIELD} style={s('due')}
              value={form.due_date ?? ''}
              onChange={e => set('due_date', e.target.value || null)}
              onFocus={() => setFocus('due')} onBlur={() => setFocus('')}
            />
          </Field>

          <Field label="Status inicial">
            <div className="grid grid-cols-4 gap-1.5">
              {STATUSES.map(st => (
                <button
                  key={st.value} type="button"
                  onClick={() => set('status', st.value)}
                  className="px-2 py-2 rounded-lg text-[11px] font-medium transition-all duration-150"
                  style={
                    form.status === st.value
                      ? { background: `${st.color}22`, border: `1px solid ${st.color}66`, color: st.color }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }
                  }
                >
                  {st.label}
                </button>
              ))}
            </div>
          </Field>

          {err && <p className="text-xs text-red-400 px-1">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-colors"
              style={BASE_STYLE}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: saving ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando…' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
