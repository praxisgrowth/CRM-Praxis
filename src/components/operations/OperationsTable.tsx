// src/components/operations/OperationsTable.tsx
import { Play, Square, Eye, AlertCircle, CheckCircle2, Circle, Clock, Lock, Loader2 } from 'lucide-react'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import { formatHours } from '../../hooks/useTaskManager'
import type { TaskStatus, TeamMember } from '../../lib/database.types'

/* ─── Types ── */
export interface ProjectMeta {
  client_name: string
  service_type: string | null
}

/* ─── Helpers ── */
function formatLiveTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDeadline(iso: string | null): { label: string; color: string; urgent: boolean; overdue: boolean } {
  if (!iso) return { label: '—', color: '#475569', urgent: false, overdue: false }
  // Date-only strings (YYYY-MM-DD) must be parsed as local noon to avoid UTC-shift
  const due  = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso)
  const now  = new Date()
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000)
  const label = days === 0 ? 'Hoje'
    : days < 0  ? `${Math.abs(days)}d atraso`
    : days === 1 ? 'Amanhã'
    : due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const color  = days < 0 ? '#ef4444' : days <= 3 ? '#f59e0b' : '#475569'
  return { label, color, urgent: days <= 3 && days >= 0, overdue: days < 0 }
}

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
}

/* ─── Config maps ── */
const STATUS_CFG: Record<TaskStatus, { label: string; color: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  todo:           { label: 'A Fazer',            color: '#64748b', Icon: Circle },
  in_progress:    { label: 'Em Andamento',        color: '#00d2ff', Icon: Loader2 },
  waiting_client: { label: 'Aguardando',          color: '#f59e0b', Icon: Clock },
  done:           { label: 'Concluído',           color: '#10b981', Icon: CheckCircle2 },
  blocked:        { label: 'Bloqueado',           color: '#ef4444', Icon: Lock },
}

const PRIORITY_CFG = {
  baixa:   { label: 'Baixa',   color: '#64748b' },
  media:   { label: 'Média',   color: '#f59e0b' },
  alta:    { label: 'Alta',    color: '#ef4444' },
  urgente: { label: 'Urgente', color: '#ec4899' },
}

const SECTOR_COLORS: Record<string, string> = {
  'Google Ads': '#4285f4',
  'Site':       '#10b981',
  'SEO':        '#f59e0b',
  'Social Media': '#8b5cf6',
  'Social':     '#8b5cf6',
  'Tráfego':    '#4285f4',
  'Email':      '#06b6d4',
}

/* ─── Row component ── */
function TableRow({
  task, projectMeta, member, onStatusToggle, onPlay, onStop, onDetails,
}: {
  task: TaskWithRelations
  projectMeta: ProjectMeta | undefined
  member: TeamMember | undefined
  onStatusToggle: () => void
  onPlay: () => void
  onStop: () => void
  onDetails: () => void
}) {
  const isRunning = !!task.current_timer_start
  const isDone    = task.status === 'done'
  const isBlocked = task.isBlocked
  const cfg       = STATUS_CFG[task.status] ?? STATUS_CFG.todo
  const pri       = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.media
  const deadline  = formatDeadline(task.deadline)
  const sector    = projectMeta?.service_type ?? null
  const sectorColor = sector ? (SECTOR_COLORS[sector] ?? '#6366f1') : '#475569'

  const rowBg = isRunning
    ? 'rgba(0,210,255,0.04)'
    : isDone
    ? 'rgba(255,255,255,0.01)'
    : 'rgba(255,255,255,0.02)'
  const rowBorder = isRunning
    ? 'rgba(0,210,255,0.15)'
    : isBlocked
    ? 'rgba(239,68,68,0.15)'
    : 'rgba(255,255,255,0.04)'

  return (
    <tr
      className="group transition-all duration-150 cursor-pointer"
      style={{ background: rowBg, borderBottom: `1px solid ${rowBorder}` }}
      onClick={onDetails}
    >
      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-9" onClick={e => { e.stopPropagation(); onStatusToggle() }}>
        <div className="flex items-center justify-center">
          {isDone ? (
            <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          ) : (
            <div
              className="w-4 h-4 rounded border-2 transition-colors"
              style={{ borderColor: isBlocked ? '#ef4444' : 'rgba(255,255,255,0.15)' }}
            />
          )}
        </div>
      </td>

      {/* Prazo */}
      <td className="px-3 py-3 w-28 hidden sm:table-cell">
        <span
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: deadline.color }}
          title={task.deadline ?? undefined}
        >
          {deadline.overdue && <AlertCircle size={10} className="inline mr-1" />}
          {deadline.label}
        </span>
      </td>

      {/* Cliente */}
      <td className="px-3 py-3 max-w-[120px] hidden md:table-cell">
        <span className="text-xs text-slate-400 truncate block" title={projectMeta?.client_name}>
          {projectMeta?.client_name ?? '—'}
        </span>
      </td>

      {/* Tarefa */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {isBlocked && <Lock size={11} style={{ color: '#ef4444', flexShrink: 0 }} />}
          <span
            className="text-sm font-medium truncate"
            style={{
              color: isDone ? '#475569' : isBlocked ? '#94a3b8' : '#e2e8f0',
              textDecoration: isDone ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
        </div>
      </td>

      {/* Responsável */}
      <td className="px-3 py-3 w-36 hidden lg:table-cell">
        {member ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
            >
              {member.initials ?? memberInitials(member.name)}
            </div>
            <span className="text-xs text-slate-400 truncate">{member.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </td>

      {/* Setor */}
      <td className="px-3 py-3 w-32 hidden xl:table-cell">
        {sector ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
            style={{
              background: `${sectorColor}18`,
              color: sectorColor,
              border: `1px solid ${sectorColor}30`,
            }}
          >
            {sector}
          </span>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </td>

      {/* Prioridade */}
      <td className="px-3 py-3 w-24 hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pri.color }} />
          <span className="text-[11px]" style={{ color: pri.color }}>{pri.label}</span>
        </div>
      </td>

      {/* Início (timer live) */}
      <td className="px-3 py-3 w-24 hidden xl:table-cell">
        {isRunning ? (
          <span className="text-xs font-mono tabular-nums" style={{ color: '#00d2ff' }}>
            {formatLiveTime(task.liveSeconds)}
          </span>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </td>

      {/* Fim (total hours) */}
      <td className="px-3 py-3 w-20 hidden xl:table-cell">
        {task.actual_hours > 0 ? (
          <span className="text-xs font-mono text-slate-500">
            {formatHours(task.actual_hours)}
          </span>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3 w-36 hidden md:table-cell">
        <div
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
          style={{
            background: `${cfg.color}15`,
            color: cfg.color,
            border: `1px solid ${cfg.color}25`,
          }}
        >
          <cfg.Icon size={10} className={task.status === 'in_progress' ? 'animate-spin' : ''} />
          {cfg.label}
        </div>
      </td>

      {/* Ações */}
      <td className="px-3 py-3 w-20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Play / Stop timer */}
          <button
            disabled={isBlocked || isDone}
            onClick={isRunning ? onStop : onPlay}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{
              background: isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(0,210,255,0.12)',
              border: `1px solid ${isRunning ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.25)'}`,
              color: isRunning ? '#ef4444' : '#00d2ff',
              cursor: isBlocked || isDone ? 'not-allowed' : 'pointer',
              opacity: isBlocked || isDone ? 0.3 : 1,
            }}
            title={isRunning ? 'Parar timer' : 'Iniciar timer'}
          >
            {isRunning ? <Square size={9} /> : <Play size={9} />}
          </button>

          {/* Details */}
          <button
            onClick={onDetails}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b',
            }}
            title="Ver detalhes"
          >
            <Eye size={9} />
          </button>
        </div>
      </td>
    </tr>
  )
}

/* ─── Table header ── */
const TH = ({ children, className = '' }: { children?: React.ReactNode; className?: string }) => (
  <th
    className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 ${className}`}
    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
  >
    {children}
  </th>
)

/* ─── Main component ── */
interface Props {
  tasks: TaskWithRelations[]
  projectMap: Record<string, ProjectMeta>
  memberMap: Record<string, TeamMember>
  onTaskClick: (task: TaskWithRelations) => void
  onPlay: (id: string) => void
  onStop: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}

export function OperationsTable({ tasks, projectMap, memberMap, onTaskClick, onPlay, onStop, onStatusChange }: Props) {
  if (tasks.length === 0) return null

  function toggleDone(task: TaskWithRelations) {
    const next: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    onStatusChange(task.id, next)
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
            <tr>
              <TH className="pl-4 w-9" />
              <TH className="hidden sm:table-cell w-28">Prazo</TH>
              <TH className="hidden md:table-cell">Cliente</TH>
              <TH>Tarefa</TH>
              <TH className="hidden lg:table-cell w-36">Responsável</TH>
              <TH className="hidden xl:table-cell w-32">Setor</TH>
              <TH className="hidden lg:table-cell w-24">Prioridade</TH>
              <TH className="hidden xl:table-cell w-24">Início</TH>
              <TH className="hidden xl:table-cell w-20">Fim</TH>
              <TH className="hidden md:table-cell w-36">Status</TH>
              <TH className="w-20">Ações</TH>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <TableRow
                key={task.id}
                task={task}
                projectMeta={task.project_id ? projectMap[task.project_id] : undefined}
                member={task.assignee_id ? memberMap[task.assignee_id] : undefined}
                onStatusToggle={() => toggleDone(task)}
                onPlay={() => onPlay(task.id)}
                onStop={() => onStop(task.id)}
                onDetails={() => onTaskClick(task)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
