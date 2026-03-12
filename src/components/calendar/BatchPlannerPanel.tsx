// src/components/calendar/BatchPlannerPanel.tsx
import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Save, Loader2 } from 'lucide-react'
import type { NexusFileType } from '../../hooks/useNexus'
import type { EditorialLine } from '../../lib/database.types'
import type { NewTaskInput } from '../../hooks/useTaskManager'

interface DraftRow {
  id:                number
  title:             string
  editorial_line_id: string
  publish_date:      string
  deliverable_type:  NexusFileType | ''
}

interface Props {
  lines:      EditorialLine[]
  projectId?: string | null
  clientId?:  string | null
  onSave:     (tasks: NewTaskInput[]) => Promise<void>
  onClose:    () => void
}

const TYPE_OPTIONS: { value: NexusFileType | ''; label: string }[] = [
  { value: '',          label: 'Sem tipo'  },
  { value: 'imagem',    label: 'Imagem'    },
  { value: 'copy',      label: 'Copy'      },
  { value: 'video',     label: 'Vídeo'     },
  { value: 'documento', label: 'Documento' },
]

const inputCls = "bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all w-full"

let _id = 0
function newRow(date = ''): DraftRow {
  return { id: ++_id, title: '', editorial_line_id: '', publish_date: date, deliverable_type: '' }
}

export function BatchPlannerPanel({ lines, projectId, clientId, onSave, onClose }: Props) {
  const [rows,   setRows]   = useState<DraftRow[]>([newRow()])
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addRow()              { setRows(r => [...r, newRow()]) }
  function removeRow(id: number) { setRows(r => r.filter(x => x.id !== id)) }
  function update(id: number, patch: Partial<DraftRow>) {
    setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  const handleSave = useCallback(async () => {
    const valid = rows.filter(r => r.title.trim() && r.publish_date)
    if (valid.length === 0) { setError('Adicione pelo menos uma linha com título e data.'); return }
    setSaving(true)
    setError(null)
    try {
      const inputs: NewTaskInput[] = valid.map(r => ({
        title:             r.title.trim(),
        status:            'todo',
        project_id:        projectId ?? null,
        client_id:         clientId  ?? null,
        publish_date:      r.publish_date,
        editorial_line_id: r.editorial_line_id || null,
        deliverable_type:  (r.deliverable_type as NexusFileType) || null,
      }))
      await onSave(inputs)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [rows, projectId, clientId, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl flex flex-col"
        style={{
          background: 'rgba(13,20,34,0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-sm font-bold text-white">Planejar Calendário</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Crie múltiplas tarefas de uma vez</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-[1fr_140px_120px_90px_28px] gap-2 px-5 pt-3 pb-1">
          {['Título', 'Linha Editorial', 'Data', 'Tipo', ''].map((l, i) => (
            <span key={i} className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{l}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 py-2">
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-[1fr_140px_120px_90px_28px] gap-2 items-center">
              <input
                value={row.title}
                onChange={e => update(row.id, { title: e.target.value })}
                placeholder="Título da tarefa"
                className={inputCls}
              />
              <select
                value={row.editorial_line_id}
                onChange={e => update(row.id, { editorial_line_id: e.target.value })}
                className={inputCls}
                style={{ cursor: 'pointer' }}
              >
                <option value="" style={{ background: '#0d1422' }}>— Linha —</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id} style={{ background: '#0d1422', color: l.color }}>{l.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={row.publish_date}
                onChange={e => update(row.id, { publish_date: e.target.value })}
                className={inputCls}
              />
              <select
                value={row.deliverable_type}
                onChange={e => update(row.id, { deliverable_type: e.target.value as NexusFileType | '' })}
                className={inputCls}
                style={{ cursor: 'pointer' }}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: '#0d1422' }}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeRow(row.id)}
                className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {error && (
            <p className="text-[11px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 8 }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Plus size={12} /> Adicionar linha
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Salvando…' : 'Salvar Rascunhos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
