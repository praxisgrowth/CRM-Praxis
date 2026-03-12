# Calendário Editorial Dinâmico e Batch Creation

**Data:** 2026-03-12
**Status:** Aprovado

---

## Contexto

O CRM Praxis já possui visualizações de tarefas em Lista e Kanban. Este documento especifica a adição de uma terceira visualização em Calendário Editorial, com suporte a criação em lote de tarefas e uma view read-only para clientes no PortalNexus.

---

## Escopo

### Incluído
- Migrações SQL: tabela `editorial_lines` + colunas `publish_date` / `editorial_line_id` em `tasks`
- Hook `useCalendarTasks.ts`
- Componente grid puro `CalendarGrid.tsx` (reutilizado em dois contextos)
- `EditorialCalendar.tsx` — wrapper para Operations (click-to-create + batch planner)
- `BatchPlannerPanel.tsx` — painel de rascunhos em lote
- `ClientCalendar.tsx` — wrapper read-only para PortalNexus
- 3º toggle "Calendário" em Operations.tsx (tasks view)
- Toggle "Grade | Calendário" na aba Aprovações do PortalNexus
- Página `/settings/editorial-lines` (ADMIN only)
- Animações framer-motion ao trocar de mês

### Excluído
- Drag-and-drop de tasks entre dias no calendário
- Sincronização com Google Calendar / iCal
- Notificações de publish_date

---

## Camada de Dados

### Nova tabela: `editorial_lines`
```sql
CREATE TABLE editorial_lines (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  ord   int  NOT NULL DEFAULT 0
);
```

### Alterações em `tasks`
```sql
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS publish_date       date,
  ADD COLUMN IF NOT EXISTS editorial_line_id  uuid
    REFERENCES editorial_lines(id) ON DELETE SET NULL;
```

### Hook `useCalendarTasks.ts`
- Parâmetros: `projectId?`, `clientId?`, `month: Date`
- Busca tasks com `publish_date` dentro do intervalo do mês
- Expõe: `tasks`, `loading`, `currentMonth`, `goToPrev()`, `goToNext()`
- Padrão de cast Supabase: `const db = _supabase as unknown as { from(t: string): any }`

---

## Arquitetura de Componentes

### `CalendarGrid.tsx` — Grid Puro
Grid sem Supabase. Props:
```ts
interface CalendarGridProps {
  tasks: TaskWithRelations[]
  month: Date
  mode: 'editor' | 'client'
  onDayClick?: (date: Date) => void
}
```
- Renderiza cabeçalho de dias da semana + células por dia
- Chips de task com cor da `editorial_line`
- `AnimatePresence` + `motion.div` para slide horizontal ao trocar mês
- Design: Neon Dark / Glassmorphism (background `#0d1422`, bordas `rgba(255,255,255,0.1)`)

### `EditorialCalendar.tsx` — Wrapper Operations
- Usa `useCalendarTasks`
- Cabeçalho: `← Março 2026 →` + botão **"Planejar Calendário"**
- Click em dia vazio → abre `NewTaskModal` com `publish_date` pré-preenchida
- Click em botão "Planejar Calendário" → abre `BatchPlannerPanel`
- Respeita filtros ativos de Operations (projeto, status, prioridade)

### `BatchPlannerPanel.tsx` — Painel de Rascunhos em Lote
Drawer lateral glassmorphism:
- Linhas dinâmicas com campos: `título | linha editorial | data | tipo`
- Botão "+ Adicionar linha"
- **"Salvar Rascunhos"** → batch insert de todas as tasks
- Fecha com `X` ou `Esc`

### `ClientCalendar.tsx` — Wrapper PortalNexus
Read-only:
- Click em task com nexus_file → abre arquivo (link externo ou preview)
- Click em task planejada → tooltip com título e linha editorial
- Chips com dois estados visuais:
  - **Planejado** (sem nexus_file): borda tracejada, opacidade 70%
  - **Entregável pronto** (com nexus_file): sólido, badge com status Nexus colorido

---

## Integrações

### Operations.tsx
- State: `taskView: 'lista' | 'kanban' | 'calendario'`
- Toggle bar: 3 botões `Lista | Kanban | Calendário`
- Ao selecionar "Calendário": renderiza `<EditorialCalendar />` no lugar da tabela/kanban
- Filtros existentes permanecem e são passados como props para `useCalendarTasks`

### PortalNexus.tsx — aba Aprovações
- State: `aprovacaoView: 'grade' | 'calendario'`
- Toggle pequeno no canto direito do header da aba
- `<ClientCalendar clientId={...} />` quando `aprovacaoView === 'calendario'`
- Navegação prev/next mês, sem batch planner nem click-to-create

### Settings — `/settings/editorial-lines`
- Nova entrada no Sidebar (abaixo de "Tarefas Padrão"), visível para ADMIN
- Página: lista com nome + color swatch + editar/remover + "Nova Linha"
- CRUD via hook `useEditorialLines.ts`
- Rota adicionada em `App.tsx` e entrada em `Sidebar.tsx`

---

## Design System

- Fundo base: `#0d1422` (praxis-dark)
- Células do calendário: `rgba(255,255,255,0.03)` com borda `rgba(255,255,255,0.07)`
- Hoje: destaque `rgba(99,102,241,0.15)` com borda `rgba(99,102,241,0.4)`
- Chips de task: cor da editorial_line com 15% de opacidade de fundo
- Drawer (BatchPlannerPanel): `backdrop-filter: blur(20px)` + `background: rgba(13,20,34,0.98)`
- Animação de mês: slide horizontal com `framer-motion` `AnimatePresence` (duração 200ms)

---

## Arquivos a Criar / Modificar

| Ação | Arquivo |
|------|---------|
| CRIAR | `supabase/editorial_calendar_migration.sql` |
| CRIAR | `src/hooks/useCalendarTasks.ts` |
| CRIAR | `src/hooks/useEditorialLines.ts` |
| CRIAR | `src/components/calendar/CalendarGrid.tsx` |
| CRIAR | `src/components/calendar/EditorialCalendar.tsx` |
| CRIAR | `src/components/calendar/BatchPlannerPanel.tsx` |
| CRIAR | `src/components/calendar/ClientCalendar.tsx` |
| CRIAR | `src/pages/settings/EditorialLines.tsx` |
| MODIFICAR | `src/lib/database.types.ts` |
| MODIFICAR | `src/pages/Operations.tsx` |
| MODIFICAR | `src/pages/PortalNexus.tsx` |
| MODIFICAR | `src/components/layout/Sidebar.tsx` |
| MODIFICAR | `src/App.tsx` |

---

## Plano de Verificação

1. Acessar Operations → Tasks → toggle "Calendário" aparece como 3º botão
2. Tasks com `publish_date` aparecem nas células corretas do mês
3. Click em dia vazio → NewTaskModal abre com data pré-preenchida
4. "Planejar Calendário" → BatchPlannerPanel abre; salvar insere múltiplas tasks
5. Animação ao navegar meses (prev/next) funciona sem jank
6. PortalNexus → Aprovações → toggle Grade/Calendário funciona
7. ClientCalendar distingue visualmente planejado vs. entregável pronto
8. Settings → Editorial Lines → CRUD funcional
9. `npm run build` sem erros TypeScript
