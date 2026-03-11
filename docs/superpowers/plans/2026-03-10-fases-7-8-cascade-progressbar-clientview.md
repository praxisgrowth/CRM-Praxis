# Fases 7 & 8 — Cascade Dependencies, Progress Bar & Ver como Cliente

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three independent improvements: (1) cascade task unblocking when a dependency is marked done, (2) a client-scoped progress bar in NexusPortal, (3) a "Ver como Cliente" button in ClientDetail.

**Architecture:** Three isolated file-level changes with no shared state. Each task modifies exactly one file. No new files needed.

**Tech Stack:** React + TypeScript + Vite + Supabase (`supabase as unknown as { from(t:string): any }` cast pattern) + lucide-react

---

## Chunk 1: Cascade Dependencies

### Task 1: Cascade unblock in `useTaskManager`

**Files:**
- Modify: `src/hooks/useTaskManager.ts:152-156`

Context: `updateTask` currently does an optimistic state update + a DB update. We need to extend it so that when `updates.status === 'done'`, it also sets all tasks whose `depends_on_id === id` to `status: 'todo'` — both in local state (optimistic) and in the DB.

The `_db` cast is already defined at the top of the file:
```ts
const _db = supabase as unknown as { from(table: string): any }
```

Supabase never throws — it returns `{ error }`. Always check the error manually.

- [ ] **Step 1: Replace `updateTask` with the cascade-aware version**

Replace the existing `updateTask` (lines 152–156):

```ts
const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
  // Optimistic: update target task
  setTasks(prev => {
    const next = prev.map(t => t.id === id ? { ...t, ...updates } : t)
    // Cascade: if marking done, unblock dependents
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

  // Cascade DB update: unblock dependents
  if (updates.status === 'done') {
    const { error: cascadeErr } = await _db
      .from('tasks')
      .update({ status: 'todo' })
      .eq('depends_on_id', id)
      .eq('status', 'blocked')
    if (cascadeErr) { console.error('[useTaskManager] cascade unblock error:', cascadeErr.message); refetch() }
  }
}, [refetch])
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: Exit code 0, no TypeScript errors.

- [ ] **Step 3: Manual browser verification**

1. Open the Operations / Tasks view.
2. Find a task that is `blocked` (depends on another task).
3. Mark the parent task as `done`.
4. Confirm the previously-blocked task now shows `todo` status immediately (optimistic) and still shows `todo` after a page refresh (DB persisted).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTaskManager.ts
git commit -m "feat(tasks): cascade unblock dependents when parent task is marked done"
```

---

## Chunk 2: Progress Bar in NexusPortal

### Task 2: Load client tasks and render progress bar

**Files:**
- Modify: `src/pages/NexusPortal.tsx`

Context: `NexusPortal` already loads `clients` and `nexus_files` for a `client_id`. We need to also load `tasks` for that client and render a gradient progress bar inside the welcome banner.

The `tasks` table has `client_id` (UUID FK) and `status` (one of: `'todo' | 'in_progress' | 'blocked' | 'done'`).

The supabase client in this file is imported as `supabase` from `'../lib/supabase'`. The file already uses `(supabase as any)` for some calls.

Progress bar design:
- Background track: `rgba(255,255,255,0.06)`, `border-radius: 6px`, height `6px`
- Fill: `linear-gradient(90deg, #00d2ff, #a855f7)`, width = `${pct}%`
- Only render if `totalTasks > 0`
- Label: `"X de Y tarefas concluídas"` in `text-xs text-slate-400`

- [ ] **Step 1: Add task-loading state**

After the existing state declarations (around line 46), add:

```ts
const [tasksDone,  setTasksDone]  = useState(0)
const [tasksTotal, setTasksTotal] = useState(0)
```

- [ ] **Step 2: Extend the `load()` function to fetch tasks**

Inside the `load()` function, add a third Promise to the existing `Promise.all`:

```ts
const [clientRes, filesRes, tasksRes] = await Promise.all([
  (supabase as any).from('clients').select('name').eq('id', client_id!).maybeSingle(),
  supabase.from('nexus_files').select('*').eq('client_id', client_id!).order('created_at', { ascending: false }),
  (supabase as any).from('tasks').select('id, status').eq('client_id', client_id!),
])
```

Then, after the `setFiles(...)` call, add:

```ts
const allTasks = (tasksRes.data ?? []) as { id: string; status: string }[]
setTasksTotal(allTasks.length)
setTasksDone(allTasks.filter(t => t.status === 'done').length)
```

- [ ] **Step 3: Render the progress bar inside the welcome banner**

In the welcome banner `<div>` (around line 122), after the `<p>` description text, add:

```tsx
{tasksTotal > 0 && (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-slate-400">{tasksDone} de {tasksTotal} tarefas concluídas</span>
      <span className="text-xs font-bold" style={{ color: '#00d2ff' }}>
        {Math.round((tasksDone / tasksTotal) * 100)}%
      </span>
    </div>
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.round((tasksDone / tasksTotal) * 100)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00d2ff, #a855f7)',
          borderRadius: 6,
          transition: 'width 0.5s ease',
        }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: Exit code 0, no TypeScript errors.

- [ ] **Step 5: Manual browser verification**

1. Navigate to `/portal/<some-client-id>` that has tasks assigned to that client.
2. Confirm a gradient bar appears below the client name with correct count and percentage.
3. If no tasks exist for that client, confirm the bar is absent (not rendered).

- [ ] **Step 6: Commit**

```bash
git add src/pages/NexusPortal.tsx
git commit -m "feat(nexus): add task progress bar in client portal welcome banner"
```

---

## Chunk 3: "Ver como Cliente" Button

### Task 3: Add "Ver como Cliente" button in `ClientDetail`

**Files:**
- Modify: `src/pages/ClientDetail.tsx`

Context: The header action buttons are at lines ~418–434, inside the `view-mode` branch (`} else {`). Currently has "Gerar Acesso ao Portal" and "Editar Perfil". We add a third button before them that opens `/portal/<client.id>` in a new tab.

The `client` object is guaranteed non-null at this point (the component returns early if `!client`). Use `window.open(url, '_blank', 'noopener,noreferrer')`.

The `ExternalLink` icon from `lucide-react` is not yet imported — it must be added to the existing import.

- [ ] **Step 1: Add `ExternalLink` to the lucide-react import**

Find the existing import (top of file, around line 3):

```ts
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Clock,
  Loader2,
  DollarSign,
  User,
  FileText,
  Pencil,
  Check,
  X as CloseIcon,
  Hash,
  Globe,
  Lock,
  AlertCircle,
  KeyRound,
} from 'lucide-react'
```

Add `ExternalLink,` after `KeyRound,`.

- [ ] **Step 2: Add the "Ver como Cliente" button**

Locate the view-mode buttons block (line ~418):

```tsx
<>
  <button
    onClick={() => setPortalModal(true)}
    ...
  >
    <Globe size={14} />
    Gerar Acesso ao Portal
  </button>
  <button
    onClick={() => setEditMode(true)}
    ...
  >
    <Pencil size={14} />
    Editar Perfil
  </button>
</>
```

Add a new button **before** "Gerar Acesso ao Portal":

```tsx
<button
  onClick={() => window.open(`/portal/${client.id}`, '_blank', 'noopener,noreferrer')}
  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-90"
  style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.12), rgba(168,85,247,0.12))', border: '1px solid rgba(0,210,255,0.25)', color: '#7dd3fc' }}
>
  <ExternalLink size={14} />
  Ver como Cliente
</button>
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: Exit code 0, no TypeScript errors.

- [ ] **Step 4: Manual browser verification**

1. Open a client's detail page.
2. Confirm "Ver como Cliente" button is visible in the header (neon-blue/purple tint).
3. Click it — a new tab opens at `/portal/<that-client-id>`.
4. Confirm the portal loads correctly for that client.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ClientDetail.tsx
git commit -m "feat(clients): add 'Ver como Cliente' button linking to Nexus portal"
```

---

## Final Verification

- [ ] Run `npm run build` one last time to confirm all three changes compile cleanly together.
- [ ] Update `task.md`: mark `[x]` for Fase 7 cascade item, Fase 8 progress bar, and Nexus "Ver como Cliente".
