// src/components/calendar/EditorialCalendar.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { CalendarGrid } from './CalendarGrid'
import { BatchPlannerPanel } from './BatchPlannerPanel'
import { useCalendarTasks } from '../../hooks/useCalendarTasks'
import { useEditorialLines } from '../../hooks/useEditorialLines'
import type { CalendarFilters, TaskWithEditorialLine } from '../../hooks/useCalendarTasks'
import type { NewTaskInput } from '../../hooks/useTaskManager'

interface Props {
  filters?:    CalendarFilters
  projectId?:  string | null
  clientId?:   string | null
  onDayClick:  (date: Date) => void
  onTaskClick: (task: TaskWithEditorialLine) => void
  onBatchSave: (tasks: NewTaskInput[]) => Promise<void>
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function EditorialCalendar({ filters, projectId, clientId, onDayClick, onTaskClick, onBatchSave }: Props) {
  const { tasksByDay, loading, currentMonth, goToPrev, goToNext } = useCalendarTasks(filters)
  const { lines } = useEditorialLines()
  const [showBatch, setShowBatch] = useState(false)

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  return (
    <div className="flex flex-col gap-3">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-white min-w-[140px] text-center">{monthLabel}</span>
          <button
            onClick={goToNext}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <button
          onClick={() => setShowBatch(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#818cf8',
          }}
        >
          <CalendarDays size={13} /> Planejar Calendário
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="animate-pulse rounded-xl h-64" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : (
        <CalendarGrid
          tasks={tasksByDay}
          month={currentMonth}
          mode="editor"
          onDayClick={onDayClick}
          onTaskClick={onTaskClick}
        />
      )}

      {/* Batch planner */}
      {showBatch && (
        <BatchPlannerPanel
          lines={lines}
          projectId={projectId}
          clientId={clientId}
          onSave={onBatchSave}
          onClose={() => setShowBatch(false)}
        />
      )}
    </div>
  )
}
