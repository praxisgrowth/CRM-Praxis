import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAudit } from './useAudit'
import type { Project, Task } from '../lib/database.types'

/* ─── Derived type ───────────────────────────────── */
export interface ProjectWithTasks extends Project {
  tasks: Task[]
}

export interface NewProjectInput {
  name: string
  client_name: string
  status: Project['status']
  service_type: string | null
  sla_percent: number
  due_date: string | null
}

export interface UseOperationsResult {
  projects: ProjectWithTasks[]
  loading: boolean
  error: string | null
  refetch: () => void
  addProject: (data: NewProjectInput) => Promise<string>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

/* ─── Hook ───────────────────────────────────────── */
export function useOperations(): UseOperationsResult {
  const [projects, setProjects] = useState<ProjectWithTasks[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const { profile } = useAuth()
  const { logAction } = useAudit()

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let projQuery = supabase.from('projects').select('*')
        let taskQuery = supabase.from('tasks').select('*')

        // Se for cliente, filtra apenas os dados dele
        if (profile?.role === 'CLIENT' && profile.client_id) {
          // Nota: Projetos não tem client_id direto em algumas versões, 
          // mas a tabela projects TEM client_name. 
          // No entanto, o correto para segurança é client_id.
          // Vou assumir que projects tem client_id ou filtrar pelo nome se necessário,
          // mas o ideal é client_id.
          projQuery = projQuery.eq('client_id', profile.client_id)
          taskQuery = taskQuery.eq('client_id', profile.client_id)
        }

        const [projRes, taskRes] = await Promise.all([
          projQuery.order('created_at', { ascending: false }),
          taskQuery.order('created_at', { ascending: true }),
        ])

        if (projRes.error) throw projRes.error
        if (taskRes.error) throw taskRes.error

        const projs = (projRes.data ?? []) as Project[]
        const tasks = (taskRes.data ?? []) as Task[]

        const merged: ProjectWithTasks[] = projs.map(p => ({
          ...p,
          tasks: tasks.filter(t => t.project_id === p.id),
        }))

        // Banco tem precedência total: mesmo com 0 projetos, substitui o fallback
        setProjects(merged)
        console.info(`[useOperations] ${merged.length} projeto(s) carregado(s) do Supabase.`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        console.error('[useOperations] Falha ao carregar projetos:', msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick, profile?.role, profile?.client_id])

  /** Optimistic insert — tipagem correta via createClient<Database> */
  const addProject = useCallback(async (input: NewProjectInput) => {
    const optimistic: ProjectWithTasks = {
      ...input,
      id: `tmp-${Date.now()}`,
      client_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tasks: [],
    }
    setProjects(prev => [optimistic, ...prev])

    const { data, error: sbErr } = await (supabase as any)
      .from('projects')
      .insert(input)
      .select()
      .single()

    if (sbErr) {
      console.error('[useOperations] Falha ao inserir projeto, revertendo optimistic:', sbErr.message)
      setProjects(prev => prev.filter(p => p.id !== optimistic.id))
      throw sbErr
    }

    // Substitui o temporário pelo retorno real do Supabase (UUID definitivo, tasks vazio)
    setProjects(prev =>
      prev.map(p => p.id === optimistic.id ? { ...(data as Project), tasks: [] } : p)
    )
    console.info('[useOperations] Projeto persistido com ID:', (data as any).id)
    return (data as any).id
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const { error: sbErr } = await (supabase as any)
      .from('projects')
      .update(updates)
      .eq('id', id)
    
    if (sbErr) {
      console.error('[useOperations] Falha ao atualizar projeto:', sbErr.message)
      refetch()
    }
  }, [refetch])

  const deleteProject = useCallback(async (id: string) => {
    const target = projects.find(p => p.id === id)
    setProjects(prev => prev.filter(p => p.id !== id))
    const { error: sbErr } = await (supabase as any)
      .from('projects')
      .delete()
      .eq('id', id)
    
    if (sbErr) {
      console.error('[useOperations] Falha ao excluir projeto:', sbErr.message)
      refetch()
      return
    }
    logAction('Delete Project', 'project', id, { name: target?.name ?? id })
  }, [refetch, logAction, projects])

  return { projects, loading, error, refetch, addProject, updateProject, deleteProject }
}
