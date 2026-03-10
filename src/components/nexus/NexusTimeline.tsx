import { useMemo } from 'react'
import {
  CheckCircle2, Circle, Clock, Rocket, ShieldCheck,
  Zap, AlertTriangle, TrendingUp, Calendar, Target,
} from 'lucide-react'
import clsx from 'clsx'
import { useOperations } from '../../hooks/useOperations'
import type { ProjectWithTasks } from '../../hooks/useOperations'

// ─── Helpers ──────────────────────────────────────────────────
function calcProgress(project: ProjectWithTasks) {
  if (!project.tasks.length) return project.sla_percent
  const done = project.tasks.filter(t => t.status === 'done').length
  return Math.round((done / project.tasks.length) * 100)
}

function parseLocalDate(iso: string): Date {
  // Date-only strings (YYYY-MM-DD) must be parsed as local noon to avoid UTC-shift
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return parseLocalDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysLeft(due: string | null) {
  if (!due) return null
  const diff = parseLocalDate(due).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

// ─── Status config ────────────────────────────────────────────
const STATUS_CFG = {
  ativo:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Ativo'     },
  pausado:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pausado'   },
  atrasado:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Atrasado'  },
  concluido: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'Concluído' },
}

// ─── Milestone builder ────────────────────────────────────────
function buildMilestones(project: ProjectWithTasks) {
  const tasks    = project.tasks
  const done     = tasks.filter(t => t.status === 'done')
  const running  = tasks.filter(t => t.status === 'in_progress')
  const progress = calcProgress(project)

  return [
    {
      id: 'kick',
      label: 'Kick-off',
      sub: 'Briefing e planejamento',
      date: fmtDate(project.created_at),
      status: 'done' as const,
      icon: Zap,
    },
    {
      id: 'exec',
      label: 'Execução',
      sub: `${done.length}/${tasks.length} tarefas concluídas`,
      date: running.length ? 'Em andamento' : done.length === tasks.length ? 'Concluído' : 'Aguardando',
      status: (running.length > 0 ? 'active' : done.length === tasks.length ? 'done' : 'pending') as 'active' | 'done' | 'pending',
      icon: Rocket,
    },
    {
      id: 'review',
      label: 'Revisão & Aprovação',
      sub: 'Central de Aprovações',
      date: progress >= 80 ? 'Em revisão' : 'Aguardando execução',
      status: (progress >= 80 ? 'active' : progress === 100 ? 'done' : 'pending') as 'active' | 'done' | 'pending',
      icon: ShieldCheck,
    },
    {
      id: 'delivery',
      label: 'Entrega Final',
      sub: project.due_date ? `Previsto: ${fmtDate(project.due_date)}` : 'Data a definir',
      date: project.status === 'concluido' ? 'Concluído' : fmtDate(project.due_date),
      status: (project.status === 'concluido' ? 'done' : 'pending') as 'done' | 'pending',
      icon: CheckCircle2,
    },
  ]
}

// ─── Single project card ──────────────────────────────────────
function ProjectTimeline({ project }: { project: ProjectWithTasks }) {
  const milestones = buildMilestones(project)
  const progress   = calcProgress(project)
  const left       = daysLeft(project.due_date)
  const cfg        = STATUS_CFG[project.status]

  const tasks       = project.tasks
  const doneTasks   = tasks.filter(t => t.status === 'done').length
  const activeTasks = tasks.filter(t => t.status === 'in_progress').length

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.label}
            </span>
            {project.service_type && (
              <span className="text-[10px] text-slate-600">{project.service_type}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white">{project.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{project.client_name}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 flex-shrink-0">
          {left !== null && (
            <div className="text-center">
              <p className="text-xs text-slate-600 mb-0.5">Prazo</p>
              <div className="flex items-center gap-1">
                {left < 0
                  ? <AlertTriangle size={13} className="text-red-400" />
                  : left <= 7
                  ? <AlertTriangle size={13} className="text-amber-400" />
                  : <Calendar size={13} className="text-slate-500" />
                }
                <span
                  className="text-xs font-bold"
                  style={{ color: left < 0 ? '#ef4444' : left <= 7 ? '#f59e0b' : '#64748b' }}
                >
                  {left < 0 ? `${Math.abs(left)}d atraso` : left === 0 ? 'Hoje' : `${left}d`}
                </span>
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-0.5">SLA</p>
            <span
              className="text-sm font-bold"
              style={{ color: project.sla_percent >= 80 ? '#10b981' : project.sla_percent >= 60 ? '#f59e0b' : '#ef4444' }}
            >
              {project.sla_percent}%
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-0.5">Tarefas</p>
            <span className="text-sm font-bold text-white">{doneTasks}/{tasks.length}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-indigo-400" />
              <span className="text-xs text-slate-500">Progresso geral</span>
              {activeTasks > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full animate-pulse"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}
                >
                  {activeTasks} em andamento
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-white">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg, #10b981, #059669)'
                  : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
        </div>

        {/* Milestones timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-[13px] top-4 bottom-4 w-px"
            style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0.05) 100%)' }}
          />

          <div className="space-y-0">
            {milestones.map((m, i) => {
              const Icon = m.icon
              const isDone   = m.status === 'done'
              const isActive = m.status === 'active'

              return (
                <div key={m.id} className={clsx('relative pl-9 py-3', i < milestones.length - 1 && 'pb-3')}>
                  {/* Node */}
                  <div
                    className={clsx(
                      'absolute left-0 top-3 w-7 h-7 rounded-xl flex items-center justify-center z-10 transition-all duration-300',
                      isDone   && 'shadow-lg',
                      isActive && 'animate-pulse',
                    )}
                    style={{
                      background: isDone   ? 'rgba(99,102,241,0.2)'
                                : isActive ? 'rgba(59,130,246,0.2)'
                                : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isDone ? 'rgba(99,102,241,0.5)' : isActive ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {isDone
                      ? <CheckCircle2 size={14} className="text-indigo-400" />
                      : isActive
                      ? <Icon size={14} className="text-blue-400" />
                      : <Circle size={14} className="text-slate-700" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={clsx(
                        'text-xs font-semibold',
                        isDone ? 'text-white' : isActive ? 'text-blue-300' : 'text-slate-500',
                      )}>
                        {m.label}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{m.sub}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      {isActive && <Clock size={10} className="text-blue-400" />}
                      <span className={clsx(
                        'text-[10px] font-medium',
                        isDone ? 'text-indigo-400' : isActive ? 'text-blue-400' : 'text-slate-600',
                      )}>
                        {m.date}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Task pills */}
        {tasks.length > 0 && (
          <div className="pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wide font-semibold">Tarefas recentes</p>
            <div className="flex flex-wrap gap-1.5">
              {tasks.slice(0, 6).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{
                    background: task.status === 'done'    ? 'rgba(16,185,129,0.1)'
                              : task.status === 'in_progress' ? 'rgba(59,130,246,0.1)'
                              : 'rgba(255,255,255,0.04)',
                    color:      task.status === 'done'    ? '#34d399'
                              : task.status === 'in_progress' ? '#60a5fa'
                              : '#475569',
                    border: `1px solid ${
                      task.status === 'done'    ? 'rgba(16,185,129,0.2)'
                    : task.status === 'in_progress' ? 'rgba(59,130,246,0.2)'
                    : 'rgba(255,255,255,0.06)' }`,
                  }}
                >
                  {task.status === 'done'    && <CheckCircle2 size={9} />}
                  {task.status === 'in_progress' && <Clock size={9} />}
                  {task.status === 'todo'     && <Circle size={9} />}
                  <span className="truncate max-w-[140px]">{task.title}</span>
                </div>
              ))}
              {tasks.length > 6 && (
                <div
                  className="px-2 py-1 rounded-lg text-[10px] text-slate-600"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  +{tasks.length - 6} mais
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page component ───────────────────────────────────────────
export function NexusTimeline() {
  const { projects, loading } = useOperations()

  const active = useMemo(
    () => projects.filter(p => p.status === 'ativo' || p.status === 'atrasado'),
    [projects],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div
            key={i}
            className="rounded-2xl animate-pulse"
            style={{ height: 280, background: 'rgba(255,255,255,0.025)' }}
          />
        ))}
      </div>
    )
  }

  if (!active.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <Target size={24} className="text-indigo-500 opacity-60" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Nenhum projeto ativo</p>
        <p className="text-xs text-slate-600 mt-2 max-w-xs">
          Os projetos em andamento aparecerão aqui com sua linha do tempo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto pb-2">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-white">Projetos em Andamento</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {active.length} projeto{active.length !== 1 ? 's' : ''} ativo{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-600">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Concluído
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Ativo
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            Pendente
          </div>
        </div>
      </div>

      {/* Project timelines */}
      {active.map(project => (
        <ProjectTimeline key={project.id} project={project} />
      ))}
    </div>
  )
}
