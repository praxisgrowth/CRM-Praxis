# Fase 3b — Gestão Avançada & UX — Design

**Date:** 2026-03-04
**Goal:** Refinar inteligência e navegabilidade do CRM Praxis em 7 melhorias cirúrgicas.

---

## 1. ViaCEP Auto-fill — `BillingOnboardingModal.tsx`
- On CEP field `onBlur`: strip non-numeric chars, if length === 8 → fetch `https://viacep.com.br/ws/{cep}/json/`
- While fetching: show `Loader2` spinner inside CEP input (replace focus ring only)
- On success: auto-fill `logradouro`, `bairro`, `cidade`, `uf`; mark as readonly (optional)
- On `erro: true` or network failure: show inline warning "CEP não encontrado" beneath the field
- No new dependencies — pure `fetch`

## 2. Pipeline — Anti-reconversão — `Pipeline.tsx`
- Problem: `handleDragEnd` reads `currentLead.stage` after optimistic move may have changed it
- Fix: `const convertedIds = useRef(new Set<string>())`
- Before `handleConvertLead`: check `!convertedIds.current.has(leadId)`
- After `handleConvertLead`: `convertedIds.current.add(leadId)`

## 3. Clients.tsx — Name Link + Badge 'Incompleto'
- `client.name` → `<Link to={/comercial/clientes/${client.id}}>` (cyan hover, same as ExternalLink)
- Inline badge 'Incompleto' (amber) after name if `!client.cpf_cnpj || !client.cep`
- Badge style: `px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30`

## 4. 'Novo Cliente' button + `NewClientModal.tsx`
- New `src/components/clients/NewClientModal.tsx`
- Fields: Nome* (required), Email, Telefone, Segmento
- On save: `supabase.from('clients').insert(...)` via new `addClient` in `useClients`
- `useClients` gets `addClient(input)`: optimistic insert, revert on Supabase error (mirrors `addLead`)
- Button in `ClientsPage` header: gradient indigo/violet matching rest of CRM

## 5. ClientDrawer — Inline Edit Lead
- New pencil button in header row of `ClientDrawer.tsx`
- Edit mode: Name, Email, Phone, Company become `<input>` fields
- Save button: `supabase.from('leads').update({name,email,phone,company}).eq('id',lead.id)`
- New prop: `onLeadUpdated?: (updated: Lead) => void` — called after successful save
- Leads.tsx: pass `onLeadUpdated={(updated) => setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))}`
- Pipeline.tsx: same pattern

## 6. Sidebar — 'Clientes' Top-level
- Remove `{ label: 'Clientes', to: '/comercial/clientes' }` from Comercial children
- Add new top-level NavItem: `{ label: 'Clientes', icon: Users, to: '/comercial/clientes' }`
- Position: between 'Comercial' and 'Operação'
- Route path `/comercial/clientes` unchanged

## 7. `useFinancialActions.ts` — 'charge' action
- `FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge'`
- New `ChargePayload` interface:
  ```ts
  export interface ChargePayload {
    client_id:    string
    description:  string
    value:        number
    billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
    due_date?:    string
  }
  ```
- `execute` function routing already generic → no change needed

---

## Files Touched
| # | File | Action |
|---|------|--------|
| 1 | `src/components/pipeline/BillingOnboardingModal.tsx` | Edit — add ViaCEP fetch |
| 2 | `src/pages/Pipeline.tsx` | Edit — add convertedIds ref |
| 3 | `src/pages/Clients.tsx` | Edit — name link + badge + Novo Cliente button |
| 4 | `src/components/clients/NewClientModal.tsx` | Create |
| 4 | `src/hooks/useClients.ts` | Edit — add addClient |
| 5 | `src/components/leads/ClientDrawer.tsx` | Edit — inline edit + onLeadUpdated prop |
| 5 | `src/pages/Leads.tsx` | Edit — pass onLeadUpdated |
| 5 | `src/pages/Pipeline.tsx` | Edit — pass onLeadUpdated |
| 6 | `src/components/layout/Sidebar.tsx` | Edit — move Clientes |
| 7 | `src/hooks/useFinancialActions.ts` | Edit — add charge type |
