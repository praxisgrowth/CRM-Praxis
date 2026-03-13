// src/hooks/useCalendarTasks.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskStatus, Priority, EditorialLine } from '../lib/database.types'
import type { TaskWithRelations } from './useTaskManager'
import type { NexusFile } from './useNexus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(t: string): any }

export interface CalendarFilters {
  projectId?: string | null
  clientId?:  string | null
  status?:    TaskStatus | 'todos'
  priority?:  Priority   | 'todos'
}

// Full nexus file shape needed for the detail modal
export interface CalendarNexusFile extends NexusFile {
  task_id: string
}

export interface TaskWithEditorialLine extends TaskWithRelations {
  editorial_line?: EditorialLine | null
  nexus_files?:   CalendarNexusFile[]
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

export function useCalendarTasks(filters: CalendarFilters = {}, initialMonth?: Date) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(initialMonth ?? new Date()))
  const [tasks,   setTasks]   = useState<TaskWithEditorialLine[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = toISO(startOfMonth(currentMonth))
      const to   = toISO(endOfMonth(currentMonth))

      let query = db.from('tasks')
        .select('*, task_checklists(*), task_comments(*)')
        .gte('publish_date', from)
        .lte('publish_date', to)

      if (filters.projectId) query = query.eq('project_id', filters.projectId)
      if (filters.clientId)  query = query.eq('client_id',  filters.clientId)
      if (filters.status   && filters.status   !== 'todos') query = query.eq('status',   filters.status)
      if (filters.priority && filters.priority !== 'todos') query = query.eq('priority', filters.priority)

      const { data: taskData, error: taskErr } = await query
      if (taskErr) throw taskErr

      // Load editorial lines + nexus_files for enrichment (parallel)
      const rawTasks = (taskData ?? []) as any[]
      const taskIds  = rawTasks.map(t => t.id)

      const [lineRes, nexusRes] = await Promise.all([
        db.from('editorial_lines').select('*'),
        taskIds.length > 0
          ? db.from('nexus_files').select('*').in('task_id', taskIds)
          : Promise.resolve({ data: [] }),
      ])

      const lineMap: Record<string, EditorialLine> = Object.fromEntries(
        ((lineRes.data ?? []) as EditorialLine[]).map(l => [l.id, l])
      )
      // Group nexus files by task_id
      const nexusMap: Record<string, CalendarNexusFile[]> = {}
      for (const nf of (nexusRes.data ?? []) as any[]) {
        if (!nexusMap[nf.task_id]) nexusMap[nf.task_id] = []
        nexusMap[nf.task_id].push(nf)
      }

      // Compute isBlocked parity with useTaskManager
      const enriched: TaskWithEditorialLine[] = rawTasks.map(t => {
        const depParent = t.depends_on_id ? rawTasks.find((x: any) => x.id === t.depends_on_id) : null
        const isBlocked = depParent ? depParent.status !== 'done' : false
        const liveSeconds = t.current_timer_start
          ? Math.floor((Date.now() - new Date(t.current_timer_start).getTime()) / 1000)
          : 0
        return {
          ...t,
          checklists:     t.task_checklists  ?? [],
          comments:       t.task_comments    ?? [],
          isBlocked,
          liveSeconds,
          editorial_line: t.editorial_line_id ? lineMap[t.editorial_line_id] : null,
          nexus_files:    nexusMap[t.id]      ?? [],
        }
      })

      setTasks(enriched)
    } catch (err) {
      console.error('[useCalendarTasks] load:', err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, filters.projectId, filters.clientId, filters.status, filters.priority])

  useEffect(() => { load() }, [load])

  const goToPrev = useCallback(() =>
    setCurrentMonth(m => startOfMonth(new Date(m.getFullYear(), m.getMonth() - 1, 1))),
  [])
  const goToNext = useCallback(() =>
    setCurrentMonth(m => startOfMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1))),
  [])

  // Build a map: 'YYYY-MM-DD' → tasks
  const tasksByDay = useMemo(() => {
    const map: Record<string, TaskWithEditorialLine[]> = {}
    for (const t of tasks) {
      if (t.publish_date) {
        if (!map[t.publish_date]) map[t.publish_date] = []
        map[t.publish_date].push(t)
      }
    }
    return map
  }, [tasks])

  return { tasks, tasksByDay, loading, currentMonth, goToPrev, goToNext, refetch: load }
}
