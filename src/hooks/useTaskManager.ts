// src/hooks/useTaskManager.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskChecklist, TaskComment, TaskStatus } from '../lib/database.types'

// Bypass TS 5.9 + Supabase 2.98 strict-mode type inference for mutation ops.
// Runtime behavior is identical — supabase IS the same object, just retyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _db = supabase as unknown as { from(table: string): any }

/* ─── Types ──────────────────────────────────────── */
export interface TaskWithRelations extends Task {
  checklists: TaskChecklist[]
  comments: TaskComment[]
  // computed
  isBlocked: boolean
  liveSeconds: number  // seconds since current_timer_start (0 if not running)
}

export interface NewTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: Task['priority']
  project_id?: string | null
  client_id?: string | null
  assignee_id?: string | null
  deadline?: string | null
  estimated_hours?: number
  depends_on_id?: string | null
}

export interface UseTaskManagerResult {
  tasks: TaskWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
  addTask: (input: NewTaskInput) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  startTimer: (taskId: string) => Promise<void>
  stopTimer: (taskId: string) => Promise<void>
  toggleChecklist: (checklistId: string, taskId: string, isCompleted: boolean) => Promise<void>
  addComment: (taskId: string, body: string) => Promise<void>
}

/* ─── Helpers ────────────────────────────────────── */
/** Convert decimal hours to "Xh Ym" display string */
export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Compute live elapsed seconds from current_timer_start */
function liveSeconds(task: Task): number {
  if (!task.current_timer_start) return 0
  return Math.floor((Date.now() - new Date(task.current_timer_start).getTime()) / 1000)
}

/** Determine if a task is blocked by its dependency */
function computeIsBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.depends_on_id) return false
  const parent = allTasks.find(t => t.id === task.depends_on_id)
  if (!parent) return false
  return parent.status !== 'done'
}

/* ─── Hook ───────────────────────────────────────── */
export function useTaskManager(): UseTaskManagerResult {
  const [tasks, setTasks]   = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [tick, setTick]     = useState(0)
  const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  /* ── Load tasks + checklists + comments ── */
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [tasksRes, checkRes, commRes] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: true }),
          supabase.from('task_checklists').select('*').order('created_at', { ascending: true }),
          supabase.from('task_comments').select('*').order('created_at', { ascending: true }),
        ])

        if (tasksRes.error) throw tasksRes.error
        if (checkRes.error) throw checkRes.error
        if (commRes.error) throw commRes.error

        const rawTasks = (tasksRes.data ?? []) as Task[]
        const checks   = (checkRes.data ?? []) as TaskChecklist[]
        const comms    = (commRes.data ?? []) as TaskComment[]

        const enriched: TaskWithRelations[] = rawTasks.map(t => ({
          ...t,
          checklists: checks.filter(c => c.task_id === t.id),
          comments:   comms.filter(c => c.task_id === t.id),
          isBlocked:  computeIsBlocked(t, rawTasks),
          liveSeconds: liveSeconds(t),
        }))

        setTasks(enriched)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  /* ── Live timer ticker (updates liveSeconds every second) ── */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTasks(prev => prev.map(t => ({
        ...t,
        liveSeconds: liveSeconds(t),
      })))
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  /* ── CRUD ── */
  const addTask = useCallback(async (input: NewTaskInput) => {
    const { error: sbErr } = await _db.from('tasks').insert({
      title:               input.title,
      description:         input.description ?? null,
      status:              input.status ?? 'todo',
      priority:            input.priority ?? 'media',
      project_id:          input.project_id ?? null,
      client_id:           input.client_id ?? null,
      template_id:         null,
      assignee_id:         input.assignee_id ?? null,
      due_date:            null,
      deadline:            input.deadline ?? null,
      estimated_hours:     input.estimated_hours ?? 0,
      actual_hours:        0,
      current_timer_start: null,
      depends_on_id:       input.depends_on_id ?? null,
    })
    if (sbErr) throw sbErr
    refetch()
  }, [refetch])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    // Optimistic update
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t)
      if (updates.status === 'done') {
        return next.map(t =>
          t.depends_on_id === id && t.status === 'blocked'
            ? { ...t, status: 'todo' as TaskStatus }
            : t
        )
      }
      return next
    })

    const { error: sbErr } = await _db.from('tasks').update(updates).eq('id', id)
    if (sbErr) { console.error('[useTaskManager] updateTask error:', sbErr.message); refetch(); return }

    // Cascade DB update: unblock dependent tasks
    if (updates.status === 'done') {
      const { error: cascadeErr } = await _db
        .from('tasks')
        .update({ status: 'todo' })
        .eq('depends_on_id', id)
        .eq('status', 'blocked')
      if (cascadeErr) { console.error('[useTaskManager] cascade unblock error:', cascadeErr.message); refetch() }
    }
  }, [refetch])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error: sbErr } = await supabase.from('tasks').delete().eq('id', id)
    if (sbErr) { console.error('[useTaskManager] deleteTask error:', sbErr.message); refetch() }
  }, [refetch])

  /* ── Time Tracking ── */
  const startTimer = useCallback(async (taskId: string) => {
    const now = new Date().toISOString()
    await updateTask(taskId, { current_timer_start: now, status: 'in_progress' })
  }, [updateTask])

  const stopTimer = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task?.current_timer_start) return

    const start   = new Date(task.current_timer_start).getTime()
    const elapsed = (Date.now() - start) / 3_600_000  // to hours
    const newActual = parseFloat((task.actual_hours + elapsed).toFixed(4))

    await updateTask(taskId, {
      actual_hours:        newActual,
      current_timer_start: null,
    })
  }, [tasks, updateTask])

  /* ── Checklists ── */
  const toggleChecklist = useCallback(async (checklistId: string, taskId: string, isCompleted: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, checklists: t.checklists.map(c => c.id === checklistId ? { ...c, is_completed: isCompleted } : c) }
      : t
    ))
    await _db.from('task_checklists').update({ is_completed: isCompleted }).eq('id', checklistId)
  }, [])

  /* ── Comments ── */
  const addComment = useCallback(async (taskId: string, body: string) => {
    const { error: sbErr } = await _db.from('task_comments').insert({ task_id: taskId, body, author: 'Equipe' })
    if (sbErr) throw sbErr
    refetch()
  }, [refetch])

  return { tasks, loading, error, refetch, addTask, updateTask, deleteTask, startTimer, stopTimer, toggleChecklist, addComment }
}
