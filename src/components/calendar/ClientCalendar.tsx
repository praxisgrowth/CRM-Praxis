// src/components/calendar/ClientCalendar.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarGrid } from './CalendarGrid'
import { useCalendarTasks } from '../../hooks/useCalendarTasks'
import { STATUS_CONFIG } from '../../lib/nexus-utils'
import type { TaskWithEditorialLine } from '../../hooks/useCalendarTasks'

interface Props {
  clientId: string
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function ClientCalendar({ clientId }: Props) {
  const { tasksByDay, loading, currentMonth, goToPrev, goToNext } =
    useCalendarTasks({ clientId })

  const [detail, setDetail] = useState<TaskWithEditorialLine | null>(null)

  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`

  function handleTaskClick(task: TaskWithEditorialLine) {
    const firstFile = task.nexus_files?.[0]
    if (firstFile?.url) {
      // Task has a deliverable with a URL — open it directly
      window.open(firstFile.url, '_blank', 'noopener,noreferrer')
    } else {
      // No file yet — show detail panel
      setDetail(prev => prev?.id === task.id ? null : task)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={goToPrev}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-white min-w-[160px] text-center">{monthLabel}</span>
        <button
          onClick={goToNext}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl h-64" style={{ background: 'rgba(255,255,255,0.03)' }} />
      ) : (
        <CalendarGrid
          tasks={tasksByDay}
          month={currentMonth}
          mode="client"
          onTaskClick={handleTaskClick}
        />
      )}

      {/* Detail panel (shown for planned tasks without a file) */}
      <AnimatePresence>
        {detail && (
          <motion.div
            key={detail.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl p-3 flex items-center justify-between gap-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{detail.title}</p>
              {detail.editorial_line && (
                <p className="text-[10px] mt-0.5" style={{ color: detail.editorial_line.color }}>
                  {detail.editorial_line.name}
                </p>
              )}
              {detail.publish_date && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(detail.publish_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {detail.nexus_files && detail.nexus_files.length > 0 ? (
                <>
                  {(() => {
                    const nf   = detail.nexus_files![0]
                    const sCfg = STATUS_CONFIG[nf.status]
                    return (
                      <>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold"
                          style={{ background: sCfg.bg, color: sCfg.color }}
                        >
                          {sCfg.label}
                        </span>
                        {nf.url && (
                          <a
                            href={nf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </>
                    )
                  })()}
                </>
              ) : (
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-semibold"
                  style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px dashed rgba(99,102,241,0.3)' }}
                >
                  Planejado
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
