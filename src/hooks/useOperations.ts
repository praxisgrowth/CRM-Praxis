import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
  addProject: (data: NewProjectInput) => Promise<void>
}

/* ─── Fallback ───────────────────────────────────── */
const FALLBACK: ProjectWithTasks[] = [
  {
    id: '1', name: 'Gestão de Tráfego Full', client_name: 'TechVision',
    status: 'ativo', service_type: 'Gestão de Tráfego', sla_percent: 95,
    due_date: '2025-03-15', created_at: '2025-01-10T00:00:00Z', updated_at: '2025-01-10T00:00:00Z',
    tasks: [
      { id: 't1', project_id: '1', title: 'Criar campanhas Google Ads',         status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't2', project_id: '1', title: 'Configurar pixel e eventos Meta',     status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't3', project_id: '1', title: 'Relatório de performance semanal',    status: 'em_andamento', priority: 'media', due_date: null, created_at: '', updated_at: '' },
      { id: 't4', project_id: '1', title: 'Otimização de audiências lookalike',  status: 'pendente',     priority: 'media', due_date: null, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '2', name: 'Social Media & Conteúdo', client_name: 'Nexus Corp',
    status: 'ativo', service_type: 'Social Media', sla_percent: 78,
    due_date: '2025-02-28', created_at: '2025-01-15T00:00:00Z', updated_at: '2025-01-15T00:00:00Z',
    tasks: [
      { id: 't5', project_id: '2', title: 'Calendário editorial janeiro',        status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't6', project_id: '2', title: 'Produção de posts semana 1',          status: 'em_andamento', priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't7', project_id: '2', title: 'Produção de posts semana 2',          status: 'em_andamento', priority: 'media', due_date: null, created_at: '', updated_at: '' },
      { id: 't8', project_id: '2', title: 'Relatório mensal de engajamento',     status: 'pendente',     priority: 'baixa', due_date: null, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '3', name: 'Automação de Chatbot com IA', client_name: 'DataFlow',
    status: 'pausado', service_type: 'Automação de Chatbot com IA', sla_percent: 62,
    due_date: '2025-04-10', created_at: '2025-01-20T00:00:00Z', updated_at: '2025-01-20T00:00:00Z',
    tasks: [
      { id: 't9',  project_id: '3', title: 'Mapeamento de fluxos de atendimento',  status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't10', project_id: '3', title: 'Integração WhatsApp Business API',     status: 'em_andamento', priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't11', project_id: '3', title: 'Treinamento do modelo de IA',          status: 'pendente',     priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '4', name: 'Landing Page + CRO', client_name: 'Retail Max',
    status: 'atrasado', service_type: 'Landing Page', sla_percent: 41,
    due_date: '2025-01-31', created_at: '2024-12-01T00:00:00Z', updated_at: '2024-12-01T00:00:00Z',
    tasks: [
      { id: 't12', project_id: '4', title: 'Briefing e wireframe aprovado',     status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't13', project_id: '4', title: 'Desenvolvimento frontend',          status: 'pendente',     priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't14', project_id: '4', title: 'Testes de conversão (A/B)',         status: 'pendente',     priority: 'media', due_date: null, created_at: '', updated_at: '' },
      { id: 't15', project_id: '4', title: 'Publicação e configuração de DNS',  status: 'pendente',     priority: 'baixa', due_date: null, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '5', name: 'Assessoria Comercial Google Ads', client_name: 'Bioforma',
    status: 'ativo', service_type: 'Assessoria Comercial Google', sla_percent: 92,
    due_date: '2025-03-30', created_at: '2025-01-08T00:00:00Z', updated_at: '2025-01-08T00:00:00Z',
    tasks: [
      { id: 't16', project_id: '5', title: 'Auditoria de conta Google Ads',         status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't17', project_id: '5', title: 'Reestruturação de campanhas Search',    status: 'concluida',    priority: 'alta',  due_date: null, created_at: '', updated_at: '' },
      { id: 't18', project_id: '5', title: 'Configuração de campanhas Display',     status: 'concluida',    priority: 'media', due_date: null, created_at: '', updated_at: '' },
      { id: 't19', project_id: '5', title: 'Relatório de ROAS e otimizações',       status: 'em_andamento', priority: 'media', due_date: null, created_at: '', updated_at: '' },
    ],
  },
]

/* ─── Hook ───────────────────────────────────────── */
export function useOperations(): UseOperationsResult {
  const [projects, setProjects] = useState<ProjectWithTasks[]>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [projRes, taskRes] = await Promise.all([
          supabase.from('projects').select('*').order('created_at', { ascending: false }),
          supabase.from('tasks').select('*').order('created_at', { ascending: true }),
        ])

        if (projRes.error) throw projRes.error
        if (taskRes.error) throw taskRes.error

        const projs = (projRes.data || []) as Project[]
        const tasks = (taskRes.data || []) as Task[]

        const merged = projs.map(p => ({
          ...p,
          tasks: tasks.filter(t => t.project_id === p.id),
        }))

        if (merged.length) setProjects(merged)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar operação'
        setError(msg)
        console.warn('[useOperations] Usando dados fallback:', msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tick])

  /** Optimistic insert */
  const addProject = useCallback(async (input: NewProjectInput) => {
    const optimistic: ProjectWithTasks = {
      ...input,
      id: `tmp-${Date.now()}`,
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
      setProjects(prev => prev.filter(p => p.id !== optimistic.id))
      throw sbErr
    }
    setProjects(prev =>
      prev.map(p => p.id === optimistic.id ? { ...(data as Project), tasks: [] } : p)
    )
  }, [])

  return { projects, loading, error, refetch, addProject }
}
