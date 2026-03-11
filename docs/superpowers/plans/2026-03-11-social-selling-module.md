# Social Selling Module — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar categoria `social` à tabela `leads` e criar o módulo Social Selling — página Kanban isolada do Pipeline CRM, com rota e item no menu.

**Architecture:** A coluna `category` na tabela `leads` filtra os funis. `useLeads` aceita parâmetro `category` opcional e adiciona `.eq()` na query. `Pipeline.tsx` passa `'crm'`; nova `SocialSelling.tsx` (cópia do Pipeline) passa `'social'`. Rota e sidebar adicionados.

**Tech Stack:** React, TypeScript, Supabase JS, lucide-react, React Router v6

---

## Chunk 1: Fundação — migration + tipos + hook

### Task 1: Migration SQL + database.types.ts + useLeads.ts

**Files:**
- Create: `supabase/social_selling_migration.sql`
- Modify: `src/lib/database.types.ts` (interface `Lead`, linhas 18–40)
- Modify: `src/hooks/useLeads.ts` (interface, hook signature, query, fallback, addLead)

---

- [ ] **Step 1: Criar migration SQL**

```sql
-- supabase/social_selling_migration.sql
-- Adiciona coluna category à tabela leads para separar funil CRM de Social Selling
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'crm';

-- Garante que registros existentes fiquem como 'crm'
UPDATE leads SET category = 'crm' WHERE category IS NULL OR category = '';
```

- [ ] **Step 2: Adicionar `category` à interface `Lead` em `src/lib/database.types.ts`**

Após a linha `updated_at: string` (última linha da interface Lead, antes do `}`), adicionar:
```typescript
  category: 'crm' | 'social'
```

- [ ] **Step 3: Atualizar `src/hooks/useLeads.ts`**

**3a. Adicionar `category` a `NewLeadInput`** — após `client_id?: string | null`:
```typescript
  category?: 'crm' | 'social'
```

**3b. Atualizar a assinatura do hook** — a função `useLeads` passa a aceitar um parâmetro:
```typescript
// antes:
export function useLeads(): UseLeadsResult {
// depois:
export function useLeads(category?: 'crm' | 'social'): UseLeadsResult {
```

**3c. Adicionar filtro de categoria na query** — após `.order('score', { ascending: false })` e ANTES de `.then` / `await`:
```typescript
// O fetchLeads atual:
const { data, error: sbErr } = await supabase
  .from('leads')
  .select('*')
  .order('score', { ascending: false })

// Substituir por:
let query = supabase
  .from('leads')
  .select('*')
  .order('score', { ascending: false })

if (category) query = query.eq('category', category)

const { data, error: sbErr } = await query
```

**3d. Adicionar `category: 'crm'` a cada objeto do array `FALLBACK_LEADS`** (8 objetos) — após `utm_term: null,`:
```typescript
category: 'crm',
```

**3e. Adicionar `category` ao objeto optimistic em `addLead`** — após `utm_term: input.utm_term ?? null,`:
```typescript
      category: input.category ?? 'crm',
```

- [ ] **Step 4: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 5: Commit**
```bash
git add supabase/social_selling_migration.sql src/lib/database.types.ts src/hooks/useLeads.ts
git commit -m "feat(leads): add category field to support social selling filter"
```

---

## Chunk 2: Pipeline CRM + nova página Social Selling

### Task 2: Atualizar Pipeline.tsx para filtrar apenas 'crm'

**Files:**
- Modify: `src/pages/Pipeline.tsx` (linha 37)

- [ ] **Step 1: Passar `category='crm'` para `useLeads` em `Pipeline.tsx`**

Localizar a linha 37:
```typescript
const { leads, loading, error, moveLead, addLead, deleteLead, refetch } = useLeads()
```

Substituir por:
```typescript
const { leads, loading, error, moveLead, addLead, deleteLead, refetch } = useLeads('crm')
```

- [ ] **Step 2: Atualizar `handleAddDeal` para persistir `category: 'crm'`**

Localizar `handleAddDeal` (linha ~147). Adicionar `category: 'crm'` ao objeto passado para `addLead`:
```typescript
async function handleAddDeal(data: NewDealInput) {
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
    category: 'crm',  // ← novo
  })
}
```

- [ ] **Step 3: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 4: Commit**
```bash
git add src/pages/Pipeline.tsx
git commit -m "feat(pipeline): filter CRM leads by category='crm'"
```

---

### Task 3: Criar SocialSelling.tsx

**Files:**
- Create: `src/pages/SocialSelling.tsx`

A página é uma cópia do Pipeline com 3 diferenças: título, `useLeads('social')`, e `category: 'social'` no `handleAddDeal`.

- [ ] **Step 1: Criar `src/pages/SocialSelling.tsx`**

Criar o arquivo com o seguinte conteúdo (igual ao Pipeline.tsx com as 3 diferenças marcadas):

```typescript
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { syncCustomer } from '../hooks/useBilling'
import { BillingOnboardingModal } from '../components/pipeline/BillingOnboardingModal'
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
  CheckSquare, X, Trash2, ArrowRight, Share2,
} from 'lucide-react'
import { KanbanColumn } from '../components/pipeline/KanbanColumn'
import { DealCard } from '../components/pipeline/DealCard'
import { NewDealModal } from '../components/pipeline/NewDealModal'
import { ClientDrawer } from '../components/leads/ClientDrawer'
import { useLeads } from '../hooks/useLeads'
import type { Lead, PipelineStage } from '../lib/database.types'
import type { NewDealInput } from '../hooks/usePipeline'
import { PIPELINE_STAGES } from '../config/pipeline'

const COLUMNS = PIPELINE_STAGES

function formatBigValue(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000)      return `R$${Math.round(v / 1000)}k`
  return `R$${v}`
}

export function SocialSellingPage() {
  // ← 'social' ao invés de 'crm'
  const { leads, loading, error, moveLead, addLead, deleteLead, refetch } = useLeads('social')
  const [activeLead,   setActiveLead]   = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [onboarding,   setOnboarding]   = useState<{ clientId: string; clientName: string; leadData?: Partial<Lead> } | null>(null)

  const [bulkMode,    setBulkMode]    = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleBulkMode = useCallback(() => {
    setBulkMode(m => !m)
    setSelectedIds(new Set())
  }, [])

  const handleToggleCard = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
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

  async function handleBulkMove(stage: PipelineStage) {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    await Promise.all(ids.map(id => moveLead(id, stage)))
  }

  async function handleConvertLead(lead: Lead) {
    try {
      const { data: existing } = await (supabase as unknown as { from: any })
        .from('clients')
        .select('id')
        .eq('name', lead.company ?? lead.name)
        .maybeSingle()

      if (existing) return

      const clientName = lead.company ?? lead.name
      const { data, error: err } = await (supabase as unknown as { from: any })
        .from('clients')
        .insert({
          name:         clientName,
          email:        lead.email,
          phone:        lead.phone,
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
      setOnboarding({ clientId: data.id, clientName: data.name, leadData: lead })
    } catch (e) {
      console.error('[SocialSelling handleConvertLead]', e)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart(e: DragStartEvent) {
    const lead = e.active.data.current?.deal as Lead | undefined
    if (lead) setActiveLead(lead)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = e
    if (!over || !active) return

    const leadId   = active.id as string
    const newStage = over.id as PipelineStage

    const currentLead = leads.find(l => l.id === leadId)
    if (!currentLead || currentLead.stage === newStage) return

    moveLead(leadId, newStage)

    if (newStage === 'fechado') {
      handleConvertLead(currentLead)
    }
  }

  async function handleAddDeal(data: NewDealInput) {
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
      category: 'social',  // ← 'social' ao invés de 'crm'
    })
  }

  const openLeads     = leads.filter(l => l.stage !== 'fechado')
  const closedLeads   = leads.filter(l => l.stage === 'fechado')
  const totalPipeline = openLeads.reduce((s, l) => s + l.value, 0)
  const totalClosed   = closedLeads.reduce((s, l) => s + l.value, 0)

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header — ← título diferente */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Share2 size={18} className="text-cyan-400" />
            Social Selling
          </h2>
          <p className="text-sm text-slate-500 mt-1">Leads originados de redes sociais</p>
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
            Novo Lead Social
          </button>
        </div>
      </div>

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

      {!loading && (
        <div className="flex items-center gap-4 flex-shrink-0">
          {[
            { label: 'Em aberto',       value: openLeads.length,              unit: 'leads',    color: '#6366f1' },
            { label: 'Valor no funil',  value: formatBigValue(totalPipeline), unit: '',         color: '#f59e0b' },
            { label: 'Fechados',        value: closedLeads.length,            unit: 'leads',    color: '#10b981' },
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
                  activeDealId={activeLead?.id ?? null}
                  bulkMode={bulkMode}
                  selectedIds={selectedIds}
                  onToggleCard={handleToggleCard}
                  onToggleAll={handleToggleAll}
                  onCardClick={setSelectedLead}
                />
              ))
          }
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead && (
            <DealCard
              deal={activeLead}
              onDelete={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {showModal && (
        <NewDealModal
          onClose={() => setShowModal(false)}
          onSave={handleAddDeal}
        />
      )}

      {selectedLead && (
        <ClientDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updated) => {
            setSelectedLead(updated)
            refetch()
          }}
        />
      )}

      {onboarding && (
        <BillingOnboardingModal
          clientId={onboarding.clientId}
          companyName={onboarding.clientName}
          initialData={onboarding.leadData as any}
          onClose={() => setOnboarding(null)}
          onSave={async (data) => {
            await (supabase as unknown as { from: any })
              .from('clients')
              .update(data)
              .eq('id', onboarding.clientId)
            syncCustomer({
              client_id: onboarding.clientId,
              name:      onboarding.clientName,
              email:     data.email     ?? '',
              phone:     data.phone     ?? '',
              cpf_cnpj:  data.cpf_cnpj  ?? '',
            })
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 3: Commit**
```bash
git add src/pages/SocialSelling.tsx
git commit -m "feat(social): create SocialSellingPage with category='social' filter"
```

---

## Chunk 3: Rota + Sidebar

### Task 4: Adicionar rota em App.tsx e item no Sidebar.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

---

#### App.tsx

- [ ] **Step 1: Adicionar import de `SocialSellingPage`**

Após a linha `import { PipelinePage as Pipeline } from './pages/Pipeline'`, adicionar:
```typescript
import { SocialSellingPage } from './pages/SocialSelling'
```

- [ ] **Step 2: Adicionar rota `/comercial/social`**

Dentro do bloco `<Route path="comercial">` (após a rota `pipeline`), adicionar:
```tsx
<Route path="social" element={
  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
    <SocialSellingPage />
  </ProtectedRoute>
} />
```

---

#### Sidebar.tsx

- [ ] **Step 3: Adicionar `Share2` ao import de lucide-react**

Adicionar `Share2` na lista de imports de lucide-react (linha 1–16).

- [ ] **Step 4: Adicionar item "Social Selling" no menu "Comercial"**

Localizar o array `children` do item "Comercial":
```typescript
children: [
  { label: 'Leads',    to: '/comercial/leads' },
  { label: 'Pipeline', to: '/comercial/pipeline' },
],
```

Substituir por:
```typescript
children: [
  { label: 'Leads',          to: '/comercial/leads' },
  { label: 'Pipeline',       to: '/comercial/pipeline' },
  { label: 'Social Selling', to: '/comercial/social' },
],
```

- [ ] **Step 5: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 6: Commit final**
```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(social): add /comercial/social route and sidebar item"
```
