// src/components/operations/TaskFilters.tsx
import type { TaskStatus, TeamMember, Sector } from '../../lib/database.types'

export interface TaskFilterState {
  status: TaskStatus | 'todos'
  assigneeId: string | 'todos'
  clientName: string | 'todos'
  sector: string | 'todos'
  deadlineFilter: 'todos' | 'today' | 'tomorrow' | 'week' | 'overdue' | 'future'
}

export const DEFAULT_FILTERS: TaskFilterState = {
  status: 'todos',
  assigneeId: 'todos',
  clientName: 'todos',
  sector: 'todos',
  deadlineFilter: 'todos',
}

/* ─── Hardcoded sector list ── */
export const SECTORS = [
  'Implementação',
  'Google Meu Negócio',
  'Site',
  'Traqueamento',
  'Gestão de Tráfego',
  'Financeiro',
  'Vendas',
  'Supervisão',
]

/* ─── Options ── */
const STATUS_OPTIONS: { value: TaskStatus | 'todos'; label: string; color: string }[] = [
  { value: 'todos',   label: 'Todos',    color: '#94a3b8' },
  { value: 'todo',    label: 'Pendente', color: '#64748b' },
  { value: 'done',    label: 'Concluída',color: '#10b981' },
  { value: 'blocked', label: 'Bloqueada',color: '#ef4444' },
]

const DEADLINE_OPTIONS: { value: TaskFilterState['deadlineFilter']; label: string }[] = [
  { value: 'todos',    label: 'Todos os prazos' },
  { value: 'today',    label: 'Prazo Hoje' },
  { value: 'tomorrow', label: 'Prazo Amanhã' },
  { value: 'week',     label: 'Para esta semana' },
  { value: 'overdue',  label: 'Atrasadas' },
  { value: 'future',   label: 'Futuras' },
]

interface Props {
  filters: TaskFilterState
  onChange: (f: TaskFilterState) => void
  teamMembers: TeamMember[]
  clients: string[]
  sectors?: Sector[]   // from useSectors(); falls back to SECTORS hardcoded if empty
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#94a3b8',
  outline: 'none',
  borderRadius: 8,
  padding: '5px 8px',
  fontSize: 11,
  cursor: 'pointer',
}

export function TaskFilters({ filters, onChange, teamMembers, clients, sectors: sectorsProp }: Props) {
  // Use dynamic sectors from DB if available, else fall back to hardcoded list
  const sectorNames = sectorsProp && sectorsProp.length > 0
    ? sectorsProp.map(s => s.name)
    : SECTORS

  function set<K extends keyof TaskFilterState>(key: K, val: TaskFilterState[K]) {
    onChange({ ...filters, [key]: val })
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
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap"
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
      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

      {/* Cliente */}
      {clients.length > 0 && (
        <select
          style={selectStyle}
          value={filters.clientName}
          onChange={e => set('clientName', e.target.value)}
        >
          <option value="todos" style={{ background: '#0d1422' }}>Todos os clientes</option>
          {clients.map(c => (
            <option key={c} value={c} style={{ background: '#0d1422' }}>{c}</option>
          ))}
        </select>
      )}

      {/* Setor (dinâmico do banco, com fallback hardcoded) */}
      <select
        style={selectStyle}
        value={filters.sector}
        onChange={e => set('sector', e.target.value)}
      >
        <option value="todos" style={{ background: '#0d1422' }}>Todos os setores</option>
        {sectorNames.map(s => (
          <option key={s} value={s} style={{ background: '#0d1422' }}>{s}</option>
        ))}
      </select>

      {/* Responsável */}
      {teamMembers.length > 0 && (
        <select
          style={selectStyle}
          value={filters.assigneeId}
          onChange={e => set('assigneeId', e.target.value)}
        >
          <option value="todos" style={{ background: '#0d1422' }}>Todos os responsáveis</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id} style={{ background: '#0d1422' }}>{m.name}</option>
          ))}
        </select>
      )}

      {/* Prazo */}
      <select
        style={selectStyle}
        value={filters.deadlineFilter}
        onChange={e => set('deadlineFilter', e.target.value as TaskFilterState['deadlineFilter'])}
      >
        {DEADLINE_OPTIONS.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#0d1422' }}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
