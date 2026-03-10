// src/components/operations/TaskKanbanBoard.tsx
import { useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lock, GripVertical, AlertCircle, Calendar } from 'lucide-react'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import type { TaskStatus, TeamMember } from '../../lib/database.types'
import type { ProjectMeta } from './OperationsTable'

const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'todo',           label: 'A Fazer',           color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  { status: 'in_progress',    label: 'Em Andamento',      color: '#00d2ff', bg: 'rgba(0,210,255,0.06)'   },
  { status: 'waiting_client', label: 'Aguardando Cliente',color: '#f59e0b', bg: 'rgba(245,158,11,0.06)'  },
  { status: 'done',           label: 'Concluído',         color: '#10b981', bg: 'rgba(16,185,129,0.06)'  },
  { status: 'blocked',        label: 'Bloqueado',         color: '#ef4444', bg: 'rgba(239,68,68,0.06)'   },
]

const PRIORITY_CFG = {
  baixa:   { label: 'Baixa',   color: '#64748b' },
  media:   { label: 'Média',   color: '#f59e0b' },
  alta:    { label: 'Alta',    color: '#ef4444' },
  urgente: { label: 'Urgente', color: '#ec4899' },
}

function fmtDeadline(iso: string | null): { label: string; color: string } | null {
  if (!iso) return null
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days < 0)  return { label: `${Math.abs(days)}d atraso`, color: '#ef4444' }
  if (days === 0) return { label: 'Hoje',                       color: '#f59e0b' }
  if (days <= 3)  return { label: `${days}d`,                   color: '#f59e0b' }
  return { label: new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), color: '#475569' }
}

function memberInitials(name: string): string {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

/* ─── Sortable card ── */
function KanbanCard({
  task, projectMeta, member, onClick,
}: {
  task: TaskWithRelations
  projectMeta: ProjectMeta | undefined
  member: TeamMember | undefined
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : task.isBlocked ? 0.6 : 1,
  }
  const pri      = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.media
  const deadline = fmtDeadline(task.deadline)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl cursor-pointer transition-all duration-150 group"
      onClick={onClick}
      {...attributes}
    >
      <div
        className="rounded-xl p-3 space-y-2.5"
        style={{
          background: task.isBlocked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${task.isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0 mt-0.5"
            style={{ color: '#334155' }}
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-200 leading-snug line-clamp-2">{task.title}</p>
            {projectMeta?.client_name && (
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">{projectMeta.client_name}</p>
            )}
          </div>
          {task.isBlocked && <Lock size={11} style={{ color: '#ef4444', flexShrink: 0 }} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {/* Avatar */}
          {member ? (
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
              title={member.name}
            >
              {member.initials ?? memberInitials(member.name)}
            </div>
          ) : (
            <div className="w-5 h-5" />
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Priority dot */}
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: pri.color }}
              title={`Prioridade ${pri.label}`}
            />

            {/* Deadline badge */}
            {deadline && (
              <div
                className="flex items-center gap-0.5 text-[10px] font-medium"
                style={{ color: deadline.color }}
              >
                {deadline.label.includes('atraso')
                  ? <AlertCircle size={9} />
                  : <Calendar size={9} />
                }
                {deadline.label}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Kanban column ── */
function KanbanColumn({
  column, tasks, projectMap, memberMap, onTaskClick,
}: {
  column: typeof COLUMNS[0]
  tasks: TaskWithRelations[]
  projectMap: Record<string, ProjectMeta>
  memberMap: Record<string, TeamMember>
  onTaskClick: (task: TaskWithRelations) => void
}) {
  const ids = useMemo(() => tasks.map(t => t.id), [tasks])

  return (
    <div
      className="flex flex-col rounded-2xl flex-shrink-0"
      style={{ width: 272, background: column.bg, border: `1px solid ${column.color}20` }}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${column.color}15` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold" style={{ color: column.color }}>{column.label}</span>
        </div>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${column.color}20`, color: column.color }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" style={{ minHeight: 80, maxHeight: 'calc(100vh - 260px)' }}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              projectMeta={task.project_id ? projectMap[task.project_id] : undefined}
              member={task.assignee_id ? memberMap[task.assignee_id] : undefined}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-slate-700">
            Sem tarefas
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Board ── */
interface Props {
  tasks: TaskWithRelations[]
  projectMap: Record<string, ProjectMeta>
  memberMap: Record<string, TeamMember>
  onTaskClick: (task: TaskWithRelations) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskKanbanBoard({ tasks, projectMap, memberMap, onTaskClick, onStatusChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask && overTask.status !== tasks.find(t => t.id === active.id)?.status) {
      onStatusChange(String(active.id), overTask.status)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={tasks.filter(t => t.status === col.status)}
            projectMap={projectMap}
            memberMap={memberMap}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DndContext>
  )
}
