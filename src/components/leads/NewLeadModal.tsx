import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import type { Lead } from '../../lib/database.types'
import type { NewLeadInput } from '../../hooks/useLeads'

/* ─── Config ─────────────────────────────────────── */
const STAGES: { value: Lead['stage']; label: string; color: string }[] = [
  { value: 'novo',        label: 'Novo',        color: '#6366f1' },
  { value: 'qualificado', label: 'Qualificado',  color: '#8b5cf6' },
  { value: 'proposta',    label: 'Proposta',     color: '#f59e0b' },
  { value: 'negociacao',  label: 'Negociação',   color: '#10b981' },
  { value: 'fechado',     label: 'Fechado',      color: '#64748b' },
]

const SOURCES = ['LinkedIn', 'Indicação', 'Evento', 'Site', 'Outbound', 'Cold Email', 'Outros']

const FIELD = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
const BASE_STYLE  = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
const FOCUS_STYLE = { background: 'rgba(99,102,241,0.06)',  border: '1px solid rgba(99,102,241,0.5)' }

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
  onSave: (data: NewLeadInput) => Promise<void>
}

export function NewLeadModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState<NewLeadInput>({
    name: '', email: null, phone: null,
    stage: 'novo', score: 50, source: null,
  })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [focus, setFocus]     = useState('')

  function set<K extends keyof NewLeadInput>(key: K, val: NewLeadInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('O nome do lead é obrigatório.'); return }
    setSaving(true); setErr('')
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar lead.')
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
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.07)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Novo Lead</p>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar novo lead no funil</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nome *">
            <input
              className={FIELD} style={s('name')} autoFocus
              placeholder="ex: TechVision Ltda"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input
                type="email" className={FIELD} style={s('email')}
                placeholder="contato@empresa.com"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value || null)}
                onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
              />
            </Field>
            <Field label="Telefone">
              <input
                className={FIELD} style={s('phone')}
                placeholder="(11) 99999-9999"
                value={form.phone ?? ''}
                onChange={e => set('phone', e.target.value || null)}
                onFocus={() => setFocus('phone')} onBlur={() => setFocus('')}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origem">
              <select
                className={FIELD} style={s('source')}
                value={form.source ?? ''}
                onChange={e => set('source', e.target.value || null)}
                onFocus={() => setFocus('source')} onBlur={() => setFocus('')}
              >
                <option value="" style={{ background: '#0d1422' }}>Selecionar…</option>
                {SOURCES.map(src => (
                  <option key={src} value={src} style={{ background: '#0d1422' }}>{src}</option>
                ))}
              </select>
            </Field>
            <Field label="Score (0–100)">
              <input
                type="number" min={0} max={100}
                className={FIELD} style={s('score')}
                value={form.score}
                onChange={e => set('score', Math.min(100, Math.max(0, Number(e.target.value))))}
                onFocus={() => setFocus('score')} onBlur={() => setFocus('')}
              />
            </Field>
          </div>

          <Field label="Estágio inicial">
            <div className="grid grid-cols-3 gap-1.5">
              {STAGES.map(st => (
                <button
                  key={st.value} type="button"
                  onClick={() => set('stage', st.value)}
                  className="px-2 py-2 rounded-lg text-[11px] font-medium transition-all duration-150"
                  style={
                    form.stage === st.value
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
                background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando…' : 'Cadastrar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
