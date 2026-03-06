import { useState } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import type { Client } from '../../lib/database.types'

interface Props {
  onClose: () => void
  onSave: (input: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}

const FIELD       = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
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

export function NewClientModal({ onClose, onSave }: Props) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [segment,  setSegment]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [focus,    setFocus]    = useState('')

  const s = (f: string) => focus === f ? { ...BASE_STYLE, ...FOCUS_STYLE } : BASE_STYLE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('O nome do cliente é obrigatório.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        name:         name.trim(),
        email:        email.trim() || null,
        phone:        phone.trim() || null,
        segment:      segment.trim() || null,
        mrr:          0,
        health_score: 50,
        trend:        'flat',
        avatar:       name.trim().charAt(0).toUpperCase(),
        asaas_id:     null,
        cpf_cnpj:     null,
        cep:          null,
        logradouro:   null,
        numero:       null,
        bairro:       null,
        cidade:       null,
        uf:           null,
        complemento:  null,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar cliente.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background:  'rgba(8,12,20,0.97)',
          border:      '1px solid rgba(99,102,241,0.25)',
          boxShadow:   '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.07)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Novo Cliente</p>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar cliente diretamente</p>
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
              placeholder="ex: Empresa Ltda"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input
                type="email" className={FIELD} style={s('email')}
                placeholder="contato@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
              />
            </Field>
            <Field label="Telefone">
              <input
                className={FIELD} style={s('phone')}
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onFocus={() => setFocus('phone')} onBlur={() => setFocus('')}
              />
            </Field>
          </div>

          <Field label="Segmento">
            <input
              className={FIELD} style={s('segment')}
              placeholder="ex: E-commerce, SaaS..."
              value={segment}
              onChange={e => setSegment(e.target.value)}
              onFocus={() => setFocus('segment')} onBlur={() => setFocus('')}
            />
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
                background:  saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow:   saving ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando…' : <><UserPlus size={14} /> Cadastrar Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
