// src/components/operations/NewTaskModal.tsx
import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import type { NewTaskInput } from '../../hooks/useTaskManager'
import type { TeamMember } from '../../lib/database.types'

interface ProjectOption {
  id: string
  name: string
  client_name: string
}

interface Props {
  projects: ProjectOption[]
  teamMembers: TeamMember[]
  onClose: () => void
  onSave: (input: NewTaskInput) => Promise<void>
}

const PRIORITY_OPTIONS = [
  { value: 'baixa',   label: 'Baixa',   color: '#64748b' },
  { value: 'media',   label: 'Média',   color: '#f59e0b' },
  { value: 'alta',    label: 'Alta',    color: '#ef4444' },
  { value: 'urgente', label: 'Urgente', color: '#ec4899' },
]

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#e2e8f0',
  outline: 'none',
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
} as const

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
}

export function NewTaskModal({ projects, teamMembers, onClose, onSave }: Props) {
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId]   = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority]     = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media')
  const [deadline, setDeadline]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setErr('Título é obrigatório.'); return }
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        title:       title.trim(),
        description: description.trim() || null,
        project_id:  projectId  || null,
        assignee_id: assigneeId || null,
        priority,
        deadline:    deadline || null,
      })
      onClose()
    } catch (e: any) {
      const message = e.message || 'Erro ao criar tarefa.'
      const code = e.code ? ` (Código: ${e.code})` : ''
      setErr(`${message}${code}`)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13,20,34,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus size={15} style={{ color: '#6366f1' }} />
            Nova Tarefa
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#475569' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {err && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {err}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              autoFocus
              style={inputStyle}
              placeholder="Ex: Criar campanha de remarketing"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: '1.5' }}
              placeholder="Contexto, critérios de aceite, links relevantes…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label style={labelStyle}>Projeto / Cliente</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                <option value="" style={{ background: '#0d1422' }}>— Sem projeto —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#0d1422' }}>
                    {p.client_name} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <label style={labelStyle}>Responsável</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="" style={{ background: '#0d1422' }}>— Nenhum —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} style={{ background: '#0d1422' }}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={labelStyle}>Prioridade</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer', color: PRIORITY_OPTIONS.find(p => p.value === priority)?.color ?? '#e2e8f0' }}
                value={priority}
                onChange={e => setPriority(e.target.value as typeof priority)}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value} style={{ background: '#0d1422', color: p.color }}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={labelStyle}>Prazo</label>
            <input
              type="date"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Criando…' : 'Criar Tarefa'}
          </button>
        </form>
      </div>
    </div>
  )
}
