# Manual de Implementação — Módulo de Tarefas
**Stack de destino:** React + TypeScript · Supabase (PostgreSQL + RLS + Realtime) · n8n · Tailwind CSS

> Documento gerado por engenharia reversa do CRM Lander-App (Flask + SQLAlchemy).
> Cada seção é independente: implemente na ordem que preferir.

---

## 1. Arquitetura de Banco de Dados (PostgreSQL / Supabase)

### 1.1 Tabela `tarefas`

```sql
CREATE TABLE tarefas (
  id                   BIGSERIAL PRIMARY KEY,

  -- Conteúdo
  descricao            TEXT        NOT NULL,
  tipo                 TEXT,                        -- Setor: 'Implementação', 'Gestão de Tráfego', etc.
  prioridade           TEXT        DEFAULT 'Média', -- 'Alta' | 'Média' | 'Baixa'
  observacoes          TEXT,

  -- Datas
  data_inicio          DATE,
  data_fim             DATE,                        -- Prazo (calculado em dias úteis)
  concluida_em         TIMESTAMPTZ,

  -- Estado
  status               TEXT        NOT NULL DEFAULT 'Pendente',
  -- Valores: 'Pendente' | 'Bloqueada' | 'Concluída'
  concluida            BOOLEAN     NOT NULL DEFAULT FALSE,
  prazo_dias           INTEGER     DEFAULT 0,       -- 0 = contínuo / sem prazo

  -- Relacionamentos
  cliente_id           BIGINT      REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id           BIGINT      REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Dependência (self-referencing)
  depende_de_id        BIGINT      REFERENCES tarefas(id) ON DELETE SET NULL,

  -- Agrupamento de lote (batch launch)
  lote                 TIMESTAMPTZ NOT NULL DEFAULT now(), -- mesmo valor p/ todas as tarefas do mesmo lançamento
  ordem                INTEGER     NOT NULL DEFAULT 1,     -- posição dentro do lote (1..N)

  -- Origem de recorrência
  origem_recorrente_id BIGINT      REFERENCES tarefas_recorrentes(id) ON DELETE SET NULL,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX idx_tarefas_cliente   ON tarefas(cliente_id);
CREATE INDEX idx_tarefas_usuario   ON tarefas(usuario_id);
CREATE INDEX idx_tarefas_status    ON tarefas(status);
CREATE INDEX idx_tarefas_lote      ON tarefas(lote);
CREATE INDEX idx_tarefas_ordem     ON tarefas(ordem);
CREATE INDEX idx_tarefas_depende   ON tarefas(depende_de_id);

-- Trigger para manter updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### 1.2 Tabela `tarefas_padrao` (Templates)

```sql
CREATE TABLE tarefas_padrao (
  id                   BIGSERIAL PRIMARY KEY,

  ordem                INTEGER     NOT NULL,        -- 1..N, gerenciado pela UI (drag-and-drop)
  descricao            TEXT        NOT NULL,
  tipo                 TEXT        NOT NULL,         -- Setor obrigatório
  prazo_dias           INTEGER     NOT NULL DEFAULT 0,

  -- Responsável sugerido (pode ser sobrescrito no lançamento)
  usuario_padrao_id    BIGINT      REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Dependência entre templates (self-referencing)
  -- Se definido: ao lançar, a tarefa gerada nasce com status = 'Bloqueada'
  depende_de_id        BIGINT      REFERENCES tarefas_padrao(id) ON DELETE SET NULL,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tp_ordem ON tarefas_padrao(ordem);
```

**Lógica do auto-relacionamento `depende_de_id`:**
- `NULL` → tarefa independente. Ao lançar: `status = 'Pendente'`, `data_inicio = hoje`, `data_fim = hoje + N dias úteis`.
- `<id>` → tarefa dependente. Ao lançar: `status = 'Bloqueada'`, `data_inicio = NULL`, `data_fim = NULL`.
- Quando a tarefa "mãe" é concluída, a "filha" é desbloqueada e suas datas são calculadas na hora.
- **Atenção com ciclos:** o sistema original não valida ciclos. Para evitar, adicione uma constraint de validação ou faça checagem no frontend antes de salvar.

---

### 1.3 Tabela `tarefas_recorrentes`

```sql
CREATE TABLE tarefas_recorrentes (
  id                   BIGSERIAL PRIMARY KEY,

  descricao            TEXT        NOT NULL,
  tipo                 TEXT,

  cliente_id           BIGINT      NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id           BIGINT      REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Opcional: vincular a uma campanha
  campaign_id          BIGINT      REFERENCES campanhas(id) ON DELETE SET NULL,

  -- Regras de recorrência
  periodicidade        TEXT        NOT NULL DEFAULT 'semanal', -- 'semanal' | 'mensal'
  dia_semana           SMALLINT,   -- 0=segunda ... 6=domingo (null = qualquer dia)

  inicio               DATE,       -- null = desde sempre
  fim                  DATE,       -- null = sem fim

  ativa                BOOLEAN     NOT NULL DEFAULT TRUE,
  observacoes_padrao   TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Evita duplicar regras
  UNIQUE (cliente_id, descricao)
);

CREATE INDEX idx_rec_cliente ON tarefas_recorrentes(cliente_id);
CREATE INDEX idx_rec_ativa   ON tarefas_recorrentes(ativa);
```

---

### 1.4 RLS Policies (Supabase)

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE tarefas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_padrao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_recorrentes ENABLE ROW LEVEL SECURITY;

-- Política: usuário vê suas próprias tarefas ou é admin
CREATE POLICY "tarefas_select" ON tarefas
  FOR SELECT USING (
    auth.uid() = usuario_id::text::uuid
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()::text::bigint AND is_admin = true
    )
  );

-- Política: qualquer usuário autenticado pode inserir
CREATE POLICY "tarefas_insert" ON tarefas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política: só o responsável ou admin pode atualizar/deletar
CREATE POLICY "tarefas_update" ON tarefas
  FOR UPDATE USING (
    auth.uid() = usuario_id::text::uuid
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()::text::bigint AND is_admin = true
    )
  );

-- tarefas_padrao: somente admins gerenciam templates
CREATE POLICY "tp_admin_only" ON tarefas_padrao
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()::text::bigint AND is_admin = true
    )
  );
```

---

## 2. Lógica de Componentes e UI (React + TypeScript)

### 2.1 Árvore de Componentes

```
<TasksPage>
├── <TasksToolbar>                    # Filtros + botões "Minhas Tarefas" / "Ocultar Concluídas"
│   ├── <FilterSelect label="Cliente" />
│   ├── <FilterSelect label="Responsável" />
│   ├── <FilterSelect label="Setor" />
│   ├── <FilterSelect label="Prazo" />    # Hoje / Esta semana / Atrasadas
│   └── <FilterSelect label="Status" />
│
├── <ViewToggle>                      # Alterna entre 'tabela' e 'por-cliente'
│
├── <TaskTable>                       # View: tabela completa
│   └── <TaskRow> (× N)
│       └── <TaskActions>             # Botões editar/excluir + checkbox concluir
│
├── <ClientsView>                     # View: agrupado por cliente (acordeão)
│   └── <ClientTaskGroup> (× N)
│       ├── <ProgressBar />
│       └── <TaskRow> (× N)
│
├── <TaskModal>                       # Criar / Editar tarefa
│   └── campos: descricao, tipo, prioridade, observacoes,
│              data_inicio, data_fim, cliente_id, usuario_id
│
└── <StandardTasksDropdown>           # Botão "Configurações"
    ├── Link → /tarefas-padrao        # Editar Templates
    └── Link → /lancar-tarefas-padrao # Lançar Combo
```

---

### 2.2 Gerenciamento de Estado dos Filtros

```typescript
// hooks/useTaskFilters.ts
import { useState, useMemo } from 'react'

type Filters = {
  clienteId: string
  usuarioId: string
  tipo: string       // setor
  prazo: 'todos' | 'hoje' | 'semana' | 'atrasadas'
  status: 'todos' | 'Pendente' | 'Bloqueada' | 'Concluída'
  soMinhas: boolean
  ocultarConcluidas: boolean
}

export function useTaskFilters(tarefas: Tarefa[], usuarioAtualId: string) {
  const [filters, setFilters] = useState<Filters>({
    clienteId: '',
    usuarioId: '',
    tipo: '',
    prazo: 'todos',
    status: 'todos',
    soMinhas: false,
    ocultarConcluidas: false,
  })

  const filtered = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    return tarefas.filter(t => {
      if (filters.soMinhas && t.usuario_id !== usuarioAtualId) return false
      if (filters.ocultarConcluidas && t.status === 'Concluída') return false
      if (filters.clienteId && t.cliente_id !== filters.clienteId) return false
      if (filters.usuarioId && t.usuario_id !== filters.usuarioId) return false
      if (filters.tipo && t.tipo !== filters.tipo) return false
      if (filters.status !== 'todos' && t.status !== filters.status) return false

      if (filters.prazo !== 'todos' && t.data_fim) {
        const fim = new Date(t.data_fim)
        if (filters.prazo === 'hoje') return fim <= hoje
        if (filters.prazo === 'atrasadas') return fim < hoje && t.status !== 'Concluída'
        if (filters.prazo === 'semana') {
          const semana = new Date(hoje)
          semana.setDate(hoje.getDate() + 7)
          return fim <= semana
        }
      }

      return true
    })
  }, [tarefas, filters, usuarioAtualId])

  // Ordenação: Pendente → Bloqueada → Concluída, depois por prazo
  const sorted = useMemo(() => {
    const statusOrder = { Pendente: 0, Bloqueada: 1, Concluída: 2 }
    return [...filtered].sort((a, b) => {
      const sd = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
      if (sd !== 0) return sd
      if (!a.data_fim && !b.data_fim) return 0
      if (!a.data_fim) return 1
      if (!b.data_fim) return -1
      return new Date(a.data_fim).getTime() - new Date(b.data_fim).getTime()
    })
  }, [filtered])

  return { filters, setFilters, sorted }
}
```

---

### 2.3 Persistência de View no localStorage

```typescript
// O sistema original salva a preferência de view por usuário
const VIEW_KEY = (userId: string) => `tarefas:view:${userId}`

function useViewPreference(userId: string) {
  const [view, setView] = useState<'tabela' | 'clientes'>(() => {
    return (localStorage.getItem(VIEW_KEY(userId)) as 'tabela' | 'clientes') ?? 'tabela'
  })

  const changeView = (v: 'tabela' | 'clientes') => {
    setView(v)
    localStorage.setItem(VIEW_KEY(userId), v)
  }

  return { view, changeView }
}
```

---

### 2.4 Gerenciamento de Modais

```typescript
// O original usa overlay global com funções globais abrirOverlay/fecharOverlay
// Versão React equivalente:

type ModalState =
  | { type: 'none' }
  | { type: 'criar' }
  | { type: 'editar'; tarefa: Tarefa }
  | { type: 'confirmar-exclusao'; tarefaId: string }

export function useTaskModal() {
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  return {
    modal,
    abrirCriar: () => setModal({ type: 'criar' }),
    abrirEditar: (tarefa: Tarefa) => setModal({ type: 'editar', tarefa }),
    abrirConfirmarExclusao: (tarefaId: string) => setModal({ type: 'confirmar-exclusao', tarefaId }),
    fechar: () => setModal({ type: 'none' }),
  }
}
```

---

### 2.5 Drag-and-Drop para Templates (com @dnd-kit)

```typescript
// components/StandardTasksList.tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Item arrastável
function SortableTaskRow({ template }: { template: TarefaPadrao }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id })

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      <td {...attributes} {...listeners} style={{ cursor: 'grab' }}>☰</td>
      <td>{template.ordem}</td>
      <td>{template.descricao}</td>
      {/* ... */}
    </tr>
  )
}

// Container com persistência
function StandardTasksList() {
  const [templates, setTemplates] = useState<TarefaPadrao[]>([])
  const [isDirty, setIsDirty] = useState(false)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = templates.findIndex(t => t.id === active.id)
    const newIndex = templates.findIndex(t => t.id === over.id)
    setTemplates(arrayMove(templates, oldIndex, newIndex))
    setIsDirty(true)
  }

  const salvarOrdem = async () => {
    // Chama a Edge Function ou API Route
    await supabase.rpc('reorder_tarefas_padrao', {
      ordered_ids: templates.map(t => t.id)
    })
    setIsDirty(false)
  }

  return (
    <>
      {isDirty && <button onClick={salvarOrdem}>💾 Salvar Nova Ordem</button>}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={templates.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <table>
            <tbody>
              {templates.map(t => <SortableTaskRow key={t.id} template={t} />)}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </>
  )
}
```

---

## 3. Core Business Logic

### 3.1 Cálculo de Prazo em Dias Úteis

O sistema ignora sábados (weekday 6) e domingos (weekday 0 em JS) ao calcular prazos.

```typescript
// lib/tasks/calculateDueDate.ts

/**
 * Calcula data de vencimento adicionando N dias úteis (Seg-Sex).
 * Retorna null se prazo_dias <= 0 (tarefa contínua / sem prazo).
 */
export function calculateDueDate(startDate: Date, prazoDias: number): Date | null {
  if (prazoDias <= 0) return null

  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < prazoDias) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay() // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sáb
    if (dow !== 0 && dow !== 6) {
      daysAdded++
    }
  }

  return result
}

// Uso:
// calculateDueDate(new Date('2024-01-01'), 5) → 2024-01-08 (pula fim de semana)
// calculateDueDate(new Date(), 0)             → null (sem prazo)
```

---

### 3.2 Lógica de Dependência (Toggle de Conclusão com Cascade)

Esta é a lógica mais crítica do sistema. Ao **concluir** uma tarefa, seus dependentes diretos são desbloqueados. Ao **desconcluir**, todos os descendentes são re-bloqueados em cascata (DFS).

```typescript
// lib/tasks/toggleCompletion.ts
import { supabase } from '@/lib/supabase'
import { calculateDueDate } from './calculateDueDate'

type ToggleResult = {
  desbloqueadas: string[]
  rebloqueadas: string[]
  progress: { total: number; done: number }
}

export async function toggleTaskCompletion(
  tarefaId: string,
  novaConcluida: boolean
): Promise<ToggleResult> {
  const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // 1. Busca a tarefa e todos os seus descendentes (para o cascade)
  const { data: tarefa } = await supabase
    .from('tarefas')
    .select('*, desbloqueia:tarefas!depende_de_id(*)')
    .eq('id', tarefaId)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada')

  const updates: Array<{ id: string; data: Partial<Tarefa> }> = []

  if (novaConcluida) {
    // === CONCLUIR: desbloqueia dependentes DIRETOS ===
    updates.push({
      id: tarefaId,
      data: { concluida: true, status: 'Concluída', concluida_em: new Date().toISOString() }
    })

    for (const dep of tarefa.desbloqueia ?? []) {
      if (dep.concluida) continue

      const dataInicio = hoje
      const dataFim = calculateDueDate(new Date(hoje), dep.prazo_dias ?? 0)

      updates.push({
        id: dep.id,
        data: {
          status: 'Pendente',
          data_inicio: dataInicio,
          data_fim: dataFim ? dataFim.toISOString().split('T')[0] : null,
        }
      })
    }
  } else {
    // === DESCONCLUIR: re-bloqueia em cascata (DFS) todos os descendentes ===
    updates.push({
      id: tarefaId,
      data: { concluida: false, status: 'Pendente', concluida_em: null }
    })

    // DFS iterativo para percorrer toda a árvore de dependências
    const stack = [tarefaId]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const currentId = stack.pop()!

      // Busca os filhos diretos deste nó
      const { data: filhos } = await supabase
        .from('tarefas')
        .select('id, concluida, prazo_dias')
        .eq('depende_de_id', currentId)

      for (const filho of filhos ?? []) {
        if (visited.has(filho.id)) continue
        visited.add(filho.id)
        stack.push(filho.id)

        if (filho.concluida) continue // não re-bloqueia o que já foi concluído

        updates.push({
          id: filho.id,
          data: { status: 'Bloqueada', data_fim: null }
        })
      }
    }
  }

  // Aplica todas as atualizações em paralelo
  await Promise.all(
    updates.map(({ id, data }) =>
      supabase.from('tarefas').update(data).eq('id', id)
    )
  )

  // Retorna progresso do cliente
  const { data: progresso } = await supabase
    .from('tarefas')
    .select('id, concluida')
    .eq('cliente_id', tarefa.cliente_id)

  const total = progresso?.length ?? 0
  const done = progresso?.filter(t => t.concluida).length ?? 0

  return {
    desbloqueadas: updates.filter(u => u.data.status === 'Pendente').map(u => u.id),
    rebloqueadas: updates.filter(u => u.data.status === 'Bloqueada').map(u => u.id),
    progress: { total, done }
  }
}
```

> **Otimização para Supabase:** Se a árvore de dependências for muito profunda, substitua o DFS iterativo com chamadas sequenciais por uma **Recursive CTE** no PostgreSQL:
> ```sql
> WITH RECURSIVE descendentes AS (
>   SELECT id, concluida FROM tarefas WHERE depende_de_id = $1
>   UNION ALL
>   SELECT t.id, t.concluida FROM tarefas t
>   JOIN descendentes d ON t.depende_de_id = d.id
> )
> UPDATE tarefas
> SET status = 'Bloqueada', data_fim = NULL
> WHERE id IN (SELECT id FROM descendentes WHERE concluida = false);
> ```

---

### 3.3 Batch Insert — Lançar Tarefas Padrão

O fluxo tem **duas passadas** obrigatórias para reconstituir as dependências entre as tarefas recém-criadas:

```typescript
// lib/tasks/batchLaunch.ts

type TemplateWithResponsavel = {
  template: TarefaPadrao
  responsavelId: string  // pode sobrescrever usuario_padrao_id
}

export async function batchLaunchTasks(
  clienteId: string,
  selecionados: TemplateWithResponsavel[]
): Promise<{ criadas: number; tarefas: Tarefa[] }> {
  const agora = new Date()
  const hoje = agora.toISOString().split('T')[0]
  const lote = agora.toISOString() // mesmo timestamp para todo o lote

  // ─── 1ª PASSADA: cria as tarefas SEM dependências ───────────────────────
  // Mapeia id_do_template → id_da_tarefa_criada (para a 2ª passada)
  const idMap = new Map<string, string>() // template.id → tarefa.id

  const insertsPromises = selecionados.map(async ({ template, responsavelId }, index) => {
    const temDependencia = !!template.depende_de_id

    // Prepara número de ordem na descrição (ex: "3- Salvar briefing")
    const descricao = /^\s*\d+\s*[-–.)]/.test(template.descricao)
      ? template.descricao
      : `${template.ordem}- ${template.descricao.trim()}`

    const tarefa: Omit<Tarefa, 'id'> = {
      descricao,
      tipo: template.tipo,
      prioridade: 'Média',
      cliente_id: clienteId,
      usuario_id: responsavelId || template.usuario_padrao_id || null,
      prazo_dias: template.prazo_dias ?? 0,
      ordem: index + 1,
      lote,
      status: temDependencia ? 'Bloqueada' : 'Pendente',
      data_inicio: temDependencia ? null : hoje,
      data_fim: temDependencia
        ? null
        : calculateDueDate(new Date(hoje), template.prazo_dias ?? 0)
            ?.toISOString().split('T')[0] ?? null,
      depende_de_id: null, // será preenchido na 2ª passada
    }

    const { data } = await supabase.from('tarefas').insert(tarefa).select('id').single()
    if (data) idMap.set(template.id, data.id)
    return data
  })

  await Promise.all(insertsPromises)

  // ─── 2ª PASSADA: amarra dependências entre as tarefas criadas ────────────
  const updatePromises = selecionados
    .filter(({ template }) => template.depende_de_id && idMap.has(template.depende_de_id))
    .map(({ template }) => {
      const tarefaId = idMap.get(template.id)!
      const dependeDeId = idMap.get(template.depende_de_id!)!
      return supabase.from('tarefas').update({ depende_de_id: dependeDeId }).eq('id', tarefaId)
    })

  await Promise.all(updatePromises)

  const criadas = [...idMap.values()]
  return { criadas: criadas.length, tarefas: [] }
}
```

**Por que duas passadas?**
Na 1ª passada, as tarefas ainda não têm ID gerado pelo banco. A 2ª passada usa o `idMap` (template.id → tarefa.id) para apontar `depende_de_id` para a tarefa correta já criada.

---

### 3.4 Reordenação Atômica de Templates

```typescript
// Equivalente de atualizar_ordem_tarefas_padrao() do Flask
// Sugerido como Supabase RPC (função PostgreSQL) para atomicidade

-- Cria a função no Supabase SQL Editor:
CREATE OR REPLACE FUNCTION reorder_tarefas_padrao(ordered_ids BIGINT[])
RETURNS void AS $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..array_length(ordered_ids, 1) LOOP
    UPDATE tarefas_padrao
    SET ordem = i
    WHERE id = ordered_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Chamada no frontend:
const salvarOrdem = async (orderedIds: string[]) => {
  const { error } = await supabase.rpc('reorder_tarefas_padrao', {
    ordered_ids: orderedIds.map(Number)
  })
  if (error) throw error
}
```

---

## 4. n8n + Supabase

### 4.1 Geração de Tarefas Recorrentes (equivale ao APScheduler)

No sistema original, a função `gerar_recorrentes_hoje()` é disparada via APScheduler diário ou comando CLI. No seu stack, isso vira um **workflow n8n**:

```
Trigger: Schedule (toda segunda-feira às 08:00)
    ↓
Node: Supabase — Query
  SELECT id, descricao, tipo, cliente_id, usuario_id, prazo_dias
  FROM tarefas_recorrentes
  WHERE ativa = true
    AND periodicidade = 'semanal'
    AND dia_semana = EXTRACT(DOW FROM CURRENT_DATE) - 1  -- Ajuste: DOW no PG: 0=Dom
    AND (inicio IS NULL OR inicio <= CURRENT_DATE)
    AND (fim IS NULL OR fim >= CURRENT_DATE)
    ↓
Node: Function (para cada item)
  // Verifica duplicata
  const existente = await supabase
    .from('tarefas')
    .select('id')
    .eq('origem_recorrente_id', item.id)
    .eq('data_inicio', today)
    .single()

  if (existente.data) return null  // já criado hoje

  return {
    descricao: item.descricao,
    tipo: item.tipo,
    cliente_id: item.cliente_id,
    usuario_id: item.usuario_id,
    data_inicio: today,
    data_fim: today,
    status: 'Pendente',
    lote: new Date().toISOString(),
    ordem: 1,
    origem_recorrente_id: item.id
  }
    ↓
Node: Supabase — Insert (filtrado de nulos)
  Insere na tabela `tarefas`
```

---

### 4.2 Realtime — Atualização entre Abas (equivale ao BroadcastChannel)

O sistema original usa `BroadcastChannel('tarefas-events')` para atualizar outras abas quando uma tarefa é concluída. Com Supabase Realtime:

```typescript
// hooks/useTasksRealtime.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useTasksRealtime(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('tarefas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tarefas' },
        (_payload) => {
          onUpdate() // refetch ou invalidate query
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onUpdate])
}

// Uso com React Query:
const { data, refetch } = useQuery(['tarefas'], fetchTarefas)
useTasksRealtime(refetch)
```

---

## 5. Snippets de Referência

### 5.1 Query de Listagem com Filtro de 15 dias (Performance)

O sistema original não carrega tarefas concluídas há mais de 15 dias. Equivalente em Supabase:

```typescript
// Busca tarefas: pendentes/bloqueadas + concluídas nos últimos 15 dias
const cutoffDate = new Date()
cutoffDate.setDate(cutoffDate.getDate() - 15)

const { data: tarefas } = await supabase
  .from('tarefas')
  .select(`
    *,
    cliente:clientes(id, nome_cliente),
    responsavel:usuarios(id, nome),
    mae:tarefas!depende_de_id(id, descricao, status)
  `)
  .or(
    `status.neq.Concluída,` +
    `and(status.eq.Concluída,concluida_em.gte.${cutoffDate.toISOString()})`
  )
  .order('lote', { ascending: false })
  .order('ordem', { ascending: true })
```

---

### 5.2 Estrutura de Tipos TypeScript

```typescript
// types/tasks.ts

export type TaskStatus = 'Pendente' | 'Bloqueada' | 'Concluída'
export type TaskPriority = 'Alta' | 'Média' | 'Baixa'
export type TaskSector =
  | 'Implementação'
  | 'Google Meu Negócio'
  | 'Site'
  | 'Traqueamento'
  | 'Gestão de Tráfego'
  | 'Financeiro'
  | 'Vendas'
  | 'Supervisão'

export type Tarefa = {
  id: string
  descricao: string
  tipo: TaskSector | null
  prioridade: TaskPriority
  observacoes: string | null
  data_inicio: string | null   // ISO date 'YYYY-MM-DD'
  data_fim: string | null
  concluida_em: string | null  // ISO timestamp
  status: TaskStatus
  concluida: boolean
  prazo_dias: number
  cliente_id: string | null
  usuario_id: string | null
  depende_de_id: string | null
  lote: string                 // ISO timestamp — agrupa batch
  ordem: number
  origem_recorrente_id: string | null
  created_at: string
  updated_at: string
  // Joins opcionais
  cliente?: { id: string; nome_cliente: string }
  responsavel?: { id: string; nome: string }
  mae?: { id: string; descricao: string; status: TaskStatus } | null
}

export type TarefaPadrao = {
  id: string
  ordem: number
  descricao: string
  tipo: TaskSector
  prazo_dias: number
  usuario_padrao_id: string | null
  depende_de_id: string | null
  // Joins opcionais
  usuario_padrao?: { id: string; nome: string } | null
  depende_de?: { id: string; descricao: string } | null
}

export type TarefaRecorrente = {
  id: string
  descricao: string
  tipo: TaskSector | null
  cliente_id: string
  usuario_id: string | null
  campaign_id: string | null
  periodicidade: 'semanal' | 'mensal'
  dia_semana: number | null   // 0=Seg...6=Dom
  inicio: string | null
  fim: string | null
  ativa: boolean
  observacoes_padrao: string | null
}
```

---

### 5.3 Seed das 39 Tarefas Padrão

O sistema original possui um combo com 39 tarefas em cadeia de dependências. Abaixo o INSERT pronto para Supabase:

```sql
-- Execute no Supabase SQL Editor para criar o combo padrão
-- (primeira inserção sem dependências, segunda atualiza os depende_de_id)

INSERT INTO tarefas_padrao (ordem, descricao, tipo, prazo_dias) VALUES
(1,  '1- Briefing recebido?',                     'Implementação',       2),
(2,  '2- Fazer pasta do cliente',                  'Implementação',       1),
(3,  '3- Salvar briefing na pasta',                'Implementação',       1),
(4,  '4- Apresentação para a equipe',              'Implementação',       1),
(5,  '5- Enviar link de acesso ao drive',          'Implementação',       1),
(6,  '6- Onboarding',                              'Implementação',       3),
(7,  '7- Enviar pesquisa de satisfação',           'Implementação',       1),
(8,  '8- Criar conta no Google Ads',               'Implementação',       2),
(9,  '9- Verificar se tem conta Google Ads',       'Implementação',       1),
(10, '10- Verificar propriedade do site',          'Implementação',       2),
(11, '11- Criar conta no Analytics',               'Implementação',       1),
(12, '12- Conceder acesso ao Analytics',           'Implementação',       1),
(13, '13- Pedir acesso ao gerenciador de negócios','Implementação',       1),
(14, '14- Criar conta no Google Ads (nova)',       'Implementação',       1),
(15, '15- Conceder acesso à conta Google Ads',     'Implementação',       1),
(16, '16- Definir orçamento da campanha',          'Implementação',       1),
(17, '17- Verificar pagamento Google Ads',         'Implementação',       2),
(18, '18- Fazer verificação de anunciante',        'Implementação',       3),
(19, '19- Salvar dados do cliente',                'Implementação',       1),
(20, '20- Enviar formulário de onboarding',        'Implementação',       1),
(21, '21- Criar ou verificar GMN',                 'Google Meu Negócio',  2),
(22, '22- Transferir propriedade do GMN',          'Google Meu Negócio',  2),
(23, '23- Verificar hospedagem',                   'Site',                1),
(24, '24- Instalar WordPress',                     'Site',                2),
(25, '25- Instalar plugins essenciais',            'Site',                1),
(26, '26- Criar LP (Landing Page)',                'Site',                5),
(27, '27- Enviar LP para aprovação',               'Site',                1),
(28, '28- Ajustes da LP',                          'Site',                3),
(29, '29- LP aprovada pelo cliente',               'Site',                1),
(30, '30- Publicar LP',                            'Site',                1),
(31, '31- Configurar domínio',                     'Site',                2),
(32, '32- Instalar TAG Manager',                   'Traqueamento',        1),
(33, '33- Instalar TAGs (conversão, analytics)',   'Traqueamento',        2),
(34, '34- Testar e validar TAGs',                  'Traqueamento',        1),
(35, '35- Criar públicos e remarketing',           'Gestão de Tráfego',   2),
(36, '36- Criar campanha',                         'Gestão de Tráfego',   3),
(37, '37- Criar lista de palavras-chave',          'Gestão de Tráfego',   2),
(38, '38- Criar extensões de anúncio',             'Gestão de Tráfego',   1),
(39, '39- Gerenciamento de campanha',              'Gestão de Tráfego',   0);

-- Atualiza dependências (execute após o INSERT acima)
-- A maioria das tarefas depende da tarefa #6 (Onboarding)
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 1)  WHERE ordem = 3;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 1)  WHERE ordem = 4;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 1)  WHERE ordem = 5;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 5)  WHERE ordem = 6;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 7;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 8;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 9;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 10;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 11;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 21;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 6)  WHERE ordem = 23;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 33) WHERE ordem = 34;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 33) WHERE ordem = 35;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 35) WHERE ordem = 36;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 36) WHERE ordem = 37;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 36) WHERE ordem = 38;
UPDATE tarefas_padrao SET depende_de_id = (SELECT id FROM tarefas_padrao WHERE ordem = 36) WHERE ordem = 39;
```

---

## Resumo das Decisões de Implementação

| Decisão | Sistema Original (Flask) | Recomendação (React + Supabase) |
|---|---|---|
| **Cascade de dependências** | DFS iterativo em Python | DFS em TS ou Recursive CTE no Postgres |
| **Batch insert** | Two-pass com `flush()` SQLAlchemy | Two-pass com `idMap` + Promise.all |
| **Dias úteis** | Loop Python ignorando Sab/Dom | `calculateDueDate()` em TS (mesmo algoritmo) |
| **Reordenação drag-drop** | SortableJS + fetch AJAX | `@dnd-kit` + Supabase RPC atômica |
| **Recorrência** | APScheduler diário | n8n Workflow com Schedule Trigger |
| **Realtime cross-tab** | BroadcastChannel | Supabase Realtime + React Query refetch |
| **Filtro de performance** | `concluida_em >= hoje - 15d` | Mesmo filtro na query Supabase |
| **Persistência de view** | localStorage por `usuario_id` | localStorage por `userId` (mesmo padrão) |
| **Agrupamento de batch** | `lote` (timestamp) + `ordem` | Mesmas colunas no schema PostgreSQL |

---

*Documento gerado em 2026-03-08 por engenharia reversa do repositório lander-app.*
