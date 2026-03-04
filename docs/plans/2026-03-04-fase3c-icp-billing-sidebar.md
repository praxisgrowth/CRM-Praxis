# Fase 3c — ICP Persistence, Billing Activation & Sidebar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persistir dados ICP do lead no Supabase, adicionar alerta de Asaas ID no BillingDrawer e reposicionar 'Clientes' no Sidebar.

**Architecture:** Três mudanças independentes e cirúrgicas. Task 1 requer migração SQL manual (instruções incluídas) + atualização de tipo TypeScript. Tasks 2–4 são mudanças puras de componente/hook sem banco. Nenhuma dependência entre as tasks.

**Tech Stack:** React 18 · TypeScript · Tailwind CSS v4 · Supabase (`as any` pattern) · Vite

---

### Task 1: Migration SQL + Atualizar Lead interface

**Files:**
- Create: `supabase/icp_migration.sql`
- Modify: `src/lib/database.types.ts`

**Context:** A tabela `leads` não tem colunas para dados ICP. Precisamos de `faturamento TEXT`, `team_size TEXT`, `dores TEXT`. A `Lead` interface precisa refletir esses campos.

**Step 1: Criar arquivo de migração**

Criar `supabase/icp_migration.sql` com o seguinte conteúdo:

```sql
-- ================================================================
-- CRM Praxis · ICP Migration — SDR Qualification fields
-- Execute no Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS faturamento TEXT,
  ADD COLUMN IF NOT EXISTS team_size   TEXT,
  ADD COLUMN IF NOT EXISTS dores       TEXT;

-- Notifica PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
```

**Step 2: Atualizar a interface Lead em `src/lib/database.types.ts`**

Localizar a interface `Lead` (linha ~19) e adicionar os três campos no bloco Pipeline fields:

```typescript
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
  // ─── ICP fields (icp_migration.sql) ───────────────────────
  faturamento: string | null
  team_size:   string | null
  dores:       string | null
  // ──────────────────────────────────────────────────────────
  created_at: string
  updated_at: string
}
```

**Step 3: Verificar build TypeScript**

```bash
npx tsc -b
```

Expected: zero erros.

**Step 4: Avisar usuário para rodar a migração**

⚠️ **AÇÃO MANUAL NECESSÁRIA:** Executar `supabase/icp_migration.sql` no Supabase Dashboard → SQL Editor antes de prosseguir para Task 2. Sem isso, os saves vão falhar silenciosamente (colunas não existem no banco).

---

### Task 2: SDRQualification — Auto-save ICP no Supabase

**Files:**
- Modify: `src/components/leads/SDRQualification.tsx`

**Context:** Os campos Faturamento, Team Size e Dores devem:
1. Inicializar com os valores salvos no lead (do Supabase)
2. Salvar automaticamente no Supabase ao blur (input/textarea) ou onChange (select)
3. Mostrar indicador visual de saving

**Step 1: Adicionar estado de saving e atualizar estado inicial**

Localizar os 3 estados ICP (linhas ~34-36):

```tsx
// Antes:
const [faturamento,   setFaturamento]   = useState('')
const [teamSize,      setTeamSize]      = useState('')
const [dores,         setDores]         = useState('')
```

Substituir por (inicializar do lead):

```tsx
const [faturamento,   setFaturamento]   = useState(lead.faturamento   ?? '')
const [teamSize,      setTeamSize]      = useState(lead.team_size      ?? '')
const [dores,         setDores]         = useState(lead.dores          ?? '')
const [icpSaving,     setIcpSaving]     = useState(false)
```

**Step 2: Adicionar função saveICP antes do return**

Adicionar antes do `return (`:

```tsx
async function saveICP(patch: { faturamento?: string; team_size?: string; dores?: string }) {
  setIcpSaving(true)
  await (supabase as any)
    .from('leads')
    .update(patch)
    .eq('id', lead.id)
  setIcpSaving(false)
}
```

**Step 3: Adicionar indicador de saving no header da seção Diagnóstico**

Localizar:
```tsx
<div className="px-4 py-2 bg-purple-500/5 border-y border-purple-500/10 mb-2">
  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Diagnóstico</p>
</div>
```

Substituir por:
```tsx
<div className="px-4 py-2 bg-purple-500/5 border-y border-purple-500/10 mb-2 flex items-center justify-between">
  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Diagnóstico</p>
  {icpSaving && (
    <Loader2 size={10} className="animate-spin text-purple-400" />
  )}
</div>
```

**Step 4: Atualizar campo Faturamento com onBlur**

Localizar o input de Faturamento:
```tsx
<input
  type="text"
  value={faturamento}
  onChange={e => setFaturamento(e.target.value)}
  placeholder="ex: R$ 80.000/mês"
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
/>
```

Substituir por:
```tsx
<input
  type="text"
  value={faturamento}
  onChange={e => setFaturamento(e.target.value)}
  onBlur={e => saveICP({ faturamento: e.target.value.trim() || null })}
  placeholder="ex: R$ 80.000/mês"
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600"
/>
```

**Step 5: Atualizar select Tamanho do Time com onChange persistente**

Localizar o select de teamSize:
```tsx
<select
  value={teamSize}
  onChange={e => setTeamSize(e.target.value)}
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
>
```

Substituir por:
```tsx
<select
  value={teamSize}
  onChange={e => { setTeamSize(e.target.value); saveICP({ team_size: e.target.value || null }) }}
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
>
```

**Step 6: Atualizar textarea Dores com onBlur**

Localizar o textarea de dores:
```tsx
<textarea
  value={dores}
  onChange={e => setDores(e.target.value)}
  placeholder="Descreva os principais desafios do lead..."
  rows={3}
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-slate-600"
/>
```

Substituir por:
```tsx
<textarea
  value={dores}
  onChange={e => setDores(e.target.value)}
  onBlur={e => saveICP({ dores: e.target.value.trim() || null })}
  placeholder="Descreva os principais desafios do lead..."
  rows={3}
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-slate-600"
/>
```

**Step 7: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 3: BillingDrawer — Warning de Asaas ID

**Files:**
- Modify: `src/components/financial/BillingDrawer.tsx`

**Context:** A query de clientes deve incluir `asaas_id`. Se o cliente selecionado não tiver `asaas_id`, exibir badge âmbar "⚠ Sem Asaas ID" com tooltip explicativo. O formulário NÃO é bloqueado — a cobrança será inserida no Supabase e o n8n tentará processar quando o cliente tiver um `asaas_id`.

**Step 1: Atualizar interface ClientOption para incluir asaas_id**

Localizar:
```tsx
interface ClientOption { id: string; name: string }
```

Substituir por:
```tsx
interface ClientOption { id: string; name: string; asaas_id: string | null }
```

**Step 2: Atualizar query de clientes no useEffect para incluir asaas_id**

Localizar:
```tsx
supabase
  .from('clients')
  .select('id, name')
  .order('name')
  .then(({ data }) => { if (data) setClients(data as ClientOption[]) })
```

Substituir por:
```tsx
supabase
  .from('clients')
  .select('id, name, asaas_id')
  .order('name')
  .then(({ data }) => { if (data) setClients(data as ClientOption[]) })
```

**Step 3: Adicionar badge de aviso após o combobox de cliente**

Localizar o fechamento do comboRef div (`</div>` logo após o dropdown de filteredClients). Após esse fechamento, adicionar o badge:

```tsx
{selectedClient && !selectedClient.asaas_id && (
  <div
    className="flex items-start gap-2 px-3 py-2 rounded-lg mt-1"
    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
  >
    <span className="text-amber-400 text-xs leading-tight">
      ⚠ <strong>Sem Asaas ID</strong> — este cliente ainda não tem cadastro no Asaas.
      A cobrança será salva e processada automaticamente pelo n8n quando o cliente
      for sincronizado.
    </span>
  </div>
)}
```

**Step 4: Verificar build**

```bash
npx tsc -b
```

Expected: zero erros.

---

### Task 4: Sidebar — Clientes acima de Comercial

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Context:** Mover o item 'Clientes' (atualmente na posição 3, entre Comercial e Operação) para a posição 2 (entre Dashboard e Comercial).

**Step 1: Reordenar NAV_ITEMS**

Localizar o array `NAV_ITEMS` e reordenar para:

```tsx
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    label: 'Clientes',
    icon: Users,
    to: '/comercial/clientes',
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

**Step 2: Verificar build final**

```bash
npx tsc -b && npm run build
```

Expected: zero TypeScript erros, build `✓` sem erros.

---

## Ordem de Execução

Tasks são independentes. Executar em ordem:

1 → 2 → 3 → 4

⚠️ **Antes da Task 2**, rodar `supabase/icp_migration.sql` no Supabase Dashboard.

Após Task 4: `npx tsc -b && npm run build` deve passar limpo.
