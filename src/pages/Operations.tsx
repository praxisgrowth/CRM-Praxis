// src/pages/Operations.tsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, AlertCircle, RefreshCw, List, LayoutGrid,
  Briefcase, Edit2, X, Eye, EyeOff, Settings,
  Rocket, ClipboardList,
} from 'lucide-react'
import { useAudit }             from '../hooks/useAudit'
import { useTeam }              from '../hooks/useTeam'
import { useOperations }        from '../hooks/useOperations'
import { useSectors }           from '../hooks/useSectors'
import { useTaskManager }       from '../hooks/useTaskManager'
import { NewProjectModal }      from '../components/operations/NewProjectModal'
import { TaskFilters, DEFAULT_FILTERS } from '../components/operations/TaskFilters'
import { OperationsTable }      from '../components/operations/OperationsTable'
import { TaskKanbanBoard }      from '../components/operations/TaskKanbanBoard'
import { TaskDetailDrawer }     from '../components/operations/TaskDetailDrawer'
import { NewTaskModal }         from '../components/operations/NewTaskModal'
import { BatchLaunchModal }     from '../components/operations/BatchLaunchModal'
import type { ProjectWithTasks } from '../hooks/useOperations'
import type { TaskWithRelations } from '../hooks/useTaskManager'
import type { TeamMember, ProjectStatus, TaskStatus } from '../lib/database.types'
import type { TaskFilterState } from '../components/operations/TaskFilters'
import type { ProjectMeta } from '../components/operations/OperationsTable'

/* ─── Project card helpers ── */
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
  // Date-only strings (YYYY-MM-DD) must be parsed as local noon to avoid UTC-shift
  const due = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso)
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
  return {
    label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    urgent: days <= 7 && days >= 0,
    overdue: days < 0,
  }
}

/* ─── Task filter logic ── */
function applyTaskFilters(
  tasks: TaskWithRelations[],
  filters: TaskFilterState,
  projectMap: Record<string, ProjectMeta>,
  hideDone: boolean,
): TaskWithRelations[] {
  return tasks.filter(t => {
    if (hideDone && t.status === 'done') return false
    if (filters.status !== 'todos' && t.status !== filters.status) return false
    if (filters.assigneeId !== 'todos' && t.assignee_id !== filters.assigneeId) return false
    if (filters.clientName !== 'todos') {
      const client = t.project_id ? projectMap[t.project_id]?.client_name : null
      if (client !== filters.clientName) return false
    }
    if (filters.sector !== 'todos') {
      const sector = t.project_id ? projectMap[t.project_id]?.service_type : null
      if (sector !== filters.sector) return false
    }
    if (filters.deadlineFilter !== 'todos') {
      const now = new Date()
      const dl  = t.deadline ? new Date(t.deadline) : null

      if (filters.deadlineFilter === 'overdue') {
        if (!dl || dl >= now) return false
      } else if (filters.deadlineFilter === 'today') {
        if (!dl || dl.toDateString() !== now.toDateString()) return false
      } else if (filters.deadlineFilter === 'tomorrow') {
        const tom = new Date(now); tom.setDate(tom.getDate() + 1)
        if (!dl || dl.toDateString() !== tom.toDateString()) return false
      } else if (filters.deadlineFilter === 'week') {
        if (!dl) return false
        const week = new Date(now); week.setDate(week.getDate() + 7)
        if (dl > week || dl < now) return false
      } else if (filters.deadlineFilter === 'future') {
        const weekOut = new Date(now); weekOut.setDate(weekOut.getDate() + 7)
        if (!dl || dl <= weekOut) return false
      }
    }
    return true
  })
}

/* ─── Gear settings dropdown ── */
function GearMenu({ onBatchLaunch }: { onBatchLaunch: () => void }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-xl transition-all"
        style={{
          background: open ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
          color: open ? '#818cf8' : '#475569',
        }}
        title="Configurações de operação"
      >
        <Settings size={15} className={open ? 'rotate-45' : 'rotate-0'} style={{ transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.95, y: -4  }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-40"
            style={{
              background: 'rgba(10,15,30,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Gestão de Templates</p>
            </div>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
              onClick={() => { setOpen(false); onBatchLaunch() }}
            >
              <Rocket size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
              Lançar Tarefas Padrão
            </button>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
              onClick={() => { setOpen(false); alert('Em breve: Editar Tarefas Padrão') }}
            >
              <ClipboardList size={14} style={{ color: '#8b5cf6', flexShrink: 0 }} />
              Editar Tarefas Padrão
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Page props ── */
interface Props {
  view: 'tarefas' | 'projetos'
}

/* ─── Page ── */
export function OperationsPage({ view }: Props) {
  const {
    projects, loading: projLoading, error: projError, refetch: refetchProj,
    addProject, updateProject, deleteProject,
  } = useOperations()
  const {
    tasks, loading: taskLoading, error: taskError, refetch: refetchTask,
    addTask, updateTask, startTimer, stopTimer, toggleChecklist, addComment,
  } = useTaskManager()
  const { logAction } = useAudit()

  const [viewMode, setViewMode]          = useState<'lista' | 'kanban'>('lista')
  const [hideDone, setHideDone]          = useState(false)
  const [statusFilter, setStatusFilter]  = useState<StatusFilter>('todos')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask]    = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithTasks | null>(null)
  const [selectedTask, setSelectedTask]  = useState<TaskWithRelations | null>(null)
  const [taskFilters, setTaskFilters]    = useState<TaskFilterState>(DEFAULT_FILTERS)
  const [showBatchLaunch, setShowBatchLaunch] = useState(false)
  const { members: teamMembers } = useTeam()
  const sectors = useSectors()

  /* Build lookup maps */
  const projectMap = useMemo<Record<string, ProjectMeta>>(() =>
    Object.fromEntries(projects.map(p => [p.id, { client_name: p.client_name, service_type: p.service_type }])),
    [projects],
  )
  const memberMap = useMemo<Record<string, TeamMember>>(() =>
    Object.fromEntries(teamMembers.map(m => [m.id, m])),
    [teamMembers],
  )

  /* Unique client names from projects */
  const uniqueClients = useMemo(() =>
    [...new Set(projects.map(p => p.client_name))].sort(),
    [projects],
  )

  /* Filtered data */
  const filteredProjects = useMemo(() =>
    statusFilter === 'todos' ? projects : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter],
  )
  const filteredTasks = useMemo(() =>
    applyTaskFilters(tasks, taskFilters, projectMap, hideDone),
    [tasks, taskFilters, projectMap, hideDone],
  )

  /* Sync selectedTask with live data */
  const liveSelectedTask = selectedTask
    ? (tasks.find(t => t.id === selectedTask.id) ?? selectedTask)
    : null

  function resetFilters() {
    setTaskFilters(DEFAULT_FILTERS)
    setHideDone(false)
  }

  /* ══════════════════════════════════════════
     TASKS VIEW
  ══════════════════════════════════════════ */
  if (view === 'tarefas') {
    return (
      <div className="flex flex-col h-full gap-0">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Tarefas</h2>
            <p className="text-sm text-slate-500 mt-0.5">Gestão operacional de tarefas e time tracking</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('lista')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'lista'
                  ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="p-2 rounded-lg transition-all"
                style={viewMode === 'kanban'
                  ? { background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
            {/* Gear */}
            <GearMenu onBatchLaunch={() => setShowBatchLaunch(true)} />
          </div>
        </div>

        {/* Error */}
        {taskError && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0 mb-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="flex items-center gap-2 text-red-400">
              <AlertCircle size={14} /> {taskError}
            </span>
            <button onClick={refetchTask}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4">
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap pb-3">
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={14} /> Nova Tarefa
          </button>

          <button
            onClick={() => setHideDone(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: hideDone ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${hideDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: hideDone ? '#34d399' : '#64748b',
            }}
          >
            {hideDone ? <EyeOff size={13} /> : <Eye size={13} />}
            Ocultar Concluídas
          </button>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#475569',
            }}
          >
            <RefreshCw size={12} />
            Todas as Tarefas
          </button>

          <span className="text-xs text-slate-700 ml-auto">
            {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filters */}
        <div className="flex-shrink-0 pb-3">
          <TaskFilters
            filters={taskFilters}
            onChange={setTaskFilters}
            teamMembers={teamMembers}
            clients={uniqueClients}
            sectors={sectors}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
          {taskLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Briefcase size={32} className="text-slate-800" />
              <p className="text-slate-600 text-sm">Nenhuma tarefa encontrada.</p>
            </div>
          ) : viewMode === 'lista' ? (
            <OperationsTable
              tasks={filteredTasks}
              projectMap={projectMap}
              memberMap={memberMap}
              onTaskClick={setSelectedTask}
              onPlay={startTimer}
              onStop={stopTimer}
              onStatusChange={(id, status) => updateTask(id, { status })}
            />
          ) : (
            <TaskKanbanBoard
              tasks={filteredTasks}
              projectMap={projectMap}
              memberMap={memberMap}
              onTaskClick={setSelectedTask}
              onStatusChange={(taskId, newStatus) => updateTask(taskId, { status: newStatus as TaskStatus })}
            />
          )}
        </div>

        {/* Modals */}
        {showNewTask && (
          <NewTaskModal
            projects={projects.map(p => ({ id: p.id, name: p.name, client_name: p.client_name }))}
            teamMembers={teamMembers}
            onClose={() => setShowNewTask(false)}
            onSave={async input => {
              await addTask(input)
              await logAction('Create Task', 'task', 'new', { title: input.title })
            }}
          />
        )}
        {showBatchLaunch && (
          <BatchLaunchModal
            projects={projects}
            onClose={() => setShowBatchLaunch(false)}
            onDone={() => { refetchTask(); setShowBatchLaunch(false) }}
          />
        )}
        {liveSelectedTask && (
          <TaskDetailDrawer
            task={liveSelectedTask}
            teamMembers={teamMembers}
            onClose={() => setSelectedTask(null)}
            onUpdateStatus={status => updateTask(liveSelectedTask.id, { status })}
            onUpdate={updates => updateTask(liveSelectedTask.id, updates)}
            onToggleChecklist={(checklistId, isCompleted) =>
              toggleChecklist(checklistId, liveSelectedTask.id, isCompleted)}
            onAddComment={body => addComment(liveSelectedTask.id, body)}
            onPlay={() => startTimer(liveSelectedTask.id)}
            onStop={() => stopTimer(liveSelectedTask.id)}
          />
        )}
      </div>
    )
  }

  /* ══════════════════════════════════════════
     PROJECTS VIEW
  ══════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Projetos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Linha do tempo e SLA de projetos ativos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={14} /> Novo Projeto
          </button>
          <GearMenu onBatchLaunch={() => setShowBatchLaunch(true)} />
        </div>
      </div>

      {/* Error */}
      {projError && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0 mb-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} /> {projError}
          </span>
          <button onClick={refetchProj}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4">
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap pb-4">
        {(['todos', 'ativo', 'pausado', 'atrasado', 'concluido'] as StatusFilter[]).map(id => {
          const cfg = id === 'todos'
            ? { label: 'Todos', color: '#94a3b8' }
            : { label: STATUS_CONFIG[id as ProjectStatus].label, color: STATUS_CONFIG[id as ProjectStatus].color }
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

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
        {projLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Briefcase size={32} className="text-slate-800" />
            <p className="text-slate-600 text-sm">Nenhum projeto neste status.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map(project => {
                const status = STATUS_CONFIG[project.status]
                const sColor = slaColor(project.sla_percent)
                const due    = formatDue(project.due_date)
                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
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

                      {/* Client + name */}
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

                      {/* SLA bar */}
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

                      {/* Deadline */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px]"
                          style={{ color: due.overdue ? '#ef4444' : due.urgent ? '#f59e0b' : '#475569' }}>
                          {due.overdue ? 'Vencido · ' : due.urgent ? 'Vence em breve · ' : 'Entrega: '}
                          <span className="font-semibold">{due.label}</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onSave={async data => {
            await addProject(data)
            await logAction('Create Project', 'project', 'new', data as unknown as Record<string, unknown>)
          }}
        />
      )}
      {editingProject && (
        <NewProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async data => {
            await updateProject(editingProject.id, data)
            await logAction('Update Project', 'project', editingProject.id, data as unknown as Record<string, unknown>)
            setEditingProject(null)
          }}
        />
      )}
    </div>
  )
}
