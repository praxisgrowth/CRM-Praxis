// src/components/operations/TaskDetailDrawer.tsx
import { useState } from 'react'
import { X, Clock, CheckSquare, Square, MessageCircle, Send, Play, StopCircle, Lock } from 'lucide-react'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import type { TaskStatus } from '../../lib/database.types'
import { formatHours } from '../../hooks/useTaskManager'

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo',           label: 'A Fazer',           color: '#64748b' },
  { value: 'in_progress',    label: 'Em Andamento',      color: '#00d2ff' },
  { value: 'waiting_client', label: 'Aguardando Cliente',color: '#f59e0b' },
  { value: 'done',           label: 'Concluído',         color: '#10b981' },
  { value: 'blocked',        label: 'Bloqueado',         color: '#ef4444' },
]

interface Props {
  task: TaskWithRelations
  onClose: () => void
  onUpdateStatus: (status: TaskStatus) => void
  onToggleChecklist: (checklistId: string, isCompleted: boolean) => void
  onAddComment: (body: string) => void
  onPlay: () => void
  onStop: () => void
}

export function TaskDetailDrawer({ task, onClose, onUpdateStatus, onToggleChecklist, onAddComment, onPlay, onStop }: Props) {
  const [comment, setComment] = useState('')
  const isRunning = !!task.current_timer_start
  const timerPct  = task.estimated_hours > 0
    ? Math.min(100, Math.round((task.actual_hours / task.estimated_hours) * 100))
    : 0

  function handleSendComment() {
    if (!comment.trim()) return
    onAddComment(comment.trim())
    setComment('')
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
            <h3 className="text-base font-semibold text-white leading-snug">{task.title}</h3>
            {task.isBlocked && (
              <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-1">
                <Lock size={11} /> Bloqueada — aguardando tarefa anterior
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Status selector */}
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

          {/* Time Tracking Widget */}
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

          {/* Checklist */}
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

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descrição</p>
              <p className="text-sm text-slate-400 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Comments */}
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
