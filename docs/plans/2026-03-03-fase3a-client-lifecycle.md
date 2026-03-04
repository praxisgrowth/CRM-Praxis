# Fase 3a — Client Lifecycle (Lead → Cliente)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar a base de clientes (ClientsPage), o fluxo de conversão Lead→Cliente com Modal de Onboarding de Faturamento e sincronizar os estágios do Pipeline com o SDR Workspace.

**Architecture:** Schema migration expande `clients` com campos de faturamento. Config centralizada `src/config/pipeline.ts` é a fonte única dos estágios. Conversão acontece no `SDRQualification` (button) e no `Pipeline` (drag to "Fechado"); ambos abrem `BillingOnboardingModal` após criar o cliente no Supabase.

**Tech Stack:** React 18 · TypeScript · Supabase (@supabase/supabase-js) · Tailwind CSS v4 · Lucide React

> **Nota:** Projeto sem test framework configurado — steps de teste omitidos. Execute cada step em sequência.

---

### Task 1: Schema migration SQL

**Files:**
- Create: `supabase/clients_billing_migration.sql`

**Step 1: Criar o arquivo SQL**

```sql
-- ================================================================
-- CRM Praxis · Clients Billing Migration (Fase 3a)
-- Adiciona campos de contato e faturamento à tabela clients
-- ================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS cpf_cnpj    TEXT,
  ADD COLUMN IF NOT EXISTS cep         TEXT,
  ADD COLUMN IF NOT EXISTS logradouro  TEXT,
  ADD COLUMN IF NOT EXISTS numero      TEXT,
  ADD COLUMN IF NOT EXISTS bairro      TEXT,
  ADD COLUMN IF NOT EXISTS cidade      TEXT,
  ADD COLUMN IF NOT EXISTS uf          CHAR(2);
```

> **Nota para o dev:** Executar este SQL no Supabase Dashboard → SQL Editor antes de rodar o app.

**Step 2: Commit**

```bash
git add supabase/clients_billing_migration.sql
git commit -m "feat(schema): add billing fields to clients table"
```

---

### Task 2: Atualizar database.types.ts — interface Client

**Files:**
- Modify: `src/lib/database.types.ts` (interface `Client`)

**Step 1: Adicionar campos opcionais à interface `Client`**

Substituir o bloco atual da interface `Client`:

```typescript
export interface Client {
  id: string
  name: string
  segment: string | null
  mrr: number
  health_score: number
  trend: Trend
  avatar: string
  asaas_id: string | null
  created_at: string
  updated_at: string
}
```

Por:

```typescript
export interface Client {
  id: string
  name: string
  segment: string | null
  mrr: number
  health_score: number
  trend: Trend
  avatar: string
  asaas_id: string | null
  // ─── Billing fields (Fase 3a) ─────────────────────
  email:      string | null
  phone:      string | null
  cpf_cnpj:   string | null
  cep:        string | null
  logradouro: string | null
  numero:     string | null
  bairro:     string | null
  cidade:     string | null
  uf:         string | null
  // ──────────────────────────────────────────────────
  created_at: string
  updated_at: string
}
```

**Step 2: Atualizar o bloco `clients` na `Database` interface**

Localizar o bloco (se existir) e garantir que `Insert` e `Update` incluam os novos campos com `?` (já são cobertos por `Omit` se o bloco existir). Se não existir bloco `clients` na `Database` interface, adicionar após `financial_subscriptions`:

```typescript
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
      }
```

**Step 3: Verificar TypeScript**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis"
npx tsc --noEmit
```

Esperado: sem erros.

**Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add billing fields to Client interface"
```

---

### Task 3: Criar src/config/pipeline.ts

**Files:**
- Create: `src/config/pipeline.ts`

**Step 1: Criar o arquivo**

```typescript
import type { PipelineStage } from '../lib/database.types'

export interface StageConfig {
  id:    PipelineStage
  label: string
  color: string
  glow:  string
}

export const PIPELINE_STAGES: StageConfig[] = [
  { id: 'prospeccao', label: 'Prospecção', color: '#6366f1', glow: 'rgba(99,102,241,0.6)'  },
  { id: 'reuniao',    label: 'Reunião',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)'  },
  { id: 'proposta',   label: 'Proposta',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)'  },
  { id: 'negociacao', label: 'Negociação', color: '#10b981', glow: 'rgba(16,185,129,0.6)'  },
  { id: 'fechado',    label: 'Fechado',    color: '#64748b', glow: 'rgba(100,116,139,0.6)' },
]
```

**Step 2: Commit**

```bash
git add src/config/pipeline.ts
git commit -m "feat(config): add shared PIPELINE_STAGES config"
```

---

### Task 4: Atualizar Pipeline.tsx para usar o config

**Files:**
- Modify: `src/pages/Pipeline.tsx`

**Step 1: Substituir a declaração local de `COLUMNS`**

Remover:
```tsx
const COLUMNS: ColumnConfig[] = [
  { id: 'prospeccao', label: 'Prospecção', color: '#6366f1', glow: 'rgba(99,102,241,0.6)'  },
  { id: 'reuniao',    label: 'Reunião',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)'  },
  { id: 'proposta',   label: 'Proposta',   color: '#f59e0b', glow: 'rgba(245,158,11,0.6)'  },
  { id: 'negociacao', label: 'Negociação', color: '#10b981', glow: 'rgba(16,185,129,0.6)'  },
  { id: 'fechado',    label: 'Fechado',    color: '#64748b', glow: 'rgba(100,116,139,0.6)' },
]
```

Adicionar ao bloco de imports no topo:
```tsx
import { PIPELINE_STAGES } from '../config/pipeline'
```

Adicionar após os imports, antes do `formatBigValue`:
```tsx
const COLUMNS: ColumnConfig[] = PIPELINE_STAGES
```

**Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros (os tipos `ColumnConfig` e `StageConfig` têm os mesmos campos).

**Step 3: Commit**

```bash
git add src/pages/Pipeline.tsx
git commit -m "refactor(pipeline): use shared PIPELINE_STAGES config"
```

---

### Task 5: Criar useClients.ts

**Files:**
- Create: `src/hooks/useClients.ts`

**Step 1: Criar o hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Client } from '../lib/database.types'

export interface UseClientsReturn {
  clients:  Client[]
  loading:  boolean
  error:    string | null
  refetch:  () => void
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('*')
          .order('mrr', { ascending: false })
        if (err) throw err
        setClients((data ?? []) as Client[])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  return { clients, loading, error, refetch }
}
```

**Step 2: Commit**

```bash
git add src/hooks/useClients.ts
git commit -m "feat(clients): add useClients hook"
```

---

### Task 6: Criar Clients.tsx (ClientsPage)

**Files:**
- Create: `src/pages/Clients.tsx`

**Step 1: Criar o componente**

```tsx
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus,
  Search, AlertCircle, RefreshCw, Users,
} from 'lucide-react'
import { useClients } from '../hooks/useClients'
import type { Client, Trend } from '../lib/database.types'

/* ─── Helpers ────────────────────────────────────── */
function fmtMRR(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v}`
}

function healthColor(score: number): string {
  if (score >= 70) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <TrendingUp  size={13} className="text-emerald-400" />
  if (trend === 'down') return <TrendingDown size={13} className="text-red-400" />
  return <Minus size={13} className="text-slate-500" />
}

/* ─── Client Card ────────────────────────────────── */
function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const hColor = healthColor(client.health_score)

  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl p-5 flex flex-col gap-4 text-left transition-all duration-200 hover:scale-[1.01]"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,210,255,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
    >
      {/* Avatar + nome */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(157,80,187,0.2))', border: '1px solid rgba(0,210,255,0.2)' }}
        >
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{client.name}</p>
          {client.segment && (
            <span
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5"
              style={{ background: 'rgba(0,210,255,0.1)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.2)' }}
            >
              {client.segment}
            </span>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="flex items-center justify-between">
        {/* MRR */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">MRR</p>
          <p className="text-base font-bold text-white tabular-nums">{fmtMRR(client.mrr)}</p>
        </div>

        {/* Health + Trend */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={client.trend} />
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: hColor }}
            >
              {client.health_score}
            </span>
          </div>
          <div
            className="w-16 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${client.health_score}%`, background: hColor, boxShadow: `0 0 6px ${hColor}` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function ClientsPage() {
  const { clients, loading, error, refetch } = useClients()
  const navigate = useNavigate()
  const [search,  setSearch]  = useState('')
  const [segment, setSegment] = useState<string | null>(null)

  /* Segmentos únicos */
  const segments = useMemo(() => {
    const set = new Set(clients.map(c => c.segment).filter(Boolean) as string[])
    return [...set].sort()
  }, [clients])

  /* Filtro */
  const filtered = useMemo(() => {
    return clients.filter(c => {
      const matchName    = c.name.toLowerCase().includes(search.toLowerCase())
      const matchSegment = !segment || c.segment === segment
      return matchName && matchSegment
    })
  }, [clients, search, segment])

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Clientes</h2>
          <p className="text-sm text-slate-500 mt-1">Base de clientes ativos da agência</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users size={14} />
          <span>{clients.length} cliente{clients.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Segment chips */}
        {segments.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSegment(null)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: !segment ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.04)',
                color:      !segment ? '#00d2ff' : '#64748b',
                border:     `1px solid ${!segment ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              Todos
            </button>
            {segments.map(seg => (
              <button
                key={seg}
                onClick={() => setSegment(seg === segment ? null : seg)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: segment === seg ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.04)',
                  color:      segment === seg ? '#00d2ff' : '#64748b',
                  border:     `1px solid ${segment === seg ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {seg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} />
            {error}
          </span>
          <button onClick={refetch} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-5 animate-pulse"
              style={{ height: 140 }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-600">
          <Users size={40} />
          <p className="text-sm">{clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum resultado para os filtros aplicados.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pb-2">
          {filtered.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              onClick={() => navigate(`/comercial/clientes/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/Clients.tsx src/hooks/useClients.ts
git commit -m "feat(clients): add ClientsPage with search and segment filter"
```

---

### Task 7: Atualizar Sidebar.tsx e App.tsx

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/App.tsx`

**Step 1: Adicionar "Clientes" no NAV_ITEMS do Sidebar**

Localizar o item `Comercial` em `NAV_ITEMS`:
```tsx
  {
    label: 'Comercial',
    icon: Briefcase,
    children: [
      { label: 'Leads',    to: '/comercial/leads' },
      { label: 'Pipeline', to: '/comercial/pipeline' },
    ],
  },
```

Substituir por:
```tsx
  {
    label: 'Comercial',
    icon: Briefcase,
    children: [
      { label: 'Leads',    to: '/comercial/leads' },
      { label: 'Pipeline', to: '/comercial/pipeline' },
      { label: 'Clientes', to: '/comercial/clientes' },
    ],
  },
```

**Step 2: Adicionar rota em App.tsx**

Adicionar import no topo:
```tsx
import { ClientsPage } from './pages/Clients'
```

Dentro do bloco `<Route path="comercial">`, após `<Route path="pipeline" ...>`:
```tsx
            <Route path="clientes" element={<ClientsPage />} />
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/App.tsx src/pages/Clients.tsx
git commit -m "feat(nav): add Clientes page to sidebar and router"
```

---

### Task 8: Criar BillingOnboardingModal.tsx

**Files:**
- Create: `src/components/clients/BillingOnboardingModal.tsx`

**Step 1: Criar diretório e componente**

```bash
mkdir -p "C:/Users/gusta/Documents/Antigravity/CRM Praxis/src/components/clients"
```

```tsx
import { useState, useEffect } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/* ─── UF List ────────────────────────────────────── */
const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

/* ─── Props ──────────────────────────────────────── */
interface BillingOnboardingModalProps {
  open:        boolean
  clientId:    string
  clientName:  string
  onClose:     () => void  // chamado somente após submit bem-sucedido
}

/* ─── Helpers ────────────────────────────────────── */
const FIELD: React.CSSProperties = {
  width:        '100%',
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding:      '10px 12px',
  color:        '#f0f4ff',
  fontSize:     14,
  outline:      'none',
}

function fmtCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function fmtCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.replace(/(\d{5})(\d)/, '$1-$2')
}

/* ─── Component ──────────────────────────────────── */
export function BillingOnboardingModal({
  open, clientId, clientName, onClose,
}: BillingOnboardingModalProps) {
  const [cpfCnpj,    setCpfCnpj]    = useState('')
  const [cep,        setCep]        = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero,     setNumero]     = useState('')
  const [bairro,     setBairro]     = useState('')
  const [cidade,     setCidade]     = useState('')
  const [uf,         setUf]         = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  /* Reset ao fechar */
  useEffect(() => {
    if (!open) {
      setCpfCnpj(''); setCep(''); setLogradouro(''); setNumero('')
      setBairro(''); setCidade(''); setUf(''); setFormError(null); setCepError(null)
    }
  }, [open])

  const digits = cpfCnpj.replace(/\D/g, '')
  const cpfCnpjValid = digits.length === 11 || digits.length === 14

  const allFilled =
    cpfCnpjValid &&
    cep.replace(/\D/g, '').length === 8 &&
    logradouro.trim() !== '' &&
    numero.trim() !== '' &&
    bairro.trim() !== '' &&
    cidade.trim() !== '' &&
    uf !== ''

  async function fetchCep() {
    const raw = cep.replace(/\D/g, '')
    if (raw.length !== 8) { setCepError('CEP deve ter 8 dígitos.'); return }
    setCepLoading(true)
    setCepError(null)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const json = await res.json()
      if (json.erro) { setCepError('CEP não encontrado.'); return }
      setLogradouro(json.logradouro ?? '')
      setBairro(json.bairro ?? '')
      setCidade(json.localidade ?? '')
      setUf(json.uf ?? '')
    } catch {
      setCepError('Erro ao buscar CEP. Tente novamente.')
    } finally {
      setCepLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allFilled) return
    setLoading(true)
    setFormError(null)
    try {
      const { error } = await (supabase as any)
        .from('clients')
        .update({
          cpf_cnpj:   cpfCnpj.replace(/\D/g, '').length === 11
            ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            : digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
          cep:        cep.replace(/\D/g, ''),
          logradouro: logradouro.trim(),
          numero:     numero.trim(),
          bairro:     bairro.trim(),
          cidade:     cidade.trim(),
          uf,
        })
        .eq('id', clientId)
      if (error) throw new Error(error.message)
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop bloqueante (sem onClick) */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden"
          style={{
            pointerEvents: 'auto',
            background:    'rgba(8,12,20,0.98)',
            border:        '1px solid rgba(0,210,255,0.2)',
            boxShadow:     '0 24px 80px rgba(0,0,0,0.7)',
            animation:     'fade-in 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-5 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.2)' }}
              >
                <MapPin size={14} style={{ color: '#00d2ff' }} />
              </div>
              <h3 className="text-base font-semibold text-white">Dados de Faturamento</h3>
            </div>
            <p className="text-xs text-slate-500 pl-11">
              Preencha os dados de <span className="text-cyan-400 font-medium">{clientName}</span> para habilitar o faturamento via Asaas.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 px-6 py-5">

              {/* CPF/CNPJ */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">CPF / CNPJ</label>
                <input
                  type="text"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(fmtCpfCnpj(e.target.value))}
                  style={FIELD}
                />
              </div>

              {/* CEP + Buscar */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={cep}
                    onChange={e => { setCep(fmtCep(e.target.value)); setCepError(null) }}
                    style={{ ...FIELD, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={fetchCep}
                    disabled={cepLoading}
                    className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold text-white flex-shrink-0 transition-all disabled:opacity-60"
                    style={{ background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.25)' }}
                  >
                    {cepLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    Buscar
                  </button>
                </div>
                {cepError && <p className="text-xs text-red-400 mt-1">{cepError}</p>}
              </div>

              {/* Logradouro + Número (2 cols) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Logradouro</label>
                  <input
                    type="text"
                    placeholder="Rua, Av..."
                    value={logradouro}
                    onChange={e => setLogradouro(e.target.value)}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Número</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    style={FIELD}
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Bairro</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  style={FIELD}
                />
              </div>

              {/* Cidade + UF (2 cols) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                    style={FIELD}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">UF</label>
                  <select
                    value={uf}
                    onChange={e => setUf(e.target.value)}
                    style={{ ...FIELD, appearance: 'none' }}
                  >
                    <option value="" style={{ background: '#0d1117' }}>—</option>
                    {UF_LIST.map(u => (
                      <option key={u} value={u} style={{ background: '#0d1117' }}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form error */}
              {formError && (
                <p className="text-xs text-red-400">⚠ {formError}</p>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                type="submit"
                disabled={!allFilled || loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{
                  background:  'linear-gradient(135deg, #00d2ff 0%, #9d50bb 100%)',
                  boxShadow:   allFilled && !loading ? '0 0 20px rgba(0,210,255,0.25)' : 'none',
                }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Salvando...' : 'Salvar Dados de Faturamento'}
              </button>
              <p className="text-center text-[11px] text-slate-700 mt-2">
                Todos os campos são obrigatórios para habilitar o faturamento.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/clients/BillingOnboardingModal.tsx
git commit -m "feat(clients): add BillingOnboardingModal with ViaCEP integration"
```

---

### Task 9: Atualizar SDRQualification.tsx

**Files:**
- Modify: `src/components/leads/SDRQualification.tsx`

**Step 1: Adicionar novos imports**

Substituir o import atual:
```tsx
import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp, Clock } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../lib/database.types'
import { ActivityTimeline } from './ActivityTimeline'
```

Por:
```tsx
import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp, Clock, UserPlus, Loader2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { Lead } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { ActivityTimeline } from './ActivityTimeline'
import { PIPELINE_STAGES } from '../../config/pipeline'
```

**Step 2: Atualizar interface Props**

Substituir:
```tsx
interface Props {
  lead: Lead
}
```

Por:
```tsx
interface Props {
  lead:       Lead
  onConverted?: (clientId: string, clientName: string) => void
}
```

**Step 3: Atualizar assinatura e adicionar state**

Substituir:
```tsx
export function SDRQualification({ lead }: Props) {
  const [faturamento, setFaturamento] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [dores, setDores] = useState('')
```

Por:
```tsx
export function SDRQualification({ lead, onConverted }: Props) {
  const [faturamento,    setFaturamento]    = useState('')
  const [teamSize,       setTeamSize]       = useState('')
  const [dores,          setDores]          = useState('')
  const [converting,     setConverting]     = useState(false)
  const [convertError,   setConvertError]   = useState<string | null>(null)
  const [stageUpdating,  setStageUpdating]  = useState(false)
```

**Step 4: Adicionar função `handleConvert`**

Inserir após os `useState`s, antes do `return`:
```tsx
  async function handleConvert() {
    setConverting(true)
    setConvertError(null)
    try {
      // 1. Criar cliente
      const { data, error: insertErr } = await (supabase as any)
        .from('clients')
        .insert({
          name:         lead.name,
          email:        lead.email,
          phone:        lead.phone,
          mrr:          0,
          health_score: 50,
          trend:        'flat',
          avatar:       lead.name.charAt(0).toUpperCase(),
          asaas_id:     null,
          segment:      null,
        })
        .select('id, name')
        .single()
      if (insertErr) throw new Error(insertErr.message)

      // 2. Marcar lead como fechado
      await (supabase as any)
        .from('leads')
        .update({ stage: 'fechado' })
        .eq('id', lead.id)

      // 3. Abrir modal de onboarding
      onConverted?.(data.id, data.name)
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Erro ao converter.')
    } finally {
      setConverting(false)
    }
  }

  async function handleStageChange(newStage: string) {
    setStageUpdating(true)
    await (supabase as any)
      .from('leads')
      .update({ stage: newStage })
      .eq('id', lead.id)
    setStageUpdating(false)
  }
```

**Step 5: Adicionar selector de estágio antes da seção Diagnóstico**

Inserir após `</section>` do bloco "Contato Básico" e antes do bloco `{/* Diagnóstico editável */}`:

```tsx
        {/* Estágio do Lead */}
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <ChevronDown size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Estágio</span>
          </div>
          <div className="relative">
            <select
              defaultValue={lead.stage}
              onChange={e => handleStageChange(e.target.value)}
              disabled={stageUpdating}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer disabled:opacity-60"
            >
              {PIPELINE_STAGES.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>
              ))}
            </select>
            {stageUpdating && (
              <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-400" />
            )}
          </div>
        </div>
```

**Step 6: Substituir os botões no footer**

Substituir o bloco `{/* Action Button */}`:

```tsx
      {/* Action Button */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/20 transition-all">
          Atualizar Lead
        </button>
        <button
          className="w-full py-2.5 rounded-xl text-[11px] font-bold text-white transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          Converter em Cliente
        </button>
      </div>
```

Por:

```tsx
      {/* Action Button */}
      <div className="p-4 border-t border-white/5 space-y-2">
        {convertError && (
          <p className="text-[11px] text-red-400 text-center pb-1">⚠ {convertError}</p>
        )}
        <button
          onClick={handleConvert}
          disabled={converting || lead.stage === 'fechado'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-white transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow:  '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          {converting
            ? <><Loader2 size={12} className="animate-spin" /> Convertendo...</>
            : <><UserPlus size={12} /> {lead.stage === 'fechado' ? 'Já convertido' : 'Converter em Cliente'}</>
          }
        </button>
      </div>
```

**Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 8: Commit**

```bash
git add src/components/leads/SDRQualification.tsx
git commit -m "feat(leads): wire convert button and stage dropdown in SDRQualification"
```

---

### Task 10: Atualizar ClientDrawer.tsx para receber conversão

**Files:**
- Modify: `src/components/leads/ClientDrawer.tsx`

**Step 1: Adicionar imports**

No topo, adicionar:
```tsx
import { useState } from 'react'
import { BillingOnboardingModal } from '../clients/BillingOnboardingModal'
```

> Nota: `useState` já pode estar importado — se estiver, não duplicar.

**Step 2: Adicionar state para modal de onboarding**

Após `const [chatDraft, setChatDraft] = useState('')`, adicionar:
```tsx
  const [onboarding, setOnboarding] = useState<{ clientId: string; clientName: string } | null>(null)
```

**Step 3: Passar `onConverted` para SDRQualification**

Localizar `<SDRQualification lead={lead} />` (nas duas ocorrências) e atualizar ambas para:
```tsx
<SDRQualification
  lead={lead}
  onConverted={(clientId, clientName) => setOnboarding({ clientId, clientName })}
/>
```

**Step 4: Adicionar BillingOnboardingModal antes do fechamento do `<aside>`**

Antes de `</aside>`, adicionar:
```tsx
      {onboarding && (
        <BillingOnboardingModal
          open={true}
          clientId={onboarding.clientId}
          clientName={onboarding.clientName}
          onClose={() => setOnboarding(null)}
        />
      )}
```

**Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/components/leads/ClientDrawer.tsx
git commit -m "feat(leads): open BillingOnboardingModal after lead conversion"
```

---

### Task 11: Atualizar Pipeline.tsx para conversão via Kanban

**Files:**
- Modify: `src/pages/Pipeline.tsx`

**Step 1: Adicionar imports**

Adicionar ao bloco de imports:
```tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { BillingOnboardingModal } from '../components/clients/BillingOnboardingModal'
```

> Nota: `useState` já pode estar importado — não duplicar.

**Step 2: Adicionar state para onboarding**

Após `const [showModal, setShowModal] = useState(false)`, adicionar:
```tsx
  const [onboarding, setOnboarding] = useState<{ clientId: string; clientName: string } | null>(null)
```

**Step 3: Adicionar função `handleConvertDeal`**

Adicionar após `handleBulkMove`:
```tsx
  async function handleConvertDeal(deal: PipelineDeal) {
    try {
      const clientName = deal.contact_name ?? deal.company
      const { data, error: err } = await (supabase as any)
        .from('clients')
        .insert({
          name:         clientName,
          mrr:          deal.value,
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
```

**Step 4: Atualizar `handleDragEnd` para disparar conversão ao mover para "fechado"**

Substituir:
```tsx
  function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = e
    if (!over || !active) return

    const dealId   = active.id as string
    const newStage = over.id as PipelineStage

    const currentDeal = deals.find(d => d.id === dealId)
    if (!currentDeal || currentDeal.stage === newStage) return

    moveDeal(dealId, newStage)
  }
```

Por:
```tsx
  function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = e
    if (!over || !active) return

    const dealId   = active.id as string
    const newStage = over.id as PipelineStage

    const currentDeal = deals.find(d => d.id === dealId)
    if (!currentDeal || currentDeal.stage === newStage) return

    moveDeal(dealId, newStage)

    if (newStage === 'fechado' && currentDeal.stage !== 'fechado') {
      handleConvertDeal(currentDeal)
    }
  }
```

**Step 5: Adicionar BillingOnboardingModal ao JSX**

Antes do `</div>` de fechamento do `return` da `PipelinePage`, adicionar:
```tsx
      {onboarding && (
        <BillingOnboardingModal
          open={true}
          clientId={onboarding.clientId}
          clientName={onboarding.clientName}
          onClose={() => setOnboarding(null)}
        />
      )}
```

**Step 6: TypeScript check final**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

**Step 7: Commit**

```bash
git add src/pages/Pipeline.tsx
git commit -m "feat(pipeline): open BillingOnboardingModal when deal moved to Fechado"
```

---

### Task 12: Verificação final e smoke test

**Step 1: Build de produção**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis"
npm run build
```

Esperado: sem erros de compilação.

**Step 2: Dev server**

```bash
npm run dev
```

**Step 3: Checklist manual**

- [ ] Menu lateral "Comercial" mostra sub-item "Clientes"
- [ ] `/comercial/clientes` carrega a ClientsPage com cards glass neon
- [ ] Busca por nome filtra os cards em tempo real
- [ ] Chips de segmento filtram corretamente
- [ ] Clicar num card navega para `/comercial/clientes/:id`
- [ ] SDR Workspace (abrir lead) → coluna CRM exibe dropdown de estágio
- [ ] Mudar estágio no dropdown persiste (reabrir lead confirma)
- [ ] Clicar "Converter em Cliente" → spinner → abre BillingOnboardingModal
- [ ] Modal é bloqueante (não fecha com ESC ou clique fora)
- [ ] Botão "Salvar" fica desabilitado até preencher todos os campos
- [ ] Buscar CEP válido auto-preenche logradouro/bairro/cidade/UF
- [ ] Submit salva no Supabase e fecha modal
- [ ] Pipeline: arrastar deal para coluna "Fechado" → abre BillingOnboardingModal
- [ ] Cliente criado pela conversão aparece na ClientsPage
