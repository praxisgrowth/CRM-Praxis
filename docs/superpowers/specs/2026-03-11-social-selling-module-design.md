# Social Selling Module — Design

**Data:** 2026-03-11
**Status:** Aprovado

---

## Objetivo

Adicionar uma categoria `social` à tabela `leads` para isolar leads originados de Social Selling do funil CRM principal. O Pipeline existente (`/comercial/pipeline`) continua mostrando apenas leads CRM. Uma nova página (`/comercial/social`) exibe leads Social Selling com o mesmo layout de Kanban.

---

## Componentes

### 1. Migration SQL — `supabase/social_selling_migration.sql`
- `ALTER TABLE leads ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'crm'`
- `UPDATE leads SET category = 'crm' WHERE category IS NULL`

### 2. `src/lib/database.types.ts`
- Interface `Lead`: adicionar `category: 'crm' | 'social'`
- `NewLeadInput` em `useLeads.ts`: adicionar `category?: 'crm' | 'social'`

### 3. `src/hooks/useLeads.ts`
- Hook aceita parâmetro `category?: 'crm' | 'social'`
- Query adiciona `.eq('category', category)` quando informado
- FALLBACK_LEADS recebem `category: 'crm'`
- `addLead` persiste `category` do input (default `'crm'`)

### 4. `src/pages/Pipeline.tsx`
- Passa `category="crm"` para `useLeads`
- Leads `'social'` ficam invisíveis no Pipeline CRM

### 5. `src/pages/SocialSelling.tsx` (novo)
- Copia estrutura do Pipeline.tsx
- Passa `category="social"` para `useLeads`
- Header/título diferenciado: "Social Selling"

### 6. `src/components/layout/Sidebar.tsx`
- Adiciona item "Social Selling" com ícone `Share2` no menu Comercial

### 7. `src/App.tsx`
- Adiciona rota `/comercial/social` → `<SocialSellingPage />` (ADMIN only)

---

## Fora de Escopo
- Stages específicos para Social Selling (usa os mesmos do CRM)
- Métricas separadas por categoria no Dashboard
