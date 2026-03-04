import { useState, useMemo } from 'react'
import { Search, Plus, AlertCircle, RefreshCw, Users } from 'lucide-react'
import { useLeads } from '../hooks/useLeads'
import { NewLeadModal } from '../components/leads/NewLeadModal'
import { ClientDrawer } from '../components/leads/ClientDrawer'
import type { Lead } from '../lib/database.types'

/* ─── Config ─────────────────────────────────────── */
type StageKey    = Lead['stage']
type StageFilter = StageKey | 'todos'

const STAGE_CONFIG: Record<StageKey, { label: string; color: string }> = {
  prospeccao: { label: 'Prospecção', color: '#6366f1' },
  reuniao:    { label: 'Reunião',    color: '#8b5cf6' },
  proposta:   { label: 'Proposta',   color: '#f59e0b' },
  negociacao: { label: 'Negociação', color: '#10b981' },
  fechado:    { label: 'Fechado',    color: '#64748b' },
}

// 'fechado' não aparece como chip — leads fechados ficam só na aba Clientes
const FILTER_CHIPS: { id: StageFilter; label: string; color: string }[] = [
  { id: 'todos',      label: 'Todos',      color: '#94a3b8' },
  { id: 'prospeccao', label: 'Prospecção', color: '#6366f1' },
  { id: 'reuniao',    label: 'Reunião',    color: '#8b5cf6' },
  { id: 'proposta',   label: 'Proposta',   color: '#f59e0b' },
  { id: 'negociacao', label: 'Negociação', color: '#10b981' },
]

const TABLE_HEADERS = ['Nome', 'E-mail', 'Origem', 'Score', 'Estágio', 'Criado em']

/* ─── Helpers ────────────────────────────────────── */
function scoreColor(score: number) {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/* ─── Skeleton row ───────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[160, 200, 90, 80, 100, 90].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="animate-pulse rounded-md"
            style={{ height: 13, width: w, background: 'rgba(255,255,255,0.05)' }}
          />
        </td>
      ))}
    </tr>
  )
}

/* ─── Lead row ───────────────────────────────────── */
function LeadRow({ lead, onClick }: { lead: Lead; onClick: (lead: Lead) => void }) {
  const stage = STAGE_CONFIG[lead.stage]
  const sColor = scoreColor(lead.score)

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onClick={() => onClick(lead)}
    >
      {/* Nome */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-medium text-xs">
            {lead.name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
            {lead.name}
          </span>
        </div>
      </td>

      {/* E-mail */}
      <td className="px-4 py-3.5">
        {lead.email
          ? <span className="text-slate-400 text-xs">{lead.email}</span>
          : <span className="text-slate-700">—</span>
        }
      </td>

      {/* Origem */}
      <td className="px-4 py-3.5">
        {lead.source
          ? (
            <span
              className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
            >
              {lead.source}
            </span>
          )
          : <span className="text-slate-700">—</span>
        }
      </td>

      {/* Score */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2" style={{ minWidth: 88 }}>
          <div
            className="flex-1 h-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${lead.score}%`, background: sColor, transition: 'width 0.4s ease' }}
            />
          </div>
          <span
            className="text-xs font-semibold tabular-nums flex-shrink-0"
            style={{ color: sColor }}
          >
            {lead.score}
          </span>
        </div>
      </td>

      {/* Estágio */}
      <td className="px-4 py-3.5">
        <span
          className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap"
          style={{
            background: `${stage.color}1a`,
            color: stage.color,
            border: `1px solid ${stage.color}40`,
          }}
        >
          {stage.label}
        </span>
      </td>

      {/* Criado em */}
      <td className="px-4 py-3.5">
        <span className="text-slate-500 text-xs whitespace-nowrap">
          {formatDate(lead.created_at)}
        </span>
      </td>
    </tr>
  )
}

/* ─── Page ───────────────────────────────────────── */
export function LeadsPage() {
  const { leads, loading, error, refetch, addLead } = useLeads()
  const [search, setSearch]               = useState('')
  const [stageFilter, setStageFilter]     = useState<StageFilter>('todos')
  const [showNewLead, setShowNewLead]     = useState(false)
  const [selectedLead, setSelectedLead]   = useState<Lead | null>(null)

  /* Leads tab never shows 'fechado' — those live in Clientes */
  const activeLeads = useMemo(() => leads.filter(l => l.stage !== 'fechado'), [leads])

  /* Filtered list */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return activeLeads.filter(l => {
      const matchSearch =
        l.name.toLowerCase().includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        (l.source?.toLowerCase().includes(q) ?? false)
      const matchStage = stageFilter === 'todos' || l.stage === stageFilter
      return matchSearch && matchStage
    })
  }, [activeLeads, search, stageFilter])

  /* Count per stage for badges on filter chips */
  const countByStage = useMemo(() => {
    const map: Record<string, number> = { todos: activeLeads.length }
    activeLeads.forEach(l => { map[l.stage] = (map[l.stage] ?? 0) + 1 })
    return map
  }, [activeLeads])

  return (
    <div className="flex flex-col h-full gap-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white">Leads</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie e qualifique seus leads no funil</p>
        </div>
        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}
        >
          <Plus size={15} />
          Novo Lead
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

      {/* Search + Stage filters */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[220px] px-3 py-2 rounded-xl transition-colors duration-150"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Search size={14} className="text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou origem…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-slate-600 outline-none w-full"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map(chip => {
            const active = stageFilter === chip.id
            const count  = countByStage[chip.id] ?? 0
            return (
              <button
                key={chip.id}
                onClick={() => setStageFilter(chip.id)}
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
      </div>

      {/* Table */}
      <div className="glass flex-1 rounded-xl overflow-auto" style={{ minHeight: 0 }}>
        <table className="w-full text-sm border-collapse">
          <thead
            className="sticky top-0 z-10"
            style={{ background: 'rgba(13,20,34,0.96)', backdropFilter: 'blur(12px)' }}
          >
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {TABLE_HEADERS.map(h => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold tracking-wider uppercase"
                  style={{ color: '#475569' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={36} className="text-slate-800" />
                        <p className="text-slate-500 text-sm">
                          {search ? 'Nenhum lead encontrado para essa busca.' : 'Nenhum lead neste estágio.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )
                : filtered.map(lead => <LeadRow key={lead.id} lead={lead} onClick={setSelectedLead} />)
            }
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!loading && (
        <p className="text-xs text-slate-700 flex-shrink-0 text-right">
          {filtered.length} de {activeLeads.length} lead{activeLeads.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onSave={addLead}
        />
      )}

      {/* Client 360 Drawer */}
      {selectedLead && (
        <ClientDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={(updated) => {
            setSelectedLead(updated)
            refetch()
          }}
        />
      )}

    </div>
  )
}
