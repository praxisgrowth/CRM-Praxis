# Editorial Calendar — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third calendar view to Operations tasks (monthly grid with batch creation) and a read-only client calendar in PortalNexus, both driven by `publish_date` + `editorial_line_id` fields on tasks.

**Architecture:** Shared `CalendarGrid` pure-UI component consumed by two wrappers (`EditorialCalendar` for internal Operations, `ClientCalendar` for PortalNexus). Data layer: new `editorial_lines` table + two columns on `tasks`. State for month navigation lives inside `useCalendarTasks`.

**Tech Stack:** React 18, TypeScript, Supabase, framer-motion (`AnimatePresence`/`motion.div`), lucide-react, Tailwind CSS, clsx.

---

## Chunk 1: Data Layer

### Task 1: SQL Migration

**Files:**
- Create: `supabase/editorial_calendar_migration.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/editorial_calendar_migration.sql

-- 1. New table for editorial lines (managed in Settings)
CREATE TABLE IF NOT EXISTS editorial_lines (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  ord   int  NOT NULL DEFAULT 0
);

-- 2. Add columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS publish_date       date,
  ADD COLUMN IF NOT EXISTS editorial_line_id  uuid
    REFERENCES editorial_lines(id) ON DELETE SET NULL;

-- 3. Seed default editorial lines
INSERT INTO editorial_lines (name, color, ord) VALUES
  ('Institucional', '#6366f1', 0),
  ('Educativo',     '#3b82f6', 1),
  ('Promocional',   '#f59e0b', 2),
  ('Engajamento',   '#10b981', 3)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Run migration in Supabase SQL editor (manual step)**

Open the Supabase dashboard → SQL editor → paste the file contents → Run.
Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name IN ('publish_date', 'editorial_line_id');` returns 2 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/editorial_calendar_migration.sql
git commit -m "feat(db): add editorial_lines table and publish_date/editorial_line_id to tasks"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/lib/database.types.ts` (Task interface, lines ~194–216)
- Modify: `src/hooks/useTaskManager.ts` (NewTaskInput + addTask insert object)

- [ ] **Step 1: Add EditorialLine interface and extend Task in `database.types.ts`**

After the `Priority` type line (~179), add:

```ts
export interface EditorialLine {
  id: string
  name: string
  color: string
  ord: number
}
```

Inside the `Task` interface, after the deliverable intent block (~213):

```ts
  // ─── Editorial Calendar (editorial_calendar_migration.sql) ───
  publish_date:       string | null   // ISO date 'YYYY-MM-DD'
  editorial_line_id:  string | null
  // ─────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Extend `NewTaskInput` in `useTaskManager.ts`**

After the deliverable intent block (~34):

```ts
  // ─── Editorial Calendar ──────────────────────────
  publish_date?:      string | null
  editorial_line_id?: string | null
  // ─────────────────────────────────────────────────
```

- [ ] **Step 3: Add the new fields to the `addTask` insert object in `useTaskManager.ts`**

After `deliverable_type: input.deliverable_type ?? null,` (~152):

```ts
      publish_date:        input.publish_date       ?? null,
      editorial_line_id:   input.editorial_line_id  ?? null,
```

- [ ] **Step 4: Verify build**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis" && npm run build 2>&1 | tail -20
```

Expected: no new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/database.types.ts src/hooks/useTaskManager.ts
git commit -m "feat(types): extend Task + NewTaskInput with editorial calendar fields"
```

---

### Task 3: useEditorialLines Hook

**Files:**
- Create: `src/hooks/useEditorialLines.ts`

- [ ] **Step 1: Create hook**

```ts
// src/hooks/useEditorialLines.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { EditorialLine } from '../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(t: string): any }

export function useEditorialLines() {
  const [lines,   setLines]   = useState<EditorialLine[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await db.from('editorial_lines').select('*').order('ord')
      if (error) throw error
      setLines((data ?? []) as EditorialLine[])
    } catch (err) {
      console.error('[useEditorialLines] load:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const addLine = useCallback(async (name: string, color: string) => {
    const maxOrd = lines.length ? Math.max(...lines.map(l => l.ord)) + 1 : 0
    const { error } = await db.from('editorial_lines').insert({ name, color, ord: maxOrd })
    if (error) throw new Error(error.message)
    load()
  }, [lines, load])

  const updateLine = useCallback(async (id: string, patch: Partial<Pick<EditorialLine, 'name' | 'color'>>) => {
    const { error } = await db.from('editorial_lines').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
    load()
  }, [load])

  const deleteLine = useCallback(async (id: string) => {
    const { error } = await db.from('editorial_lines').delete().eq('id', id)
    if (error) throw new Error(error.message)
    load()
  }, [load])

  const reorder = useCallback(async (orderedIds: string[]) => {
    // Update ord for each id based on its position in the array
    await Promise.all(
      orderedIds.map((id, idx) =>
        db.from('editorial_lines').update({ ord: idx }).eq('id', id)
      )
    )
    load()
  }, [load])

  return { lines, loading, addLine, updateLine, deleteLine, reorder, refetch: load }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEditorialLines.ts
git commit -m "feat(hooks): add useEditorialLines with CRUD"
```

---

### Task 4: useCalendarTasks Hook

**Files:**
- Create: `src/hooks/useCalendarTasks.ts`

- [ ] **Step 1: Create hook**

```ts
// src/hooks/useCalendarTasks.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus, Priority, EditorialLine } from '../lib/database.types'
import type { TaskWithRelations } from './useTaskManager'
import type { NexusFileStatus } from './useNexus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(t: string): any }

export interface CalendarFilters {
  projectId?: string | null
  clientId?:  string | null
  status?:    TaskStatus | 'todos'
  priority?:  Priority   | 'todos'
}

// Minimal nexus file shape needed for the client calendar
export interface CalendarNexusFile {
  id:     string
  url:    string | null
  status: NexusFileStatus
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
          ? db.from('nexus_files').select('id, url, status, task_id').in('task_id', taskIds)
          : Promise.resolve({ data: [] }),
      ])

      const lineMap: Record<string, EditorialLine> = Object.fromEntries(
        ((lineRes.data ?? []) as EditorialLine[]).map(l => [l.id, l])
      )
      // Group nexus files by task_id
      const nexusMap: Record<string, CalendarNexusFile[]> = {}
      for (const nf of (nexusRes.data ?? []) as any[]) {
        if (!nexusMap[nf.task_id]) nexusMap[nf.task_id] = []
        nexusMap[nf.task_id].push({ id: nf.id, url: nf.url, status: nf.status })
      }

      // Compute isBlocked parity with useTaskManager
      const enriched: TaskWithEditorialLine[] = rawTasks.map(t => {
        const depParent = t.depends_on_id ? rawTasks.find(x => x.id === t.depends_on_id) : null
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalendarTasks.ts
git commit -m "feat(hooks): add useCalendarTasks with month navigation and filter support"
```

---

## Chunk 2: CalendarGrid Component

### Task 5: CalendarGrid — Pure UI

**Files:**
- Create: `src/components/calendar/CalendarGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/calendar/CalendarGrid.tsx
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TaskWithEditorialLine } from '../../hooks/useCalendarTasks'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface CalendarGridProps {
  tasks:      Record<string, TaskWithEditorialLine[]>  // tasksByDay map
  month:      Date
  mode:       'editor' | 'client'
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

            const iso       = toISO(day)
            const isToday   = iso === TODAY_ISO
            const dayTasks  = tasks[iso] ?? []

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
                        background:    `${chipColor}${isPlanned ? '0d' : '18'}`,
                        border:        `1px ${isPlanned ? 'dashed' : 'solid'} ${chipColor}${isPlanned ? '55' : '35'}`,
                        color:         chipColor,
                        opacity:       isPlanned ? 0.7 : 1,
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/CalendarGrid.tsx
git commit -m "feat(calendar): add CalendarGrid pure UI component with framer-motion transitions"
```

---

## Chunk 3: Operations Calendar

### Task 6: BatchPlannerPanel

**Files:**
- Create: `src/components/calendar/BatchPlannerPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
// src/components/calendar/BatchPlannerPanel.tsx
import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Save, Loader2 } from 'lucide-react'
import type { NexusFileType } from '../../hooks/useNexus'
import type { EditorialLine } from '../../lib/database.types'
import type { NewTaskInput } from '../../hooks/useTaskManager'

interface DraftRow {
  id:                number
  title:             string
  editorial_line_id: string
  publish_date:      string
  deliverable_type:  NexusFileType | ''
}

interface Props {
  lines:       EditorialLine[]
  projectId?:  string | null
  clientId?:   string | null
  onSave:      (tasks: NewTaskInput[]) => Promise<void>
  onClose:     () => void
}

const TYPE_OPTIONS: { value: NexusFileType | ''; label: string }[] = [
  { value: '',          label: 'Sem tipo'   },
  { value: 'imagem',    label: 'Imagem'     },
  { value: 'copy',      label: 'Copy'       },
  { value: 'video',     label: 'Vídeo'      },
  { value: 'documento', label: 'Documento'  },
]

const inputCls = "bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all w-full"

let _id = 0
function newRow(date = ''): DraftRow {
  return { id: ++_id, title: '', editorial_line_id: '', publish_date: date, deliverable_type: '' }
}

export function BatchPlannerPanel({ lines, projectId, clientId, onSave, onClose }: Props) {
  const [rows,      setRows]      = useState<DraftRow[]>([newRow()])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Close on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addRow()    { setRows(r => [...r, newRow()]) }
  function removeRow(id: number) { setRows(r => r.filter(x => x.id !== id)) }
  function update(id: number, patch: Partial<DraftRow>) {
    setRows(r => r.map(x => x.id === id ? { ...x, ...patch } : x))
  }

  const handleSave = useCallback(async () => {
    const valid = rows.filter(r => r.title.trim() && r.publish_date)
    if (valid.length === 0) { setError('Adicione pelo menos uma linha com título e data.'); return }
    setSaving(true)
    setError(null)
    try {
      const inputs: NewTaskInput[] = valid.map(r => ({
        title:             r.title.trim(),
        status:            'todo',
        project_id:        projectId ?? null,
        client_id:         clientId  ?? null,
        publish_date:      r.publish_date,
        editorial_line_id: r.editorial_line_id || null,
        deliverable_type:  (r.deliverable_type as NexusFileType) || null,
      }))
      await onSave(inputs)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [rows, projectId, clientId, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl flex flex-col"
        style={{
          background: 'rgba(13,20,34,0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-sm font-bold text-white">Planejar Calendário</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Crie múltiplas tarefas de uma vez</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-[1fr_140px_120px_90px_28px] gap-2 px-5 pt-3 pb-1">
          {['Título', 'Linha Editorial', 'Data', 'Tipo', ''].map((l, i) => (
            <span key={i} className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{l}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 space-y-2 py-2">
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-[1fr_140px_120px_90px_28px] gap-2 items-center">
              <input
                value={row.title}
                onChange={e => update(row.id, { title: e.target.value })}
                placeholder="Título da tarefa"
                className={inputCls}
              />
              <select
                value={row.editorial_line_id}
                onChange={e => update(row.id, { editorial_line_id: e.target.value })}
                className={inputCls}
                style={{ cursor: 'pointer' }}
              >
                <option value="" style={{ background: '#0d1422' }}>— Linha —</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id} style={{ background: '#0d1422', color: l.color }}>{l.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={row.publish_date}
                onChange={e => update(row.id, { publish_date: e.target.value })}
                className={inputCls}
              />
              <select
                value={row.deliverable_type}
                onChange={e => update(row.id, { deliverable_type: e.target.value as NexusFileType | '' })}
                className={inputCls}
                style={{ cursor: 'pointer' }}
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ background: '#0d1422' }}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={() => removeRow(row.id)}
                className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {error && (
            <p className="text-[11px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', padding: '6px 10px', borderRadius: 8 }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Plus size={12} /> Adicionar linha
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {saving ? 'Salvando…' : 'Salvar Rascunhos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/BatchPlannerPanel.tsx
git commit -m "feat(calendar): add BatchPlannerPanel drawer for bulk task creation"
```

---

### Task 7: EditorialCalendar — Operations Wrapper

**Files:**
- Create: `src/components/calendar/EditorialCalendar.tsx`

- [ ] **Step 1: Create component**

```tsx
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
  filters?:   CalendarFilters
  projectId?: string | null
  clientId?:  string | null
  onDayClick: (date: Date) => void
  onTaskClick: (task: TaskWithEditorialLine) => void
  onBatchSave: (tasks: NewTaskInput[]) => Promise<void>
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/EditorialCalendar.tsx
git commit -m "feat(calendar): add EditorialCalendar wrapper for Operations with batch planner"
```

---

## Chunk 4: Client Calendar

### Task 8: ClientCalendar — PortalNexus Wrapper

**Files:**
- Create: `src/components/calendar/ClientCalendar.tsx`

- [ ] **Step 1: Create component**

```tsx
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
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
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
      // No file yet — show detail tooltip
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
                // Has nexus file — show status badge + external link
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
                // No file — planejado badge
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/ClientCalendar.tsx
git commit -m "feat(calendar): add ClientCalendar read-only wrapper for PortalNexus"
```

---

## Chunk 5: Integrations + Settings

### Task 9: Settings — EditorialLines Page

**Files:**
- Create: `src/pages/settings/EditorialLines.tsx`

- [ ] **Step 1: Create settings page**

```tsx
// src/pages/settings/EditorialLines.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { useEditorialLines } from '../../hooks/useEditorialLines'
import type { EditorialLine } from '../../lib/database.types'

const DEFAULT_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#f97316','#ec4899']

const inputCls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"

export function EditorialLinesPage() {
  const { lines, loading, addLine, updateLine, deleteLine } = useEditorialLines()

  const [adding, setAdding]     = useState(false)
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editPatch, setEditPatch] = useState<{ name: string; color: string }>({ name: '', color: '' })

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await addLine(newName.trim(), newColor)
      setNewName('')
      setNewColor(DEFAULT_COLORS[0])
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    try {
      await updateLine(id, editPatch)
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta linha editorial?')) return
    await deleteLine(id)
  }

  function startEdit(line: EditorialLine) {
    setEditId(line.id)
    setEditPatch({ name: line.name, color: line.color })
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Linhas Editoriais</h2>
          <p className="text-sm text-slate-500 mt-0.5">Categorias usadas no calendário editorial</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
          >
            <Plus size={14} /> Nova Linha
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map(line => (
            <div
              key={line.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {editId === line.id ? (
                <>
                  <input
                    type="color"
                    value={editPatch.color}
                    onChange={e => setEditPatch(p => ({ ...p, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={editPatch.name}
                    onChange={e => setEditPatch(p => ({ ...p, name: e.target.value }))}
                    className={`${inputCls} flex-1 py-1 text-sm`}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(line.id)} disabled={saving} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/10 transition-all">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: line.color }} />
                  <span className="text-sm text-white flex-1">{line.name}</span>
                  <button onClick={() => startEdit(line)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(line.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}

          {adding && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome da linha editorial"
                className={`${inputCls} flex-1 py-1 text-sm`}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              />
              <div className="flex gap-1">
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} disabled={saving || !newName.trim()} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/10 transition-all">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/EditorialLines.tsx
git commit -m "feat(settings): add EditorialLines CRUD page"
```

---

### Task 10: Wire App.tsx and Sidebar.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add import and route to `App.tsx`**

Add import after `StandardTasksPage` import (~line 18):

```ts
import { EditorialLinesPage } from './pages/settings/EditorialLines'
```

Inside the `settings` route block (after `<Route path="templates" ...>`):

```tsx
<Route path="editorial-lines" element={
  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/settings">
    <EditorialLinesPage />
  </ProtectedRoute>
} />
```

- [ ] **Step 2: Add Sidebar entry**

In `Sidebar.tsx`, find the children array for Settings (~line 85). After `{ label: 'Tarefas Padrão', to: '/settings/templates' }`, add:

```ts
{ label: 'Linhas Editoriais', to: '/settings/editorial-lines' },
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(settings): register editorial-lines route and sidebar entry"
```

---

### Task 11: Wire Operations.tsx — 3rd Toggle

**Files:**
- Modify: `src/pages/Operations.tsx`

- [ ] **Step 1: Add Calendar icon import**

In the lucide-react import block at the top, add `CalendarDays` to the existing list.

- [ ] **Step 2: Add EditorialCalendar import**

After the `TaskKanbanBoard` import:

```ts
import { EditorialCalendar } from '../components/calendar/EditorialCalendar'
import type { TaskWithEditorialLine } from '../hooks/useCalendarTasks'
```

- [ ] **Step 3: Change viewMode state type**

On line ~181, change:

```ts
const [viewMode, setViewMode] = useState<'lista' | 'kanban'>('lista')
```

to:

```ts
const [viewMode, setViewMode] = useState<'lista' | 'kanban' | 'calendario'>('lista')
```

- [ ] **Step 4: Add 3rd toggle button**

After the kanban toggle button (after the closing `</button>` for kanban, ~line 262), add:

```tsx
<button
  onClick={() => setViewMode('calendario')}
  className="p-2 rounded-lg transition-all"
  style={viewMode === 'calendario'
    ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
    : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
>
  <CalendarDays size={15} />
</button>
```

- [ ] **Step 5: Add calendar render branch**

In the content area, after the `viewMode === 'lista'` ternary and before the closing `</div>` of the content wrapper (~line 370), change the final ternary to add the calendar branch. The current structure is:

```tsx
} : viewMode === 'lista' ? (
  <OperationsTable ... />
) : (
  <TaskKanbanBoard ... />
)}
```

Change to:

```tsx
} : viewMode === 'lista' ? (
  <OperationsTable ... />
) : viewMode === 'kanban' ? (
  <TaskKanbanBoard ... />
) : (
  <EditorialCalendar
    filters={{
      projectId: taskFilters.assigneeId !== 'todos' ? undefined : undefined,
      status:    taskFilters.status !== 'todos' ? taskFilters.status : undefined,
    }}
    onDayClick={(date) => {
      // Pre-fill publish_date then open NewTaskModal
      // We store the selected date and pass to NewTaskModal
      setCalendarPrefilDate(date.toISOString().split('T')[0])
      setShowNewTask(true)
    }}
    onTaskClick={(task) => setSelectedTask(task)}
    onBatchSave={async (inputs) => {
      for (const input of inputs) await addTask(input)
      await refetchTask()
    }}
  />
)}
```

- [ ] **Step 6: Add calendarPrefillDate state and pass to NewTaskModal**

Add state near other modal states (~line 189):

```ts
const [calendarPrefillDate, setCalendarPrefillDate] = useState<string | null>(null)
```

Update `NewTaskModal` to pass the prefill date — add prop `prefillPublishDate` to `NewTaskModal` invocation:

```tsx
{showNewTask && (
  <NewTaskModal
    projects={projects.map(p => ({ id: p.id, name: p.name, client_name: p.client_name }))}
    teamMembers={teamMembers}
    prefillPublishDate={calendarPrefillDate}
    onClose={() => { setShowNewTask(false); setCalendarPrefillDate(null) }}
    onSave={async input => {
      await addTask(input)
      await logAction('Create Task', 'task', 'new', { title: input.title })
    }}
  />
)}
```

- [ ] **Step 7: Add `prefillPublishDate` prop to NewTaskModal**

In `src/components/operations/NewTaskModal.tsx`, add `prefillPublishDate?: string | null` to the Props interface, and inside the component initialize the publish_date form field with it if provided. Add a `publish_date` field to the form state:

```ts
const [publishDate, setPublishDate] = useState(prefillPublishDate ?? '')
```

Add it to the `onSave` call:

```ts
await onSave({ ...restOfInput, publish_date: publishDate || null })
```

Add a date input in the form body (e.g., after the deadline field):

```tsx
<div>
  <label className={labelClass}>Data de Publicação</label>
  <input
    type="date"
    value={publishDate}
    onChange={e => setPublishDate(e.target.value)}
    className={inputClass}
  />
</div>
```

- [ ] **Step 8: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build.

- [ ] **Step 9: Commit**

```bash
git add src/pages/Operations.tsx src/components/operations/NewTaskModal.tsx
git commit -m "feat(operations): add Calendário as 3rd view toggle with prefill date support"
```

---

### Task 12: Wire PortalNexus.tsx — Client Calendar Toggle

**Files:**
- Modify: `src/pages/PortalNexus.tsx`

- [ ] **Step 1: Add ClientCalendar import**

After the `NexusTimeline` import:

```ts
import { ClientCalendar } from '../components/calendar/ClientCalendar'
```

- [ ] **Step 2: Add aprovacaoView state**

After the `filter` state (~line 287):

```ts
const [aprovacaoView, setAprovacaoView] = useState<'grade' | 'calendario'>('grade')
```

- [ ] **Step 3: Get clientId for filtering**

After the `isClientView` line (~291), add:

```ts
// For CLIENT role, use their linked client_id; for ADMIN/MEMBER, no client filter
const calendarClientId = role === 'CLIENT' ? (profile?.client_id ?? null) : null
```

(Note: `profile.client_id` may not exist on the profile type — if it doesn't, use `null` for now as a safe fallback. Check the `Profile` type in `database.types.ts` and add `client_id?: string | null` if absent.)

- [ ] **Step 4: Add toggle in the Aprovações tab header**

In the `aprovacoes` tab content section (~line 416), find the stats strip or the filter bar and add the toggle. Locate where the `<Filter ...>` or filter bar starts and add a view toggle before it:

```tsx
{/* Grade/Calendar toggle */}
<div className="flex items-center gap-1 ml-auto">
  <button
    onClick={() => setAprovacaoView('grade')}
    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
    style={aprovacaoView === 'grade'
      ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
      : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    Grade
  </button>
  <button
    onClick={() => setAprovacaoView('calendario')}
    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
    style={aprovacaoView === 'calendario'
      ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
      : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.07)' }}
  >
    Calendário
  </button>
</div>
```

- [ ] **Step 5: Conditionally render ClientCalendar**

Inside the `aprovacoes` tab section, wrap the existing media grid in a condition and add the calendar branch:

```tsx
{aprovacaoView === 'calendario' ? (
  <ClientCalendar clientId={calendarClientId ?? ''} />
) : (
  /* existing media cards grid here */
)}
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: clean build. Zero new TypeScript errors.

- [ ] **Step 7: Final commit**

```bash
git add src/pages/PortalNexus.tsx
git commit -m "feat(nexus): add Grade/Calendário toggle in Aprovações tab"
```

---

## Final Verification

- [ ] `npm run build` — clean build, no TypeScript errors
- [ ] Operations → Tarefas → 3rd toggle "Calendário" visible and renders grid
- [ ] Click on day in calendar → NewTaskModal opens with date pre-filled
- [ ] "Planejar Calendário" button → BatchPlannerPanel opens, batch save creates tasks
- [ ] Month navigation prev/next works with slide animation
- [ ] PortalNexus → Aprovações → Grade/Calendário toggle works
- [ ] Settings → Linhas Editoriais → CRUD (create/edit/delete) works
- [ ] Tasks with `publish_date` appear on correct day cells
