# Fase 3a — Ciclo de Vida Lead → Cliente

**Data:** 2026-03-03
**Escopo:** ClientsPage · Conversão Lead→Cliente · Modal de Onboarding de Faturamento · Pipeline Config Sync
**Stack:** React 18 · TypeScript · Supabase · Tailwind CSS v4 · Lucide React

---

## Decisões de Design

| Questão | Decisão |
|---------|---------|
| Schema de faturamento | Expandir `clients` com colunas nullable (email, phone, cpf_cnpj, cep, logradouro, numero, bairro, cidade, uf) |
| Pipeline stages | Sincronizar labels via arquivo de config compartilhado — sem banco |
| Ações financeiras | Fase 3b (ClientDetail) — fora deste escopo |

---

## Seção 1 — Schema Migration

### SQL (`supabase/clients_billing_migration.sql`)

```sql
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

### Types TS (`database.types.ts`)

Adicionar campos opcionais à interface `Client`:
```typescript
email?:      string | null
phone?:      string | null
cpf_cnpj?:   string | null
cep?:        string | null
logradouro?: string | null
numero?:     string | null
bairro?:     string | null
cidade?:     string | null
uf?:         string | null
```

---

## Seção 2 — ClientsPage + Navegação

### Rota
`/comercial/clientes` → `src/pages/Clients.tsx`

### Sidebar
Sub-item "Clientes" adicionado em Comercial (após Pipeline), em `Sidebar.tsx` NAV_ITEMS.

### App.tsx
Nova `<Route path="clientes" element={<ClientsPage />} />` dentro de `comercial`.

### Hook: `useClients.ts`
```
supabase.from('clients').select('*').order('mrr', { ascending: false })
```
Expõe: `clients`, `loading`, `error`, `refetch`.

### Layout `Clients.tsx`
- **Header:** busca por nome (input) + chips de filtro por segmento + badge count por segmento
- **Grid de cards** (3 colunas, glass neon):
  - Avatar inicial do nome (div colorida)
  - Nome do cliente + segmento (badge pill)
  - MRR formatado em BRL
  - Health score com cor: verde ≥70, amarelo ≥40, vermelho <40
  - Trend icon: TrendingUp (verde), TrendingDown (vermelho), Minus (slate)
  - Clique → `navigate('/comercial/clientes/:id')`

---

## Seção 3 — Conversão Lead → Cliente

### Botão no SDRQualification
Local: seção inferior da coluna CRM no SDR Workspace (`SDRQualification.tsx`).
Label: "Converter em Cliente" com ícone `UserPlus`.
Estado: loading enquanto o insert acontece.

### Lógica de conversão (`useConvertLead.ts` ou inline)
```
1. INSERT INTO clients (name, email, phone) VALUES (lead.name, lead.email, lead.phone)
   → retorna client_id
2. UPDATE leads SET stage = 'fechado' WHERE id = lead.id
3. onSuccess(client_id) → abre BillingOnboardingModal
```

### Kanban trigger (Pipeline.tsx)
Quando `moveDeal(dealId, 'fechado')` é chamado:
1. Executa o move normal
2. Em seguida abre `BillingOnboardingModal` pré-preenchido com:
   - `name`: `deal.contact_name ?? deal.company`
   - `client_id`: do INSERT INTO clients feito naquele momento

---

## Seção 4 — BillingOnboardingModal

**Componente:** `src/components/clients/BillingOnboardingModal.tsx`

### Props
```typescript
interface BillingOnboardingModalProps {
  open:      boolean
  clientId:  string
  clientName: string
  onClose:   () => void   // chamado apenas após submit bem-sucedido
}
```

### Comportamento
- Backdrop bloqueado: `pointer-events: none` no overlay ou `onClick` sem fechar
- **Sem botão de fechar** (X removido) — modal totalmente bloqueante
- Único botão de ação: **Salvar** (desabilitado até todos os campos obrigatórios preenchidos)

### Campos
| Campo | Tipo | Validação |
|-------|------|-----------|
| CPF/CNPJ | text + máscara | obrigatório; aceita 11 (CPF) ou 14 (CNPJ) dígitos |
| CEP | text + botão Buscar | obrigatório; chama ViaCEP |
| Logradouro | text | obrigatório; preenchido auto pelo ViaCEP |
| Número | text | obrigatório; manual |
| Bairro | text | obrigatório; preenchido auto |
| Cidade | text | obrigatório; preenchido auto |
| UF | select (27 estados) | obrigatório; selecionado auto |

### ViaCEP
```
GET https://viacep.com.br/ws/{cep}/json/
→ auto-preenche logradouro, bairro, cidade, uf
```

### On submit
```
UPDATE clients SET cpf_cnpj=..., cep=..., logradouro=..., numero=...,
  bairro=..., cidade=..., uf=... WHERE id = clientId
→ onClose()
```

---

## Seção 5 — Pipeline Config Sync

### Arquivo novo: `src/config/pipeline.ts`
```typescript
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

### Mudanças em Pipeline.tsx
- Remove declaração local de `COLUMNS`
- Importa `PIPELINE_STAGES` de `../config/pipeline`
- Passa para `KanbanColumn` (interface `ColumnConfig` já compatível)

### Mudanças em SDRQualification.tsx
- Remove botões estáticos de stage
- Adiciona `<select>` com `PIPELINE_STAGES.map(s => <option>)`
- On change: `UPDATE leads SET stage = newStage WHERE id = lead.id`
- Trigger: quando `newStage === 'fechado'` → chama `onConvert?.()` para abrir `BillingOnboardingModal`

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/clients_billing_migration.sql` | Criar |
| `src/lib/database.types.ts` | Modificar (Client interface) |
| `src/config/pipeline.ts` | Criar |
| `src/hooks/useClients.ts` | Criar |
| `src/pages/Clients.tsx` | Criar |
| `src/components/clients/BillingOnboardingModal.tsx` | Criar |
| `src/components/leads/SDRQualification.tsx` | Modificar |
| `src/pages/Pipeline.tsx` | Modificar |
| `src/components/layout/Sidebar.tsx` | Modificar |
| `src/App.tsx` | Modificar |
