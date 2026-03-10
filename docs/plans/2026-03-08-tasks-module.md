# Tasks Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Construir o módulo completo de Tarefas (criação, filtros, dependências em cascata, templates drag-and-drop e lançamento em batch) no CRM React + TypeScript + Supabase.

**Architecture:** Supabase como banco + auth + realtime; lógica de negócio em hooks React e funções TS puras; componentes atômicos com Tailwind + Framer Motion; n8n para geração de tarefas recorrentes. Todo o estado de servidor via React Query com invalidação em tempo real pelo Supabase Realtime channel.

**Tech Stack:** React 18, TypeScript, Supabase JS v2, React Query v5, @dnd-kit/core, Framer Motion, Tailwind CSS, Lucide React, n8n (workflow externo).

**Referência:** `manual_implementacao_tarefas.md` na raiz deste repositório contém todos os schemas SQL, tipos TS e snippets de lógica de negócio prontos para copiar.

---

## Task 1: Schema do Banco de Dados no Supabase

**Files:**
- Create: `supabase/migrations/20260308_tasks_module.sql`

**Step 1: Criar o arquivo de migration**

Copie o conteúdo do `manual_implementacao_tarefas.md` seção 1 (tabelas `tarefas`, `tarefas_padrao`, `tarefas_recorrentes`) e cole em `supabase/migrations/20260308_tasks_module.sql`.

**Step 2: Aplicar a migration**

```bash
supabase db push
# ou pelo painel: Supabase Dashboard → SQL Editor → Execute
```

Expected: tabelas criadas sem erros, índices visíveis em Database → Tables.

**Step 3: Habilitar RLS e criar policies**

No Supabase SQL Editor, execute as policies da seção `1.4` do manual:

```sql
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_padrao ENABLE ROW LEVEL SECURITY;
-- cole as policies do manual...
```

**Step 4: Seed das 39 tarefas padrão**

Execute o INSERT da seção `5.3` do manual no SQL Editor.
Expected: `SELECT count(*) FROM tarefas_padrao` → `39`.

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): adiciona schema do módulo de tarefas com RLS e seed padrão"
```

---

## Task 2: Tipos TypeScript Centrais

**Files:**
- Create: `src/types/tasks.ts`

**Step 1: Criar o arquivo de tipos**

Copie os tipos da seção `5.2` do manual (`Tarefa`, `TarefaPadrao`, `TarefaRecorrente`, `TaskStatus`, `TaskPriority`, `TaskSector`) para `src/types/tasks.ts`.

**Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```
Expected: zero erros.

**Step 3: Commit**

```bash
git add src/types/tasks.ts
git commit -m "feat(types): adiciona tipos do módulo de tarefas"
```

---

## Task 3: Funções de Lógica de Negócio Pura

**Files:**
- Create: `src/lib/tasks/calculateDueDate.ts`
- Create: `src/lib/tasks/calculateDueDate.test.ts`
- Create: `src/lib/tasks/batchLaunch.ts`

**Step 1: Escrever o teste de `calculateDueDate`**

```typescript
// src/lib/tasks/calculateDueDate.test.ts
import { calculateDueDate } from './calculateDueDate'

describe('calculateDueDate', () => {
  it('retorna null para prazo 0', () => {
    expect(calculateDueDate(new Date('2024-01-01'), 0)).toBeNull()
  })

  it('retorna null para prazo negativo', () => {
    expect(calculateDueDate(new Date('2024-01-01'), -1)).toBeNull()
  })

  it('pula fim de semana: 1 dia útil após sexta = segunda', () => {
    // 2024-01-05 = sexta
    const result = calculateDueDate(new Date('2024-01-05'), 1)
    expect(result?.toISOString().split('T')[0]).toBe('2024-01-08') // segunda
  })

  it('calcula 5 dias úteis corretamente', () => {
    // 2024-01-01 = segunda
    const result = calculateDueDate(new Date('2024-01-01'), 5)
    expect(result?.toISOString().split('T')[0]).toBe('2024-01-08') // próxima segunda
  })
})
```

**Step 2: Rodar e verificar falha**

```bash
npx vitest run src/lib/tasks/calculateDueDate.test.ts
```
Expected: FAIL — `Cannot find module './calculateDueDate'`

**Step 3: Implementar `calculateDueDate`**

Copie o snippet da seção `3.1` do manual para `src/lib/tasks/calculateDueDate.ts`.

**Step 4: Rodar e verificar aprovação**

```bash
npx vitest run src/lib/tasks/calculateDueDate.test.ts
```
Expected: 4 testes PASS.

**Step 5: Implementar `batchLaunch`**

Copie o snippet da seção `3.3` do manual para `src/lib/tasks/batchLaunch.ts`.
Ajuste o import do Supabase para o path do seu projeto (`@/lib/supabase`).

**Step 6: Verificar compilação**

```bash
npx tsc --noEmit
```
Expected: zero erros.

**Step 7: Commit**

```bash
git add src/lib/tasks/
git commit -m "feat(lib): adiciona calculateDueDate e batchLaunch com testes"
```

---

## Task 4: Hook `useTaskFilters` (Filtros e Ordenação)

**Files:**
- Create: `src/hooks/useTaskFilters.ts`
- Create: `src/hooks/useTaskFilters.test.ts`

**Step 1: Escrever o teste**

```typescript
// src/hooks/useTaskFilters.test.ts
import { renderHook, act } from '@testing-library/react'
import { useTaskFilters } from './useTaskFilters'
import type { Tarefa } from '@/types/tasks'

const mockTarefas: Tarefa[] = [
  { id: '1', descricao: 'Tarefa A', status: 'Pendente', usuario_id: 'u1', cliente_id: 'c1', tipo: 'Site', prioridade: 'Alta', data_fim: '2024-01-01', concluida: false, lote: '', ordem: 1, prazo_dias: 5, created_at: '', updated_at: '' } as Tarefa,
  { id: '2', descricao: 'Tarefa B', status: 'Concluída', usuario_id: 'u2', cliente_id: 'c2', tipo: 'Implementação', prioridade: 'Baixa', data_fim: '2024-01-02', concluida: true, lote: '', ordem: 2, prazo_dias: 0, created_at: '', updated_at: '' } as Tarefa,
]

test('ocultarConcluidas remove tarefas concluídas', () => {
  const { result } = renderHook(() => useTaskFilters(mockTarefas, 'u1'))
  act(() => result.current.setFilters(f => ({ ...f, ocultarConcluidas: true })))
  expect(result.current.sorted).toHaveLength(1)
  expect(result.current.sorted[0].id).toBe('1')
})

test('soMinhas filtra por usuario_id', () => {
  const { result } = renderHook(() => useTaskFilters(mockTarefas, 'u1'))
  act(() => result.current.setFilters(f => ({ ...f, soMinhas: true })))
  expect(result.current.sorted).toHaveLength(1)
  expect(result.current.sorted[0].usuario_id).toBe('u1')
})
```

**Step 2: Rodar e verificar falha**

```bash
npx vitest run src/hooks/useTaskFilters.test.ts
```
Expected: FAIL.

**Step 3: Implementar o hook**

Copie o hook da seção `2.2` do manual para `src/hooks/useTaskFilters.ts`.

**Step 4: Rodar e verificar aprovação**

```bash
npx vitest run src/hooks/useTaskFilters.test.ts
```
Expected: 2 testes PASS.

**Step 5: Commit**

```bash
git add src/hooks/useTaskFilters.ts src/hooks/useTaskFilters.test.ts
git commit -m "feat(hooks): adiciona useTaskFilters com testes"
```

---

## Task 5: Hook `useTasks` (Supabase Query + Realtime)

**Files:**
- Create: `src/hooks/useTasks.ts`

**Step 1: Implementar o hook**

```typescript
// src/hooks/useTasks.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tarefa } from '@/types/tasks'

async function fetchTarefas(): Promise<Tarefa[]> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 15)

  const { data, error } = await supabase
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

  if (error) throw error
  return data as Tarefa[]
}

export function useTasks() {
  const queryClient = useQueryClient()

  // Realtime: invalida cache quando qualquer tarefa muda
  useEffect(() => {
    const channel = supabase
      .channel('tarefas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tarefas'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({ queryKey: ['tarefas'], queryFn: fetchTarefas })
}
```

**Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```
Expected: zero erros.

**Step 3: Commit**

```bash
git add src/hooks/useTasks.ts
git commit -m "feat(hooks): adiciona useTasks com Supabase Realtime"
```

---

## Task 6: Componente `TaskRow`

**Files:**
- Create: `src/components/tasks/TaskRow.tsx`

**Step 1: Implementar o componente**

```typescript
// src/components/tasks/TaskRow.tsx
import { Pencil, Trash2, Circle, CheckCircle2, Lock } from 'lucide-react'
import type { Tarefa } from '@/types/tasks'

const STATUS_STYLES = {
  Pendente:  'text-blue-600 bg-blue-50',
  Bloqueada: 'text-yellow-700 bg-yellow-50',
  Concluída: 'text-green-700 bg-green-50',
}

const SECTOR_STYLES: Record<string, string> = {
  'Implementação':      'bg-indigo-100 text-indigo-800',
  'Gestão de Tráfego':  'bg-purple-100 text-purple-800',
  'Site':               'bg-sky-100 text-sky-800',
  'Traqueamento':       'bg-orange-100 text-orange-800',
  'Google Meu Negócio': 'bg-green-100 text-green-800',
  'Financeiro':         'bg-emerald-100 text-emerald-800',
}

type Props = {
  tarefa: Tarefa
  onToggle: (id: string, concluida: boolean) => void
  onEdit: (tarefa: Tarefa) => void
  onDelete: (id: string) => void
}

export function TaskRow({ tarefa, onToggle, onEdit, onDelete }: Props) {
  const isConcluida = tarefa.status === 'Concluída'
  const isBloqueada = tarefa.status === 'Bloqueada'

  return (
    <tr className={`border-b transition-colors ${isConcluida ? 'opacity-60' : 'hover:bg-gray-50'}`}>
      {/* Checkbox conclusão */}
      <td className="px-4 py-3 w-10">
        <button
          onClick={() => onToggle(tarefa.id, !tarefa.concluida)}
          disabled={isBloqueada}
          className="text-gray-400 hover:text-green-500 disabled:cursor-not-allowed"
        >
          {isBloqueada
            ? <Lock size={18} className="text-yellow-400" />
            : isConcluida
              ? <CheckCircle2 size={18} className="text-green-500" />
              : <Circle size={18} />
          }
        </button>
      </td>

      {/* Prazo */}
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {tarefa.data_fim ?? '—'}
      </td>

      {/* Cliente */}
      <td className="px-4 py-3 text-sm font-medium text-gray-800">
        {tarefa.cliente?.nome_cliente ?? '—'}
      </td>

      {/* Descrição */}
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
        {tarefa.descricao}
        {tarefa.origem_recorrente_id && <span className="ml-1">🔁</span>}
      </td>

      {/* Responsável */}
      <td className="px-4 py-3 text-sm text-gray-600">
        {tarefa.responsavel?.nome ?? '—'}
      </td>

      {/* Setor */}
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${SECTOR_STYLES[tarefa.tipo ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
          {tarefa.tipo ?? '—'}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_STYLES[tarefa.status]}`}>
          {tarefa.status}
        </span>
      </td>

      {/* Ações */}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button onClick={() => onEdit(tarefa)} className="text-gray-400 hover:text-blue-500">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(tarefa.id)} className="text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  )
}
```

**Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```
Expected: zero erros.

**Step 3: Commit**

```bash
git add src/components/tasks/TaskRow.tsx
git commit -m "feat(ui): adiciona TaskRow com status, setor e ações"
```

---

## Task 7: Componente `TaskModal` (Criar / Editar)

**Files:**
- Create: `src/components/tasks/TaskModal.tsx`

**Step 1: Implementar o modal**

```typescript
// src/components/tasks/TaskModal.tsx
import { useForm } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import type { Tarefa, TaskSector, TaskPriority } from '@/types/tasks'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

const SETORES: TaskSector[] = [
  'Implementação', 'Google Meu Negócio', 'Site', 'Traqueamento',
  'Gestão de Tráfego', 'Financeiro', 'Vendas', 'Supervisão'
]
const PRIORIDADES: TaskPriority[] = ['Alta', 'Média', 'Baixa']

type FormData = {
  descricao: string
  tipo: TaskSector
  prioridade: TaskPriority
  observacoes?: string
  data_inicio?: string
  data_fim?: string
  cliente_id?: string
  usuario_id?: string
}

type Props = {
  isOpen: boolean
  tarefa?: Tarefa | null    // null = criar, Tarefa = editar
  clientes: { id: string; nome_cliente: string }[]
  usuarios: { id: string; nome: string }[]
  onClose: () => void
}

export function TaskModal({ isOpen, tarefa, clientes, usuarios, onClose }: Props) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: tarefa ? {
      descricao: tarefa.descricao,
      tipo: tarefa.tipo as TaskSector,
      prioridade: tarefa.prioridade as TaskPriority,
      observacoes: tarefa.observacoes ?? '',
      data_inicio: tarefa.data_inicio ?? '',
      data_fim: tarefa.data_fim ?? '',
      cliente_id: tarefa.cliente_id ?? '',
      usuario_id: tarefa.usuario_id ?? '',
    } : { prioridade: 'Média' }
  })

  const onSubmit = async (data: FormData) => {
    if (tarefa) {
      await supabase.from('tarefas').update(data).eq('id', tarefa.id)
    } else {
      await supabase.from('tarefas').insert({
        ...data,
        status: 'Pendente',
        concluida: false,
        lote: new Date().toISOString(),
        ordem: 1,
      })
    }
    qc.invalidateQueries({ queryKey: ['tarefas'] })
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg"
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500">Tarefa *</label>
                <input {...register('descricao', { required: true })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Setor *</label>
                <select {...register('tipo', { required: true })}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                  {SETORES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Prioridade</label>
                <select {...register('prioridade')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                  {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Cliente</label>
                <select {...register('cliente_id')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                  <option value="">— Nenhum —</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Responsável</label>
                <select {...register('usuario_id')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
                  <option value="">— Nenhum —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Data de Início</label>
                <input type="date" {...register('data_inicio')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500">Data de Fim (Prazo)</label>
                <input type="date" {...register('data_fim')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500">Observações</label>
                <textarea {...register('observacoes')}
                  className="w-full mt-1 border rounded-xl px-3 py-2 text-sm min-h-[80px]" />
              </div>

              <div className="col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm rounded-xl border text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {isSubmitting ? 'Salvando...' : tarefa ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Step 2: Verificar compilação**

```bash
npx tsc --noEmit
```
Expected: zero erros.

**Step 3: Commit**

```bash
git add src/components/tasks/TaskModal.tsx
git commit -m "feat(ui): adiciona TaskModal criar/editar com Framer Motion"
```

---

## Task 8: Página Principal `TasksPage`

**Files:**
- Create: `src/pages/TasksPage.tsx`

**Step 1: Implementar a página**

```typescript
// src/pages/TasksPage.tsx
import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useTaskFilters } from '@/hooks/useTaskFilters'
import { TaskRow } from '@/components/tasks/TaskRow'
import { TaskModal } from '@/components/tasks/TaskModal'
import { toggleTaskCompletion } from '@/lib/tasks/toggleCompletion'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tarefa } from '@/types/tasks'

export function TasksPage() {
  const { data: tarefas = [], isLoading } = useTasks()
  const { data: clientes = [] } = useClientes()  // seu hook de clientes existente
  const { data: usuarios = [] } = useUsuarios()  // seu hook de usuários existente

  const usuarioAtualId = useCurrentUserId()       // seu hook de auth
  const { filters, setFilters, sorted } = useTaskFilters(tarefas, usuarioAtualId)

  const [modal, setModal] = useState<{ open: boolean; tarefa?: Tarefa | null }>({ open: false })
  const qc = useQueryClient()

  const handleToggle = async (id: string, concluida: boolean) => {
    await toggleTaskCompletion(id, concluida)
    qc.invalidateQueries({ queryKey: ['tarefas'] })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return
    await supabase.from('tarefas').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['tarefas'] })
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando tarefas…</div>

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setFilters(f => ({ ...f, soMinhas: !f.soMinhas }))}
            className={`px-4 py-2 text-sm rounded-xl font-bold transition-colors ${filters.soMinhas ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Minhas Tarefas
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, ocultarConcluidas: !f.ocultarConcluidas }))}
            className={`px-4 py-2 text-sm rounded-xl font-bold transition-colors ${filters.ocultarConcluidas ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Ocultar Concluídas
          </button>

          {/* Dropdown Configurações */}
          <div className="relative group">
            <button className="px-4 py-2 text-sm rounded-xl bg-gray-100 text-gray-600 font-bold flex items-center gap-2">
              <Settings size={16} /> Configurações
            </button>
            <div className="hidden group-hover:flex flex-col absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg overflow-hidden z-10 min-w-[200px]">
              <a href="/tarefas-padrao" className="px-4 py-3 text-sm hover:bg-gray-50">Editar Tarefas Padrão</a>
              <a href="/lancar-tarefas-padrao" className="px-4 py-3 text-sm hover:bg-gray-50">Lançar Tarefas Padrão</a>
            </div>
          </div>

          <button
            onClick={() => setModal({ open: true, tarefa: null })}
            className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          onChange={e => setFilters(f => ({ ...f, clienteId: e.target.value }))}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todos os Clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome_cliente}</option>)}
        </select>

        <select
          onChange={e => setFilters(f => ({ ...f, usuarioId: e.target.value }))}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option value="">Todos os Responsáveis</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>

        <select
          onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option value="todos">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Bloqueada">Bloqueada</option>
          <option value="Concluída">Concluída</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Prazo</th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Cliente</th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Tarefa</th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Responsável</th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Setor</th>
              <th className="px-4 py-3 text-left text-gray-500 font-bold text-xs">Status</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0
              ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhuma tarefa encontrada.</td></tr>
              : sorted.map(t => (
                  <TaskRow
                    key={t.id}
                    tarefa={t}
                    onToggle={handleToggle}
                    onEdit={tarefa => setModal({ open: true, tarefa })}
                    onDelete={handleDelete}
                  />
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <TaskModal
        isOpen={modal.open}
        tarefa={modal.tarefa}
        clientes={clientes}
        usuarios={usuarios}
        onClose={() => setModal({ open: false })}
      />
    </div>
  )
}
```

**Step 2: Registrar a rota no seu router (ex: React Router)**

```typescript
// No seu router:
<Route path="/tarefas" element={<TasksPage />} />
```

**Step 3: Testar manualmente**

1. Abrir `/tarefas`
2. Verificar listagem de tarefas
3. Criar uma tarefa pelo botão "+ Nova Tarefa"
4. Verificar que aparece na lista
5. Concluir a tarefa e verificar mudança de status

**Step 4: Commit**

```bash
git add src/pages/TasksPage.tsx
git commit -m "feat(pages): adiciona TasksPage com filtros, modal e toggle de conclusão"
```

---

## Task 9: Toggle de Conclusão com Cascade de Dependências

**Files:**
- Create: `src/lib/tasks/toggleCompletion.ts`
- Create: `src/lib/tasks/toggleCompletion.test.ts`

**Step 1: Escrever os testes**

```typescript
// src/lib/tasks/toggleCompletion.test.ts
// Nota: estes são testes de integração que requerem Supabase local
// Instale: npx supabase start (requer Docker)

import { toggleTaskCompletion } from './toggleCompletion'
import { supabase } from '@/lib/supabase'

describe('toggleTaskCompletion', () => {
  it('ao concluir: muda status para Concluída e desbloqueia filho direto', async () => {
    // Setup: cria tarefa mãe + filha dependente no banco de teste
    const { data: mae } = await supabase.from('tarefas')
      .insert({ descricao: 'Mãe', status: 'Pendente', concluida: false, lote: new Date().toISOString(), ordem: 1, prazo_dias: 2 })
      .select().single()

    const { data: filha } = await supabase.from('tarefas')
      .insert({ descricao: 'Filha', status: 'Bloqueada', concluida: false, depende_de_id: mae!.id, lote: new Date().toISOString(), ordem: 2, prazo_dias: 2 })
      .select().single()

    await toggleTaskCompletion(mae!.id, true)

    const { data: filhaAtualizada } = await supabase.from('tarefas').select('status').eq('id', filha!.id).single()
    expect(filhaAtualizada?.status).toBe('Pendente')
  })
})
```

**Step 2: Implementar `toggleCompletion`**

Copie o snippet da seção `3.2` do manual para `src/lib/tasks/toggleCompletion.ts`.

**Step 3: Testar manualmente no browser**

1. Criar duas tarefas onde B depende de A
2. Verificar que B está "Bloqueada"
3. Concluir A → verificar que B vira "Pendente" automaticamente
4. Desconcluir A → verificar que B volta a "Bloqueada"

**Step 4: Commit**

```bash
git add src/lib/tasks/toggleCompletion.ts src/lib/tasks/toggleCompletion.test.ts
git commit -m "feat(lib): adiciona toggleCompletion com cascade de dependências"
```

---

## Task 10: Página de Gerenciamento de Templates (`StandardTasksPage`)

**Files:**
- Create: `src/pages/StandardTasksPage.tsx`

**Step 1: Implementar a página com drag-and-drop**

Crie a página combinando:
- `useTarefasPadrao()` hook (query para `tarefas_padrao` ordenado por `ordem`)
- `DndContext` + `SortableContext` do `@dnd-kit/core` (estrutura da seção `2.5` do manual)
- CRUD: botões Editar / Excluir por linha + "Nova Tarefa Padrão"
- Botão "💾 Salvar Nova Ordem" que aparece após arrastar

**Step 2: Implementar a RPC de reordenação**

No Supabase SQL Editor, crie a função da seção `3.4` do manual:

```sql
CREATE OR REPLACE FUNCTION reorder_tarefas_padrao(ordered_ids BIGINT[])
RETURNS void AS $$
DECLARE i INT;
BEGIN
  FOR i IN 1..array_length(ordered_ids, 1) LOOP
    UPDATE tarefas_padrao SET ordem = i WHERE id = ordered_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Registrar a rota**

```typescript
<Route path="/tarefas-padrao" element={<StandardTasksPage />} />
```

**Step 4: Commit**

```bash
git add src/pages/StandardTasksPage.tsx
git commit -m "feat(pages): adiciona StandardTasksPage com drag-and-drop e CRUD"
```

---

## Task 11: Página de Lançamento em Batch (`BatchLaunchPage`)

**Files:**
- Create: `src/pages/BatchLaunchPage.tsx`

**Step 1: Implementar a página**

```typescript
// src/pages/BatchLaunchPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { batchLaunchTasks } from '@/lib/tasks/batchLaunch'

export function BatchLaunchPage() {
  const navigate = useNavigate()
  const { data: templates = [] } = useTarefasPadrao()
  const { data: clientes = [] } = useClientes()
  const { data: usuarios = [] } = useUsuarios()

  const [clienteId, setClienteId] = useState('')
  const [busca, setBusca] = useState('')
  // selecionados: Map<templateId, responsavelId>
  const [responsaveis, setResponsaveis] = useState<Map<string, string>>(new Map(
    templates.map(t => [t.id, t.usuario_padrao_id ?? ''])
  ))

  const clientesFiltrados = clientes.filter(c =>
    c.nome_cliente.toLowerCase().includes(busca.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selecionados = templates.map(t => ({
      template: t,
      responsavelId: responsaveis.get(t.id) ?? ''
    }))
    await batchLaunchTasks(clienteId, selecionados)
    navigate('/tarefas')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Lançar Tarefas Padrão</h1>
      <p className="text-sm text-gray-500 mb-4">
        Selecione o cliente e defina o responsável de cada item do combo antes de salvar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de cliente */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500">Buscar cliente</label>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Digite parte do nome..."
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500">Cliente *</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} required
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm">
              <option value="">Selecione</option>
              {clientesFiltrados.map(c => (
                <option key={c.id} value={c.id}>{c.nome_cliente}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de templates */}
        <div className="border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 w-10">✓</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Responsável *</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" defaultChecked className="scale-110" />
                  </td>
                  <td className="px-4 py-3 text-sm">{t.descricao}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.tipo}</td>
                  <td className="px-4 py-3">
                    <select
                      value={responsaveis.get(t.id) ?? ''}
                      onChange={e => setResponsaveis(m => new Map(m).set(t.id, e.target.value))}
                      required
                      className="w-full border rounded-xl px-2 py-1 text-sm"
                    >
                      <option value="">Selecione</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/tarefas')}
            className="px-6 py-2 text-sm rounded-xl border text-gray-600">
            Cancelar
          </button>
          <button type="submit" disabled={!clienteId}
            className="px-6 py-2 text-sm rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50">
            Salvar Tarefas
          </button>
        </div>
      </form>
    </div>
  )
}
```

**Step 2: Registrar a rota**

```typescript
<Route path="/lancar-tarefas-padrao" element={<BatchLaunchPage />} />
```

**Step 3: Testar o fluxo completo**

1. Acessar `/lancar-tarefas-padrao`
2. Buscar e selecionar um cliente
3. Definir responsável para cada tarefa
4. Salvar → verificar redirecionamento para `/tarefas`
5. Verificar que as tarefas foram criadas com status correto (Pendente / Bloqueada)
6. Verificar que dependências foram corretamente vinculadas

**Step 4: Commit**

```bash
git add src/pages/BatchLaunchPage.tsx
git commit -m "feat(pages): adiciona BatchLaunchPage com two-pass de dependências"
```

---

## Task 12: Workflow n8n — Tarefas Recorrentes

**Files:**
- Create: `docs/n8n/recorrentes-workflow.json` (exportado do n8n)

**Step 1: Criar o workflow no n8n**

1. Abrir o n8n Dashboard
2. Criar novo workflow: `Gerar Tarefas Recorrentes`
3. Adicionar nó **Schedule Trigger**: toda segunda-feira às 08:00

**Step 2: Adicionar nó Supabase Query**

```sql
SELECT id, descricao, tipo, cliente_id, usuario_id, prazo_dias
FROM tarefas_recorrentes
WHERE ativa = true
  AND periodicidade = 'semanal'
  AND (dia_semana IS NULL OR dia_semana = EXTRACT(ISODOW FROM CURRENT_DATE) - 1)
  AND (inicio IS NULL OR inicio <= CURRENT_DATE)
  AND (fim IS NULL OR fim >= CURRENT_DATE)
```

**Step 3: Adicionar nó Function (verificar duplicata + criar)**

```javascript
const hoje = new Date().toISOString().split('T')[0]
const items = []

for (const item of $input.all()) {
  const rec = item.json

  // Verificar duplicata via Supabase REST
  const check = await $http.get({
    url: `${$env.SUPABASE_URL}/rest/v1/tarefas?origem_recorrente_id=eq.${rec.id}&data_inicio=eq.${hoje}&select=id`,
    headers: {
      apikey: $env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${$env.SUPABASE_ANON_KEY}`
    }
  })

  if (check.data.length > 0) continue // já criado hoje

  items.push({
    json: {
      descricao: rec.descricao,
      tipo: rec.tipo,
      cliente_id: rec.cliente_id,
      usuario_id: rec.usuario_id,
      data_inicio: hoje,
      data_fim: hoje,
      status: 'Pendente',
      concluida: false,
      lote: new Date().toISOString(),
      ordem: 1,
      origem_recorrente_id: rec.id
    }
  })
}

return items
```

**Step 4: Adicionar nó Supabase Insert**

Inserir os itens na tabela `tarefas`.

**Step 5: Exportar e commitar**

Exportar o workflow como JSON e salvar em `docs/n8n/recorrentes-workflow.json`.

```bash
git add docs/n8n/
git commit -m "docs(n8n): adiciona workflow de geração de tarefas recorrentes"
```

---

## Checklist Final de Validação

Antes de considerar o módulo completo, verificar:

- [ ] Criar tarefa manual funciona (`/tarefas` → "Nova Tarefa")
- [ ] Editar tarefa funciona
- [ ] Excluir tarefa funciona
- [ ] Concluir tarefa A desbloqueia tarefa B (que depende de A)
- [ ] Desconcluir tarefa A re-bloqueia tarefa B em cascata
- [ ] Filtros de cliente, responsável e status funcionam
- [ ] "Minhas Tarefas" filtra pelo usuário logado
- [ ] "Ocultar Concluídas" esconde as concluídas
- [ ] Lançar Tarefas Padrão cria as 39 tarefas com dependências corretas
- [ ] Drag-and-drop de templates salva nova ordem no banco
- [ ] Realtime: ao concluir tarefa em outra aba, a lista atualiza automaticamente
- [ ] n8n workflow gera tarefas recorrentes sem duplicatas

---

*Plano gerado em 2026-03-08 com base no manual_implementacao_tarefas.md.*
