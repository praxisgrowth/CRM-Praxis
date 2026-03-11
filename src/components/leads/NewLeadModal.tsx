import { useState } from 'react'
import { X, Loader2, ChevronDown, Link2 } from 'lucide-react'
import type { Lead } from '../../lib/database.types'
import type { NewLeadInput } from '../../hooks/useLeads'

/* ─── Config ─────────────────────────────────────── */
const STAGES: { value: Lead['stage']; label: string }[] = [
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'reuniao',    label: 'Reunião'    },
  { value: 'proposta',   label: 'Proposta'   },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado',    label: 'Fechado'    },
]

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
    stage: 'prospeccao', score: 50, source: null,
    utm_source: null, utm_medium: null, utm_campaign: null,
    utm_content: null, utm_term: null,
  })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [focus, setFocus]     = useState('')
  const [utmOpen, setUtmOpen] = useState(false)

  function set<K extends keyof NewLeadInput>(key: K, val: NewLeadInput[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('O nome do lead é obrigatório.'); return }
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
      setErr('Telefone inválido — informe o DDD + número (mínimo 10 dígitos).')
      return
    }
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
          <Field label="Serviço *">
            <select
              className={FIELD}
              style={s('title')}
              value={form.title ?? ''}
              onChange={e => set('title', e.target.value || null)}
              onFocus={() => setFocus('title')}
              onBlur={() => setFocus('')}
            >
              <option value="" style={{ background: '#0d1422' }}>Selecionar serviço…</option>
              {SERVICES.map(s => (
                <option key={s} value={s} style={{ background: '#0d1422' }}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Nome da Empresa *">
            <input
              className={FIELD} style={s('name')}
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
            <select
              className={FIELD}
              style={s('stage')}
              value={form.stage}
              onChange={e => set('stage', e.target.value as Lead['stage'])}
              onFocus={() => setFocus('stage')}
              onBlur={() => setFocus('')}
            >
              {STAGES.map(st => (
                <option key={st.value} value={st.value} style={{ background: '#0d1422' }}>
                  {st.label}
                </option>
              ))}
            </select>
          </Field>

          {/* UTM / Rastreamento de Origem — colapsável */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              type="button"
              onClick={() => setUtmOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
            >
              <span className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <Link2 size={11} />
                UTM / Origem da Campanha
              </span>
              <ChevronDown
                size={12}
                className="text-slate-600 transition-transform duration-200"
                style={{ transform: utmOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {utmOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04]">
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {([
                    ['utm_source',   'Source (ex: google)'],
                    ['utm_medium',   'Medium (ex: cpc)'],
                    ['utm_campaign', 'Campaign'],
                    ['utm_content',  'Content'],
                    ['utm_term',     'Term'],
                  ] as [keyof NewLeadInput, string][]).map(([key, placeholder]) => (
                    <div key={key} className={key === 'utm_campaign' || key === 'utm_term' ? 'col-span-2' : ''}>
                      <label className="text-[10px] text-slate-600 font-medium uppercase tracking-wider block mb-1">
                        {key.replace('utm_', '')}
                      </label>
                      <input
                        className="w-full px-2.5 py-2 rounded-lg text-xs text-white placeholder-slate-700 outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        placeholder={placeholder}
                        value={(form[key] as string | null) ?? ''}
                        onChange={e => set(key, e.target.value || null)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
