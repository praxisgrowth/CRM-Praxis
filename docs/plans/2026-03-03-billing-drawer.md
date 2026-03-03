# Billing Drawer — Módulo Financeiro Fase 2

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir a lógica de faturamento direto (asaasProvider) por um Drawer lateral com Tabs que insere cobranças únicas e assinaturas no Supabase para processamento assíncrono via n8n.

**Architecture:** BillingDrawer.tsx (slide-over com Tabs Única/Assinatura) + Toast.tsx reutilizável + useBilling.ts (funções de insert) + refactor de Financial.tsx (remove lógica Asaas direta, adiciona seção de cobranças com badge "Pendente Asaas").

**Tech Stack:** React 18 · TypeScript · Supabase (@supabase/supabase-js) · Tailwind CSS v4 · Lucide React

> **Nota:** Projeto sem test framework configurado — steps de teste omitidos. Siga exatamente a ordem das tarefas.

---

### Task 1: Adicionar tipos de FinancialSubscription ao database.types.ts

**Files:**
- Modify: `src/lib/database.types.ts:83-103` (após bloco Asaas/Financial Payments)
- Modify: `src/lib/database.types.ts:248-252` (Database interface, financial_payments block)

**Step 1: Adicionar types e interface após linha 103 (após `FinancialPayment`)**

Inserir após a interface `FinancialPayment` (após linha 103):

```typescript
export type SubscriptionCycle  = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export interface FinancialSubscription {
  id:                string
  client_id:         string | null
  client_name:       string | null
  asaas_id:          string | null
  description:       string
  value:             number
  cycle:             SubscriptionCycle
  status:            SubscriptionStatus
  billing_type:      AsaasBillingType
  next_due_date:     string | null
  created_at:        string
  updated_at:        string
}
```

**Step 2: Adicionar `financial_subscriptions` na Database interface**

Inserir após o bloco `financial_payments` (após linha 252):

```typescript
      financial_subscriptions: {
        Row: FinancialSubscription
        Insert: Omit<FinancialSubscription, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialSubscription, 'id' | 'created_at'>>
      }
```

**Step 3: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat(types): add FinancialSubscription type and Database entry"
```

---

### Task 2: Criar Toast.tsx

**Files:**
- Create: `src/components/financial/Toast.tsx`

**Step 1: Criar o componente**

```tsx
import { useEffect } from 'react'
import { Check, X, AlertCircle } from 'lucide-react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const isSuccess = type === 'success'
  const color = isSuccess ? '#10b981' : '#ef4444'
  const bg    = isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
  const bdr   = isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: bg,
        border: `1px solid ${bdr}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'fade-in 0.2s ease-out',
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20` }}
      >
        {isSuccess
          ? <Check size={13} style={{ color }} />
          : <AlertCircle size={13} style={{ color }} />
        }
      </div>
      <p className="text-sm font-medium flex-1" style={{ color: isSuccess ? '#6ee7b7' : '#fca5a5' }}>
        {message}
      </p>
      <button
        onClick={onClose}
        className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/financial/Toast.tsx
git commit -m "feat(financial): add reusable neon Toast component"
```

---

### Task 3: Criar useBilling.ts

**Files:**
- Create: `src/hooks/useBilling.ts`

**Step 1: Criar o hook/service**

```typescript
import { supabase } from '../lib/supabase'
import type { AsaasBillingType, SubscriptionCycle } from '../lib/database.types'

export interface CreatePaymentInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  due_date:    string   // ISO date YYYY-MM-DD
}

export interface CreateSubscriptionInput {
  client_id:   string
  client_name: string
  description: string
  value:       number
  billing_type: AsaasBillingType
  cycle:       SubscriptionCycle
}

export async function createPayment(input: CreatePaymentInput): Promise<void> {
  const { error } = await supabase
    .from('financial_payments')
    .insert({
      client_id:         input.client_id,
      client_name:       input.client_name,
      description:       input.description,
      value:             input.value,
      type:              'ONE_OFF',
      billing_type:      input.billing_type,
      due_date:          input.due_date,
      status:            'PENDING',
      asaas_id:          null,
      asaas_customer_id: null,
      payment_link:      null,
    })
  if (error) throw new Error(error.message)
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<void> {
  const { error } = await (supabase as any)
    .from('financial_subscriptions')
    .insert({
      client_id:   input.client_id,
      client_name: input.client_name,
      description: input.description,
      value:       input.value,
      billing_type: input.billing_type,
      cycle:       input.cycle,
      status:      'ACTIVE',
      asaas_id:    null,
    })
  if (error) throw new Error(error.message)
}
```

> **Nota:** O cast `as any` na `createSubscription` pode ser removido após a Task 1 gerar inferência correta — se o TypeScript reclamar, mantenha-o.

**Step 2: Commit**

```bash
git add src/hooks/useBilling.ts
git commit -m "feat(financial): add useBilling service for Supabase inserts"
```

---

### Task 4: Atualizar useFinancial.ts para buscar financial_payments

**Files:**
- Modify: `src/hooks/useFinancial.ts`

**Step 1: Adicionar `FinancialPayment` ao import**

Linha 3 atual:
```typescript
import type { FinancialTransaction, FinancialMRREntry } from '../lib/database.types'
```

Substituir por:
```typescript
import type { FinancialTransaction, FinancialMRREntry, FinancialPayment } from '../lib/database.types'
```

**Step 2: Adicionar `payments` à interface `UseFinancialResult`**

Após `transactions: FinancialTransaction[]` (linha 18), adicionar:
```typescript
  payments: FinancialPayment[]
```

**Step 3: Adicionar estado `payments` no hook**

Após `const [transactions, setTransactions]` (linha 74), adicionar:
```typescript
  const [payments, setPayments] = useState<FinancialPayment[]>([])
```

**Step 4: Adicionar query de payments no Promise.all**

No `Promise.all` dentro de `load()` (linha 86-90), substituir o bloco por:

```typescript
        const [mrrRes, txRes, clientRes, paymentsRes] = await Promise.all([
          supabase.from('mrr_history').select('*').order('recorded_at', { ascending: true }),
          supabase.from('financial_transactions').select('*').order('date', { ascending: false }),
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('financial_payments').select('*').order('created_at', { ascending: false }).limit(20),
        ])
```

**Step 5: Processar e setar os payments**

Após `setKpis(computeKPIs(...))` (linha 110), adicionar:
```typescript
        setPayments((paymentsRes.data ?? []) as FinancialPayment[])
```

**Step 6: Adicionar `payments` no return**

Linha 122, substituir:
```typescript
  return { kpis, mrrHistory, transactions, loading, error, refetch }
```
por:
```typescript
  return { kpis, mrrHistory, transactions, payments, loading, error, refetch }
```

**Step 7: Commit**

```bash
git add src/hooks/useFinancial.ts
git commit -m "feat(financial): expose financial_payments in useFinancial hook"
```

---

### Task 5: Criar BillingDrawer.tsx

**Files:**
- Create: `src/components/financial/BillingDrawer.tsx`

**Step 1: Criar o componente completo**

```tsx
import { useState, useEffect, useRef } from 'react'
import {
  X, Search, ChevronDown, Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createPayment, createSubscription } from '../../hooks/useBilling'
import type { AsaasBillingType, SubscriptionCycle } from '../../lib/database.types'

/* ─── Types ──────────────────────────────────────── */
interface ClientOption { id: string; name: string }
type Tab = 'unica' | 'assinatura'

interface BillingDrawerProps {
  open:      boolean
  onClose:   () => void
  onSuccess: (message: string) => void
}

/* ─── Constants ──────────────────────────────────── */
const CYCLES: { value: SubscriptionCycle; label: string }[] = [
  { value: 'WEEKLY',       label: 'Semanal'    },
  { value: 'BIWEEKLY',     label: 'Quinzenal'  },
  { value: 'MONTHLY',      label: 'Mensal'     },
  { value: 'QUARTERLY',    label: 'Trimestral' },
  { value: 'SEMIANNUALLY', label: 'Semestral'  },
  { value: 'YEARLY',       label: 'Anual'      },
]

const PAYMENT_METHODS: { value: AsaasBillingType; label: string }[] = [
  { value: 'PIX',         label: 'PIX'    },
  { value: 'BOLETO',      label: 'Boleto' },
  { value: 'CREDIT_CARD', label: 'Cartão' },
]

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

function fmtBRL(raw: string): string {
  const n = parseInt(raw.replace(/\D/g, '') || '0', 10)
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(fmt: string): number {
  return parseInt(fmt.replace(/\D/g, '') || '0', 10) / 100
}

/* ─── Component ──────────────────────────────────── */
export function BillingDrawer({ open, onClose, onSuccess }: BillingDrawerProps) {
  const [tab,             setTab]             = useState<Tab>('unica')
  const [clients,         setClients]         = useState<ClientOption[]>([])
  const [clientQuery,     setClientQuery]     = useState('')
  const [clientDropdown,  setClientDropdown]  = useState(false)
  const [selectedClient,  setSelectedClient]  = useState<ClientOption | null>(null)
  const [valueFmt,        setValueFmt]        = useState('R$ 0,00')
  const [description,     setDescription]     = useState('')
  const [paymentMethod,   setPaymentMethod]   = useState<AsaasBillingType>('PIX')
  const [dueDate,         setDueDate]         = useState('')
  const [cycle,           setCycle]           = useState<SubscriptionCycle>('MONTHLY')
  const [loading,         setLoading]         = useState(false)
  const [formError,       setFormError]       = useState<string | null>(null)

  const comboRef = useRef<HTMLDivElement>(null)

  /* Load clients when drawer opens */
  useEffect(() => {
    if (!open) return
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setClients(data as ClientOption[]) })
  }, [open])

  /* Reset on close */
  useEffect(() => {
    if (!open) {
      setTab('unica')
      setClientQuery('')
      setSelectedClient(null)
      setValueFmt('R$ 0,00')
      setDescription('')
      setPaymentMethod('PIX')
      setDueDate('')
      setCycle('MONTHLY')
      setFormError(null)
    }
  }, [open])

  /* Close combobox on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredClients = clients
    .filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()))
    .slice(0, 8)

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValueFmt(fmtBRL(e.target.value))
  }

  function selectClient(c: ClientOption) {
    setSelectedClient(c)
    setClientQuery(c.name)
    setClientDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseBRL(valueFmt)

    if (!selectedClient)      { setFormError('Selecione um cliente.');               return }
    if (value <= 0)            { setFormError('Informe um valor maior que zero.');    return }
    if (!description.trim())   { setFormError('Informe uma descrição.');              return }
    if (tab === 'unica' && !dueDate) { setFormError('Informe a data de vencimento.'); return }

    setLoading(true)
    setFormError(null)

    try {
      if (tab === 'unica') {
        await createPayment({
          client_id:   selectedClient.id,
          client_name: selectedClient.name,
          description: description.trim(),
          value,
          billing_type: paymentMethod,
          due_date:    dueDate,
        })
        onSuccess('Cobrança enviada! O n8n irá processar em instantes.')
      } else {
        await createSubscription({
          client_id:   selectedClient.id,
          client_name: selectedClient.name,
          description: description.trim(),
          value,
          billing_type: paymentMethod,
          cycle,
        })
        onSuccess('Assinatura criada! O n8n irá ativar em instantes.')
      }
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width:      420,
          background: 'rgba(8,12,20,0.98)',
          borderLeft: '1px solid rgba(0,210,255,0.18)',
          boxShadow:  '-32px 0 80px rgba(0,0,0,0.6)',
          animation:  'slide-in-right 0.22s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h3 className="text-base font-semibold text-white">Nova Cobrança</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cobrança única ou assinatura recorrente</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['unica', 'assinatura'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t ? 'rgba(0,210,255,0.1)' : 'rgba(255,255,255,0.03)',
                color:      tab === t ? '#00d2ff' : '#64748b',
                border:     `1px solid ${tab === t ? 'rgba(0,210,255,0.3)' : 'transparent'}`,
              }}
            >
              {t === 'unica' ? 'Cobrança Única' : 'Assinatura Recorrente'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">

            {/* Cliente — Combobox */}
            <div ref={comboRef} className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Cliente</label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientQuery}
                  onChange={e => { setClientQuery(e.target.value); setSelectedClient(null) }}
                  onFocus={() => setClientDropdown(true)}
                  style={{ ...FIELD, paddingLeft: 32 }}
                />
              </div>
              {clientDropdown && filteredClients.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden"
                  style={{
                    background: 'rgba(13,20,34,0.98)',
                    border:     '1px solid rgba(255,255,255,0.1)',
                    boxShadow:  '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseDown={() => selectClient(c)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Valor</label>
              <input
                type="text"
                inputMode="numeric"
                value={valueFmt}
                onChange={handleValueChange}
                onFocus={e => e.target.select()}
                style={FIELD}
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Gestão de tráfego — Março 2026"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={FIELD}
              />
            </div>

            {/* Meio de Pagamento */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Meio de Pagamento</label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: paymentMethod === m.value ? 'rgba(0,210,255,0.1)'       : 'rgba(255,255,255,0.04)',
                      border:     `1px solid ${paymentMethod === m.value ? 'rgba(0,210,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      color:      paymentMethod === m.value ? '#00d2ff' : '#475569',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condicional: Data de Vencimento (Única) */}
            {tab === 'unica' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ ...FIELD, colorScheme: 'dark' }}
                />
              </div>
            )}

            {/* Condicional: Ciclo de Recorrência (Assinatura) */}
            {tab === 'assinatura' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Ciclo de Recorrência</label>
                <div className="relative">
                  <select
                    value={cycle}
                    onChange={e => setCycle(e.target.value as SubscriptionCycle)}
                    style={{ ...FIELD, appearance: 'none', paddingRight: 32 }}
                  >
                    {CYCLES.map(c => (
                      <option key={c.value} value={c.value} style={{ background: '#0d1117' }}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Erro de formulário */}
            {formError && (
              <p className="text-xs text-red-400">⚠ {formError}</p>
            )}

          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #00d2ff 0%, #9d50bb 100%)',
                boxShadow:  loading ? 'none' : '0 0 20px rgba(0,210,255,0.25)',
              }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading
                ? 'Salvando...'
                : tab === 'unica' ? 'Criar Cobrança' : 'Criar Assinatura'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/financial/BillingDrawer.tsx
git commit -m "feat(financial): add BillingDrawer with tabs, combobox and BRL mask"
```

---

### Task 6: Refatorar Financial.tsx

**Files:**
- Modify: `src/pages/Financial.tsx`

Esta é a tarefa mais extensa. Execute cada step em sequência.

**Step 1: Substituir o bloco de imports (linhas 1-17)**

```tsx
import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, Percent, Wallet, BarChart2,
  AlertCircle, RefreshCw, ArrowUpRight, ArrowDownRight,
  Plus, Clock,
} from 'lucide-react'
import { useFinancial } from '../hooks/useFinancial'
import type { FinancialKPIs, UseFinancialResult } from '../hooks/useFinancial'
import type { FinancialTransaction, TransactionStatus, FinancialPayment } from '../lib/database.types'
import { BillingDrawer } from '../components/financial/BillingDrawer'
import { Toast } from '../components/financial/Toast'
```

**Step 2: Remover a const `BILLING_OPTIONS` (linhas 37-41) inteiramente**

Remover:
```tsx
const BILLING_OPTIONS: { value: AsaasBillingType; label: string }[] = [
  { value: 'PIX',         label: 'PIX'         },
  { value: 'BOLETO',      label: 'Boleto'      },
  { value: 'CREDIT_CARD', label: 'Cartão'      },
]
```

**Step 3: Atualizar `TABLE_HEADERS` (linha 35)**

Substituir:
```tsx
const TABLE_HEADERS = ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Data', 'Ações']
```
por:
```tsx
const TABLE_HEADERS = ['Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Data']
```

**Step 4: Remover o componente `InvoiceBanner` inteiro (linhas 351-409)**

Apagar todo o bloco `interface InvoiceBannerProps` + `function InvoiceBanner(...)`.

**Step 5: Atualizar a assinatura do `TxRow` (linhas 223-231)**

Substituir:
```tsx
function TxRow({
  tx,
  onGenerateInvoice,
  generating,
}: {
  tx: FinancialTransaction
  onGenerateInvoice?: (tx: FinancialTransaction) => Promise<void>
  generating: boolean
}) {
```
por:
```tsx
function TxRow({ tx }: { tx: FinancialTransaction }) {
```

**Step 6: Remover a `canInvoice` var e a célula de Ações do TxRow**

Remover a linha:
```tsx
  const canInvoice = tx.status === 'pendente' && isRec && !!tx.client_id
```

Remover o bloco `{/* Ações — botão Asaas */}` inteiro (da `<td>` que contém o botão "Gerar Fatura"):
```tsx
      {/* Ações — botão Asaas */}
      <td className="px-4 py-3">
        {canInvoice && (
          ...
        )}
      </td>
```

**Step 7: Adicionar componente `PaymentRow` antes de `SkeletonTxRow`**

Adicionar após a função `TxRow` e antes de `SkeletonTxRow`:

```tsx
/* ─── Payment row (financial_payments) ──────────── */
const PAYMENT_STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',   color: '#f59e0b' },
  CONFIRMED: { label: 'Confirmado', color: '#10b981' },
  RECEIVED:  { label: 'Recebido',   color: '#10b981' },
  OVERDUE:   { label: 'Atrasado',   color: '#ef4444' },
  REFUNDED:  { label: 'Estornado',  color: '#8b5cf6' },
  CANCELLED: { label: 'Cancelado',  color: '#64748b' },
}

function PaymentRow({ payment }: { payment: FinancialPayment }) {
  const st = PAYMENT_STATUS_CFG[payment.status] ?? { label: payment.status, color: '#64748b' }

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Descrição */}
      <td className="px-4 py-3">
        <span className="text-sm text-white font-medium">{payment.description}</span>
      </td>

      {/* Cliente */}
      <td className="px-4 py-3">
        <span className="text-xs text-slate-400">{payment.client_name ?? '—'}</span>
      </td>

      {/* Tipo */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
          style={{
            background: 'rgba(0,210,255,0.1)',
            color: '#00d2ff',
            border: '1px solid rgba(0,210,255,0.25)',
          }}
        >
          {payment.type === 'ONE_OFF' ? 'Única' : 'Recorrente'}
        </span>
      </td>

      {/* Valor */}
      <td className="px-4 py-3 tabular-nums">
        <span className="text-sm font-semibold text-emerald-400">
          {payment.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{
            background: `${st.color}18`,
            color: st.color,
            border: `1px solid ${st.color}40`,
          }}
        >
          {st.label}
        </span>
      </td>

      {/* Pendente Asaas / Data */}
      <td className="px-4 py-3">
        {payment.asaas_id === null ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: 'rgba(245,158,11,0.1)',
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <Clock size={10} />
            Pendente Asaas
          </span>
        ) : (
          <span className="text-xs text-slate-500">{fmtDate(payment.created_at)}</span>
        )}
      </td>
    </tr>
  )
}
```

**Step 8: Atualizar a função `FinancialPage`**

Substituir o bloco de state da `FinancialPage` (linhas 412-453):

```tsx
export function FinancialPage() {
  const { kpis, mrrHistory, transactions, payments, loading, error, refetch } = useFinancial()
  const [txFilter,     setTxFilter]     = useState<TxFilter>('todos')
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [toast,        setToast]        = useState<{ message: string } | null>(null)
```

**Step 9: Atualizar o JSX do header da página**

Substituir o bloco `<div className="flex items-center gap-2">` dentro do header (linhas 480-503) por:

```tsx
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Fev / 2025
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0,210,255,0.2) 0%, rgba(157,80,187,0.2) 100%)',
              border: '1px solid rgba(0,210,255,0.3)',
            }}
          >
            <Plus size={13} />
            Nova Cobrança
          </button>
        </div>
```

**Step 10: Remover os banners Asaas do JSX (linhas 525-542)**

Remover os dois blocos abaixo do `{/* Error banner — DB */}`:
- `{/* Banner sucesso Asaas */}` com `{invoiceResult && <InvoiceBanner ... />}`
- `{/* Banner erro Asaas */}` com `{invoiceError && <div ... />}`

**Step 11: Adicionar seção "Cobranças Recentes" após o MRR chart**

Inserir antes do bloco `{/* Transactions */}`:

```tsx
      {/* Cobranças Recentes */}
      {payments.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden flex-shrink-0">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm font-semibold text-white">Cobranças Recentes</p>
            <span className="text-xs text-slate-500">{payments.length} cobrança{payments.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead style={{ background: 'rgba(13,20,34,0.96)' }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Descrição', 'Cliente', 'Tipo', 'Valor', 'Status', 'Asaas'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider uppercase"
                    style={{ color: '#475569' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map(p => <PaymentRow key={p.id} payment={p} />)}
            </tbody>
          </table>
        </div>
      )}
```

**Step 12: Atualizar a renderização das TxRow (remover props extras)**

Na renderização dentro da tabela de transações, substituir:
```tsx
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      onGenerateInvoice={handleGenerateInvoice}
                      generating={generatingId === tx.id}
                    />
```
por:
```tsx
                    <TxRow key={tx.id} tx={tx} />
```

**Step 13: Adicionar BillingDrawer e Toast ao final do JSX, antes do `</div>` de fechamento da página**

```tsx
      <BillingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={msg => { setToast({ message: msg }); refetch() }}
      />

      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
```

**Step 14: Verificar TypeScript**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis"
npx tsc --noEmit
```

Resolver erros remanescentes se houver (normalmente relacionados a imports não usados).

**Step 15: Commit final**

```bash
git add src/pages/Financial.tsx
git commit -m "feat(financial): replace direct Asaas calls with async Supabase queue + BillingDrawer"
```

---

### Task 7: Apagar asaasProvider.ts (limpeza)

**Files:**
- Delete: `src/services/asaasProvider.ts`

**Step 1: Verificar que nenhum outro arquivo importa asaasProvider**

```bash
grep -r "asaasProvider" "C:/Users/gusta/Documents/Antigravity/CRM Praxis/src"
```

Esperado: nenhum resultado (após Task 6 remover os imports do Financial.tsx).

**Step 2: Deletar o arquivo**

```bash
rm "C:/Users/gusta/Documents/Antigravity/CRM Praxis/src/services/asaasProvider.ts"
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(financial): remove asaasProvider — billing now via Supabase queue"
```

---

### Task 8: Smoke test visual

**Step 1: Iniciar o dev server**

```bash
cd "C:/Users/gusta/Documents/Antigravity/CRM Praxis"
npm run dev
```

**Step 2: Verificar os seguintes itens manualmente**

- [ ] Página Financeiro carrega sem erros no console
- [ ] Botão "Nova Cobrança" aparece no header
- [ ] Clicar no botão abre o Drawer da direita com animação slide-in
- [ ] Tab "Cobrança Única" está ativa por padrão
- [ ] Campo Valor formata como BRL ao digitar (ex: digitar "150000" → "R$ 1.500,00")
- [ ] Combobox de Cliente filtra ao digitar e permite selecionar
- [ ] Toggle de Meio de Pagamento funciona (PIX/Boleto/Cartão)
- [ ] Tab "Assinatura Recorrente" troca campo "Data de Vencimento" por "Ciclo"
- [ ] Submit sem cliente exibe "Selecione um cliente."
- [ ] Submit válido fecha drawer e exibe Toast de sucesso
- [ ] Registro inserido aparece na seção "Cobranças Recentes" com badge "Pendente Asaas"
- [ ] Botão "Gerar Fatura" não existe mais na tabela de transações
