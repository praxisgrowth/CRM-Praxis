# Unified Leads + Pipeline Design

**Date:** 2026-03-03
**Goal:** Unificar Leads e Pipeline para usar apenas a tabela `leads` no Supabase, corrigindo duplicação de dados e bugs de UX.

---

## Context

Currently the app maintains two separate tables:
- `leads` — used by `Leads.tsx` via `useLeads`
- `pipeline_deals` — used by `Pipeline.tsx` via `usePipeline`

The `unified_leads_migration.sql` adds pipeline columns to `leads` and unifies stage names, making `pipeline_deals` redundant.

---

## Architecture

**Single source of truth: `leads` table**

Both the Leads tab and the Pipeline Kanban read/write to `leads`. `usePipeline` / `pipeline_deals` are retired from active use.

**Unified stage names** (post-migration):
`prospeccao | reuniao | proposta | negociacao | fechado`

**Data flow:**
- `useLeads` hook → extended with `moveLead` + `deleteLead`
- `Leads.tsx` → uses `useLeads`, filters out `stage === 'fechado'`
- `Pipeline.tsx` → uses `useLeads` with new pipeline operations

---

## Changes per file

### `src/lib/database.types.ts`
- `Lead['stage']`: `'novo' | 'qualificado' | ...` → `'prospeccao' | 'reuniao' | 'proposta' | 'negociacao' | 'fechado'`
- `Lead` gets new optional fields: `title`, `value`, `priority`, `company`, `tags`
- `PipelineStage` becomes alias: `type PipelineStage = Lead['stage']`

### `src/hooks/useLeads.ts`
- `NewLeadInput` extended with: `title?`, `company?`, `value?`, `priority?`, `tags?`
- Add `moveLead(id: string, stage: Lead['stage']): Promise<void>` — optimistic + persist
- Add `deleteLead(id: string): Promise<void>` — optimistic + persist
- Update fallback data to use new stage names (`prospeccao`, `reuniao`)

### `src/components/pipeline/DealCard.tsx`
- `deal: PipelineDeal` → `deal: Lead`
- `listeners` moved from grip div to outer card div (full card draggable)
- Card title: `deal.title ?? deal.name`
- Card company: `deal.company ?? deal.name`
- Contact row: show `deal.name` only when `deal.title` is set

### `src/components/pipeline/KanbanColumn.tsx`
- `deals: PipelineDeal[]` → `leads: Lead[]`
- Add `onCardClick?: (lead: Lead) => void` prop → passed to `DealCard.onClick`

### `src/components/leads/NewLeadModal.tsx`
- Stage button grid → `<select>` dropdown
- Stage options: Prospecção, Reunião, Proposta, Negociação, Fechado
- Default stage: `'prospeccao'`

### `src/pages/Leads.tsx`
- `STAGE_CONFIG` updated to new stage keys
- `FILTER_CHIPS` updated (remove `novo`/`qualificado`, add `prospeccao`/`reuniao`)
- `filtered` adds `&& l.stage !== 'fechado'`
- Remove "Fechado" chip (irrelevant if filtered out)

### `src/pages/Pipeline.tsx`
- Replace `usePipeline()` with `useLeads()` + `moveLead`/`deleteLead`
- `handleDragEnd` calls `moveLead` instead of `moveDeal`
- `handleConvertDeal(lead: Lead)` — creates client from `lead.name`/`lead.value`
- Add `selectedLead: Lead | null` state + `ClientDrawer` in JSX
- Pass `onCardClick={setSelectedLead}` to `KanbanColumn`
- `NewDealModal.onSave` maps to `addLead()`

---

## UX Outcomes

1. No data duplication between Leads and Pipeline
2. NewLeadModal stage = clean dropdown with real stage names
3. Entire DealCard is draggable (not just the grip icon)
4. Clicking a card opens ClientDrawer for full lead editing
5. Leads tab hides 'fechado' entries (those live in Clientes tab)
6. Drag to 'Fechado' triggers BillingOnboardingModal + client creation
