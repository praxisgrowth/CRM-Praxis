# Project Management & Onboarding Module — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a full task management system with time tracking, 5-column kanban, dependency-aware blocking, and 48-task onboarding seed data for "Google Ads Completo".

**Architecture:** Additive migration on existing `tasks` table (project_id→nullable, new columns added), new `project_templates` table with 48 seed rows, reformulated `Operations.tsx` with List/Kanban toggle, and a new `useTaskManager` hook handling time tracking logic.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, Supabase JS v2, @dnd-kit/core (already installed), lucide-react, existing Dark Neon/Glassmorphism design tokens in `src/index.css`.

---

## Task 1: Database Migration SQL

**Files:**
- Create: `supabase/project_management_migration.sql`

**Step 1: Create the migration file**

```sql
-- supabase/project_management_migration.sql
-- ═══════════════════════════════════════════════════════════
-- MIGRATION: Project Management & Onboarding Module
-- Strategy: Additive (backward-compatible)
-- ═══════════════════════════════════════════════════════════

-- 1. Make project_id nullable on tasks
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;

-- 2. Add new columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_id           uuid REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_id         uuid,
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS assignee_id         uuid REFERENCES team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deadline            timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_hours     numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours        numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_timer_start timestamptz,
  ADD COLUMN IF NOT EXISTS depends_on_id       uuid REFERENCES tasks(id) ON DELETE SET NULL;

-- 3. Migrate status values
UPDATE tasks SET status = CASE status
  WHEN 'pendente'     THEN 'todo'
  WHEN 'em_andamento' THEN 'in_progress'
  WHEN 'concluida'    THEN 'done'
  ELSE status
END
WHERE status IN ('pendente', 'em_andamento', 'concluida');

-- 4. Add 'urgente' to priority if using enum (if text column, skip)
-- (priority is text in this project — no action needed)

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: project_templates
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_templates (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type           text NOT NULL,
  task_number            int  NOT NULL,
  title                  text NOT NULL,
  type                   text NOT NULL,
  sla_days               int  NOT NULL DEFAULT 1,
  depends_on_task_number int,
  depends_on_id          uuid REFERENCES project_templates(id) ON DELETE SET NULL,
  created_at             timestamptz DEFAULT now(),
  UNIQUE (service_type, task_number)
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_checklists
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_checklists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_comments
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  body       text NOT NULL,
  author     text NOT NULL DEFAULT 'Equipe',
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- NEW TABLE: task_attachments
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_attachments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       text NOT NULL,
  url        text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**Step 2: Run in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → paste the content above → Run.
Verify: no errors, tables `project_templates`, `task_checklists`, `task_comments`, `task_attachments` appear in Table Editor.

**Step 3: Commit**

```bash
git add supabase/project_management_migration.sql
git commit -m "feat(db): additive migration for project management module"
```

---

## Task 2: Seed Data — 48 project_templates

**Files:**
- Create: `supabase/project_templates_seed.sql`

**Step 1: Create seed file with all 48 tasks**

```sql
-- supabase/project_templates_seed.sql
-- Google Ads Completo — 48 tasks (literal names from spec)
-- Step 1: Insert all rows (no depends_on_id yet)

INSERT INTO project_templates (service_type, task_number, title, type, sla_days, depends_on_task_number) VALUES
('Google Ads Completo',  1, 'Salvar contrato assinado na pasta',                        'Implementação',      1, NULL),
('Google Ads Completo',  2, 'Trocar foto do WhatsApp e sistema',                         'Implementação',      1, NULL),
('Google Ads Completo',  3, 'Inserir Cliente na planilha de vendas offline',              'Implementação',      1, 1),
('Google Ads Completo',  4, 'Agendar reunião de onboarding',                             'Implementação',      1, NULL),
('Google Ads Completo',  5, 'Briefing recebido?',                                        'Implementação',      2, NULL),
('Google Ads Completo',  6, 'Fazer pasta do cliente',                                    'Implementação',      1, NULL),
('Google Ads Completo',  7, 'Salvar briefing na pasta',                                  'Implementação',      1, 5),
('Google Ads Completo',  8, 'Recebimento de fotos',                                      'Implementação',      4, NULL),
('Google Ads Completo',  9, 'Salvar fotos na pasta',                                     'Implementação',      1, 8),
('Google Ads Completo', 10, 'Fazer onboarding com o cliente',                            'Implementação',      4, 4),
('Google Ads Completo', 11, 'Preencher ficha do cliente',                                'Implementação',      1, 10),
('Google Ads Completo', 12, 'Enviar para aprovação resumo onboarding',                   'Implementação',      1, 10),
('Google Ads Completo', 13, 'Enviar Treinamento Vendas',                                 'Implementação',      1, 5),
('Google Ads Completo', 14, 'Comprar domínio na registro br',                            'Implementação',      1, NULL),
('Google Ads Completo', 15, 'Comprar hospedagem da Hostgator',                           'Implementação',      1, NULL),
('Google Ads Completo', 16, 'Inserir compra do cliente no arquivo Compras HostGator',    'Implementação',      2, 15),
('Google Ads Completo', 17, 'Colocar senha da hospedagem na ficha',                      'Implementação',      1, 16),
('Google Ads Completo', 18, 'Avisar Vitor e cliente sobre a hospedagem e prazo de 7 dias','Implementação',     1, 16),
('Google Ads Completo', 19, 'Verificar modelos de site',                                 'Implementação',      1, 14),
('Google Ads Completo', 20, 'Abrir a conta do Google ADS',                               'Implementação',      3, 5),
('Google Ads Completo', 21, 'Colocar a conta dentro do MCC',                             'Implementação',      3, 10),
('Google Ads Completo', 22, 'Verificar se tem campanha antiga rodando e pausar',          'Implementação',      3, 10),
('Google Ads Completo', 23, 'Colocar saldo na conta para aquecer',                       'Implementação',      3, 10),
('Google Ads Completo', 24, 'Fazer verificação do anunciante',                           'Implementação',      3, 10),
('Google Ads Completo', 25, 'Criar e/ou otimizar GMN',                                   'Google Meu Negócio', 5, 5),
('Google Ads Completo', 26, 'Passar a propriedade GMN',                                  'Google Meu Negócio',15, 25),
('Google Ads Completo', 27, 'Acessar a hospedagem e configurar domínio',                 'Site',               2, 16),
('Google Ads Completo', 28, 'Fazer verificação da hospedagem',                           'Site',               2, 16),
('Google Ads Completo', 29, 'Instalar WordPress',                                        'Site',               1, 27),
('Google Ads Completo', 30, 'Adicionar login e senha na ficha do cliente',               'Site',               1, 29),
('Google Ads Completo', 31, 'Construção Landing Page',                                   'Site',               5, 29),
('Google Ads Completo', 32, 'Enviar pra correção',                                       'Site',               1, 31),
('Google Ads Completo', 33, 'Aprovação do cliente',                                      'Site',               5, 32),
('Google Ads Completo', 34, 'Enviar Formulário de Satisfação do Cliente',                'Site',               1, 33),
('Google Ads Completo', 35, 'Instalar na hospedagem',                                    'Site',               1, 33),
('Google Ads Completo', 36, 'Duplicar a página com foto de família/logo na capa.',       'Site',               0, 33),
('Google Ads Completo', 37, 'Avisar na implementação',                                   'Site',               1, 33),
('Google Ads Completo', 38, 'Avisar o cliente que vai começar a programação da campanha','Gestão de Tráfego',  1, 37),
('Google Ads Completo', 39, 'Abrir conta no TAG Manager',                                'Traqueamento',       1, 37),
('Google Ads Completo', 40, 'Instalar TAGs',                                             'Traqueamento',       1, 39),
('Google Ads Completo', 41, 'Checar pela segunda vez com o cliente as informações',      'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 42, 'Verificar se a foto do WhatsApp está correta',              'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 43, 'Verificar todos os botões do WhatsApp',                     'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 44, 'Criar campanha',                                            'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 45, 'Criar lista de exclusão',                                   'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 46, 'Criar recursos na campanha',                                'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 47, 'Avisar para o cliente que a campanha está ativa',           'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 48, 'Remover notificações do cliente',                           'Gestão de Tráfego',  1, 44)
ON CONFLICT (service_type, task_number) DO NOTHING;

-- Step 2: Resolve depends_on_id via self-join
UPDATE project_templates t
SET depends_on_id = d.id
FROM project_templates d
WHERE t.depends_on_task_number IS NOT NULL
  AND d.service_type = t.service_type
  AND d.task_number  = t.depends_on_task_number;
```

**Step 2: Run in Supabase SQL Editor**

Paste and run. Verify: `SELECT COUNT(*) FROM project_templates;` → returns 48.
Verify deps: `SELECT task_number, depends_on_task_number, depends_on_id FROM project_templates WHERE depends_on_task_number IS NOT NULL LIMIT 5;` → `depends_on_id` should be non-null.

**Step 3: Commit**

```bash
git add supabase/project_templates_seed.sql
git commit -m "feat(db): seed 48 project_templates for Google Ads Completo"
```

---

## Task 3: TypeScript Types Update

**Files:**
- Modify: `src/lib/database.types.ts`

**Step 1: Update TaskStatus, Priority, Task interface, and add new interfaces**

Replace the existing `TaskStatus`, `Task`, and `Priority` definitions and add new ones. Find and replace these exact blocks:

**Find** (line ~172):
```typescript
export type ProjectStatus = 'ativo' | 'pausado' | 'concluido' | 'atrasado'
export type TaskStatus    = 'pendente' | 'em_andamento' | 'concluida'

export interface Project {
  id: string
  name: string
  client_name: string
  status: ProjectStatus
  service_type: string | null
  sla_percent: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  status: TaskStatus
  priority: Priority
  due_date: string | null
  created_at: string
  updated_at: string
}
```

**Replace with:**
```typescript
export type ProjectStatus = 'ativo' | 'pausado' | 'concluido' | 'atrasado'
export type TaskStatus    = 'todo' | 'in_progress' | 'waiting_client' | 'done' | 'blocked'
export type Priority      = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Project {
  id: string
  name: string
  client_name: string
  status: ProjectStatus
  service_type: string | null
  sla_percent: number
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string | null
  client_id: string | null
  template_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assignee_id: string | null
  due_date: string | null
  deadline: string | null
  estimated_hours: number
  actual_hours: number
  current_timer_start: string | null
  depends_on_id: string | null
  created_at: string
  updated_at: string
}

export interface ProjectTemplate {
  id: string
  service_type: string
  task_number: number
  title: string
  type: string
  sla_days: number
  depends_on_task_number: number | null
  depends_on_id: string | null
  created_at: string
}

export interface TaskChecklist {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  body: string
  author: string
  created_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  name: string
  url: string
  created_at: string
}
```

**Step 2: Add new tables to the Database interface**

Inside `Database.public.Tables`, add after the `tasks` entry:
```typescript
      project_templates: {
        Row: ProjectTemplate
        Insert: Omit<ProjectTemplate, 'id' | 'created_at'>
        Update: Partial<Omit<ProjectTemplate, 'id' | 'created_at'>>
      }
      task_checklists: {
        Row: TaskChecklist
        Insert: Omit<TaskChecklist, 'id' | 'created_at'>
        Update: Partial<Omit<TaskChecklist, 'id' | 'created_at'>>
      }
      task_comments: {
        Row: TaskComment
        Insert: Omit<TaskComment, 'id' | 'created_at'>
        Update: Partial<Omit<TaskComment, 'id' | 'created_at'>>
      }
      task_attachments: {
        Row: TaskAttachment
        Insert: Omit<TaskAttachment, 'id' | 'created_at'>
        Update: Partial<Omit<TaskAttachment, 'id' | 'created_at'>>
      }
```

Also update the `tasks` entry to match the new Task interface:
```typescript
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
```

**Step 3: Verify TypeScript compiles**

```bash
cd "C:\Users\gusta\Documents\Antigravity\CRM Praxis"
npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only about existing code using old status values (will fix in next tasks). Zero errors in `database.types.ts` itself.

**Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): update Task, add ProjectTemplate/Checklist/Comment types"
```

---

## Task 4: Hook `useTaskManager`

**Files:**
- Create: `src/hooks/useTaskManager.ts`
- The existing `useOperations.ts` stays intact for backward compat (Projects section still works).

**Step 1: Create the new hook**

```typescript
// src/hooks/useTaskManager.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Task, TaskChecklist, TaskComment, TaskStatus } from '../lib/database.types'

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
    const { error: sbErr } = await supabase.from('tasks').insert({
      title:           input.title,
      description:     input.description ?? null,
      status:          input.status ?? 'todo',
      priority:        input.priority ?? 'media',
      project_id:      input.project_id ?? null,
      client_id:       input.client_id ?? null,
      assignee_id:     input.assignee_id ?? null,
      deadline:        input.deadline ?? null,
      estimated_hours: input.estimated_hours ?? 0,
      depends_on_id:   input.depends_on_id ?? null,
      actual_hours:    0,
    } as any)
    if (sbErr) throw sbErr
    refetch()
  }, [refetch])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error: sbErr } = await supabase.from('tasks').update(updates as any).eq('id', id)
    if (sbErr) { console.error('[useTaskManager] updateTask error:', sbErr.message); refetch() }
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
    await supabase.from('task_checklists').update({ is_completed: isCompleted }).eq('id', checklistId)
  }, [])

  /* ── Comments ── */
  const addComment = useCallback(async (taskId: string, body: string) => {
    const { error: sbErr } = await supabase.from('task_comments').insert({ task_id: taskId, body, author: 'Equipe' })
    if (sbErr) throw sbErr
    refetch()
  }, [refetch])

  return { tasks, loading, error, refetch, addTask, updateTask, deleteTask, startTimer, stopTimer, toggleChecklist, addComment }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep useTaskManager
```

Expected: no errors in `useTaskManager.ts`.

**Step 3: Commit**

```bash
git add src/hooks/useTaskManager.ts
git commit -m "feat(hook): add useTaskManager with time tracking and dependency logic"
```

---

## Task 5: Component `TaskFilters`

**Files:**
- Create: `src/components/operations/TaskFilters.tsx`

**Step 1: Create the component**

```tsx
// src/components/operations/TaskFilters.tsx
import type { TaskStatus } from '../../lib/database.types'
import type { TeamMember } from '../../lib/database.types'

export interface TaskFilterState {
  status: TaskStatus | 'todos'
  assigneeId: string | 'todos'
  clientId: string | 'todos'
  deadlineFilter: 'todos' | 'today' | 'week' | 'overdue'
}

interface Props {
  filters: TaskFilterState
  onChange: (f: TaskFilterState) => void
  teamMembers: TeamMember[]
}

const STATUS_OPTIONS: { value: TaskStatus | 'todos'; label: string; color: string }[] = [
  { value: 'todos',          label: 'Todos',             color: '#94a3b8' },
  { value: 'todo',           label: 'A Fazer',           color: '#64748b' },
  { value: 'in_progress',    label: 'Em Andamento',      color: '#00d2ff' },
  { value: 'waiting_client', label: 'Aguardando Cliente',color: '#f59e0b' },
  { value: 'done',           label: 'Concluído',         color: '#10b981' },
  { value: 'blocked',        label: 'Bloqueado',         color: '#ef4444' },
]

const DEADLINE_OPTIONS = [
  { value: 'todos',   label: 'Todos' },
  { value: 'today',   label: 'Hoje' },
  { value: 'week',    label: 'Esta Semana' },
  { value: 'overdue', label: 'Atrasados' },
]

export function TaskFilters({ filters, onChange, teamMembers }: Props) {
  function set<K extends keyof TaskFilterState>(key: K, val: TaskFilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  const selectStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    outline: 'none',
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status chips */}
      {STATUS_OPTIONS.map(opt => {
        const active = filters.status === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => set('status', opt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: active ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? opt.color + '50' : 'rgba(255,255,255,0.06)'}`,
              color: active ? opt.color : '#64748b',
            }}
          >
            {opt.label}
          </button>
        )
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Deadline filter */}
      <select
        style={selectStyle}
        value={filters.deadlineFilter}
        onChange={e => set('deadlineFilter', e.target.value as TaskFilterState['deadlineFilter'])}
      >
        {DEADLINE_OPTIONS.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0d1117' }}>{o.label}</option>
        ))}
      </select>

      {/* Assignee filter */}
      {teamMembers.length > 0 && (
        <select
          style={selectStyle}
          value={filters.assigneeId}
          onChange={e => set('assigneeId', e.target.value)}
        >
          <option value="todos" style={{ background: '#0d1117' }}>Todos os responsáveis</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id} style={{ background: '#0d1117' }}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/operations/TaskFilters.tsx
git commit -m "feat(ui): add TaskFilters component"
```

---

## Task 6: Component `TaskItemRow` (with Play/Stop)

**Files:**
- Create: `src/components/operations/TaskItemRow.tsx`

**Step 1: Create the component**

```tsx
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
        <AlertCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} title="Aguardando conclusão de tarefa anterior" />
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep TaskItemRow
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/operations/TaskItemRow.tsx
git commit -m "feat(ui): add TaskItemRow with Play/Stop time tracking"
```

---

## Task 7: Component `TaskDetailDrawer`

**Files:**
- Create: `src/components/operations/TaskDetailDrawer.tsx`

**Step 1: Create the component**

```tsx
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
```

**Step 2: Commit**

```bash
git add src/components/operations/TaskDetailDrawer.tsx
git commit -m "feat(ui): add TaskDetailDrawer with time tracking widget and comments"
```

---

## Task 8: Component `TaskKanbanBoard`

**Files:**
- Create: `src/components/operations/TaskKanbanBoard.tsx`

**Step 1: Create the Kanban with @dnd-kit**

```tsx
// src/components/operations/TaskKanbanBoard.tsx
import { useMemo } from 'react'
import {
  DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
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
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -i kanban
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/operations/TaskKanbanBoard.tsx
git commit -m "feat(ui): add TaskKanbanBoard with 5 columns and DnD"
```

---

## Task 9: Reformulate `Operations.tsx`

**Files:**
- Modify: `src/pages/Operations.tsx`

**Step 1: Full replacement of Operations.tsx**

Replace the entire file content with:

```tsx
// src/pages/Operations.tsx
import { useState, useMemo } from 'react'
import { Plus, AlertCircle, RefreshCw, List, LayoutGrid, Briefcase, Edit2, X } from 'lucide-react'
import { useAudit }          from '../hooks/useAudit'
import { useOperations }     from '../hooks/useOperations'
import { useTaskManager }    from '../hooks/useTaskManager'
import { NewProjectModal }   from '../components/operations/NewProjectModal'
import { TaskFilters }       from '../components/operations/TaskFilters'
import { TaskItemRow }       from '../components/operations/TaskItemRow'
import { TaskKanbanBoard }   from '../components/operations/TaskKanbanBoard'
import { TaskDetailDrawer }  from '../components/operations/TaskDetailDrawer'
import type { ProjectWithTasks } from '../hooks/useOperations'
import type { TaskWithRelations } from '../hooks/useTaskManager'
import type { ProjectStatus, TaskStatus } from '../lib/database.types'
import type { TaskFilterState } from '../components/operations/TaskFilters'

/* ─── Project cards section (kept for backward compat) ── */
type StatusFilter = ProjectStatus | 'todos'
const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#10b981' },
  pausado:   { label: 'Pausado',   color: '#f59e0b' },
  concluido: { label: 'Concluído', color: '#6366f1' },
  atrasado:  { label: 'Atrasado',  color: '#ef4444' },
}
function slaColor(pct: number) { return pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444' }
function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}
function formatDue(iso: string | null) {
  if (!iso) return { label: '—', urgent: false, overdue: false }
  const due = new Date(iso); const now = new Date()
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
  return { label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), urgent: days <= 7 && days >= 0, overdue: days < 0 }
}

function applyTaskFilters(tasks: TaskWithRelations[], filters: TaskFilterState): TaskWithRelations[] {
  return tasks.filter(t => {
    if (filters.status !== 'todos' && t.status !== filters.status) return false
    if (filters.assigneeId !== 'todos' && t.assignee_id !== filters.assigneeId) return false
    if (filters.deadlineFilter !== 'todos') {
      const now = new Date(); const dl = t.deadline ? new Date(t.deadline) : null
      if (filters.deadlineFilter === 'overdue') {
        if (!dl || dl >= now) return false
      } else if (filters.deadlineFilter === 'today') {
        if (!dl) return false
        const today = now.toDateString()
        if (dl.toDateString() !== today) return false
      } else if (filters.deadlineFilter === 'week') {
        if (!dl) return false
        const week = new Date(now); week.setDate(week.getDate() + 7)
        if (dl > week || dl < now) return false
      }
    }
    return true
  })
}

/* ─── Tab type ── */
type Tab = 'projetos' | 'tarefas'
type ViewMode = 'lista' | 'kanban'

/* ─── Page ── */
export function OperationsPage() {
  const { projects, loading: projLoading, error: projError, refetch: refetchProj, addProject, updateProject, deleteProject } = useOperations()
  const { tasks, loading: taskLoading, error: taskError, refetch: refetchTask, updateTask, startTimer, stopTimer, toggleChecklist, addComment } = useTaskManager()
  const { logAction } = useAudit()

  const [tab, setTab]                 = useState<Tab>('tarefas')
  const [viewMode, setViewMode]       = useState<ViewMode>('lista')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithTasks | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [taskFilters, setTaskFilters] = useState<TaskFilterState>({
    status: 'todos', assigneeId: 'todos', clientId: 'todos', deadlineFilter: 'todos',
  })

  const filteredProjects = useMemo(() =>
    statusFilter === 'todos' ? projects : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter]
  )
  const filteredTasks = useMemo(() => applyTaskFilters(tasks, taskFilters), [tasks, taskFilters])

  // Sync selectedTask with live data
  const liveSelectedTask = selectedTask ? (tasks.find(t => t.id === selectedTask.id) ?? selectedTask) : null

  const TAB_BTN = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
      style={
        tab === t
          ? { background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)', color: '#00d2ff' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }
      }
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Operação</h2>
          <p className="text-sm text-slate-500 mt-1">Projetos, tarefas e time tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'tarefas' && (
            <>
              <button
                onClick={() => setViewMode('lista')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'lista' ? { background: 'rgba(0,210,255,0.12)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'kanban' ? { background: 'rgba(0,210,255,0.12)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <LayoutGrid size={15} />
              </button>
            </>
          )}
          {tab === 'projetos' && (
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
            >
              <Plus size={15} /> Novo Projeto
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {TAB_BTN('tarefas', 'Tarefas')}
        {TAB_BTN('projetos', 'Projetos')}
      </div>

      {/* Error banners */}
      {(tab === 'tarefas' ? taskError : projError) && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} /> {tab === 'tarefas' ? taskError : projError}
          </span>
          <button onClick={tab === 'tarefas' ? refetchTask : refetchProj}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {tab === 'tarefas' && (
        <>
          <TaskFilters filters={taskFilters} onChange={setTaskFilters} teamMembers={[]} />

          <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
            {taskLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : viewMode === 'lista' ? (
              <div className="space-y-1.5">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <Briefcase size={36} className="text-slate-800" />
                    <p className="text-slate-500 text-sm">Nenhuma tarefa encontrada.</p>
                  </div>
                ) : filteredTasks.map(task => (
                  <TaskItemRow
                    key={task.id}
                    task={task}
                    onPlay={() => startTimer(task.id)}
                    onStop={() => stopTimer(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            ) : (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskClick={setSelectedTask}
                onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus as TaskStatus })}
              />
            )}
          </div>
        </>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projetos' && (
        <>
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {(['todos', 'ativo', 'pausado', 'atrasado', 'concluido'] as (StatusFilter)[]).map(id => {
              const cfg = id === 'todos' ? { label: 'Todos', color: '#94a3b8' } : { label: STATUS_CONFIG[id as ProjectStatus].label, color: STATUS_CONFIG[id as ProjectStatus].color }
              const active = statusFilter === id
              return (
                <button key={id} onClick={() => setStatusFilter(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: active ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? cfg.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? cfg.color : '#64748b',
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
            {projLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Briefcase size={36} className="text-slate-800" />
                <p className="text-slate-500 text-sm">Nenhum projeto neste status.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map(project => {
                  const status = STATUS_CONFIG[project.status]
                  const sColor = slaColor(project.sla_percent)
                  const due = formatDue(project.due_date)
                  return (
                    <div key={project.id}
                      className="glass rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:border-white/10 group"
                      style={{ borderColor: `${status.color}20` }}
                    >
                      <div className="px-5 pt-5 pb-4 flex flex-col gap-3 relative">
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingProject(project)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={async () => {
                            if (confirm(`Excluir projeto "${project.name}"?`)) {
                              await deleteProject(project.id)
                              await logAction('Delete Project', 'project', project.id, { name: project.name })
                            }
                          }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all">
                            <X size={13} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: `${status.color}20`, color: status.color }}>
                              {initials(project.client_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-500 leading-none mb-0.5 truncate">{project.client_name}</p>
                              <p className="text-sm font-semibold text-white leading-tight truncate">{project.name}</p>
                            </div>
                          </div>
                          <span className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ background: `${status.color}18`, color: status.color, border: `1px solid ${status.color}35` }}>
                            {status.label}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-600 font-medium">SLA de Entrega</span>
                            <span className="text-[11px] font-bold tabular-nums" style={{ color: sColor }}>{project.sla_percent}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${project.sla_percent}%`, background: sColor }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]"
                            style={{ color: due.overdue ? '#ef4444' : due.urgent ? '#f59e0b' : '#475569' }}>
                            {due.overdue ? 'Vencido · ' : due.urgent ? 'Vence em breve · ' : 'Entrega: '}
                            <span className="font-semibold">{due.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals / Drawers */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSave={async (data) => {
            await addProject(data)
            await logAction('Create Project', 'project', 'new', data as unknown as Record<string, unknown>)
          }}
        />
      )}
      {editingProject && (
        <NewProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async (data) => {
            await updateProject(editingProject.id, data)
            await logAction('Update Project', 'project', editingProject.id, data as unknown as Record<string, unknown>)
            setEditingProject(null)
          }}
        />
      )}
      {liveSelectedTask && (
        <TaskDetailDrawer
          task={liveSelectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={status => updateTask(liveSelectedTask.id, { status })}
          onToggleChecklist={(checklistId, isCompleted) => toggleChecklist(checklistId, liveSelectedTask.id, isCompleted)}
          onAddComment={body => addComment(liveSelectedTask.id, body)}
          onPlay={() => startTimer(liveSelectedTask.id)}
          onStop={() => stopTimer(liveSelectedTask.id)}
        />
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors. If there are minor type errors from the `any` casts in `useOperations.ts`, they are pre-existing and OK.

**Step 3: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173/operacao` in browser. Verify:
- [ ] Tabs "Tarefas" / "Projetos" appear and switch correctly
- [ ] Lista/Kanban toggle visible on Tarefas tab
- [ ] Kanban shows 5 columns (A Fazer, Em Andamento, Aguardando Cliente, Concluído, Bloqueado)
- [ ] Clicking a task row opens the DetailDrawer
- [ ] Play button appears on hover in Lista view
- [ ] Blocked tasks show lock icon and reduced opacity

**Step 4: Commit**

```bash
git add src/pages/Operations.tsx
git commit -m "feat(ui): reformulate Operations page with List/Kanban, task management and time tracking"
```

---

## Task 10: Final Integration Verification

**Step 1: TypeScript full check**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors (or only pre-existing errors from other modules, not from files added in this plan).

**Step 2: Manual QA checklist**

Open `http://localhost:5173/operacao`:

**Lista view:**
- [ ] Tasks load from Supabase
- [ ] Status filter chips work (A Fazer, Em Andamento, etc.)
- [ ] Clicking Play on a task updates status to `in_progress` and shows live timer
- [ ] Clicking Stop on a running task saves `actual_hours` and clears timer
- [ ] Blocked tasks (depends_on_id pointing to non-done task) show lock + opacity 50%
- [ ] Clicking a task row opens TaskDetailDrawer

**Kanban view:**
- [ ] 5 columns visible with correct colors
- [ ] Tasks appear in correct column based on status
- [ ] Dragging a card changes its status (verify in DB)

**TaskDetailDrawer:**
- [ ] Time Tracking widget shows Estimado vs Realizado
- [ ] Progress bar fills correctly
- [ ] Play/Stop works from drawer too
- [ ] Comment input sends and appears in feed
- [ ] Status buttons update the task status

**Projetos tab:**
- [ ] Existing projects still display as cards
- [ ] CRUD (create/edit/delete) still works

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Project Management & Onboarding module (Task 10 — QA pass)"
```

---

## Summary of Files Changed

| Action | File |
|--------|------|
| Create | `supabase/project_management_migration.sql` |
| Create | `supabase/project_templates_seed.sql` |
| Modify | `src/lib/database.types.ts` |
| Create | `src/hooks/useTaskManager.ts` |
| Create | `src/components/operations/TaskFilters.tsx` |
| Create | `src/components/operations/TaskItemRow.tsx` |
| Create | `src/components/operations/TaskDetailDrawer.tsx` |
| Create | `src/components/operations/TaskKanbanBoard.tsx` |
| Modify | `src/pages/Operations.tsx` |
