# Fase 3b — Gestão Avançada & UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar 7 melhorias de UX/inteligência no CRM Praxis: ViaCEP auto-fill, trava de reconversão, link de cliente, badge Incompleto, Novo Cliente, edição inline de lead, reposicionamento de nav e novo tipo de cobrança.

**Architecture:** Cada tarefa é cirúrgica e independente. Nenhuma migração de banco é necessária. Supabase usa padrão `(supabase as any)` para mutações. O `useClients` já expõe `addClient` e `updateClient` otimistas — sem mudanças no hook necessárias.

**Tech Stack:** React 18 · TypeScript · Tailwind CSS v4 · Vite · Supabase · React Router v7 · Lucide React

---

### Task 1: ViaCEP Auto-fill — `BillingOnboardingModal.tsx`

**Files:**
- Modify: `src/components/pipeline/BillingOnboardingModal.tsx`

**Context:** O modal já tem campos `cep`, `logradouro`, `bairro`, `cidade`, `uf`. Precisamos buscar a API ViaCEP quando o CEP é preenchido (onBlur com 8 dígitos) e preencher os campos restantes automaticamente.

**Step 1: Adicionar estado de loading e erro de CEP**

Dentro de `BillingOnboardingModal`, após `const [focusField, setFocusField] = useState('')`, adicionar:

```tsx
const [cepLoading, setCepLoading] = useState(false)
const [cepError,   setCepError]   = useState('')
```

**Step 2: Implementar a função fetchCep**

Adicionar antes do `return`:

```tsx
async function fetchCep(raw: string) {
  const cep = raw.replace(/\D/g, '')
  if (cep.length !== 8) return
  setCepLoading(true)
  setCepError('')
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if (data.erro) { setCepError('CEP não encontrado.'); return }
    setForm(f => ({
      ...f,
      logradouro: data.logradouro || f.logradouro,
      bairro:     data.bairro     || f.bairro,
      cidade:     data.localidade || f.cidade,
      uf:         data.uf         || f.uf,
    }))
  } catch {
    setCepError('Erro ao buscar CEP.')
  } finally {
    setCepLoading(false)
  }
}
```

**Step 3: Atualizar o campo CEP para chamar fetchCep no onBlur e mostrar loading**

Localizar o `<Field label="CEP" icon={Hash}>` e substituir seu conteúdo interno:

```tsx
<Field label="CEP" icon={Hash}>
  <div className="relative">
    <input
      className={FIELD}
      style={inputStyle('cep')}
      placeholder="00000-000"
      value={form.cep || ''}
      onChange={e => { update('cep', e.target.value); setCepError('') }}
      onFocus={() => setFocusField('cep')}
      onBlur={e => { setFocusField(''); fetchCep(e.target.value) }}
    />
    {cepLoading && (
      <Loader2
        size={12}
        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-cyan-400"
      />
    )}
  </div>
  {cepError && (
    <p className="text-[10px] text-amber-400 mt-1">{cepError}</p>
  )}
</Field>
```

Note: `Loader2` já está importado no arquivo.

**Step 4: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 2: Pipeline — Trava Anti-Reconversão — `Pipeline.tsx`

**Files:**
- Modify: `src/pages/Pipeline.tsx`

**Context:** Quando um lead em 'fechado' é movido para outra coluna e depois de volta para 'fechado', a condição `currentLead.stage !== 'fechado'` não protege porque o estado já foi atualizado otimisticamente. Usamos `useRef` para rastrear IDs já convertidos.

**Step 1: Importar useRef**

No topo de `Pipeline.tsx`, `useRef` já é disponível via React — verificar se está no import:

```tsx
import { useState, useCallback, useRef } from 'react'
```

Se já existir o import de `{ useState, useCallback }`, adicionar `useRef`.

**Step 2: Declarar o ref logo após os estados**

Após `const [onboarding, setOnboarding] = useState(...)`, adicionar:

```tsx
/* IDs de leads já convertidos — evita reconversão ao arrastar de volta */
const convertedIds = useRef(new Set<string>())
```

**Step 3: Atualizar handleConvertLead para registrar o ID**

Na função `handleConvertLead`, logo após `setOnboarding(...)`:

```tsx
convertedIds.current.add(lead.id)
```

Código completo da função após a mudança:

```tsx
async function handleConvertLead(lead: Lead) {
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
    convertedIds.current.add(lead.id)
    setOnboarding({ clientId: data.id, clientName: data.name })
  } catch (e) {
    console.error('[handleConvertLead]', e)
  }
}
```

**Step 4: Adicionar verificação em handleDragEnd**

Localizar:
```tsx
if (newStage === 'fechado' && currentLead.stage !== 'fechado') {
  handleConvertLead(currentLead)
}
```

Substituir por:
```tsx
if (newStage === 'fechado' && !convertedIds.current.has(leadId)) {
  handleConvertLead(currentLead)
}
```

**Step 5: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 3: Clients.tsx — Name Link + Badge Incompleto

**Files:**
- Modify: `src/pages/Clients.tsx`

**Context:** O nome do cliente deve ser clicável (link para `/comercial/clientes/:id`). Um badge âmbar "Incompleto" deve aparecer ao lado do nome se `cpf_cnpj` ou `cep` estiver ausente. `Link` já está importado via `react-router-dom`.

**Step 1: Localizar o trecho do nome do cliente na tabela**

Linha ~119:
```tsx
<p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{client.name}</p>
```

**Step 2: Substituir por link + badge**

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <Link
    to={`/comercial/clientes/${client.id}`}
    className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
  >
    {client.name}
  </Link>
  {(!client.cpf_cnpj || !client.cep) && (
    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}>
      Incompleto
    </span>
  )}
</div>
```

**Step 3: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 4: Botão 'Novo Cliente' + `NewClientModal.tsx`

**Files:**
- Create: `src/components/clients/NewClientModal.tsx`
- Modify: `src/pages/Clients.tsx`

**Context:** `useClients` já expõe `addClient(input: Omit<Client, 'id'|'created_at'|'updated_at'>)`. O modal deve pedir Nome (obrigatório), Email, Telefone, Segmento e chamar `addClient` com defaults para os campos restantes.

**Step 1: Criar `src/components/clients/NewClientModal.tsx`**

```tsx
import { useState } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import type { Client } from '../../lib/database.types'

interface Props {
  onClose: () => void
  onSave: (input: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
}

const FIELD       = 'w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200'
const BASE_STYLE  = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
const FOCUS_STYLE = { background: 'rgba(99,102,241,0.06)',  border: '1px solid rgba(99,102,241,0.5)' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  )
}

export function NewClientModal({ onClose, onSave }: Props) {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [segment,  setSegment]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')
  const [focus,    setFocus]    = useState('')

  const s = (f: string) => focus === f ? { ...BASE_STYLE, ...FOCUS_STYLE } : BASE_STYLE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('O nome do cliente é obrigatório.'); return }
    setSaving(true); setErr('')
    try {
      await onSave({
        name:         name.trim(),
        email:        email.trim() || null,
        phone:        phone.trim() || null,
        segment:      segment.trim() || null,
        mrr:          0,
        health_score: 50,
        trend:        'flat',
        avatar:       name.trim().charAt(0).toUpperCase(),
        asaas_id:     null,
        cpf_cnpj:     null,
        cep:          null,
        logradouro:   null,
        numero:       null,
        bairro:       null,
        cidade:       null,
        uf:           null,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao salvar cliente.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background:  'rgba(8,12,20,0.97)',
          border:      '1px solid rgba(99,102,241,0.25)',
          boxShadow:   '0 32px 80px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.07)' }}
        >
          <div>
            <p className="text-sm font-semibold text-white">Novo Cliente</p>
            <p className="text-xs text-slate-500 mt-0.5">Cadastrar cliente diretamente</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="Nome *">
            <input
              className={FIELD} style={s('name')} autoFocus
              placeholder="ex: Empresa Ltda"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocus('name')} onBlur={() => setFocus('')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input
                type="email" className={FIELD} style={s('email')}
                placeholder="contato@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
              />
            </Field>
            <Field label="Telefone">
              <input
                className={FIELD} style={s('phone')}
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onFocus={() => setFocus('phone')} onBlur={() => setFocus('')}
              />
            </Field>
          </div>

          <Field label="Segmento">
            <input
              className={FIELD} style={s('segment')}
              placeholder="ex: E-commerce, SaaS..."
              value={segment}
              onChange={e => setSegment(e.target.value)}
              onFocus={() => setFocus('segment')} onBlur={() => setFocus('')}
            />
          </Field>

          {err && <p className="text-xs text-red-400 px-1">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 transition-colors"
              style={BASE_STYLE}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background:  saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow:   saving ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
              }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Salvando…' : <><UserPlus size={14} /> Cadastrar Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Atualizar `Clients.tsx` para abrir o modal**

a) Adicionar import no topo:
```tsx
import { NewClientModal } from '../components/clients/NewClientModal'
import { Plus } from 'lucide-react'
```

b) Adicionar estado e destructure `addClient` do hook:
```tsx
const { clients, loading, error, addClient } = useClients()
const [showNewClient, setShowNewClient] = useState(false)
```

c) Adicionar botão "Novo Cliente" no header (ao lado do botão Filter existente):
```tsx
<button
  onClick={() => setShowNewClient(true)}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
  style={{
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    boxShadow:  '0 4px 16px rgba(99,102,241,0.3)',
  }}
>
  <Plus size={15} /> Novo Cliente
</button>
```

d) Antes do `</div>` final do return, adicionar:
```tsx
{showNewClient && (
  <NewClientModal
    onClose={() => setShowNewClient(false)}
    onSave={addClient}
  />
)}
```

**Step 3: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 5: ClientDrawer — Edição Inline de Lead

**Files:**
- Modify: `src/components/leads/ClientDrawer.tsx`
- Modify: `src/pages/Leads.tsx`
- Modify: `src/pages/Pipeline.tsx`

**Context:** Adicionar modo de edição (pencil icon toggle no header) para Name, Email, Phone e Company. Ao salvar, persiste no Supabase e chama `onLeadUpdated` para o pai atualizar o estado local.

**Step 1: Atualizar props de ClientDrawer**

Localizar a interface Props:
```tsx
interface Props {
  lead: Lead
  onClose: () => void
}
```

Substituir por:
```tsx
interface Props {
  lead:              Lead
  onClose:           () => void
  onLeadUpdated?:    (updated: Lead) => void
}
```

Adicionar `onLeadUpdated` na assinatura da função:
```tsx
export function ClientDrawer({ lead, onClose, onLeadUpdated }: Props) {
```

**Step 2: Adicionar estados de edição**

Logo após os estados existentes (`isExpanded`, `chatDraft`, `onboarding`), adicionar:

```tsx
const [editMode,    setEditMode]    = useState(false)
const [editName,    setEditName]    = useState(lead.name)
const [editEmail,   setEditEmail]   = useState(lead.email ?? '')
const [editPhone,   setEditPhone]   = useState(lead.phone ?? '')
const [editCompany, setEditCompany] = useState(lead.company ?? '')
const [saving,      setSaving]      = useState(false)
```

**Step 3: Adicionar imports necessários**

Acrescentar `Pencil`, `Check`, `Loader2` ao import de lucide-react (linha 1):

```tsx
import { X, LayoutGrid, Maximize2, Minimize2, Pencil, Check, Loader2 } from 'lucide-react'
```

Adicionar supabase import (se não existir):
```tsx
import { supabase } from '../../lib/supabase'
```
(já existe no arquivo — verificar)

**Step 4: Implementar handleSave**

Antes do `return`, adicionar:

```tsx
async function handleSave() {
  setSaving(true)
  const updates = {
    name:    editName.trim()    || lead.name,
    email:   editEmail.trim()   || null,
    phone:   editPhone.trim()   || null,
    company: editCompany.trim() || null,
  }
  const { error: err } = await (supabase as any)
    .from('leads')
    .update(updates)
    .eq('id', lead.id)
  if (!err) {
    const updated: Lead = { ...lead, ...updates }
    onLeadUpdated?.(updated)
    setEditMode(false)
  }
  setSaving(false)
}
```

**Step 5: Atualizar o header do drawer para incluir botão de edição**

No bloco `<div className="flex items-center gap-3">` que já contém os botões Minimize2/X, adicionar antes do separador `div.w-px`:

```tsx
<button
  onClick={() => editMode ? handleSave() : setEditMode(true)}
  disabled={saving}
  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
  title={editMode ? 'Salvar alterações' : 'Editar lead'}
>
  {saving ? <Loader2 size={16} className="animate-spin" /> : editMode ? <Check size={16} className="text-green-400" /> : <Pencil size={16} />}
</button>
```

**Step 6: Atualizar o header info para mostrar inputs em modo de edição**

No bloco que exibe `lead.name` e subtítulo, substituir:

```tsx
{/* Antes: */}
<h2 className="text-sm font-bold text-white truncate">{lead.name}</h2>
```

Por:

```tsx
{editMode ? (
  <div className="flex flex-col gap-1.5 min-w-0">
    <input
      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-blue-500/50 w-full"
      value={editName}
      onChange={e => setEditName(e.target.value)}
      placeholder="Nome"
    />
    <div className="flex gap-1.5">
      <input
        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 flex-1 min-w-0"
        value={editEmail}
        onChange={e => setEditEmail(e.target.value)}
        placeholder="E-mail"
      />
      <input
        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 flex-1 min-w-0"
        value={editPhone}
        onChange={e => setEditPhone(e.target.value)}
        placeholder="Telefone"
      />
    </div>
    <input
      className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500/50 w-full"
      value={editCompany}
      onChange={e => setEditCompany(e.target.value)}
      placeholder="Empresa"
    />
  </div>
) : (
  <div className="flex items-center gap-2">
    <h2 className="text-sm font-bold text-white truncate">{lead.name}</h2>
    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase border border-blue-500/20">
      SDR Workspace
    </span>
  </div>
)}
```

Note: remover o `<span>SDR Workspace</span>` original que estava ao lado de `lead.name`.

**Step 7: Atualizar Leads.tsx para receber onLeadUpdated**

Em `Leads.tsx`, a `ClientDrawer` é usada com:
```tsx
{selectedLead && (
  <ClientDrawer
    lead={selectedLead}
    onClose={() => setSelectedLead(null)}
  />
)}
```

Adicionar `onLeadUpdated`:
```tsx
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
```

Garantir que `refetch` está desestruturado do `useLeads()` no topo da página (já existe).

**Step 8: Atualizar Pipeline.tsx para receber onLeadUpdated**

Em `Pipeline.tsx`, localizar:
```tsx
{selectedLead && (
  <ClientDrawer
    lead={selectedLead}
    onClose={() => setSelectedLead(null)}
  />
)}
```

Substituir por:
```tsx
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
```

**Step 9: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 6: Sidebar — 'Clientes' para Top-level

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Context:** Remover 'Clientes' de dentro de Comercial e adicioná-lo como item top-level entre Comercial e Operação. Rota permanece `/comercial/clientes`.

**Step 1: Adicionar ícone Users ao import do lucide-react**

Linha 1, acrescentar `Users` se não existir:
```tsx
import {
  LayoutDashboard,
  Briefcase,
  DollarSign,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Zap,
  Menu,
  X,
  Globe,
  Settings as SettingsIcon,
  Users,
} from 'lucide-react'
```

**Step 2: Atualizar NAV_ITEMS**

Localizar o array `NAV_ITEMS`. Remover `{ label: 'Clientes', to: '/comercial/clientes' }` dos children de Comercial e adicionar item top-level entre Comercial e Operação:

```tsx
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    label: 'Comercial',
    icon: Briefcase,
    children: [
      { label: 'Leads',    to: '/comercial/leads' },
      { label: 'Pipeline', to: '/comercial/pipeline' },
    ],
  },
  {
    label: 'Clientes',
    icon: Users,
    to: '/comercial/clientes',
  },
  {
    label: 'Operação',
    icon: Zap,
    to: '/operacao',
  },
  {
    label: 'Financeiro',
    icon: DollarSign,
    to: '/financeiro',
  },
  {
    label: 'Universidade',
    icon: GraduationCap,
    to: '/universidade',
  },
  {
    label: 'Portal Nexus',
    icon: Globe,
    to: '/nexus',
  },
  {
    label: 'Configurações',
    icon: SettingsIcon,
    to: '/settings',
  },
]
```

**Step 3: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 7: useFinancialActions — Adicionar 'charge'

**Files:**
- Modify: `src/hooks/useFinancialActions.ts`

**Context:** Adicionar 'charge' ao tipo FinancialAction e criar a interface ChargePayload para padronizar o payload de nova cobrança.

**Step 1: Atualizar o tipo FinancialAction**

Localizar:
```ts
export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend'
```

Substituir por:
```ts
export type FinancialAction = 'cancel' | 'refund' | 'postpone' | 'resend' | 'charge'
```

**Step 2: Adicionar a interface ChargePayload após ActionPayload**

```ts
export interface ChargePayload {
  client_id:    string
  description:  string
  value:        number
  billing_type: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  due_date?:    string
}
```

**Step 3: Verificar build final**

```bash
npx tsc -b && npm run build
```

Expected: zero TypeScript erros, build `✓` sem erros.

---

## Ordem de Execução Recomendada

Tasks 1–7 são independentes entre si (exceto Task 5 que toca Leads.tsx e Pipeline.tsx após o ClientDrawer). Execute nessa ordem:

1 → 2 → 3 → 4 → 5 → 6 → 7

Após Task 7: `npx tsc -b && npm run build` deve passar limpo.
