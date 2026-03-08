// src/components/operations/TaskFilters.tsx
import type { TaskStatus } from '../../lib/database.types'
import type { TeamMember } from '../../lib/database.types'

export interface TaskFilterState {
  status: TaskStatus | 'todos'
  assigneeId: string | 'todos'
  clientId: string | 'todos'
  deadlineFilter: 'todos' | 'today' | 'week' | 'overdue'
}

interface Props {
  filters: TaskFilterState
  onChange: (f: TaskFilterState) => void
  teamMembers: TeamMember[]
}

const STATUS_OPTIONS: { value: TaskStatus | 'todos'; label: string; color: string }[] = [
  { value: 'todos',          label: 'Todos',             color: '#94a3b8' },
  { value: 'todo',           label: 'A Fazer',           color: '#64748b' },
  { value: 'in_progress',    label: 'Em Andamento',      color: '#00d2ff' },
  { value: 'waiting_client', label: 'Aguardando Cliente',color: '#f59e0b' },
  { value: 'done',           label: 'Concluído',         color: '#10b981' },
  { value: 'blocked',        label: 'Bloqueado',         color: '#ef4444' },
]

const DEADLINE_OPTIONS = [
  { value: 'todos',   label: 'Todos' },
  { value: 'today',   label: 'Hoje' },
  { value: 'week',    label: 'Esta Semana' },
  { value: 'overdue', label: 'Atrasados' },
]

export function TaskFilters({ filters, onChange, teamMembers }: Props) {
  function set<K extends keyof TaskFilterState>(key: K, val: TaskFilterState[K]) {
    onChange({ ...filters, [key]: val })
  }

  const selectStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    outline: 'none',
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: 12,
    cursor: 'pointer',
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status chips */}
      {STATUS_OPTIONS.map(opt => {
        const active = filters.status === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => set('status', opt.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: active ? `${opt.color}20` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? opt.color + '50' : 'rgba(255,255,255,0.06)'}`,
              color: active ? opt.color : '#64748b',
            }}
          >
            {opt.label}
          </button>
        )
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

      {/* Deadline filter */}
      <select
        style={selectStyle}
        value={filters.deadlineFilter}
        onChange={e => set('deadlineFilter', e.target.value as TaskFilterState['deadlineFilter'])}
      >
        {DEADLINE_OPTIONS.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0d1117' }}>{o.label}</option>
        ))}
      </select>

      {/* Assignee filter */}
      {teamMembers.length > 0 && (
        <select
          style={selectStyle}
          value={filters.assigneeId}
          onChange={e => set('assigneeId', e.target.value)}
        >
          <option value="todos" style={{ background: '#0d1117' }}>Todos os responsáveis</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id} style={{ background: '#0d1117' }}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
