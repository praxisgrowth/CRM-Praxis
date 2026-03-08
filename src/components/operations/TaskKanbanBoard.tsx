// src/components/operations/TaskKanbanBoard.tsx
import { useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lock, GripVertical } from 'lucide-react'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import type { TaskStatus } from '../../lib/database.types'

const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'todo',           label: 'A Fazer',           color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
  { status: 'in_progress',    label: 'Em Andamento',      color: '#00d2ff', bg: 'rgba(0,210,255,0.06)'   },
  { status: 'waiting_client', label: 'Aguardando Cliente',color: '#f59e0b', bg: 'rgba(245,158,11,0.06)'  },
  { status: 'done',           label: 'Concluído',         color: '#10b981', bg: 'rgba(16,185,129,0.06)'  },
  { status: 'blocked',        label: 'Bloqueado',         color: '#ef4444', bg: 'rgba(239,68,68,0.06)'   },
]

/* ─── Sortable card ── */
function KanbanCard({ task, onClick }: { task: TaskWithRelations; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : task.isBlocked ? 0.55 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl p-3 cursor-pointer transition-all duration-150 group"
      onClick={onClick}
      {...attributes}
    >
      <div
        className="rounded-xl p-3 space-y-2"
        style={{
          background: task.isBlocked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${task.isBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
        }}
      >
        <div className="flex items-start gap-2">
          <div
            {...listeners}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0 mt-0.5"
            style={{ color: '#334155' }}
          >
            <GripVertical size={14} />
          </div>
          <p className="text-sm text-slate-300 flex-1 leading-snug">{task.title}</p>
          {task.isBlocked && <Lock size={12} style={{ color: '#ef4444', flexShrink: 0 }} />}
        </div>
        {task.actual_hours > 0 && (
          <div className="text-[11px] text-slate-600">
            ⏱ {task.actual_hours.toFixed(1)}h
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Kanban column ── */
function KanbanColumn({
  column, tasks, onTaskClick,
}: {
  column: typeof COLUMNS[0]
  tasks: TaskWithRelations[]
  onTaskClick: (task: TaskWithRelations) => void
}) {
  const ids = useMemo(() => tasks.map(t => t.id), [tasks])

  return (
    <div
      className="flex flex-col rounded-2xl flex-shrink-0"
      style={{ width: 280, background: column.bg, border: `1px solid ${column.color}20` }}
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ minHeight: 80, maxHeight: 'calc(100vh - 260px)' }}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
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
  onTaskClick: (task: TaskWithRelations) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskKanbanBoard({ tasks, onTaskClick, onStatusChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Detect which column the card was dropped into
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask && overTask.status !== tasks.find(t => t.id === active.id)?.status) {
      onStatusChange(String(active.id), overTask.status)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            column={col}
            tasks={tasks.filter(t => t.status === col.status)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    </DndContext>
  )
}
