// src/pages/Operations.tsx
import { useState, useMemo } from 'react'
import { Plus, AlertCircle, RefreshCw, List, LayoutGrid, Briefcase, Edit2, X } from 'lucide-react'
import { useAudit }          from '../hooks/useAudit'
import { useOperations }     from '../hooks/useOperations'
import { useTaskManager }    from '../hooks/useTaskManager'
import { NewProjectModal }   from '../components/operations/NewProjectModal'
import { TaskFilters }       from '../components/operations/TaskFilters'
import { TaskItemRow }       from '../components/operations/TaskItemRow'
import { TaskKanbanBoard }   from '../components/operations/TaskKanbanBoard'
import { TaskDetailDrawer }  from '../components/operations/TaskDetailDrawer'
import type { ProjectWithTasks } from '../hooks/useOperations'
import type { TaskWithRelations } from '../hooks/useTaskManager'
import type { ProjectStatus, TaskStatus } from '../lib/database.types'
import type { TaskFilterState } from '../components/operations/TaskFilters'

/* ─── Project cards section (kept for backward compat) ── */
type StatusFilter = ProjectStatus | 'todos'
const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#10b981' },
  pausado:   { label: 'Pausado',   color: '#f59e0b' },
  concluido: { label: 'Concluído', color: '#6366f1' },
  atrasado:  { label: 'Atrasado',  color: '#ef4444' },
}
function slaColor(pct: number) { return pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444' }
function initials(name: string) {
  const p = name.trim().split(/\s+/)
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}
function formatDue(iso: string | null) {
  if (!iso) return { label: '—', urgent: false, overdue: false }
  const due = new Date(iso); const now = new Date()
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
  return { label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }), urgent: days <= 7 && days >= 0, overdue: days < 0 }
}

function applyTaskFilters(tasks: TaskWithRelations[], filters: TaskFilterState): TaskWithRelations[] {
  return tasks.filter(t => {
    if (filters.status !== 'todos' && t.status !== filters.status) return false
    if (filters.assigneeId !== 'todos' && t.assignee_id !== filters.assigneeId) return false
    if (filters.deadlineFilter !== 'todos') {
      const now = new Date(); const dl = t.deadline ? new Date(t.deadline) : null
      if (filters.deadlineFilter === 'overdue') {
        if (!dl || dl >= now) return false
      } else if (filters.deadlineFilter === 'today') {
        if (!dl) return false
        const today = now.toDateString()
        if (dl.toDateString() !== today) return false
      } else if (filters.deadlineFilter === 'week') {
        if (!dl) return false
        const week = new Date(now); week.setDate(week.getDate() + 7)
        if (dl > week || dl < now) return false
      }
    }
    return true
  })
}

/* ─── Tab type ── */
type Tab = 'projetos' | 'tarefas'
type ViewMode = 'lista' | 'kanban'

/* ─── Page ── */
export function OperationsPage() {
  const { projects, loading: projLoading, error: projError, refetch: refetchProj, addProject, updateProject, deleteProject } = useOperations()
  const { tasks, loading: taskLoading, error: taskError, refetch: refetchTask, updateTask, startTimer, stopTimer, toggleChecklist, addComment } = useTaskManager()
  const { logAction } = useAudit()

  const [tab, setTab]                 = useState<Tab>('tarefas')
  const [viewMode, setViewMode]       = useState<ViewMode>('lista')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithTasks | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [taskFilters, setTaskFilters] = useState<TaskFilterState>({
    status: 'todos', assigneeId: 'todos', clientId: 'todos', deadlineFilter: 'todos',
  })

  const filteredProjects = useMemo(() =>
    statusFilter === 'todos' ? projects : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter]
  )
  const filteredTasks = useMemo(() => applyTaskFilters(tasks, taskFilters), [tasks, taskFilters])

  // Sync selectedTask with live data
  const liveSelectedTask = selectedTask ? (tasks.find(t => t.id === selectedTask.id) ?? selectedTask) : null

  const TAB_BTN = (t: Tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
      style={
        tab === t
          ? { background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.3)', color: '#00d2ff' }
          : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }
      }
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Operação</h2>
          <p className="text-sm text-slate-500 mt-1">Projetos, tarefas e time tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'tarefas' && (
            <>
              <button
                onClick={() => setViewMode('lista')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'lista' ? { background: 'rgba(0,210,255,0.12)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'kanban' ? { background: 'rgba(0,210,255,0.12)', color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <LayoutGrid size={15} />
              </button>
            </>
          )}
          {tab === 'projetos' && (
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
            >
              <Plus size={15} /> Novo Projeto
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {TAB_BTN('tarefas', 'Tarefas')}
        {TAB_BTN('projetos', 'Projetos')}
      </div>

      {/* Error banners */}
      {(tab === 'tarefas' ? taskError : projError) && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} /> {tab === 'tarefas' ? taskError : projError}
          </span>
          <button onClick={tab === 'tarefas' ? refetchTask : refetchProj}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {tab === 'tarefas' && (
        <>
          <TaskFilters filters={taskFilters} onChange={setTaskFilters} teamMembers={[]} />

          <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
            {taskLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : viewMode === 'lista' ? (
              <div className="space-y-1.5">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <Briefcase size={36} className="text-slate-800" />
                    <p className="text-slate-500 text-sm">Nenhuma tarefa encontrada.</p>
                  </div>
                ) : filteredTasks.map(task => (
                  <TaskItemRow
                    key={task.id}
                    task={task}
                    onPlay={() => startTimer(task.id)}
                    onStop={() => stopTimer(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            ) : (
              <TaskKanbanBoard
                tasks={filteredTasks}
                onTaskClick={setSelectedTask}
                onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus as TaskStatus })}
              />
            )}
          </div>
        </>
      )}

      {/* ── PROJECTS TAB ── */}
      {tab === 'projetos' && (
        <>
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {(['todos', 'ativo', 'pausado', 'atrasado', 'concluido'] as (StatusFilter)[]).map(id => {
              const cfg = id === 'todos' ? { label: 'Todos', color: '#94a3b8' } : { label: STATUS_CONFIG[id as ProjectStatus].label, color: STATUS_CONFIG[id as ProjectStatus].color }
              const active = statusFilter === id
              return (
                <button key={id} onClick={() => setStatusFilter(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                  style={{
                    background: active ? `${cfg.color}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? cfg.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    color: active ? cfg.color : '#64748b',
                  }}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
            {projLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Briefcase size={36} className="text-slate-800" />
                <p className="text-slate-500 text-sm">Nenhum projeto neste status.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map(project => {
                  const status = STATUS_CONFIG[project.status]
                  const sColor = slaColor(project.sla_percent)
                  const due = formatDue(project.due_date)
                  return (
                    <div key={project.id}
                      className="glass rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:border-white/10 group"
                      style={{ borderColor: `${status.color}20` }}
                    >
                      <div className="px-5 pt-5 pb-4 flex flex-col gap-3 relative">
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingProject(project)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={async () => {
                            if (confirm(`Excluir projeto "${project.name}"?`)) {
                              await deleteProject(project.id)
                              await logAction('Delete Project', 'project', project.id, { name: project.name })
                            }
                          }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all">
                            <X size={13} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: `${status.color}20`, color: status.color }}>
                              {initials(project.client_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-500 leading-none mb-0.5 truncate">{project.client_name}</p>
                              <p className="text-sm font-semibold text-white leading-tight truncate">{project.name}</p>
                            </div>
                          </div>
                          <span className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                            style={{ background: `${status.color}18`, color: status.color, border: `1px solid ${status.color}35` }}>
                            {status.label}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] text-slate-600 font-medium">SLA de Entrega</span>
                            <span className="text-[11px] font-bold tabular-nums" style={{ color: sColor }}>{project.sla_percent}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${project.sla_percent}%`, background: sColor }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px]"
                            style={{ color: due.overdue ? '#ef4444' : due.urgent ? '#f59e0b' : '#475569' }}>
                            {due.overdue ? 'Vencido · ' : due.urgent ? 'Vence em breve · ' : 'Entrega: '}
                            <span className="font-semibold">{due.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals / Drawers */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSave={async (data) => {
            await addProject(data)
            await logAction('Create Project', 'project', 'new', data as unknown as Record<string, unknown>)
          }}
        />
      )}
      {editingProject && (
        <NewProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async (data) => {
            await updateProject(editingProject.id, data)
            await logAction('Update Project', 'project', editingProject.id, data as unknown as Record<string, unknown>)
            setEditingProject(null)
          }}
        />
      )}
      {liveSelectedTask && (
        <TaskDetailDrawer
          task={liveSelectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdateStatus={status => updateTask(liveSelectedTask.id, { status })}
          onToggleChecklist={(checklistId, isCompleted) => toggleChecklist(checklistId, liveSelectedTask.id, isCompleted)}
          onAddComment={body => addComment(liveSelectedTask.id, body)}
          onPlay={() => startTimer(liveSelectedTask.id)}
          onStop={() => stopTimer(liveSelectedTask.id)}
        />
      )}
    </div>
  )
}
