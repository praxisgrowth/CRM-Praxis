# Design: Página de Edição de Templates de Projeto

**Data:** 2026-03-10
**Status:** Aprovado

---

## Objetivo

Criar a página `/settings/templates` para que Admins possam visualizar, criar, editar, reordenar e excluir as tarefas padrão (`project_templates`) que são lançadas em projetos via `BatchLaunchModal`.

---

## Layout

Layout de duas colunas fixas dentro do `AppShell`:

- **Coluna esquerda (lista):** lista densa e reordenável via drag-and-drop (@dnd-kit). Cada item exibe `task_number`, `title` e badge do setor.
- **Coluna direita (editor):** painel glassmorphism fixo que abre ao clicar em uma tarefa. Contém formulário de edição com campos `title`, `sla_days`, `type` (setor) e `depends_on_task_number`.

---

## Arquitetura

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/settings/StandardTasks.tsx` | Página principal — layout 2 colunas, estado de seleção |
| `src/hooks/useTemplates.ts` | CRUD + reorder (batch update de `task_number`) |

### Componentes internos (dentro de StandardTasks.tsx)

| Componente | Responsabilidade |
|---|---|
| `TemplateList` | `DndContext` + `SortableContext` do @dnd-kit |
| `SortableTemplateRow` | Item arrastável — handle, número, título, badge setor |
| `TemplateEditor` | Painel glassmorphism — form controlado, salvar/excluir |

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | Adiciona rota `/settings/templates` (ADMIN only) |
| `src/components/layout/Sidebar.tsx` | Adiciona "Tarefas Padrão" em Configurações |
| `src/pages/Operations.tsx` | GearMenu: troca `alert(...)` por `navigate('/settings/templates')` |

---

## Hook: `useTemplates`

```ts
// Retorna:
{
  templates: ProjectTemplate[]
  loading: boolean
  error: string | null
  addTemplate: (data: Omit<ProjectTemplate, 'id' | 'created_at'>) => Promise<void>
  updateTemplate: (id: string, data: Partial<ProjectTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>  // batch update task_number
}
```

### Lógica de reorder

Após `arrayMove` do dnd-kit, recalcula `task_number` (1..N) e faz `Promise.all` de updates para cada item alterado. Optimistic update no estado local; reverte em caso de erro.

---

## Design System

- Fundo: `#0d1422` (praxis-dark)
- Accent: `#00d2ff` (praxis-blue) e `#a855f7` (praxis-purple)
- Bordas: `1px solid rgba(255,255,255,0.1)`
- Editor panel: `backdrop-filter: blur(20px)` + `background: rgba(13,20,34,0.95)`
- Feedback "Salvando...": spinner `Loader2` do lucide-react

---

## Campos do Editor

| Campo | Tipo | Fonte de dados |
|---|---|---|
| `title` | text input | — |
| `sla_days` | number input | — |
| `type` (setor) | select | `useSectors()` |
| `depends_on_task_number` | select | lista de templates carregada |

---

## Routing & Acesso

- Rota: `/settings/templates`
- Guard: `ProtectedRoute allowedRoles={['ADMIN']}`
- Sidebar: entrada "Tarefas Padrão" dentro do grupo Configurações
- GearMenu em `/operacao/tarefas` e `/operacao/projetos` navega para esta rota

---

## Fora do escopo (v1)

- Reordenação via RPC atômica no Postgres (batch Promise.all é suficiente para v1)
- Preview do template antes de lançar
- Importação/exportação de templates
