import { useState } from 'react'
import {
  Star, MessageSquare, GitBranch, Phone, Mail, Clock, Send,
} from 'lucide-react'
import type { LeadActivity, ActivityType } from '../../lib/database.types'
import { useLeadActivities } from '../../hooks/useLeadActivities'

/* ─── Configuração por tipo ──────────────────────── */
const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  color: string
  label: string
}> = {
  criacao:      { icon: Star,         color: '#00d2ff', label: 'Lead Criado'         },
  nota:         { icon: MessageSquare,color: '#9d50bb', label: 'Nota'                },
  stage_change: { icon: GitBranch,    color: '#f59e0b', label: 'Mudança de Estágio'  },
  contato:      { icon: Phone,        color: '#10b981', label: 'Contato'             },
  email:        { icon: Mail,         color: '#6366f1', label: 'E-mail'              },
}

/* ─── Tempo relativo ─────────────────────────────── */
function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'agora'
  if (mins < 60) return `${mins}m atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d atrás`
  return new Date(isoDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─── Activity Item ──────────────────────────────── */
function ActivityItem({ activity, isLast }: { activity: LeadActivity; isLast: boolean }) {
  const cfg = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.nota
  const Icon = cfg.icon

  return (
    <div className="flex gap-3">
      {/* Ícone + linha vertical */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}35` }}
        >
          <Icon size={12} style={{ color: cfg.color }} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-1" style={{ background: 'rgba(255,255,255,0.05)', minHeight: 14 }} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
            <Clock size={9} />
            {relativeTime(activity.created_at)}
          </span>
        </div>

        <div
          className="rounded-xl p-2.5"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-[11px] text-slate-300 leading-relaxed">{activity.description}</p>

          {/* Metadado de mudança de estágio */}
          {activity.type === 'stage_change' && activity.metadata?.old_stage && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold">
              <span className="text-slate-500">{String(activity.metadata.old_stage)}</span>
              <span className="text-slate-700">→</span>
              <span style={{ color: cfg.color }}>{String(activity.metadata.new_stage)}</span>
            </div>
          )}
        </div>

        {activity.created_by !== 'Sistema' && (
          <p className="text-[10px] text-slate-700 mt-0.5 pl-0.5">por {activity.created_by}</p>
        )}
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────── */
function SkeletonItem() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex-1 space-y-1.5 pb-4">
        <div className="h-2.5 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-8 w-full rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────── */
interface Props {
  leadId: string
}

export function ActivityTimeline({ leadId }: Props) {
  const { activities, loading, error, addActivity } = useLeadActivities(leadId)
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveNote() {
    const trimmed = note.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await addActivity({ type: 'nota', description: trimmed })
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSaveNote()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Input de nota ───────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar nota… (Ctrl+Enter para salvar)"
          rows={3}
          className="w-full bg-transparent px-3 pt-3 pb-1 text-[11px] text-slate-300 placeholder-slate-700 outline-none resize-none"
        />
        <div className="flex items-center justify-between px-3 pb-2.5">
          <span className="text-[9px] text-slate-700">Ctrl+Enter para salvar</span>
          <button
            onClick={handleSaveNote}
            disabled={!note.trim() || saving}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-35"
            style={{
              background: 'rgba(157,80,187,0.15)',
              color: '#9d50bb',
              border: '1px solid rgba(157,80,187,0.25)',
            }}
          >
            <Send size={9} />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────── */}
      {error && (
        <p className="text-[10px] text-red-400 px-1">Erro ao carregar histórico: {error}</p>
      )}

      {loading ? (
        <div className="flex flex-col">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonItem key={i} />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2 opacity-40">
          <Clock size={24} className="text-slate-600" />
          <p className="text-[11px] text-slate-600">Nenhuma atividade registrada.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {activities.map((a, i) => (
            <ActivityItem key={a.id} activity={a} isLast={i === activities.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
