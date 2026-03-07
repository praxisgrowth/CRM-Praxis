import { useState, useMemo } from 'react'
import {
  Plus, AlertCircle, RefreshCw, Calendar, CheckCircle2,
  Circle, Loader2, ChevronRight, Briefcase, Edit2, X,
} from 'lucide-react'
import { useAudit } from '../hooks/useAudit'
import { useOperations } from '../hooks/useOperations'
import { NewProjectModal } from '../components/operations/NewProjectModal'
import type { ProjectWithTasks } from '../hooks/useOperations'
import type { Task, ProjectStatus } from '../lib/database.types'

/* ─── Config ─────────────────────────────────────── */
type StatusFilter = ProjectStatus | 'todos'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#10b981' },
  pausado:   { label: 'Pausado',   color: '#f59e0b' },
  concluido: { label: 'Concluído', color: '#6366f1' },
  atrasado:  { label: 'Atrasado',  color: '#ef4444' },
}

const FILTER_CHIPS: { id: StatusFilter; label: string; color: string }[] = [
  { id: 'todos',     label: 'Todos',     color: '#94a3b8' },
  { id: 'ativo',     label: 'Ativo',     color: '#10b981' },
  { id: 'pausado',   label: 'Pausado',   color: '#f59e0b' },
  { id: 'atrasado',  label: 'Atrasado',  color: '#ef4444' },
  { id: 'concluido', label: 'Concluído', color: '#6366f1' },
]

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  alta:  '#ef4444',
  media: '#f59e0b',
  baixa: '#64748b',
}

/* ─── Helpers ────────────────────────────────────── */
function slaColor(pct: number) {
  if (pct >= 80) return '#10b981'
  if (pct >= 60) return '#f59e0b'
  return '#ef4444'
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function formatDueDate(iso: string | null): { label: string; urgent: boolean; overdue: boolean } {
  if (!iso) return { label: '—', urgent: false, overdue: false }
  const due  = new Date(iso)
  const now  = new Date()
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
  const label = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return { label, urgent: days <= 7 && days >= 0, overdue: days < 0 }
}

/* ─── Skeleton card ──────────────────────────────── */
function SkeletonCard() {
  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col gap-4 animate-pulse"
      style={{ minHeight: 280 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded-md w-2/3" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-2.5 rounded-md w-1/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
        <div className="h-5 w-16 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>
      <div className="h-3 rounded-md w-1/2" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="space-y-2">
        <div className="h-2 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-2 rounded-full w-3/4" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-2 rounded-full w-5/6" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  )
}

/* ─── Task item ──────────────────────────────────── */
function TaskItem({ task }: { task: Task }) {
  const done       = task.status === 'concluida'
  const inProgress = task.status === 'em_andamento'

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {/* Status icon */}
      <span className="flex-shrink-0">
        {done
          ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
          : inProgress
            ? <Loader2 size={14} style={{ color: '#f59e0b' }} className="animate-spin" />
            : <Circle size={14} style={{ color: '#334155' }} />
        }
      </span>

      {/* Title */}
      <span
        className="flex-1 text-xs leading-snug"
        style={{
          color: done ? '#475569' : '#94a3b8',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: PRIORITY_COLOR[task.priority] }}
        title={`Prioridade ${task.priority}`}
      />
    </div>
  )
}

/* ─── Project card ───────────────────────────────── */
function ProjectCard({ project, onEdit, onDelete }: { project: ProjectWithTasks; onEdit: () => void; onDelete: () => void }) {
  const status   = STATUS_CONFIG[project.status]
  const sColor   = slaColor(project.sla_percent)
  const due      = formatDueDate(project.due_date)
  const doneTasks   = project.tasks.filter(t => t.status === 'concluida').length
  const totalTasks  = project.tasks.length
  const taskPct     = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div
      className="glass rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:border-white/10 group"
      style={{ borderColor: `${status.color}20` }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3 relative">
        {/* Actions hover */}
        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title="Editar Projeto"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
            title="Excluir Projeto"
          >
            <X size={13} />
          </button>
        </div>

        {/* Client row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: `${status.color}20`, color: status.color }}
            >
              {initials(project.client_name)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 leading-none mb-0.5 truncate">
                {project.client_name}
              </p>
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {project.name}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span
            className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{
              background: `${status.color}18`,
              color: status.color,
              border: `1px solid ${status.color}35`,
            }}
          >
            {status.label}
          </span>
        </div>

        {/* Service type */}
        {project.service_type && (
          <span
            className="inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
          >
            <Briefcase size={10} />
            {project.service_type}
          </span>
        )}

        {/* SLA bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-600 font-medium">SLA de Entrega</span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: sColor }}>
              {project.sla_percent}%
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${project.sla_percent}%`, background: sColor }}
            />
          </div>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-1.5">
          <Calendar size={12} style={{ color: due.overdue ? '#ef4444' : due.urgent ? '#f59e0b' : '#475569' }} />
          <span
            className="text-[11px]"
            style={{ color: due.overdue ? '#ef4444' : due.urgent ? '#f59e0b' : '#475569' }}
          >
            {due.overdue ? 'Vencido · ' : due.urgent ? 'Vence em breve · ' : 'Entrega: '}
            <span className="font-semibold">{due.label}</span>
          </span>
        </div>
      </div>

      {/* Tasks section */}
      <div
        className="flex flex-col px-5 pb-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Tasks header */}
        <div className="flex items-center justify-between py-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Tarefas
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: taskPct === 100 ? '#10b981' : '#64748b' }}>
              {doneTasks}/{totalTasks}
            </span>
            {/* Mini progress */}
            <div
              className="w-16 h-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${taskPct}%`,
                  background: taskPct === 100 ? '#10b981' : '#6366f1',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        {project.tasks.length === 0
          ? (
            <p className="text-xs text-slate-700 text-center py-2">
              Nenhuma tarefa cadastrada
            </p>
          )
          : (
            <div className="flex flex-col divide-y divide-white/[0.03]">
              {project.tasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function OperationsPage() {
  const { projects, loading, error, refetch, addProject, updateProject, deleteProject } = useOperations()
  const { logAction } = useAudit()
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('todos')
  const [showNewProject, setShowNewProject] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectWithTasks | null>(null)

  /* Filtered projects */
  const filtered = useMemo(() =>
    statusFilter === 'todos'
      ? projects
      : projects.filter(p => p.status === statusFilter),
    [projects, statusFilter]
  )

  /* Summary stats */
  const stats = useMemo(() => {
    const ativos    = projects.filter(p => p.status === 'ativo').length
    const atrasados = projects.filter(p => p.status === 'atrasado').length
    const avgSLA    = projects.length
      ? Math.round(projects.reduce((s, p) => s + p.sla_percent, 0) / projects.length)
      : 0
    return { total: projects.length, ativos, atrasados, avgSLA }
  }, [projects])

  /* Count per status */
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { todos: projects.length }
    projects.forEach(p => { map[p.status] = (map[p.status] ?? 0) + 1 })
    return map
  }, [projects])

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Operação</h2>
          <p className="text-sm text-slate-500 mt-1">Projetos ativos, SLA e tarefas por cliente</p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          <Plus size={15} />
          Novo Projeto
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} />
            {error} — exibindo dados de demonstração.
          </span>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {/* Stats strip */}
      {!loading && (
        <div className="flex items-center gap-5 flex-shrink-0">
          {[
            { label: 'Total de projetos', value: stats.total,    unit: '',         color: '#94a3b8' },
            { label: 'Ativos',            value: stats.ativos,   unit: 'projetos', color: '#10b981' },
            { label: 'Atrasados',         value: stats.atrasados,unit: 'projetos', color: '#ef4444' },
            { label: 'SLA médio',         value: `${stats.avgSLA}%`, unit: '',    color: slaColor(stats.avgSLA) },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <ChevronRight size={12} style={{ color: s.color }} />
              <span className="text-xs text-slate-500">{s.label}:</span>
              <span className="text-xs font-bold" style={{ color: s.color }}>
                {s.value}{s.unit ? ` ${s.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {FILTER_CHIPS.map(chip => {
          const active = statusFilter === chip.id
          const count  = countByStatus[chip.id] ?? 0
          return (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: active ? `${chip.color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? chip.color + '50' : 'rgba(255,255,255,0.06)'}`,
                color: active ? chip.color : '#64748b',
              }}
            >
              {chip.label}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: active ? `${chip.color}30` : 'rgba(255,255,255,0.05)',
                  color: active ? chip.color : '#475569',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto pb-2" style={{ minHeight: 0 }}>
        {loading
          ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )
          : filtered.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Briefcase size={36} className="text-slate-800" />
                <p className="text-slate-500 text-sm">Nenhum projeto neste status.</p>
              </div>
            )
            : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => setEditingProject(project)}
                    onDelete={async () => {
                      if (confirm(`Excluir projeto "${project.name}"?`)) {
                        await deleteProject(project.id)
                        await logAction('Delete Project', 'project', project.id, { name: project.name })
                      }
                    }}
                  />
                ))}
              </div>
            )
        }
      </div>

      {/* Modals */}
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

    </div>
  )
}
