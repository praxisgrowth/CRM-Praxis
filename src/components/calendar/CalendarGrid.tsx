// src/components/calendar/CalendarGrid.tsx
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TaskWithEditorialLine } from '../../hooks/useCalendarTasks'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface CalendarGridProps {
  tasks:       Record<string, TaskWithEditorialLine[]>  // tasksByDay map
  month:       Date
  mode:        'editor' | 'client'
  onDayClick?: (date: Date) => void
  onTaskClick?: (task: TaskWithEditorialLine) => void
}

function buildCalendarDays(month: Date): Array<Date | null> {
  const first   = new Date(month.getFullYear(), month.getMonth(), 1)
  const last    = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const leading = first.getDay() // 0=Sun
  const days: Array<Date | null> = []
  for (let i = 0; i < leading; i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), d))
  }
  // Pad to full weeks
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TODAY_ISO = toISO(new Date())

export function CalendarGrid({ tasks, month, mode, onDayClick, onTaskClick }: CalendarGridProps) {
  const days = useMemo(() => buildCalendarDays(month), [month])
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={monthKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0  }}
        exit={{    opacity: 0, x: -24 }}
        transition={{ duration: 0.18, ease: 'easeInOut' }}
      >
        {/* Weekday header */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} style={{ background: '#0d1422', minHeight: 80 }} />
            }

            const iso      = toISO(day)
            const isToday  = iso === TODAY_ISO
            const dayTasks = tasks[iso] ?? []

            return (
              <div
                key={iso}
                onClick={() => mode === 'editor' && onDayClick?.(day)}
                style={{
                  background: isToday ? 'rgba(99,102,241,0.08)' : 'rgba(13,20,34,0.98)',
                  border: isToday ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.04)',
                  minHeight: 80,
                  cursor: mode === 'editor' ? 'pointer' : 'default',
                  padding: '6px',
                }}
                className="flex flex-col gap-1 transition-colors hover:bg-white/[0.03]"
              >
                {/* Day number */}
                <span
                  className="text-[11px] font-semibold self-end"
                  style={{ color: isToday ? '#818cf8' : '#475569' }}
                >
                  {day.getDate()}
                </span>

                {/* Task chips */}
                {dayTasks.map(task => {
                  const chipColor = task.editorial_line?.color ?? '#6366f1'
                  // In client mode: distinguish planned (no nexus_file) vs. ready (has nexus_file)
                  const hasNexus  = mode === 'client' && (task.nexus_files?.length ?? 0) > 0
                  const isPlanned = mode === 'client' && !hasNexus
                  return (
                    <button
                      key={task.id}
                      onClick={e => { e.stopPropagation(); onTaskClick?.(task) }}
                      title={task.title}
                      className="w-full text-left truncate text-[10px] font-medium rounded px-1.5 py-0.5 transition-opacity hover:opacity-80"
                      style={{
                        background: `${chipColor}${isPlanned ? '0d' : '18'}`,
                        border:     `1px ${isPlanned ? 'dashed' : 'solid'} ${chipColor}${isPlanned ? '55' : '35'}`,
                        color:      chipColor,
                        opacity:    isPlanned ? 0.7 : 1,
                      }}
                    >
                      {task.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
