# Design: Módulo de Gestão de Projetos e Onboarding

**Data:** 2026-03-08
**Referência:** `implementation_plan.md` (Gemini, 75cbac43)
**Estratégia:** Migração Aditiva (backward-compatible)

---

## 1. Banco de Dados

### 1.1 Migration aditiva em `tasks`
- `project_id` → nullable (tarefas podem existir sem projeto)
- Novas colunas: `client_id` (FK clients), `template_id` (uuid), `description` (text), `assignee_id` (FK team_members), `deadline` (timestamptz), `estimated_hours` (numeric), `actual_hours` (numeric, default 0), `current_timer_start` (timestamptz nullable)
- Status migrados: `pendente→todo`, `em_andamento→in_progress`, `concluida→done`; novos: `waiting_client`, `blocked`

### 1.2 Nova tabela `project_templates`
Campos: `id`, `service_type`, `task_number`, `title`, `type`, `sla_days`, `depends_on_task_number`, `depends_on_id` (self-ref uuid)

Seed: 48 tarefas do pacote "Google Ads Completo" com nomes literais e dependências numéricas resolvidas.

### 1.3 Tabelas de apoio
- `task_checklists`: `id`, `task_id`, `title`, `is_completed`
- `task_comments`: `id`, `task_id`, `body`, `author`, `created_at`
- `task_attachments`: `id`, `task_id`, `url`, `name`, `created_at`

---

## 2. UI/UX

### 2.1 Componentes novos
| Componente | Responsabilidade |
|---|---|
| `TaskFilters` | Filtros por Responsável, Cliente, Deadline |
| `TaskItemRow` | Linha com botão Play/Stop de time tracking |
| `TaskKanbanBoard` | Kanban 5 colunas com @dnd-kit |
| `TaskDetailDrawer` | Slide-over: descrição, checklist, timer, comentários |

### 2.2 Kanban — 5 colunas
| Status | Label PT-BR | Cor |
|---|---|---|
| `todo` | A Fazer | slate |
| `in_progress` | Em Andamento | cyan neon |
| `waiting_client` | Aguardando Cliente | amber |
| `done` | Concluído | green neon |
| `blocked` | Bloqueado | red neon |

### 2.3 Time Tracking
- **Play:** grava `current_timer_start = now()` no banco
- **Stop:** `elapsed = (now() - current_timer_start) / 3600`, acumula em `actual_hours`, limpa `current_timer_start`
- **Display:** horas decimais convertidas para `Xh Ym` (ex: `2.5h → 2h 30m`)
- Timer ativo: `setInterval` no frontend, sem polling no banco
- Precisão: arredondamento a 4 casas decimais antes de somar

### 2.4 Tarefas Bloqueadas
- Visual: opacity 50%, borda vermelha, ícone de cadeado, Play desabilitado
- Lógica: `isBlocked = task.depends_on_id !== null && dependencyTask?.status !== 'done'`

---

## 3. Tema Visual

Dark Neon / Glassmorphism — conforme tokens existentes em `index.css`:
- `--neon-cyan`, `--neon-green`, `--neon-red`, `--neon-violet`
- Cards com `className="glass"`, bordas `rgba(99,180,255,0.08)`

---

## 4. Fluxo n8n (preparação de dados)
A tabela `project_templates` serve como fonte para o n8n:
1. Gatilho: lead movido para "Fechado" no Pipeline
2. n8n consulta `project_templates WHERE service_type = lead.service`
3. Loop: insere cada template em `tasks` calculando `deadline = now() + sla_days`

---

## 5. Tipos TypeScript (atualizações)
- `TaskStatus` → `'todo' | 'in_progress' | 'waiting_client' | 'done' | 'blocked'`
- `Task` → novas propriedades adicionadas
- Novos interfaces: `ProjectTemplate`, `TaskChecklist`, `TaskComment`, `TaskAttachment`
- `Database` → novas tabelas registradas

---

## Decisões de Design
1. **Opção A** (migração aditiva): `project_id` fica nullable, novas colunas adicionadas sem DROP
2. **Status Opção A**: migrar para novos valores em inglês, labels em PT-BR no UI
3. Abordagem incremental por camada (DB → Hook → Components → Page)
