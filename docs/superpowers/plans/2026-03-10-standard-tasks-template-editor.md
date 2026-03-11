# Standard Tasks Template Editor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/settings/templates` para gerenciar as `project_templates` com lista reordenável (drag-and-drop) e painel de edição glassmorphism.

**Architecture:** Hook `useTemplates` encapsula todo CRUD + reorder. Página `StandardTasks.tsx` divide em duas colunas: `TemplateList` (DnD sortable) à esquerda e `TemplateEditor` (glassmorphism) à direita. Rota adicionada no App.tsx com guard ADMIN; GearMenu em Operations.tsx passa a navegar para a nova rota.

**Tech Stack:** React, TypeScript, Supabase, @dnd-kit/core + @dnd-kit/sortable, lucide-react, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-10-standard-tasks-template-editor-design.md`

---

## Chunk 1: Hook `useTemplates`

### Task 1: Criar `src/hooks/useTemplates.ts`

**Files:**
- Create: `src/hooks/useTemplates.ts`

O hook segue o mesmo padrão de `useSectors.ts` e `useOperations.ts`. Usa o cast `db` para contornar a tipagem estrita do Supabase client (padrão já estabelecido no projeto).

- [ ] **Criar o arquivo `src/hooks/useTemplates.ts`** com o seguinte conteúdo:

```typescript
// src/hooks/useTemplates.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase as _supabase } from '../lib/supabase'
import type { ProjectTemplate } from '../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

export type NewTemplateInput = Omit<ProjectTemplate, 'id' | 'created_at'>

export interface UseTemplatesResult {
  templates: ProjectTemplate[]
  loading: boolean
  error: string | null
  saving: boolean
  refetch: () => void
  addTemplate: (data: NewTemplateInput) => Promise<void>
  updateTemplate: (id: string, data: Partial<NewTemplateInput>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  reorder: (ordered: ProjectTemplate[]) => Promise<void>
}

export function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [tick, setTick]           = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    db.from('project_templates')
      .select('*')
      .order('task_number', { ascending: true })
      .then(({ data, error: err }: { data: ProjectTemplate[] | null; error: any }) => {
        if (err) setError(err.message)
        else { setTemplates(data ?? []); setError(null) }
        setLoading(false)
      })
  }, [tick])

  const addTemplate = useCallback(async (data: NewTemplateInput) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').insert(data)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const updateTemplate = useCallback(async (id: string, data: Partial<NewTemplateInput>) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').update(data).eq('id', id)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  const deleteTemplate = useCallback(async (id: string) => {
    setSaving(true)
    try {
      const { error: err } = await db.from('project_templates').delete().eq('id', id)
      if (err) throw new Error(err.message)
      refetch()
    } finally {
      setSaving(false)
    }
  }, [refetch])

  /**
   * Reorder: recalculate task_number (1..N) for all templates and batch-update.
   * Uses optimistic local state update; on error reverts to previous order.
   */
  const reorder = useCallback(async (ordered: ProjectTemplate[]) => {
    const previous = templates
    // Optimistic update
    setTemplates(ordered.map((t, i) => ({ ...t, task_number: i + 1 })))
    setSaving(true)

    try {
      await Promise.all(
        ordered.map((t, i) =>
          db.from('project_templates')
            .update({ task_number: i + 1 })
            .eq('id', t.id)
        )
      )
    } catch (e: any) {
      // Revert on failure
      setTemplates(previous)
      setError(e.message ?? 'Erro ao reordenar')
    } finally {
      setSaving(false)
    }
  }, [templates])

  return { templates, loading, error, saving, refetch, addTemplate, updateTemplate, deleteTemplate, reorder }
}
```

- [ ] **Verificar build:** `npm run build` — deve passar sem erros de TypeScript.

- [ ] **Commit:**
```bash
git add src/hooks/useTemplates.ts
git commit -m "feat(templates): hook useTemplates com CRUD e reorder"
```

---

## Chunk 2: Página `StandardTasks.tsx`

### Task 2: Criar `src/pages/settings/StandardTasks.tsx`

**Files:**
- Create: `src/pages/settings/StandardTasks.tsx`

A página é dividida em três partes co-localizadas no mesmo arquivo (padrão já usado em `Operations.tsx` com `GearMenu` interno):
1. `SortableRow` — item arrastável do DnD
2. `TemplateEditor` — painel de edição glassmorphism
3. `StandardTasksPage` — componente principal exportado

Padrão DnD: seguir exatamente o que está em `TaskKanbanBoard.tsx` (PointerSensor, useSortable, CSS.Transform).

- [ ] **Criar `src/pages/settings/StandardTasks.tsx`** com o seguinte conteúdo:

```typescript
// src/pages/settings/StandardTasks.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Plus, Loader2, Trash2, Save, X, AlertCircle, RefreshCw,
} from 'lucide-react'
import { useTemplates } from '../../hooks/useTemplates'
import { useSectors } from '../../hooks/useSectors'
import type { ProjectTemplate } from '../../lib/database.types'

/* ─── Sector badge colors ──────────────────────── */
const SECTOR_COLORS: Record<string, string> = {
  'Implementação':      '#6366f1',
  'Google Meu Negócio': '#f59e0b',
  'Site':               '#10b981',
  'Traqueamento':       '#00d2ff',
  'Gestão de Tráfego':  '#a855f7',
  'Financeiro':         '#ef4444',
  'Vendas':             '#ec4899',
  'Supervisão':         '#64748b',
}
function sectorColor(type: string) { return SECTOR_COLORS[type] ?? '#475569' }

/* ─── SortableRow ──────────────────────────────── */
function SortableRow({
  template, selected, onClick,
}: {
  template: ProjectTemplate
  selected: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: template.id })

  const color = sectorColor(template.type)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: selected
          ? 'rgba(99,102,241,0.1)'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${selected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        cursor: 'pointer',
        marginBottom: 4,
        // NOTE: use only the useSortable `transition` here — do NOT add a second
        // `transition` key (duplicate keys are silently overwritten in JS objects,
        // which would break the DnD drag animation). Hover color changes are
        // handled by the className below.
      }}
      className="transition-colors duration-150"
      onClick={onClick}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{ color: '#374151', cursor: 'grab', flexShrink: 0, lineHeight: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </span>

      {/* Number */}
      <span style={{ color: '#475569', fontSize: 11, fontWeight: 600, minWidth: 24, flexShrink: 0 }}>
        {template.task_number}
      </span>

      {/* Title */}
      <span style={{ color: '#e2e8f0', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {template.title}
      </span>

      {/* Sector badge */}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 5,
        background: `${color}18`,
        color,
        border: `1px solid ${color}35`,
        flexShrink: 0,
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {template.type}
      </span>
    </div>
  )
}

/* ─── TemplateEditor ───────────────────────────── */
function TemplateEditor({
  template,
  allTemplates,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  template: ProjectTemplate | null
  allTemplates: ProjectTemplate[]
  onClose: () => void
  onSave: (id: string, data: Partial<ProjectTemplate>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  saving: boolean
}) {
  const sectors = useSectors()
  const [title, setTitle]               = useState(template?.title ?? '')
  const [slaDays, setSlaDays]           = useState(String(template?.sla_days ?? 0))
  const [type, setType]                 = useState(template?.type ?? '')
  const [dependsOn, setDependsOn]       = useState(String(template?.depends_on_task_number ?? ''))
  const [localSaving, setLocalSaving]   = useState(false)
  const [err, setErr]                   = useState<string | null>(null)

  // Re-sync fields whenever the selected template changes (keyed on template.id)
  useEffect(() => {
    setTitle(template?.title ?? '')
    setSlaDays(String(template?.sla_days ?? 0))
    setType(template?.type ?? '')
    setDependsOn(String(template?.depends_on_task_number ?? ''))
    setErr(null)
  }, [template?.id])

  if (!template) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#374151',
        fontSize: 13,
        flexDirection: 'column',
        gap: 8,
      }}>
        <Plus size={28} />
        <span>Selecione uma tarefa para editar</span>
      </div>
    )
  }

  const isDirty =
    title !== template.title ||
    slaDays !== String(template.sla_days) ||
    type !== template.type ||
    dependsOn !== String(template.depends_on_task_number ?? '')

  async function handleSave() {
    if (!title.trim()) { setErr('Título é obrigatório'); return }
    setLocalSaving(true)
    setErr(null)
    try {
      await onSave(template.id, {
        title: title.trim(),
        sla_days: parseInt(slaDays) || 0,
        type,
        depends_on_task_number: dependsOn ? parseInt(dependsOn) : null,
      })
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar')
    } finally {
      setLocalSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${template.title}"?`)) return
    setLocalSaving(true)
    try {
      await onDelete(template.id)
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao excluir')
      setLocalSaving(false)
    }
  }

  const isBusy = localSaving || saving

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    outline: 'none',
    padding: '9px 11px',
    fontSize: 13,
    width: '100%',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: 5,
  }

  const sectorNames = sectors.length > 0
    ? sectors.map(s => s.name)
    : Object.keys(SECTOR_COLORS)

  return (
    <div style={{
      width: 320,
      flexShrink: 0,
      background: 'rgba(13,20,34,0.95)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 14,
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
          Tarefa #{template.task_number}
        </span>
        <button
          onClick={onClose}
          style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '14px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {err && (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            padding: '8px 10px',
            color: '#f87171',
            fontSize: 12,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}>
            <AlertCircle size={12} /> {err}
          </div>
        )}

        {/* Title */}
        <div>
          <label style={labelStyle}>Título *</label>
          <input
            style={inputStyle}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Briefing recebido?"
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* SLA days */}
        <div>
          <label style={labelStyle}>Prazo (dias úteis)</label>
          <input
            type="number"
            min={0}
            style={{ ...inputStyle, colorScheme: 'dark' }}
            value={slaDays}
            onChange={e => setSlaDays(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.4)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Sector */}
        <div>
          <label style={labelStyle}>Setor</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="" style={{ background: '#0d1422' }}>— Sem setor —</option>
            {sectorNames.map(s => (
              <option key={s} value={s} style={{ background: '#0d1422' }}>{s}</option>
            ))}
          </select>
        </div>

        {/* Depends on */}
        <div>
          <label style={labelStyle}>Depende da tarefa #</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={dependsOn}
            onChange={e => setDependsOn(e.target.value)}
          >
            <option value="" style={{ background: '#0d1422' }}>— Independente —</option>
            {allTemplates
              .filter(t => t.id !== template.id)
              .map(t => (
                <option key={t.id} value={String(t.task_number)} style={{ background: '#0d1422' }}>
                  #{t.task_number} · {t.title.slice(0, 35)}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 8,
      }}>
        <button
          onClick={handleSave}
          disabled={isBusy || !isDirty}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: isBusy || !isDirty ? 'not-allowed' : 'pointer',
            background: isBusy || !isDirty
              ? 'rgba(99,102,241,0.15)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: isBusy || !isDirty ? '#6366f180' : '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isBusy ? 'Salvando…' : 'Salvar'}
        </button>

        <button
          onClick={handleDelete}
          disabled={isBusy}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.25)',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            background: 'rgba(239,68,68,0.06)',
            color: '#ef4444',
            lineHeight: 0,
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────── */
export function StandardTasksPage() {
  const { templates, loading, error, saving, refetch, addTemplate, updateTemplate, deleteTemplate, reorder } =
    useTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = templates.find(t => t.id === selectedId) ?? null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = templates.findIndex(t => t.id === active.id)
    const newIndex  = templates.findIndex(t => t.id === over.id)
    const reordered = arrayMove(templates, oldIndex, newIndex)
    reorder(reordered)
  }

  async function handleNew() {
    const nextNumber = (templates[templates.length - 1]?.task_number ?? 0) + 1
    await addTemplate({
      task_number: nextNumber,
      title: 'Nova tarefa',
      type: '',
      service_type: '',
      sla_days: 1,
      depends_on_task_number: null,
      depends_on_id: null,
    })
  }

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Tarefas Padrão</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Templates lançados ao criar projetos · {templates.length} tarefas
            {saving && (
              <span style={{ color: '#00d2ff', marginLeft: 8 }} className="inline-flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" /> Salvando…
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleNew}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={14} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm flex-shrink-0 mb-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Body */}
      <div className="flex gap-4 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Left: list */}
        <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Plus size={28} className="text-slate-800" />
              <p className="text-slate-600 text-sm">Nenhum template. Clique em "Nova Tarefa".</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {templates.map(t => (
                  <SortableRow
                    key={t.id}
                    template={t}
                    selected={selectedId === t.id}
                    onClick={() => setSelectedId(id => id === t.id ? null : t.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right: editor */}
        <TemplateEditor
          template={selected}
          allTemplates={templates}
          onClose={() => setSelectedId(null)}
          onSave={updateTemplate}
          onDelete={deleteTemplate}
          saving={saving}
        />
      </div>
    </div>
  )
}
```

- [ ] **Verificar build:** `npm run build` — sem erros de TypeScript.

- [ ] **Commit:**
```bash
git add src/pages/settings/StandardTasks.tsx
git commit -m "feat(templates): página StandardTasks com lista DnD e editor glassmorphism"
```

---

## Chunk 3: Wiring — Rota, Sidebar e GearMenu

### Task 3: Adicionar rota em `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Adicionar import** no topo de `App.tsx` (junto com os outros imports de settings):

```typescript
import { StandardTasksPage } from './pages/settings/StandardTasks'
```

- [ ] **Adicionar rota** dentro de `<Route path="settings">` (após a rota `deliverables`):

```tsx
<Route path="templates" element={
  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
    <StandardTasksPage />
  </ProtectedRoute>
} />
```

- [ ] **Verificar build:** `npm run build`

- [ ] **Commit:**
```bash
git add src/App.tsx
git commit -m "feat(templates): adiciona rota /settings/templates"
```

---

### Task 4: Adicionar entrada na Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Localizar** o array `NAV_ITEMS` em `Sidebar.tsx` e encontrar o objeto com `label: 'Configurações'`.

- [ ] **Adicionar** `{ label: 'Tarefas Padrão', to: '/settings/templates' }` nos filhos de Configurações:

```typescript
// Antes (children de Configurações):
children: [
  { label: 'Geral',         to: '/settings' },
  { label: 'Equipe',        to: '/settings/team' },
  { label: 'Setores',       to: '/settings/sectors' },
  { label: 'Deliverables',  to: '/settings/deliverables' },
],

// Depois:
children: [
  { label: 'Geral',           to: '/settings' },
  { label: 'Equipe',          to: '/settings/team' },
  { label: 'Setores',         to: '/settings/sectors' },
  { label: 'Deliverables',    to: '/settings/deliverables' },
  { label: 'Tarefas Padrão',  to: '/settings/templates' },
],
```

- [ ] **Verificar build:** `npm run build`

- [ ] **Commit:**
```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(templates): adiciona 'Tarefas Padrão' na sidebar em Configurações"
```

---

### Task 5: Atualizar GearMenu em `Operations.tsx`

**Files:**
- Modify: `src/pages/Operations.tsx`

- [ ] **Adicionar import** de `useNavigate` em `Operations.tsx`. Atenção: `react-router-dom` ainda **não está importado** neste arquivo — esta é uma linha nova no topo, não uma extensão de import existente:

```typescript
// Adicionar como nova linha de import no topo de Operations.tsx:
import { useNavigate } from 'react-router-dom'
```

- [ ] **Adicionar hook** no início de `GearMenu`:

```typescript
function GearMenu({ onBatchLaunch }: { onBatchLaunch: () => void }) {
  const navigate = useNavigate()   // ← adicionar esta linha
  const [open, setOpen] = useState(false)
  // ...
```

- [ ] **Trocar `alert`** pelo navigate no botão "Editar Tarefas Padrão":

```typescript
// Antes:
onClick={() => { setOpen(false); alert('Em breve: Editar Tarefas Padrão') }}

// Depois:
onClick={() => { setOpen(false); navigate('/settings/templates') }}
```

- [ ] **Verificar build:** `npm run build`

- [ ] **Commit:**
```bash
git add src/pages/Operations.tsx
git commit -m "feat(templates): GearMenu navega para /settings/templates"
```

---

## Chunk 4: Verificação Final

### Task 7: Build e smoke test manual

- [ ] **Rodar build final:** `npm run build` — deve completar sem warnings de TS.

- [ ] **Iniciar dev server:** `npm run dev`

- [ ] **Smoke test** (checar manualmente):
  1. Login como ADMIN → Sidebar > Configurações > "Tarefas Padrão" visível
  2. Navegar para `/settings/templates` → lista carrega com os templates do banco
  3. Arrastar uma tarefa → `task_number` atualiza + badge "Salvando…" aparece
  4. Clicar em uma tarefa → painel direito abre com campos preenchidos
  5. Editar título e salvar → lista atualiza
  6. Clicar em outra tarefa → campos do editor mudam
  7. Operação > Tarefas > Engrenagem > "Editar Tarefas Padrão" → navega para `/settings/templates`
  8. Login como MEMBER → "Tarefas Padrão" não aparece na sidebar (ADMIN only)

- [ ] **Commit final se necessário** e criar entry no MEMORY.md.
