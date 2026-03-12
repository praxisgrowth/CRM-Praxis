// src/components/operations/TaskDetailDrawer.tsx
import { useState } from 'react'
import {
  X, Clock, CheckSquare, Square, MessageCircle, Send, Play, StopCircle,
  Lock, Edit2, Save, XCircle,
} from 'lucide-react'
import { TaskNexusIntegration } from './TaskNexusIntegration'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import type { TaskStatus, Priority, TeamMember } from '../../lib/database.types'
import { formatHours } from '../../hooks/useTaskManager'

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo',           label: 'A Fazer',            color: '#64748b' },
  { value: 'in_progress',    label: 'Em Andamento',       color: '#00d2ff' },
  { value: 'waiting_client', label: 'Aguardando Cliente', color: '#f59e0b' },
  { value: 'done',           label: 'Concluído',          color: '#10b981' },
  { value: 'blocked',        label: 'Bloqueado',          color: '#ef4444' },
]

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'baixa',   label: 'Baixa',   color: '#64748b' },
  { value: 'media',   label: 'Média',   color: '#f59e0b' },
  { value: 'alta',    label: 'Alta',    color: '#ef4444' },
  { value: 'urgente', label: 'Urgente', color: '#ec4899' },
]

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  outline: 'none',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
} as const

interface Props {
  task: TaskWithRelations
  teamMembers?: TeamMember[]
  onClose: () => void
  onUpdateStatus: (status: TaskStatus) => void
  onUpdate?: (updates: { title?: string; description?: string | null; deadline?: string | null; priority?: Priority; assignee_id?: string | null }) => void
  onToggleChecklist: (checklistId: string, isCompleted: boolean) => void
  onAddComment: (body: string) => void
  onPlay: () => void
  onStop: () => void
}

export function TaskDetailDrawer({
  task, teamMembers = [], onClose, onUpdateStatus, onUpdate,
  onToggleChecklist, onAddComment, onPlay, onStop,
}: Props) {
  const [comment,   setComment]   = useState('')
  const [editMode,  setEditMode]  = useState(false)

  // Edit form state
  const [editTitle,      setEditTitle]      = useState(task.title)
  const [editDesc,       setEditDesc]       = useState(task.description ?? '')
  const [editDeadline,   setEditDeadline]   = useState(task.deadline ?? '')
  const [editPriority,   setEditPriority]   = useState<Priority>(task.priority)
  const [editAssigneeId, setEditAssigneeId] = useState(task.assignee_id ?? '')

  const isRunning = !!task.current_timer_start
  const timerPct  = task.estimated_hours > 0
    ? Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100))
    : 0

  function handleSendComment() {
    if (!comment.trim()) return
    onAddComment(comment.trim())
    setComment('')
  }

  function openEdit() {
    // Sync form with latest task data
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
    setEditDeadline(task.deadline ?? '')
    setEditPriority(task.priority)
    setEditAssigneeId(task.assignee_id ?? '')
    setEditMode(true)
  }

  function handleSaveEdit() {
    if (!editTitle.trim()) return
    onUpdate?.({
      title:       editTitle.trim(),
      description: editDesc.trim() || null,
      deadline:    editDeadline || null,
      priority:    editPriority,
      assignee_id: editAssigneeId || null,
    })
    setEditMode(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(480px, 100vw)',
          background: 'rgba(10,14,22,0.98)',
          borderLeft: '1px solid rgba(99,180,255,0.1)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex-1 pr-4">
            {editMode ? (
              <input
                autoFocus
                style={inputStyle}
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-base font-semibold"
              />
            ) : (
              <h3 className="text-base font-semibold text-white leading-snug">{task.title}</h3>
            )}
            {task.isBlocked && !editMode && (
              <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                <Lock size={11} /> Bloqueada — aguardando tarefa anterior
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Edit / Save / Cancel */}
            {onUpdate && !editMode && (
              <button
                onClick={openEdit}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: '#475569' }}
                title="Editar tarefa"
              >
                <Edit2 size={14} />
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }}
                >
                  <Save size={12} /> Salvar
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: '#475569' }}
                >
                  <XCircle size={14} />
                </button>
              </>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 ml-1" style={{ color: '#475569' }}>
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* ── Edit form ── */}
          {editMode && (
            <div className="space-y-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Edição Inline</p>

              {/* Description */}
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Descrição</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
                  placeholder="Contexto, critérios de aceite…"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Deadline */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Prazo</label>
                  <input
                    type="date"
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                    value={editDeadline}
                    onChange={e => setEditDeadline(e.target.value)}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Prioridade</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={editPriority}
                    onChange={e => setEditPriority(e.target.value as Priority)}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p.value} value={p.value} style={{ background: '#0a0e16' }}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee */}
              {teamMembers.length > 0 && (
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">Responsável</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={editAssigneeId}
                    onChange={e => setEditAssigneeId(e.target.value)}
                  >
                    <option value="" style={{ background: '#0a0e16' }}>— Nenhum —</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#0a0e16' }}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ── Status selector (always visible) ── */}
          {!editMode && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdateStatus(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={
                      task.status === opt.value
                        ? { background: `${opt.color}22`, border: `1px solid ${opt.color}66`, color: opt.color }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Time Tracking Widget ── */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(0,210,255,0.05)', border: '1px solid rgba(0,210,255,0.12)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock size={12} style={{ color: '#00d2ff' }} /> Time Tracking
              </span>
              <button
                onClick={isRunning ? onStop : onPlay}
                disabled={task.isBlocked || task.status === 'done'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(0,210,255,0.15)',
                  border: `1px solid ${isRunning ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.3)'}`,
                  color: isRunning ? '#ef4444' : '#00d2ff',
                  opacity: task.isBlocked || task.status === 'done' ? 0.4 : 1,
                  cursor: task.isBlocked || task.status === 'done' ? 'not-allowed' : 'pointer',
                }}
              >
                {isRunning ? <><StopCircle size={12} /> Parar</> : <><Play size={12} /> Iniciar</>}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-slate-600 mb-0.5">Estimado</p>
                <p className="text-sm font-bold text-white">{formatHours(task.estimated_hours)}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-600 mb-0.5">Realizado</p>
                <p className="text-sm font-bold" style={{ color: timerPct > 100 ? '#ef4444' : '#10b981' }}>
                  {formatHours(task.actual_hours)}
                </p>
              </div>
            </div>

            {task.estimated_hours > 0 && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600">Progresso</span>
                  <span style={{ color: timerPct > 100 ? '#ef4444' : '#00d2ff' }}>{timerPct}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(timerPct, 100)}%`,
                      background: timerPct > 100 ? '#ef4444' : 'linear-gradient(90deg, #00d2ff, #9d50bb)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Nexus Deliverable Integration ── */}
          {!editMode && (
            <div className="pt-2">
              <TaskNexusIntegration task={task} />
            </div>
          )}

          {/* ── Checklist ── */}
          {task.checklists.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Checklist</p>
              <div className="space-y-1.5">
                {task.checklists.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onToggleChecklist(item.id, !item.is_completed)}
                    className="flex items-center gap-2.5 w-full text-left transition-opacity"
                    style={{ opacity: item.is_completed ? 0.6 : 1 }}
                  >
                    {item.is_completed
                      ? <CheckSquare size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                      : <Square size={15} style={{ color: '#334155', flexShrink: 0 }} />
                    }
                    <span
                      className="text-sm"
                      style={{
                        color: item.is_completed ? '#475569' : '#94a3b8',
                        textDecoration: item.is_completed ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Description (view mode) ── */}
          {!editMode && task.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descrição</p>
              <p className="text-sm text-slate-400 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* ── Comments ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageCircle size={12} /> Comentários ({task.comments.length})
            </p>
            <div className="space-y-2 mb-3">
              {task.comments.map(c => (
                <div
                  key={c.id}
                  className="rounded-lg p-3 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-400">{c.author}</span>
                    <span className="text-[11px] text-slate-600">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300">{c.body}</p>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-slate-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                placeholder="Adicionar comentário…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendComment() }}
              />
              <button
                onClick={handleSendComment}
                disabled={!comment.trim()}
                className="px-3 py-2 rounded-lg transition-all"
                style={{
                  background: comment.trim() ? 'rgba(0,210,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${comment.trim() ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: comment.trim() ? '#00d2ff' : '#475569',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
