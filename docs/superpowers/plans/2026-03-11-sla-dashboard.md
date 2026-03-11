# SLA Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar seção "Performance & SLA" no `Dashboard.tsx` com 2 cards glassmorphism mostrando tempo médio de entrega da agência (projetos concluídos) e tempo médio de aprovação do cliente (nexus_files → nexus_approvals), visível apenas para ADMIN/MEMBER.

**Architecture:** Novo hook `useSLAMetrics` encapsula as 2 queries Supabase. Novo componente `SLADashboard` renderiza os cards. `Dashboard.tsx` importa e renderiza condicionalmente pelo role. Sem novas tabelas — usa dados existentes de `projects` e `nexus_approvals`.

**Tech Stack:** React, TypeScript, Supabase JS, lucide-react, Tailwind CSS, useAuth

---

## Chunk 1: Hook useSLAMetrics

### Task 1: Criar src/hooks/useSLAMetrics.ts

**Files:**
- Create: `src/hooks/useSLAMetrics.ts`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/useSLAMetrics.ts
import { useState, useEffect } from 'react'
import { supabase as _supabase } from '../lib/supabase'

const db = _supabase as unknown as { from(t: string): any }

export interface SLAMetrics {
  avgDeliveryDays:  number | null   // média (updated_at - created_at) em projetos concluídos
  deliveryCount:    number          // n= amostras de entrega
  avgApprovalHours: number | null   // média (nexus_approvals.created_at - nexus_files.created_at) aprovados
  approvalCount:    number          // n= amostras de aprovação
  loading:          boolean
  error:            string | null
}

export function useSLAMetrics(): SLAMetrics {
  const [metrics, setMetrics] = useState<Omit<SLAMetrics, 'loading' | 'error'>>({
    avgDeliveryDays:  null,
    deliveryCount:    0,
    avgApprovalHours: null,
    approvalCount:    0,
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // ── Métrica 1: Tempo médio de entrega ─────────────────────────
        const { data: projects, error: projErr } = await db
          .from('projects')
          .select('created_at, updated_at')
          .eq('status', 'concluido')

        if (projErr) throw new Error(projErr.message)

        const deliveryDays = (projects ?? []).map((p: { created_at: string; updated_at: string }) => {
          const ms = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()
          return ms / (1000 * 60 * 60 * 24) // ms → days
        }).filter((d: number) => d >= 0)

        const avgDeliveryDays = deliveryDays.length > 0
          ? deliveryDays.reduce((a: number, b: number) => a + b, 0) / deliveryDays.length
          : null

        // ── Métrica 2: Tempo médio de aprovação do cliente ─────────────
        const { data: approvals, error: appErr } = await db
          .from('nexus_approvals')
          .select('created_at, file_id, nexus_files(created_at)')
          .eq('action', 'aprovado')

        if (appErr) throw new Error(appErr.message)

        const approvalHours = (approvals ?? [])
          .filter((a: any) => a.nexus_files?.created_at)
          .map((a: any) => {
            const ms = new Date(a.created_at).getTime() - new Date(a.nexus_files.created_at).getTime()
            return ms / (1000 * 60 * 60) // ms → hours
          })
          .filter((h: number) => h >= 0)

        const avgApprovalHours = approvalHours.length > 0
          ? approvalHours.reduce((a: number, b: number) => a + b, 0) / approvalHours.length
          : null

        setMetrics({
          avgDeliveryDays,
          deliveryCount:   deliveryDays.length,
          avgApprovalHours,
          approvalCount:   approvalHours.length,
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return { ...metrics, loading, error }
}
```

- [ ] **Step 2: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 3: Commit**
```bash
git add src/hooks/useSLAMetrics.ts
git commit -m "feat(sla): add useSLAMetrics hook"
```

---

## Chunk 2: Componente SLADashboard

### Task 2: Criar src/components/dashboard/SLADashboard.tsx

**Files:**
- Create: `src/components/dashboard/SLADashboard.tsx`

Referência de estilo: `src/pages/Dashboard.tsx` — `KPICard` usa `linear-gradient`, `backdrop-filter: blur(20px)`, `border: 1px solid ${color}25`. Replicar esse padrão.

- [ ] **Step 1: Criar o componente**

```typescript
// src/components/dashboard/SLADashboard.tsx
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useSLAMetrics } from '../../hooks/useSLAMetrics'

function SLACard({
  label,
  value,
  unit,
  count,
  color,
  icon: Icon,
  loading,
  empty,
}: {
  label:   string
  value:   number | null
  unit:    string
  count:   number
  color:   string
  icon:    React.ElementType
  loading: boolean
  empty:   boolean
}) {
  return (
    <div
      className="rounded-2xl p-5 cursor-default transition-all duration-300"
      style={{
        background:      `linear-gradient(135deg, ${color}12 0%, rgba(13,17,23,0.92) 65%)`,
        border:          `1px solid ${color}22`,
        backdropFilter:  'blur(20px)',
        boxShadow:       `0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        {!loading && !empty && count > 0 && (
          <span className="text-[10px] text-slate-600 font-medium">n={count}</span>
        )}
      </div>

      {loading ? (
        <div className="h-9 w-24 rounded-xl animate-pulse mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
      ) : empty || value === null ? (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle size={13} className="text-slate-600" />
          <span className="text-sm text-slate-600">Sem dados</span>
        </div>
      ) : (
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className="text-3xl font-black leading-none"
            style={{ color, textShadow: `0 0 20px ${color}60` }}
          >
            {Math.round(value * 10) / 10}
          </span>
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
      )}

      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  )
}

export function SLADashboard() {
  const { avgDeliveryDays, deliveryCount, avgApprovalHours, approvalCount, loading, error } = useSLAMetrics()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={14} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-400">Performance & SLA</h3>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3 px-1">Erro ao carregar métricas: {error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SLACard
          label="Tempo médio de entrega (agência)"
          value={avgDeliveryDays}
          unit="dias"
          count={deliveryCount}
          color="#00d2ff"
          icon={Clock}
          loading={loading}
          empty={deliveryCount === 0 && !loading}
        />
        <SLACard
          label="Tempo médio de aprovação (cliente)"
          value={avgApprovalHours}
          unit="horas"
          count={approvalCount}
          color="#a855f7"
          icon={CheckCircle2}
          loading={loading}
          empty={approvalCount === 0 && !loading}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 3: Commit**
```bash
git add src/components/dashboard/SLADashboard.tsx
git commit -m "feat(sla): add SLADashboard component"
```

---

## Chunk 3: Integração no Dashboard.tsx

### Task 3: Integrar SLADashboard em Dashboard.tsx

**Files:**
- Modify: `src/pages/Dashboard.tsx`

`Dashboard.tsx` já importa `useDashboard` e renderiza os KPIs. Adicionar `useAuth` para verificar role e renderizar `SLADashboard` condicionalmente.

- [ ] **Step 1: Adicionar imports**

No topo de `Dashboard.tsx`, adicionar:
```typescript
import { useAuth }        from '../contexts/AuthContext'
import { SLADashboard }   from '../components/dashboard/SLADashboard'
```

- [ ] **Step 2: Consumir `profile` dentro de `DashboardPage`**

No início da função `DashboardPage`, adicionar:
```typescript
const { profile } = useAuth()
const showSLA = profile?.role === 'ADMIN' || profile?.role === 'MEMBER'
```

- [ ] **Step 3: Renderizar SLADashboard abaixo de `ClientHealthList`**

Após `<ClientHealthList clients={clients} loading={loading} />`, adicionar:
```tsx
{/* Performance & SLA — ADMIN/MEMBER only */}
{showSLA && <SLADashboard />}
```

- [ ] **Step 4: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 5: Commit final**
```bash
git add src/pages/Dashboard.tsx src/components/dashboard/SLADashboard.tsx src/hooks/useSLAMetrics.ts
git commit -m "feat(dashboard): integrate SLA Performance section for ADMIN/MEMBER"
```
