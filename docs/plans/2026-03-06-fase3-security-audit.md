# Fase 3 — Security, Audit & UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add audit logging to all delete operations, fix pipeline re-conversion idempotency, display complemento in ClientDetail, and capture login events via SettingsProvider.

**Architecture:** All three entity hooks (useLeads, useClients, useOperations) call useAudit() internally and log after a successful delete. Pipeline.tsx skips the onboarding modal when a client already exists. SettingsContext fires a fire-and-forget insert to audit_logs after settings load successfully.

**Tech Stack:** React 18, TypeScript, Supabase JS client, useAudit hook (existing), useSettings context (existing)

---

### Task 1: Audit on deleteLead — `src/hooks/useLeads.ts`

**Files:**
- Modify: `src/hooks/useLeads.ts:1-4` (imports)
- Modify: `src/hooks/useLeads.ts:126-136` (deleteLead body)

**Step 1: Add useAudit import**

At line 1, add to the import block:
```ts
import { useAudit } from './useAudit'
```

**Step 2: Call useAudit inside the hook**

Inside `useLeads()`, after the `useCallback` for `moveLead`, add:
```ts
const { logAction } = useAudit()
```

**Step 3: Capture name before optimistic removal and log after success**

Replace the `deleteLead` implementation:
```ts
const deleteLead = useCallback(async (id: string) => {
  const target = leads.find(l => l.id === id)
  setLeads(prev => prev.filter(l => l.id !== id))
  const { error: err } = await (supabase as any)
    .from('leads')
    .delete()
    .eq('id', id)
  if (err) {
    console.error('[deleteLead]', err.message)
    fetchLeads()
    return
  }
  logAction('Delete Lead', 'lead', id, { name: target?.name ?? id })
}, [fetchLeads, logAction])
```

> Note: `leads` is the state array from the hook's closure. Capture `target` BEFORE `setLeads` so the item is still present.

**Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\gusta\Documents\Antigravity\CRM Praxis" && npx tsc --noEmit
```
Expected: no errors.

**Step 5: Commit**

```bash
git add src/hooks/useLeads.ts
git commit -m "feat(audit): log delete on leads"
```

---

### Task 2: Audit on deleteClient — `src/hooks/useClients.ts`

**Files:**
- Modify: `src/hooks/useClients.ts`

**Step 1: Add useAudit import and call**

Add at top:
```ts
import { useAudit } from './useAudit'
```

Inside `useClients()`, add:
```ts
const { logAction } = useAudit()
```

**Step 2: Update deleteClient**

Replace `deleteClient`:
```ts
const deleteClient = useCallback(async (id: string) => {
  const target = clients.find(c => c.id === id)
  setClients(prev => prev.filter(c => c.id !== id))
  const { error: err } = await (supabase as any)
    .from('clients')
    .delete()
    .eq('id', id)
  if (err) {
    console.error('[deleteClient]', err.message)
    refetch()
    return
  }
  logAction('Delete Client', 'client', id, { name: target?.name ?? id })
}, [refetch, logAction])
```

**Step 3: Verify and commit**

```bash
npx tsc --noEmit
git add src/hooks/useClients.ts
git commit -m "feat(audit): log delete on clients"
```

---

### Task 3: Audit on deleteProject — `src/hooks/useOperations.ts`

**Files:**
- Modify: `src/hooks/useOperations.ts`

**Step 1: Add useAudit import and call**

Add at top:
```ts
import { useAudit } from './useAudit'
```

Inside `useOperations()`, add:
```ts
const { logAction } = useAudit()
```

**Step 2: Update deleteProject**

Replace `deleteProject`:
```ts
const deleteProject = useCallback(async (id: string) => {
  const target = projects.find(p => p.id === id)
  setProjects(prev => prev.filter(p => p.id !== id))
  const { error: sbErr } = await (supabase as any)
    .from('projects')
    .delete()
    .eq('id', id)
  if (sbErr) {
    console.error('[useOperations] Falha ao excluir projeto:', sbErr.message)
    refetch()
    return
  }
  logAction('Delete Project', 'project', id, { name: target?.name ?? id })
}, [refetch, logAction])
```

**Step 3: Verify and commit**

```bash
npx tsc --noEmit
git add src/hooks/useOperations.ts
git commit -m "feat(audit): log delete on projects"
```

---

### Task 4: Pipeline idempotency — `src/pages/Pipeline.tsx`

**Files:**
- Modify: `src/pages/Pipeline.tsx` — `handleConvertLead` function (~line 82)

**Context:** Currently, when a lead card is moved back from 'fechado' and re-dragged there, `handleConvertLead` fires again. If a client already exists (found by name lookup), the code opens the onboarding modal. The fix: if `existing` is found, return silently — no modal, no duplicate.

**Step 1: Update the `existing` branch in handleConvertLead**

Find this block:
```ts
if (existing) {
  setOnboarding({ clientId: existing.id, clientName: lead.company ?? lead.name })
  return
}
```

Replace with:
```ts
if (existing) {
  // Cliente já convertido — silently skip, sem reabrir onboarding
  return
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

**Step 3: Commit**

```bash
git add src/pages/Pipeline.tsx
git commit -m "fix(pipeline): skip onboarding if client already converted"
```

---

### Task 5: Login audit via SettingsProvider — `src/contexts/SettingsContext.tsx`

**Files:**
- Modify: `src/contexts/SettingsContext.tsx` — `load` function

**Context:** `load()` fetches agency_settings from Supabase. When it succeeds and `data` is truthy, we have the `user_name` available. Fire a single insert to `audit_logs` here — no hook needed, just direct supabase call.

**Step 1: Add the login log inside load()**

Find this block inside `load`:
```ts
if (data) setSettings(data as AgencySettings)
```

Replace with:
```ts
if (data) {
  setSettings(data as AgencySettings)
  // Fire-and-forget: registra acesso ao sistema
  supabase.from('audit_logs').insert({
    user_name:   data.user_name || 'Admin',
    action:      'Login',
    entity_type: 'session',
    entity_id:   null,
    details:     { timestamp: new Date().toISOString() },
  }).then(() => {}).catch(() => {})
}
```

> `supabase` is already imported in this file. No new import needed.

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/contexts/SettingsContext.tsx
git commit -m "feat(audit): log login event on settings load"
```

---

### Task 6: Display complemento in ClientDetail — `src/pages/ClientDetail.tsx`

**Files:**
- Modify: `src/pages/ClientDetail.tsx` — address ContactRow (~line 179)

**Context:** `ClientDetail` shows the address without `complemento`. The `Client` type already has `complemento: string | null` and the field is stored in DB. Just add it to the display value.

**Step 1: Update the address ContactRow value**

Find:
```tsx
value={[client.logradouro, client.numero].filter(Boolean).join(', ')}
```

Replace with:
```tsx
value={[client.logradouro, client.numero, client.complemento].filter(Boolean).join(', ')}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add src/pages/ClientDetail.tsx
git commit -m "fix(clients): display complemento in ClientDetail address"
```

---

### Final: Full build verification

```bash
cd "C:\Users\gusta\Documents\Antigravity\CRM Praxis" && npm run build 2>&1
```
Expected: `✓ built in X.XXs` with no TypeScript errors. Bundle size warning is pre-existing and acceptable.
