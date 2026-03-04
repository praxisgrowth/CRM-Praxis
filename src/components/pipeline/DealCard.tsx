import {
  Building2,
  Clock,
  GripVertical,
  MessageSquare,
  Phone,
  AlertCircle,
  User
} from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import clsx from 'clsx'
import type { Lead, Priority } from '../../lib/database.types'

interface Props {
  deal: Lead
  onClick?: (deal: Lead) => void
  onDelete?: (id: string) => void
  isDragOverlay?: boolean
  bulkMode?: boolean
  checked?: boolean
  onCheck?: (id: string, checked: boolean) => void
}

const PRIORITY_STYLES: Record<Priority, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  media: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  baixa: { label: 'Baixa', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

function formatValue(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function timeInStage(updatedAt: string): { label: string; color: string; isCold: boolean } {
  const diffMs   = Date.now() - new Date(updatedAt).getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  const diffHrs  = Math.floor(diffMs / 3_600_000)

  if (diffDays >= 7)  return { label: `${diffDays}d`, color: '#ef4444', isCold: true }
  if (diffDays >= 3)  return { label: `${diffDays}d`, color: '#f59e0b', isCold: false }
  if (diffDays >= 1)  return { label: `${diffDays}d`, color: '#10b981', isCold: false }
  if (diffHrs >= 1)   return { label: `${diffHrs}h`,  color: '#10b981', isCold: false }
  return               { label: 'agora',               color: '#6366f1', isCold: false }
}

export function DealCard({
  deal,
  onClick,
  onDelete: _onDelete,
  isDragOverlay = false,
  bulkMode = false,
  checked = false,
  onCheck
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: bulkMode,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const priority = deal.priority ?? 'media'
  const p        = PRIORITY_STYLES[priority]
  const timing   = timeInStage(deal.updated_at)

  const hasPendingWhatsApp = priority === 'alta' && !isDragOverlay
  const hasPendingCall     = timing.label.includes('d') && !isDragOverlay
  const isColdLead         = timing.isCold

  // Title: use deal.title if set, otherwise fall back to name
  const cardTitle   = deal.title ?? deal.name
  const cardCompany = deal.company ?? deal.name
  // Show contact row only when a title exists (avoids showing name twice)
  const showContact = !!deal.title

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!bulkMode ? listeners : {})}
      className={clsx(
        "group relative bg-[#0d1422] rounded-2xl border transition-all duration-300 select-none",
        isDragging && !isDragOverlay ? "opacity-40" : "opacity-100",
        isDragOverlay ? "shadow-2xl rotate-1 scale-105 border-blue-500/50" : "hover:border-white/20 hover:shadow-xl",
        checked ? "border-blue-500/50 bg-blue-500/5" : "border-white/5",
        !bulkMode && "cursor-grab active:cursor-grabbing"
      )}
    >
      <div
        className="p-4 space-y-3"
        onClick={() => {
          if (bulkMode) {
            onCheck?.(deal.id, !checked)
          } else {
            onClick?.(deal)
          }
        }}
      >
        {/* Header: Priority & Grip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {bulkMode && (
              <div className="mr-1" onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onCheck?.(deal.id, e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/20 transition-all cursor-pointer"
                />
              </div>
            )}
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
              style={{ background: `${p.color}15`, color: p.color, borderColor: `${p.color}30` }}
            >
              {p.label}
            </span>
          </div>

          {/* Grip — visual affordance only; drag listeners are on outer div */}
          <div className="text-slate-600 group-hover:text-slate-400 p-1 rounded-lg hover:bg-white/5 transition-all">
            <GripVertical size={14} />
          </div>
        </div>

        {/* Title & Company */}
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {cardTitle}
          </h4>
          {cardCompany !== cardTitle && (
            <div className="flex items-center gap-2 text-slate-500">
              <Building2 size={12} className="flex-shrink-0" />
              <span className="text-xs truncate">{cardCompany}</span>
            </div>
          )}
          {showContact && (
            <div className="flex items-center gap-2 text-slate-500">
              <User size={12} className="flex-shrink-0" />
              <span className="text-xs truncate">{deal.name}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-[10px] font-bold text-slate-300">
                {formatValue(deal.value)}
              </span>
            </div>

            {/* Indicadores Visuais */}
            <div className="flex items-center gap-2 ml-1 border-l border-white/10 pl-3">
              {hasPendingWhatsApp && (
                <div title="WhatsApp Pendente" className="text-emerald-500 filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]">
                  <MessageSquare size={12} strokeWidth={3} />
                </div>
              )}
              {hasPendingCall && (
                <div title="Ligação Pendente" className="text-blue-400 filter drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">
                  <Phone size={12} strokeWidth={3} />
                </div>
              )}
              {isColdLead && (
                <div title="SLA Crítico (Lead Frio)" className="text-red-500 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.3)] animate-pulse">
                  <AlertCircle size={12} strokeWidth={3} />
                </div>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-colors"
            style={{ color: timing.color, background: `${timing.color}15`, borderColor: `${timing.color}30` }}
          >
            <Clock size={10} />
            {timing.label}
          </div>
        </div>
      </div>
    </div>
  )
}
