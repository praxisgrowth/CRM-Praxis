# UTM Tracking — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campos UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) na tabela `leads` e expô-los no `NewLeadModal` (colapsável) e no `SDRQualification` (seção "Rastreamento de Origem", híbrido read+edit).

**Architecture:** Migration SQL adiciona colunas nullable. `database.types.ts` e `useLeads.ts` recebem os campos. `NewLeadModal` ganha seção colapsável ao final. `SDRQualification` ganha seção editável que persiste via `saveICP` pattern já existente.

**Tech Stack:** React, TypeScript, Supabase JS, lucide-react, Tailwind CSS

---

## Chunk 1: Tipos e Migration

### Task 1: Migration SQL + database.types.ts + useLeads.ts

**Files:**
- Create: `supabase/utm_migration.sql`
- Modify: `src/lib/database.types.ts` (interface Lead, linhas 18–40)
- Modify: `src/hooks/useLeads.ts` (NewLeadInput linhas 7–21, optimistic object linhas 79–98)

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/utm_migration.sql
-- Adiciona campos de rastreamento UTM à tabela leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content  text,
  ADD COLUMN IF NOT EXISTS utm_term     text;
```

- [ ] **Step 2: Atualizar a interface `Lead` em `src/lib/database.types.ts`**

Após a linha `dores: string | null`, antes de `client_id`, adicionar:
```typescript
  // ─── UTM Tracking (utm_migration.sql) ─────────────────────
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
  utm_term:     string | null
```

- [ ] **Step 3: Atualizar `NewLeadInput` em `src/hooks/useLeads.ts`**

Após `client_id?: string | null`, adicionar:
```typescript
  // UTM tracking
  utm_source?:   string | null
  utm_medium?:   string | null
  utm_campaign?: string | null
  utm_content?:  string | null
  utm_term?:     string | null
```

- [ ] **Step 4: Atualizar o objeto optimistic em `addLead` (useLeads.ts)**

Após `dores: null,`, adicionar:
```typescript
      utm_source:   input.utm_source   ?? null,
      utm_medium:   input.utm_medium   ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_content:  input.utm_content  ?? null,
      utm_term:     input.utm_term     ?? null,
```

- [ ] **Step 5: Atualizar fallback leads em `useLeads.ts`**

Em cada objeto do array `FALLBACK_LEADS`, após `dores: null,`, adicionar:
```typescript
utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
```
(8 objetos no total — aplicar em todos)

- [ ] **Step 6: Verificar TypeScript** — rodar `npx tsc --noEmit`, 0 erros.

- [ ] **Step 7: Commit**
```bash
git add supabase/utm_migration.sql src/lib/database.types.ts src/hooks/useLeads.ts
git commit -m "feat(leads): add UTM fields to Lead type, NewLeadInput, and migration"
```

---

## Chunk 2: UI — NewLeadModal

### Task 2: Seção UTM colapsável no NewLeadModal

**Files:**
- Modify: `src/components/leads/NewLeadModal.tsx`

A seção deve ficar entre o campo "Estágio inicial" e os botões de ação. Começa colapsada. Estilo visual discreto com fundo levemente diferente.

- [ ] **Step 1: Adicionar import de `ChevronDown` e `Link2`**

Alterar linha 2:
```typescript
import { X, Loader2, ChevronDown, Link2 } from 'lucide-react'
```

- [ ] **Step 2: Adicionar estado UTM e toggle ao form**

Após `const [focus, setFocus] = useState('')`, adicionar:
```typescript
const [utmOpen, setUtmOpen] = useState(false)
```

Após o estado do form (`useState<NewLeadInput>({...})`), já existe a linha de `name`, `email` etc. Acrescentar os campos UTM na inicialização:
```typescript
// O form já tem: name, email, phone, stage, score, source
// Adicionar no objeto inicial:
utm_source: null, utm_medium: null, utm_campaign: null,
utm_content: null, utm_term: null,
```

- [ ] **Step 3: Adicionar a seção UTM no JSX**

Inserir ANTES de `{err && <p...>}` e APÓS o `</Field>` de "Estágio inicial":

```tsx
{/* UTM / Rastreamento de Origem — colapsável */}
<div
  className="rounded-xl overflow-hidden"
  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
>
  <button
    type="button"
    onClick={() => setUtmOpen(o => !o)}
    className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
  >
    <span className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
      <Link2 size={11} />
      UTM / Origem da Campanha
    </span>
    <ChevronDown
      size={12}
      className="text-slate-600 transition-transform duration-200"
      style={{ transform: utmOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
    />
  </button>

  {utmOpen && (
    <div className="px-3 pb-3 space-y-2 border-t border-white/[0.04]">
      <div className="grid grid-cols-2 gap-2 pt-2">
        {([
          ['utm_source',   'Source (ex: google)'],
          ['utm_medium',   'Medium (ex: cpc)'],
          ['utm_campaign', 'Campaign'],
          ['utm_content',  'Content'],
          ['utm_term',     'Term'],
        ] as [keyof NewLeadInput, string][]).map(([key, placeholder]) => (
          <div key={key} className={key === 'utm_campaign' || key === 'utm_term' ? 'col-span-2' : ''}>
            <label className="text-[10px] text-slate-600 font-medium uppercase tracking-wider block mb-1">
              {key.replace('utm_', '')}
            </label>
            <input
              className="w-full px-2.5 py-2 rounded-lg text-xs text-white placeholder-slate-700 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              placeholder={placeholder}
              value={(form[key] as string | null) ?? ''}
              onChange={e => set(key, e.target.value || null)}
            />
          </div>
        ))}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 5: Commit**
```bash
git add src/components/leads/NewLeadModal.tsx
git commit -m "feat(leads): add collapsible UTM section to NewLeadModal"
```

---

## Chunk 3: UI — SDRQualification

### Task 3: Seção "Rastreamento de Origem" no SDRQualification

**Files:**
- Modify: `src/components/leads/SDRQualification.tsx`

Padrão: igual ao bloco de ICP — cada campo tem label + input, salva no `onBlur` via função existente `saveICP` (renomear para `saveLead` para incluir UTMs, ou criar `saveUTM` separada).

- [ ] **Step 1: Adicionar estados UTM**

Após `const [dores, setDores] = useState(lead.dores ?? '')`, adicionar:
```typescript
const [utmSource,   setUtmSource]   = useState(lead.utm_source   ?? '')
const [utmMedium,   setUtmMedium]   = useState(lead.utm_medium   ?? '')
const [utmCampaign, setUtmCampaign] = useState(lead.utm_campaign ?? '')
const [utmContent,  setUtmContent]  = useState(lead.utm_content  ?? '')
const [utmTerm,     setUtmTerm]     = useState(lead.utm_term     ?? '')
```

- [ ] **Step 2: Adicionar import de `Link2`**

Na linha 1, adicionar `Link2` ao import de lucide-react:
```typescript
import { User, Mail, Phone, Globe, Briefcase, Target, Users, TrendingUp, Clock, UserPlus, Loader2, ChevronDown, Link2 } from 'lucide-react'
```

- [ ] **Step 3: Adicionar função `saveUTM`**

Após a função `saveICP`, adicionar:
```typescript
async function saveUTM(patch: Partial<Pick<Lead, 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term'>>) {
  await (supabase as any)
    .from('leads')
    .update(patch)
    .eq('id', lead.id)
}
```

- [ ] **Step 4: Adicionar seção UTM no JSX**

Inserir APÓS o `</section>` de diagnóstico (após `</section>` que fecha o bloco de Dores Principais, aproximadamente linha 236) e ANTES do bloco de "Histórico de Atividades":

```tsx
{/* Rastreamento de Origem */}
<div className="px-4 py-2 border-y border-cyan-500/10 mb-2 flex items-center"
  style={{ background: 'rgba(0,210,255,0.03)' }}>
  <Link2 size={10} className="text-cyan-600 mr-2" />
  <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest">Rastreamento de Origem</p>
</div>

<section className="px-4 space-y-2 pb-3">
  {([
    ['utm_source',   utmSource,   setUtmSource,   'Source',   'ex: google'],
    ['utm_medium',   utmMedium,   setUtmMedium,   'Medium',   'ex: cpc'],
    ['utm_campaign', utmCampaign, setUtmCampaign, 'Campaign', 'ex: praxis-jan26'],
    ['utm_content',  utmContent,  setUtmContent,  'Content',  'ex: banner-hero'],
    ['utm_term',     utmTerm,     setUtmTerm,     'Term',     'ex: agencia-marketing'],
  ] as [keyof Pick<Lead, 'utm_source'|'utm_medium'|'utm_campaign'|'utm_content'|'utm_term'>, string, React.Dispatch<React.SetStateAction<string>>, string, string][]).map(([key, val, setter, label, placeholder]) => (
    <div key={key} className="flex flex-col gap-1">
      <label className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={val}
        onChange={e => setter(e.target.value)}
        onBlur={e => saveUTM({ [key]: e.target.value.trim() || null })}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500/30 transition-all placeholder:text-slate-700"
      />
    </div>
  ))}
</section>
```

- [ ] **Step 5: Verificar TypeScript** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 6: Commit final**
```bash
git add src/components/leads/SDRQualification.tsx
git commit -m "feat(leads): add UTM tracking section to SDRQualification"
```
