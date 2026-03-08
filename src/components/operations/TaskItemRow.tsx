// src/components/operations/TaskItemRow.tsx
import { Play, Square, Lock, CheckCircle2, Clock, AlertCircle, Loader2, Circle, User } from 'lucide-react'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import { formatHours } from '../../hooks/useTaskManager'

const STATUS_CONFIG = {
  todo:           { label: 'A Fazer',            color: '#64748b', Icon: Circle },
  in_progress:    { label: 'Em Andamento',        color: '#00d2ff', Icon: Loader2 },
  waiting_client: { label: 'Aguardando Cliente',  color: '#f59e0b', Icon: Clock },
  done:           { label: 'Concluído',           color: '#10b981', Icon: CheckCircle2 },
  blocked:        { label: 'Bloqueado',           color: '#ef4444', Icon: Lock },
}

const PRIORITY_COLOR = {
  baixa:   '#64748b',
  media:   '#f59e0b',
  alta:    '#ef4444',
  urgente: '#ec4899',
}

function formatLiveTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface Props {
  task: TaskWithRelations
  onPlay: () => void
  onStop: () => void
  onClick: () => void
}

export function TaskItemRow({ task, onPlay, onStop, onClick }: Props) {
  const cfg        = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo
  const isRunning  = !!task.current_timer_start
  const isBlocked  = task.isBlocked
  const isDone     = task.status === 'done'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 cursor-pointer group"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${isBlocked ? 'rgba(239,68,68,0.2)' : isRunning ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
        opacity: isBlocked ? 0.55 : 1,
      }}
      onClick={onClick}
    >
      {/* Status icon */}
      <div style={{ color: cfg.color, flexShrink: 0 }}>
        {isBlocked
          ? <Lock size={15} style={{ color: '#ef4444' }} />
          : <cfg.Icon size={15} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
        }
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm truncate block"
          style={{
            color: isDone ? '#475569' : '#cbd5e1',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
        {task.assignee_id && (
          <span className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
            <User size={10} /> Atribuído
          </span>
        )}
      </div>

      {/* Priority dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        title={`Prioridade ${task.priority}`}
        style={{ background: PRIORITY_COLOR[task.priority] ?? '#64748b' }}
      />

      {/* Timer display */}
      <div className="flex items-center gap-1.5 flex-shrink-0" style={{ minWidth: 80 }}>
        {isRunning && (
          <span
            className="text-xs font-mono tabular-nums"
            style={{ color: '#00d2ff' }}
          >
            {formatLiveTime(task.liveSeconds)}
          </span>
        )}
        {!isRunning && task.actual_hours > 0 && (
          <span className="text-xs text-slate-600 font-mono">
            {formatHours(task.actual_hours)}
          </span>
        )}
      </div>

      {/* Play/Stop button */}
      <button
        onClick={e => {
          e.stopPropagation()
          isRunning ? onStop() : onPlay()
        }}
        disabled={isBlocked || isDone}
        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100"
        style={{
          background: isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(0,210,255,0.12)',
          border: `1px solid ${isRunning ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.25)'}`,
          color: isRunning ? '#ef4444' : '#00d2ff',
          cursor: isBlocked || isDone ? 'not-allowed' : 'pointer',
          opacity: isBlocked || isDone ? 0.3 : undefined,
        }}
        title={isRunning ? 'Parar timer' : isBlocked ? 'Tarefa bloqueada' : 'Iniciar timer'}
      >
        {isRunning ? <Square size={11} /> : <Play size={11} />}
      </button>

      {/* Blocked indicator */}
      {isBlocked && (
        <span title="Aguardando conclusão de tarefa anterior" style={{ flexShrink: 0 }}>
          <AlertCircle size={13} style={{ color: '#ef4444' }} />
        </span>
      )}
    </div>
  )
}
