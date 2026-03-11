# Auto-Launch Template Tasks on Project Create — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao criar um novo projeto, o usuário pode optar por lançar as tarefas padrão automaticamente via toggle no modal de criação.

**Architecture:** Extrair a lógica 2-pass de lançamento de tarefas em uma função utilitária pura (`launchTemplateTasks`), fazer `addProject` retornar o ID do projeto criado, adicionar toggle no `NewProjectModal`, e disparar o lançamento em `Operations.tsx` após a criação.

**Tech Stack:** React, TypeScript, Supabase JS Client, lucide-react

---

## Chunk 1: Extrair lógica de lançamento + corrigir retorno de addProject

### Task 1: Criar `src/lib/launchTemplateTasks.ts`

**Files:**
- Create: `src/lib/launchTemplateTasks.ts`

- [ ] **Step 1: Criar o arquivo com a função utilitária**

```typescript
// src/lib/launchTemplateTasks.ts
// Lança as tarefas do template (project_templates) num projeto via 2-pass insert.
// Pass 1: insere todas as tasks sem depends_on_id.
// Pass 2: resolve depends_on_id referenciando os UUIDs do Pass 1.
import { supabase as _supabase } from './supabase'
import type { ProjectTemplate } from './database.types'

const db = _supabase as unknown as { from(t: string): any }

/**
 * @returns número de tarefas lançadas
 * @throws Error se algum insert/update falhar
 */
export async function launchTemplateTasks(
  projectId: string,
  clientId: string | null,
): Promise<number> {
  const { data: templates, error: tplErr } = await db
    .from('project_templates')
    .select('*')
    .order('task_number', { ascending: true })

  if (tplErr) throw new Error(tplErr.message)
  if (!templates || templates.length === 0) return 0

  const tpls = templates as ProjectTemplate[]

  // ── Pass 1: inserir sem depends_on_id ──────────────────────────────────
  const taskNumberToId: Record<number, string> = {}

  for (const tpl of tpls) {
    const { data, error: insertErr } = await db.from('tasks').insert({
      title:               tpl.title,
      description:         null,
      status:              'todo',
      priority:            'media',
      project_id:          projectId,
      client_id:           clientId ?? null,
      template_id:         tpl.id,
      assignee_id:         null,
      deadline:            null,
      estimated_hours:     tpl.sla_days > 0 ? tpl.sla_days * 8 : 0,
      actual_hours:        0,
      current_timer_start: null,
      depends_on_id:       null,
    }).select('id').single()

    if (insertErr) throw new Error(insertErr.message)
    taskNumberToId[tpl.task_number] = data.id
  }

  // ── Pass 2: resolver depends_on_id ────────────────────────────────────
  for (const tpl of tpls) {
    if (!tpl.depends_on_task_number) continue
    const parentId = taskNumberToId[tpl.depends_on_task_number]
    if (!parentId) continue
    const taskId = taskNumberToId[tpl.task_number]
    const { error: updErr } = await db
      .from('tasks')
      .update({ depends_on_id: parentId })
      .eq('id', taskId)
    if (updErr) throw new Error(updErr.message)
  }

  return tpls.length
}
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente** — inspecionar `src/lib/launchTemplateTasks.ts`.

---

### Task 2: Fazer `addProject` retornar o ID do projeto criado

**Files:**
- Modify: `src/hooks/useOperations.ts` (linhas 26, 92–120)

- [ ] **Step 1: Alterar a assinatura de `addProject` na interface e na implementação**

Em `src/hooks/useOperations.ts`:

1. Mudar a interface `UseOperationsResult`:
```typescript
// antes:
addProject: (data: NewProjectInput) => Promise<void>
// depois:
addProject: (data: NewProjectInput) => Promise<string>
```

2. Mudar o corpo de `addProject` para retornar o ID real:
```typescript
// ao final da função, após substituir o temporário:
setProjects(prev =>
  prev.map(p => p.id === optimistic.id ? { ...(data as Project), tasks: [] } : p)
)
console.info('[useOperations] Projeto persistido com ID:', (data as any).id)
return (data as any).id   // ← linha nova
```

- [ ] **Step 2: Verificar que não há erros de TypeScript** — rodar `npx tsc --noEmit` e confirmar 0 erros relacionados a `addProject`.

---

### Task 3: Refatorar `BatchLaunchModal` para usar `launchTemplateTasks`

**Files:**
- Modify: `src/components/operations/BatchLaunchModal.tsx`

- [ ] **Step 1: Substituir a lógica 2-pass inline pelo import da função utilitária**

1. Adicionar import no topo do arquivo:
```typescript
import { launchTemplateTasks } from '../../lib/launchTemplateTasks'
```

2. Remover o estado `templates` e `loadingTemplates` e o `useEffect` que os carrega — a função utilitária busca os templates internamente.

3. Substituir o corpo inteiro de `handleLaunch`:
```typescript
async function handleLaunch() {
  if (!projectId || !selectedProject) return
  setPhase('running')
  setError(null)
  try {
    const count = await launchTemplateTasks(projectId, selectedProject.client_id ?? null)
    setLaunched(count)
    setPhase('done')
    onDone()
  } catch (e: any) {
    setError(e.message ?? 'Erro desconhecido.')
    setPhase('error')
  }
}
```

4. Remover as referências a `templates` e `loadingTemplates` no JSX:
   - Remover o bloco de loading (`loadingTemplates ? ...`)
   - Remover o bloco `templates.length === 0 ? ...`
   - Atualizar o botão para não depender de `templates.length` — usar texto fixo "Lançar tarefas padrão"

- [ ] **Step 2: Verificar que `BatchLaunchModal` ainda compila** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 3: Commit do Chunk 1**
```bash
git add src/lib/launchTemplateTasks.ts src/hooks/useOperations.ts src/components/operations/BatchLaunchModal.tsx
git commit -m "refactor(tasks): extract launchTemplateTasks util, addProject returns id"
```

---

## Chunk 2: Toggle no modal + disparo automático

### Task 4: Adicionar toggle "Lançar tarefas padrão" no `NewProjectModal`

**Files:**
- Modify: `src/components/operations/NewProjectModal.tsx`

O toggle deve aparecer **apenas ao criar** (quando `!project`), ativado por padrão. Deve ficar visualmente entre o campo "Status inicial" e os botões de ação.

- [ ] **Step 1: Adicionar estado do toggle**

Após a declaração de `saving`, adicionar:
```typescript
const [launchTasks, setLaunchTasks] = useState(true)
```

- [ ] **Step 2: Expor `launchTasks` no callback `onSave`**

Alterar a interface `Props`:
```typescript
// antes:
onSave: (data: NewProjectInput) => Promise<void>
// depois:
onSave: (data: NewProjectInput, launchTasks: boolean) => Promise<void>
```

Alterar a chamada em `handleSubmit`:
```typescript
// antes:
await onSave(form)
// depois:
await onSave(form, launchTasks)
```

- [ ] **Step 3: Adicionar o toggle no JSX**

Inserir após o `<Field label="Status inicial">...</Field>` e antes de `{err && ...}`:

```tsx
{!project && (
  <button
    type="button"
    onClick={() => setLaunchTasks(v => !v)}
    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
    style={
      launchTasks
        ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }
        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }
    }
  >
    <span className="flex items-center gap-2">
      <Rocket size={13} />
      Lançar tarefas padrão
    </span>
    <span
      className="w-8 h-4 rounded-full relative transition-all duration-200 flex-shrink-0"
      style={{ background: launchTasks ? '#6366f1' : 'rgba(255,255,255,0.1)' }}
    >
      <span
        className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200"
        style={{ left: launchTasks ? '17px' : '2px' }}
      />
    </span>
  </button>
)}
```

- [ ] **Step 4: Adicionar import de `Rocket`**

No topo do arquivo:
```typescript
import { X, Loader2, Rocket } from 'lucide-react'
```

- [ ] **Step 5: Verificar compilação** — `npx tsc --noEmit`, 0 erros.

---

### Task 5: Disparar lançamento em `Operations.tsx` após criação do projeto

**Files:**
- Modify: `src/pages/Operations.tsx`

- [ ] **Step 1: Adicionar import de `launchTemplateTasks`**

```typescript
import { launchTemplateTasks } from '../lib/launchTemplateTasks'
```

- [ ] **Step 2: Atualizar o `onSave` do `NewProjectModal` de criação**

Localizar (em torno da linha 570):
```tsx
{showNewProject && (
  <NewProjectModal
    onClose={() => setShowNewProject(false)}
    onSave={async data => {
      await addProject(data)
      await logAction('Create Project', 'project', 'new', data as unknown as Record<string, unknown>)
    }}
  />
)}
```

Substituir por:
```tsx
{showNewProject && (
  <NewProjectModal
    onClose={() => setShowNewProject(false)}
    onSave={async (data, launchTasks) => {
      const newId = await addProject(data)
      await logAction('Create Project', 'project', newId, data as unknown as Record<string, unknown>)
      if (launchTasks) {
        try {
          await launchTemplateTasks(newId, null)
          refetchTask()
        } catch (e) {
          console.error('[Operations] Falha ao lançar tarefas padrão:', e)
        }
      }
    }}
  />
)}
```

> Nota: `client_id` é passado como `null` aqui porque `NewProjectInput` não carrega `client_id`. Se futuramente o campo for adicionado, passar `data.client_id`.

- [ ] **Step 3: Verificar compilação final** — `npx tsc --noEmit`, 0 erros.

- [ ] **Step 4: Teste manual**
  1. Abrir a app em `localhost:5173`
  2. Navegar para Operação → Projetos
  3. Clicar em "Novo Projeto"
  4. Preencher nome, cliente — confirmar que o toggle "Lançar tarefas padrão" aparece ativado
  5. Clicar "Criar Projeto" → projeto criado + tarefas lançadas
  6. Verificar na lista de tarefas que as tarefas do template aparecem vinculadas ao novo projeto
  7. Repetir com toggle desativado → projeto criado sem tarefas

- [ ] **Step 5: Commit final**
```bash
git add src/components/operations/NewProjectModal.tsx src/pages/Operations.tsx src/lib/launchTemplateTasks.ts
git commit -m "feat(projects): add 'launch template tasks' toggle on project creation"
```
