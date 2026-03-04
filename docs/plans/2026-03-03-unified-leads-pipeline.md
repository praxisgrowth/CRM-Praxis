# Unified Leads + Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unificar Leads e Kanban para usar somente a tabela `leads`, corrigindo duplicação de dados e 5 bugs de UX.

**Architecture:** A tabela `leads` (após a migration SQL) já contém os campos de pipeline (`title`, `value`, `priority`, `company`, `tags`) e estágios unificados. `useLeads` ganha `moveLead`/`deleteLead`. `Pipeline.tsx` troca `usePipeline` por `useLeads`. `DealCard` aceita `Lead`. `Leads.tsx` filtra os fechados.

**Tech Stack:** React 18 · TypeScript · Supabase · dnd-kit · Tailwind CSS v4

**Prerequisite:** Executar `supabase/unified_leads_migration.sql` no Supabase Dashboard antes de testar.

---

## Task 1: Atualizar tipos em `database.types.ts`

**Files:**
- Modify: `src/lib/database.types.ts`

**Step 1: Atualizar `Lead['stage']` e adicionar campos pipeline**

Localizar a interface `Lead` (linha ~19) e substituir completamente:

```ts
export interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  stage: 'prospeccao' | 'reuniao' | 'proposta' | 'negociacao' | 'fechado'
  score: number
  source: string | null
  // ─── Pipeline fields (unified_leads_migration.sql) ─────────
  title:    string | null
  value:    number
  priority: Priority | null
  company:  string | null
  tags:     string[]
  // ──────────────────────────────────────────────────────────
  created_at: string
  updated_at: string
}
```

**Step 2: Tornar `PipelineStage` um alias de `Lead['stage']`**

Localizar `export type PipelineStage = ...` (linha ~3) e substituir:

```ts
export type PipelineStage = Lead['stage']
```

(Remove a definição inline antiga com `'prospeccao' | ...` — agora deriva de `Lead`.)

**Step 3: Verificar build**

```bash
cd "C:\Users\gusta\Documents\Antigravity\CRM Praxis" && npx tsc -b 2>&1
```

Esperado: zero erros (ou apenas erros em arquivos que ainda usam estágios antigos — isso será corrigido nas próximas tasks).

---

## Task 2: Estender `useLeads.ts` com `moveLead` e `deleteLead`

**Files:**
- Modify: `src/hooks/useLeads.ts`

**Step 1: Atualizar `NewLeadInput` com campos opcionais de pipeline**

Localizar o `interface NewLeadInput` e substituir:

```ts
export interface NewLeadInput {
  name:      string
  email:     string | null
  phone:     string | null
  stage:     Lead['stage']
  score:     number
  source:    string | null
  // Optional pipeline fields
  title?:    string | null
  company?:  string | null
  value?:    number
  priority?: Priority | null
  tags?:     string[]
}
```

**Step 2: Atualizar `UseLeadsResult`**

```ts
export interface UseLeadsResult {
  leads:      Lead[]
  loading:    boolean
  error:      string | null
  refetch:    () => void
  addLead:    (data: NewLeadInput) => Promise<void>
  moveLead:   (id: string, stage: Lead['stage']) => Promise<void>
  deleteLead: (id: string) => Promise<void>
}
```

**Step 3: Atualizar `FALLBACK_LEADS` com novos campos e estágios**

```ts
const FALLBACK_LEADS: Lead[] = [
  { id: '1', name: 'Construmax Engenharia', email: 'contato@construmax.com', phone: null, stage: 'proposta',    score: 94, source: 'LinkedIn',   title: null, value: 0, priority: null, company: null, tags: [], created_at: '2024-10-15T00:00:00Z', updated_at: '2024-10-15T00:00:00Z' },
  { id: '2', name: 'FinScale Ltda',         email: 'hello@finscale.io',      phone: null, stage: 'reuniao',    score: 88, source: 'Indicação',  title: null, value: 0, priority: null, company: null, tags: [], created_at: '2024-11-02T00:00:00Z', updated_at: '2024-11-02T00:00:00Z' },
  { id: '3', name: 'Agro Dinâmico',         email: 'adm@agrodinamico.com',   phone: null, stage: 'negociacao', score: 82, source: 'Evento',     title: null, value: 0, priority: null, company: null, tags: [], created_at: '2024-12-10T00:00:00Z', updated_at: '2024-12-10T00:00:00Z' },
  { id: '4', name: 'Medbyte Health',        email: 'tech@medbyte.com',       phone: null, stage: 'prospeccao', score: 71, source: 'Site',       title: null, value: 0, priority: null, company: null, tags: [], created_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
  { id: '5', name: 'LogiSmart',             email: 'ops@logismart.com',      phone: null, stage: 'proposta',   score: 67, source: 'LinkedIn',   title: null, value: 0, priority: null, company: null, tags: [], created_at: '2025-01-12T00:00:00Z', updated_at: '2025-01-12T00:00:00Z' },
  { id: '6', name: 'CityFin',               email: 'cfo@cityfin.com',        phone: null, stage: 'reuniao',    score: 59, source: 'Outbound',   title: null, value: 0, priority: null, company: null, tags: [], created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z' },
  { id: '7', name: 'Ecopack Brasil',        email: 'eco@ecopack.com',        phone: null, stage: 'prospeccao', score: 45, source: 'Site',       title: null, value: 0, priority: null, company: null, tags: [], created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: '8', name: 'Rápido Express',        email: 'ti@rapidoexpress.com',   phone: null, stage: 'prospeccao', score: 38, source: 'Cold Email', title: null, value: 0, priority: null, company: null, tags: [], created_at: '2025-02-10T00:00:00Z', updated_at: '2025-02-10T00:00:00Z' },
]
```

**Step 4: Adicionar `moveLead` e `deleteLead` dentro do hook**

Adicionar após o `addLead` callback e antes do `return`:

```ts
const moveLead = useCallback(async (id: string, stage: Lead['stage']) => {
  setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  const { error: err } = await (supabase as any)
    .from('leads')
    .update({ stage })
    .eq('id', id)
  if (err) {
    console.error('[moveLead]', err.message)
    fetchLeads()
  }
}, [fetchLeads])

const deleteLead = useCallback(async (id: string) => {
  setLeads(prev => prev.filter(l => l.id !== id))
  const { error: err } = await (supabase as any)
    .from('leads')
    .delete()
    .eq('id', id)
  if (err) {
    console.error('[deleteLead]', err.message)
    fetchLeads()
  }
}, [fetchLeads])
```

**Step 5: Atualizar o `return` do hook**

```ts
return { leads, loading, error, refetch: fetchLeads, addLead, moveLead, deleteLead }
```

**Step 6: Verificar build**

```bash
npx tsc -b 2>&1
```

Esperado: zero erros neste arquivo. Pode haver erros em arquivos que ainda usam `useLeads` com a interface antiga — serão corrigidos em tasks posteriores.

---

## Task 3: `NewLeadModal.tsx` — Stage dropdown

**Files:**
- Modify: `src/components/leads/NewLeadModal.tsx`

**Step 1: Atualizar array `STAGES` e default**

Substituir o array `STAGES` no topo do arquivo:

```ts
const STAGES: { value: Lead['stage']; label: string }[] = [
  { value: 'prospeccao', label: 'Prospecção' },
  { value: 'reuniao',    label: 'Reunião'    },
  { value: 'proposta',   label: 'Proposta'   },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado',    label: 'Fechado'    },
]
```

**Step 2: Atualizar default do form**

```ts
const [form, setForm] = useState<NewLeadInput>({
  name: '', email: null, phone: null,
  stage: 'prospeccao', score: 50, source: null,
})
```

**Step 3: Substituir botão-grid pelo select**

Localizar o bloco `<Field label="Estágio inicial">` e substituir todo o conteúdo:

```tsx
<Field label="Estágio inicial">
  <select
    className={FIELD}
    style={s('stage')}
    value={form.stage}
    onChange={e => set('stage', e.target.value as Lead['stage'])}
    onFocus={() => setFocus('stage')}
    onBlur={() => setFocus('')}
  >
    {STAGES.map(st => (
      <option key={st.value} value={st.value} style={{ background: '#0d1422' }}>
        {st.label}
      </option>
    ))}
  </select>
</Field>
```

**Step 4: Verificar build**

```bash
npx tsc -b 2>&1
```

---

## Task 4: `DealCard.tsx` — Aceitar `Lead`, card inteiro arrastável

**Files:**
- Modify: `src/components/pipeline/DealCard.tsx`

**Step 1: Reescrever o arquivo completo**

```tsx
import {
  Building2,
  Clock,
  GripVertical,
  MessageSquare,
  Phone,
  AlertCircle,
  User
} from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import type { Lead, Priority } from '../../lib/database.types'

interface Props {
  deal: Lead
  onClick?: (deal: Lead) => void
  onDelete?: (id: string) => void
  isDragOverlay?: boolean
  bulkMode?: boolean
  checked?: boolean
  onCheck?: (id: string, checked: boolean) => void
}

const PRIORITY_STYLES: Record<Priority, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  media: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  baixa: { label: 'Baixa', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

function formatValue(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function timeInStage(updatedAt: string): { label: string; color: string; isCold: boolean } {
  const diffMs   = Date.now() - new Date(updatedAt).getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  const diffHrs  = Math.floor(diffMs / 3_600_000)

  if (diffDays >= 7)  return { label: `${diffDays}d`, color: '#ef4444', isCold: true }
  if (diffDays >= 3)  return { label: `${diffDays}d`, color: '#f59e0b', isCold: false }
  if (diffDays >= 1)  return { label: `${diffDays}d`, color: '#10b981', isCold: false }
  if (diffHrs >= 1)   return { label: `${diffHrs}h`,  color: '#10b981', isCold: false }
  return               { label: 'agora',               color: '#6366f1', isCold: false }
}

export function DealCard({
  deal,
  onClick,
  onDelete: _onDelete,
  isDragOverlay = false,
  bulkMode = false,
  checked = false,
  onCheck
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: bulkMode,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const priority = deal.priority ?? 'media'
  const p      = PRIORITY_STYLES[priority]
  const timing = timeInStage(deal.updated_at)

  const hasPendingWhatsApp = priority === 'alta' && !isDragOverlay
  const hasPendingCall     = timing.label.includes('d') && !isDragOverlay
  const isColdLead         = timing.isCold

  // Card title: deal.title if set, otherwise the contact/company name
  const cardTitle   = deal.title ?? deal.name
  const cardCompany = deal.company ?? deal.name
  // Show contact row only when there's a title (avoids showing name twice)
  const showContact = !!deal.title

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!bulkMode ? listeners : {})}
      className={clsx(
        "group relative bg-[#0d1422] rounded-2xl border transition-all duration-300 select-none",
        isDragging && !isDragOverlay ? "opacity-40" : "opacity-100",
        isDragOverlay ? "shadow-2xl rotate-1 scale-105 border-blue-500/50" : "hover:border-white/20 hover:shadow-xl",
        checked ? "border-blue-500/50 bg-blue-500/5" : "border-white/5",
        !bulkMode && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div
        className="p-4 space-y-3"
        onClick={() => {
          if (bulkMode) {
            onCheck?.(deal.id, !checked)
          } else {
            onClick?.(deal)
          }
        }}
      >
        {/* Header: Priority & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {bulkMode && (
              <div className="mr-1" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onCheck?.(deal.id, e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20 transition-all cursor-pointer"
                />
              </div>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{ background: `${p.color}15`, color: p.color, borderColor: `${p.color}30` }}
            >
              {p.label}
            </span>
          </div>

          {/* Grip — visual affordance only, listeners are on outer div */}
          <div className="text-slate-600 group-hover:text-slate-400 p-1 rounded-lg hover:bg-white/5 transition-all">
            <GripVertical size={14} />
          </div>
        </div>

        {/* Title & Company */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {cardTitle}
          </h4>
          {cardCompany !== cardTitle && (
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 size={12} className="flex-shrink-0" />
              <span className="text-xs truncate">{cardCompany}</span>
            </div>
          )}
          {showContact && (
            <div className="flex items-center gap-2 text-slate-500">
              <User size={12} className="flex-shrink-0" />
              <span className="text-xs truncate">{deal.name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[10px] font-bold text-slate-300">
                {formatValue(deal.value)}
              </span>
            </div>

            {/* Visual indicators */}
            <div className="flex items-center gap-2 ml-1 border-l border-white/10 pl-3">
              {hasPendingWhatsApp && (
                <div title="WhatsApp Pendente" className="text-emerald-500 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]">
                  <MessageSquare size={12} strokeWidth={3} />
                </div>
              )}
              {hasPendingCall && (
                <div title="Ligação Pendente" className="text-blue-400 filter drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">
                  <Phone size={12} strokeWidth={3} />
                </div>
              )}
              {isColdLead && (
                <div title="SLA Crítico (Lead Frio)" className="text-red-500 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.3)] animate-pulse">
                  <AlertCircle size={12} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-colors"
            style={{ color: timing.color, background: `${timing.color}15`, borderColor: `${timing.color}30` }}
          >
            <Clock size={10} />
            {timing.label}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verificar build**

```bash
npx tsc -b 2>&1
```

---

## Task 5: `KanbanColumn.tsx` — Aceitar `Lead[]` e `onCardClick`

**Files:**
- Modify: `src/components/pipeline/KanbanColumn.tsx`

**Step 1: Reescrever o arquivo completo**

```tsx
import { useDroppable } from '@dnd-kit/core'
import clsx from 'clsx'
import { DealCard } from './DealCard'
import type { Lead, PipelineStage } from '../../lib/database.types'

export interface ColumnConfig {
  id: PipelineStage
  label: string
  color: string
  glow: string
}

interface Props {
  column: ColumnConfig
  leads: Lead[]
  onDelete: (id: string) => void
  activeDealId: string | null
  bulkMode?: boolean
  selectedIds?: Set<string>
  onToggleCard?: (id: string, checked: boolean) => void
  onToggleAll?: (ids: string[], selectAll: boolean) => void
  onCardClick?: (lead: Lead) => void
}

function formatTotal(leads: Lead[]) {
  const total = leads.reduce((s, l) => s + l.value, 0)
  if (total >= 1000) return `R$${(total / 1000).toFixed(0)}k`
  return `R$${total}`
}

export function KanbanColumn({
  column, leads, onDelete, activeDealId,
  bulkMode = false, selectedIds = new Set(), onToggleCard, onToggleAll, onCardClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const columnIds    = leads.map(l => l.id)
  const allSelected  = columnIds.length > 0 && columnIds.every(id => selectedIds.has(id))
  const someSelected = columnIds.some(id => selectedIds.has(id)) && !allSelected

  function handleToggleAll() {
    onToggleAll?.(columnIds, !allSelected)
  }

  return (
    <div className="flex flex-col min-w-[260px] max-w-[260px]">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-2"
        style={{
          background: `${column.color}12`,
          border: `1px solid ${column.color}25`,
        }}
      >
        <div className="flex items-center gap-2">
          {bulkMode && (
            <button
              onClick={handleToggleAll}
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-150"
              style={{
                background: allSelected
                  ? column.color
                  : someSelected
                  ? `${column.color}40`
                  : 'rgba(255,255,255,0.08)',
                border: `1px solid ${allSelected || someSelected ? column.color : 'rgba(255,255,255,0.2)'}`,
              }}
              title={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            >
              {allSelected && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {someSelected && !allSelected && (
                <span className="w-1.5 h-px rounded-full bg-white block" />
              )}
            </button>
          )}

          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: column.color, boxShadow: `0 0 6px ${column.glow}` }}
          />
          <span className="text-xs font-semibold text-white">{column.label}</span>
          <span
            className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `${column.color}25`, color: column.color }}
          >
            {leads.length}
          </span>
        </div>
        <span className="text-[10px] font-semibold" style={{ color: column.color }}>
          {formatTotal(leads)}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 flex flex-col gap-1.5 rounded-xl p-2 min-h-[120px] transition-all duration-200',
          isOver
            ? 'outline outline-2 outline-offset-[-2px]'
            : 'outline outline-2 outline-transparent',
        )}
        style={{
          background: isOver ? `${column.color}08` : 'rgba(255,255,255,0.02)',
          outlineColor: isOver ? `${column.color}50` : undefined,
        }}
      >
        {leads.map(lead => (
          <DealCard
            key={lead.id}
            deal={lead}
            onClick={onCardClick}
            onDelete={onDelete}
            isDragOverlay={lead.id === activeDealId}
            bulkMode={bulkMode}
            checked={selectedIds.has(lead.id)}
            onCheck={onToggleCard}
          />
        ))}

        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-[80px]">
            <p
              className="text-[11px] text-center px-4 py-6 rounded-xl w-full"
              style={{
                color: isOver ? column.color : '#334155',
                background: isOver ? `${column.color}08` : 'transparent',
                border: `1px dashed ${isOver ? column.color + '40' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              {isOver ? 'Soltar aqui' : 'Vazio'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verificar build**

```bash
npx tsc -b 2>&1
```

---

## Task 6: `Leads.tsx` — Novos estágios + filtrar 'fechado'

**Files:**
- Modify: `src/pages/Leads.tsx`

**Step 1: Atualizar `STAGE_CONFIG` e `FILTER_CHIPS`**

Substituir o bloco de configuração no topo (após os imports):

```ts
type StageKey    = Lead['stage']
type StageFilter = StageKey | 'todos'

const STAGE_CONFIG: Record<StageKey, { label: string; color: string }> = {
  prospeccao: { label: 'Prospecção', color: '#6366f1' },
  reuniao:    { label: 'Reunião',    color: '#8b5cf6' },
  proposta:   { label: 'Proposta',   color: '#f59e0b' },
  negociacao: { label: 'Negociação', color: '#10b981' },
  fechado:    { label: 'Fechado',    color: '#64748b' },
}

// Nota: 'fechado' não aparece como chip porque leads fechados não aparecem nesta aba
const FILTER_CHIPS: { id: StageFilter; label: string; color: string }[] = [
  { id: 'todos',      label: 'Todos',      color: '#94a3b8' },
  { id: 'prospeccao', label: 'Prospecção', color: '#6366f1' },
  { id: 'reuniao',    label: 'Reunião',    color: '#8b5cf6' },
  { id: 'proposta',   label: 'Proposta',   color: '#f59e0b' },
  { id: 'negociacao', label: 'Negociação', color: '#10b981' },
]
```

**Step 2: Atualizar `filtered` para excluir fechados**

Localizar o `useMemo` de `filtered` e atualizar:

```ts
const filtered = useMemo(() => {
  const q = search.toLowerCase()
  return leads.filter(l => {
    if (l.stage === 'fechado') return false  // only visible in Clientes tab
    const matchSearch =
      l.name.toLowerCase().includes(q) ||
      (l.email?.toLowerCase().includes(q) ?? false) ||
      (l.source?.toLowerCase().includes(q) ?? false)
    const matchStage = stageFilter === 'todos' || l.stage === stageFilter
    return matchSearch && matchStage
  })
}, [leads, search, stageFilter])
```

**Step 3: Atualizar `countByStage` para contar só os ativos**

```ts
const countByStage = useMemo(() => {
  const active = leads.filter(l => l.stage !== 'fechado')
  const map: Record<string, number> = { todos: active.length }
  active.forEach(l => { map[l.stage] = (map[l.stage] ?? 0) + 1 })
  return map
}, [leads])
```

**Step 4: Verificar build**

```bash
npx tsc -b 2>&1
```

---

## Task 7: `Pipeline.tsx` — Trocar `usePipeline` por `useLeads`, adicionar ClientDrawer

**Files:**
- Modify: `src/pages/Pipeline.tsx`

**Step 1: Reescrever o arquivo completo**

```tsx
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { BillingOnboardingModal } from '../components/pipeline/BillingOnboardingModal'
import { ClientDrawer } from '../components/leads/ClientDrawer'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  Plus, AlertCircle, RefreshCw, TrendingUp,
  CheckSquare, X, Trash2, ArrowRight,
} from 'lucide-react'
import { KanbanColumn } from '../components/pipeline/KanbanColumn'
import { DealCard } from '../components/pipeline/DealCard'
import { NewDealModal } from '../components/pipeline/NewDealModal'
import { useLeads } from '../hooks/useLeads'
import type { Lead } from '../lib/database.types'
import { PIPELINE_STAGES } from '../config/pipeline'

const COLUMNS = PIPELINE_STAGES

function formatBigValue(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000)      return `R$${Math.round(v / 1000)}k`
  return `R$${v}`
}

export function PipelinePage() {
  const { leads, loading, error, moveLead, addLead, deleteLead, refetch } = useLeads()
  const [activeDeal,   setActiveDeal]   = useState<Lead | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [onboarding,   setOnboarding]   = useState<{ clientId: string; clientName: string } | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  /* ── Bulk Mode ───────────────────────────────────── */
  const [bulkMode,    setBulkMode]    = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleBulkMode = useCallback(() => {
    setBulkMode(m => !m)
    setSelectedIds(new Set())
  }, [])

  const handleToggleCard = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback((ids: string[], selectAll: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => selectAll ? next.add(id) : next.delete(id))
      return next
    })
  }, [])

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    await Promise.all(ids.map(id => deleteLead(id)))
  }

  async function handleBulkMove(stage: Lead['stage']) {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    await Promise.all(ids.map(id => moveLead(id, stage)))
  }

  async function handleConvertDeal(lead: Lead) {
    try {
      const clientName = lead.company ?? lead.name
      const { data, error: err } = await (supabase as any)
        .from('clients')
        .insert({
          name:         clientName,
          mrr:          lead.value,
          health_score: 50,
          trend:        'flat',
          avatar:       clientName.charAt(0).toUpperCase(),
          asaas_id:     null,
          segment:      null,
        })
        .select('id, name')
        .single()
      if (err) throw err
      setOnboarding({ clientId: data.id, clientName: data.name })
    } catch (e) {
      console.error('[handleConvertDeal]', e)
    }
  }

  /* dnd-kit sensors — 8px distance to avoid accidental drags on click */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(e: DragStartEvent) {
    const lead = e.active.data.current?.deal as Lead | undefined
    if (lead) setActiveDeal(lead)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = e
    if (!over || !active) return

    const leadId   = active.id as string
    const newStage = over.id as Lead['stage']

    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.stage === newStage) return

    moveLead(leadId, newStage)

    if (newStage === 'fechado' && currentLead.stage !== 'fechado') {
      handleConvertDeal(currentLead)
    }
  }

  /* Summary stats */
  const openLeads     = leads.filter(l => l.stage !== 'fechado')
  const closedLeads   = leads.filter(l => l.stage === 'fechado')
  const totalPipeline = openLeads.reduce((s, l) => s + l.value, 0)
  const totalClosed   = closedLeads.reduce((s, l) => s + l.value, 0)

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Pipeline de Vendas</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie negócios com drag &amp; drop</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBulkMode}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={bulkMode
              ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }
            }
          >
            <CheckSquare size={14} />
            {bulkMode ? `${selectedIds.size} selecionados` : 'Selecionar'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={15} />
            Novo Negócio
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl flex-shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <span className="text-xs text-slate-400 mr-1">
            <span className="text-indigo-300 font-semibold">{selectedIds.size}</span> negócio{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-700 text-xs">Mover para →</span>
          {COLUMNS.map(col => (
            <button
              key={col.id}
              onClick={() => handleBulkMove(col.id)}
              className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80"
              style={{ background: `${col.color}15`, color: col.color, border: `1px solid ${col.color}30` }}
            >
              <ArrowRight size={10} />
              {col.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <Trash2 size={12} />
            Excluir
          </button>
          <button onClick={toggleBulkMode} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} />
            {error} — exibindo dados de demonstração.
          </span>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Summary strip */}
      {!loading && (
        <div className="flex items-center gap-4 flex-shrink-0">
          {[
            { label: 'Em aberto',       value: openLeads.length,              unit: 'negócios', color: '#6366f1' },
            { label: 'Valor no funil',  value: formatBigValue(totalPipeline), unit: '',         color: '#f59e0b' },
            { label: 'Fechados',        value: closedLeads.length,            unit: 'negócios', color: '#10b981' },
            { label: 'Receita fechada', value: formatBigValue(totalClosed),   unit: '',         color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <TrendingUp size={12} style={{ color: s.color }} />
              <span className="text-xs text-slate-500">{s.label}:</span>
              <span className="text-xs font-bold" style={{ color: s.color }}>
                {s.value}{s.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start">
          {loading
            ? COLUMNS.map(col => (
                <div
                  key={col.id}
                  className="min-w-[260px] max-w-[260px] rounded-xl animate-pulse"
                  style={{ height: 320, background: 'rgba(255,255,255,0.03)' }}
                />
              ))
            : COLUMNS.map(col => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  leads={leads.filter(l => l.stage === col.id)}
                  onDelete={deleteLead}
                  activeDealId={activeDeal?.id ?? null}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  onToggleCard={handleToggleCard}
                  onToggleAll={handleToggleAll}
                  onCardClick={setSelectedLead}
                />
              ))
          }
        </div>

        {/* Ghost card while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeDeal && (
            <DealCard
              deal={activeDeal}
              onDelete={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* New deal modal — inserts into leads table */}
      {showModal && (
        <NewDealModal
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            await addLead({
              name:     data.contact_name || data.company,
              email:    null,
              phone:    null,
              stage:    data.stage,
              score:    50,
              source:   null,
              title:    data.title,
              company:  data.company,
              value:    data.value,
              priority: data.priority,
              tags:     [],
            })
          }}
        />
      )}

      {/* Billing onboarding after Kanban conversion */}
      {onboarding && (
        <BillingOnboardingModal
          dealId={onboarding.clientId}
          companyName={onboarding.clientName}
          onClose={() => setOnboarding(null)}
          onSave={async (data) => {
            await (supabase as any)
              .from('clients')
              .update(data)
              .eq('id', onboarding.clientId)
          }}
        />
      )}

      {/* Lead drawer — opens on card click */}
      {selectedLead && (
        <ClientDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  )
}
```

**Step 2: Verificar build final**

```bash
npx tsc -b 2>&1 && npm run build 2>&1 | tail -15
```

Esperado: zero erros TypeScript, `✓ built in X.Xs`.
