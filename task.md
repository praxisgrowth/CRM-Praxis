# CRM Praxis · Roadmap de Desenvolvimento

> **Cérebro do Antigravity** — guia de referência para o agente de desenvolvimento.

---

## Fase 1 · Fundação ✅ (concluída)

| # | Tarefa | Status |
|---|--------|--------|
| 1.1 | Inicializar Vite + React + TypeScript | ✅ |
| 1.2 | Instalar Tailwind CSS v4 via `@tailwindcss/vite` | ✅ |
| 1.3 | Instalar dependências: `react-router-dom`, `lucide-react`, `clsx` | ✅ |
| 1.4 | Configurar tema premium Dark Mode com design tokens CSS | ✅ |
| 1.5 | Implementar Glassmorphism (`.glass`, `glow-active`, `gradient-text`) | ✅ |
| 1.6 | Criar `AppShell` (layout raiz com Sidebar + header + Outlet) | ✅ |
| 1.7 | Criar `Sidebar` com navegação: Dashboard, Comercial (Leads/Pipeline), Operação, Financeiro, Universidade | ✅ |
| 1.8 | Criar rotas base com `react-router-dom` | ✅ |
| 1.9 | Criar `DashboardPage` com KPI cards placeholder | ✅ |
| 1.10 | Sidebar colapsável (toggle) | ✅ |

---

## Fase 2 · Core CRM (próxima)

| # | Tarefa | Status |
|---|--------|--------|
| 2.1 | Módulo de Leads: listagem, filtros, scoring | ⬜ |
| 2.2 | Pipeline Kanban com drag-and-drop | ✅ |
| 2.3 | Detalhe do Lead / Contato (timeline de atividades) | ⬜ |
| 2.4 | Dashboard com gráficos reais (Recharts ou Tremor) | ⬜ |
| 2.5 | Módulo Financeiro: MRR, churn, projeções | ⬜ |
| 2.6 | Módulo Operação: SLA, tarefas, projetos | ⬜ |
| 2.7 | Sistema de busca global (⌘K) | ⬜ |
| 2.8 | Notificações e toast system | ⬜ |

---

## Fase 3 · Inteligência & Automação

| # | Tarefa | Status |
|---|--------|--------|
| 3.1 | Universidade Praxis: trilhas de onboarding | ⬜ |
| 3.2 | Integração com n8n (webhooks, automações) | ⬜ |
| 3.3 | IA Assistente (resumo de leads, sugestões) | ⬜ |
| 3.4 | Relatórios e exportação | ⬜ |
| 3.5 | Multi-tenant / workspace | ⬜ |

---

## Stack Técnico

- **Frontend:** Vite · React 18 · TypeScript · Tailwind CSS v4
- **Roteamento:** React Router v7
- **Ícones:** Lucide React
- **Utilitários:** clsx
- **Tema:** Dark Mode · Glassmorphism · Indigo/Violet accent

## Convenções

- Componentes em `src/components/`
- Layout em `src/components/layout/`
- Páginas em `src/pages/`
- Hooks em `src/hooks/`
- Design tokens em `src/index.css` (variáveis CSS)
