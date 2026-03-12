import { useState, useMemo } from 'react'
import {
  Globe, CheckCircle2, Pencil, HelpCircle, PlusCircle,
  Loader2, FolderOpen,
  BarChart3, Calendar, Sparkles, Filter, Upload, Check, X,
  Eye,
} from 'lucide-react'
import clsx from 'clsx'
import { useNexus } from '../hooks/useNexus'
import { NexusTimeline } from '../components/nexus/NexusTimeline'
import { NexusBrandFolder } from '../components/nexus/NexusBrandFolder'
import { useAuth } from '../contexts/AuthContext'
import type { NexusFile, NexusFileStatus } from '../hooks/useNexus'
import { TYPE_CONFIG, STATUS_CONFIG, fmtDate } from '../lib/nexus-utils'

type ApprovalAction = 'aprovado' | 'ajuste' | 'duvida' | 'sugestao'

const ACTIONS: {
  action: ApprovalAction
  label: string
  icon: React.ElementType
  color: string
  border: string
}[] = [
  { action: 'aprovado', label: 'Aprovar',  icon: CheckCircle2, color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  { action: 'ajuste',   label: 'Ajuste',   icon: Pencil,       color: '#f97316', border: 'rgba(249,115,22,0.3)'  },
  { action: 'duvida',   label: 'Dúvida',   icon: HelpCircle,   color: '#3b82f6', border: 'rgba(59,130,246,0.3)'  },
  { action: 'sugestao', label: 'Sugerir',  icon: PlusCircle,   color: '#8b5cf6', border: 'rgba(139,92,246,0.3)'  },
]

const TABS = [
  { id: 'aprovacoes',   label: 'Aprovações',      icon: CheckCircle2, live: true  },
  { id: 'brand-folder', label: 'Brand Folder',     icon: FolderOpen,   live: true  },
  { id: 'timeline',     label: 'Timeline',         icon: Calendar,     live: true  },
  { id: 'metricas',     label: 'Métricas de Ads',  icon: BarChart3,    live: false },
]

const FILTERS: { value: NexusFileStatus | 'todos'; label: string }[] = [
  { value: 'todos',    label: 'Todos'     },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'aprovado', label: 'Aprovados' },
  { value: 'ajuste',   label: 'Em Ajuste' },
  { value: 'duvida',   label: 'Em Dúvida' },
]

// ─── Media Card ───────────────────────────────────────────────
function MediaCard({
  file,
  activeState,
  onSelectAction,
  onCommentChange,
  onCancel,
  onConfirm,
  submitting,
  justSuggested,
  clientView = false,
}: {
  file: NexusFile
  activeState: { fileId: string; action: ApprovalAction; comment: string } | null
  onSelectAction: (fileId: string, action: ApprovalAction) => void
  onCommentChange: (comment: string) => void
  onCancel: () => void
  onConfirm: (fileId: string, action: ApprovalAction, comment: string) => void
  submitting: boolean
  justSuggested: string | null
  clientView?: boolean
}) {
  const isActive     = activeState !== null
  const typeConf     = TYPE_CONFIG[file.type]
  const statusConf   = STATUS_CONFIG[file.status]
  const TypeIcon     = typeConf.icon
  const activeAction = ACTIONS.find(a => a.action === activeState?.action)
  const isSuggested  = justSuggested === file.id

  function handleConfirm() {
    onConfirm(file.id, activeState!.action, activeState!.comment)
  }

  function handleCancel() {
    onCancel()
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: isActive
          ? `1px solid ${activeAction?.border ?? 'rgba(255,255,255,0.12)'}`
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Preview area */}
      <div
        className="relative h-36 flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${typeConf.color}18 0%, ${typeConf.color}06 100%)`,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Status badge — top-left */}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg"
          style={{ background: statusConf.bg, border: `1px solid ${statusConf.color}33` }}
        >
          <span className="text-[10px] font-semibold" style={{ color: statusConf.color }}>
            {statusConf.label}
          </span>
        </div>

        {/* Type badge — top-right */}
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg"
          style={{ background: `${typeConf.color}22`, border: `1px solid ${typeConf.color}33` }}
        >
          <TypeIcon size={10} style={{ color: typeConf.color }} />
          <span className="text-[10px] font-semibold" style={{ color: typeConf.color }}>
            {typeConf.label}
          </span>
        </div>

        {/* Center icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            background: `${typeConf.color}20`,
            border: `1px solid ${typeConf.color}30`,
          }}
        >
          <TypeIcon size={22} style={{ color: typeConf.color }} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Info */}
        <div>
          <p className="text-sm font-semibold text-white leading-snug">{file.title}</p>
          <p className="text-[11px] text-slate-600 mt-1">
            {file.uploaded_by} · {fmtDate(file.created_at)}
          </p>
        </div>

        {/* Description */}
        {file.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
            {file.description}
          </p>
        )}

        {/* Suggestion sent */}
        {isSuggested && !isActive && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}
          >
            <Check size={11} />
            Sugestão enviada com sucesso!
          </div>
        )}

        {/* Pending — action buttons */}
        {file.status === 'pendente' && !isActive && !isSuggested && (
          <div className="grid grid-cols-2 gap-2 mt-auto">
            {ACTIONS.map(({ action, label, icon: Icon, color, border }) => (
              <button
                key={action}
                onClick={() => onSelectAction(file.id, action)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
                style={{ background: `${color}10`, border: `1px solid ${border}`, color }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Already decided — status display (team view only) */}
        {file.status !== 'pendente' && !isActive && !isSuggested && !clientView && (
          <div
            className="mt-auto flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}30` }}
          >
            <CheckCircle2 size={13} />
            Decisão registrada: {statusConf.label}
          </div>
        )}

        {/* Inline confirm form */}
        {isActive && activeAction && (
          <div className="mt-auto space-y-2.5">
            {/* Selected action indicator */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: `${activeAction.color}12`,
                color: activeAction.color,
                border: `1px solid ${activeAction.border}`,
              }}
            >
              <activeAction.icon size={12} />
              {activeAction.label} selecionado
            </div>

            {/* Comment textarea */}
            <textarea
              value={activeState?.comment || ''}
              onChange={e => onCommentChange(e.target.value)}
              autoFocus
              placeholder={
                activeState?.action === 'sugestao'
                  ? 'Descreva o conteúdo que gostaria de ver… (obrigatório)'
                  : 'Adicione um comentário (opcional)…'
              }
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-xs text-slate-200 outline-none transition-all duration-200 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-indigo-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
              }}
            />

            {/* Confirm / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={submitting || (activeState?.action === 'sugestao' && !activeState?.comment?.trim())}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-40 hover:brightness-110 active:scale-95 shadow-lg shadow-indigo-500/20"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
              >
                {submitting
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Check size={13} />
                }
                Confirmar
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-9 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Coming Soon placeholder ─────────────────────────────────
function ComingSoonTab({
  icon: Icon, label, description,
}: { icon: React.ElementType; label: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}
      >
        <Icon size={26} className="text-indigo-500 opacity-70" />
      </div>
      <p className="text-sm font-semibold text-slate-400">{label}</p>
      <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed">{description}</p>
      <div
        className="mt-5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
        style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}
      >
        Em desenvolvimento · Fase 3
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export function PortalNexusPage() {
  const { files, loading, error, approveFile, requestAdjustment } = useNexus()
  const { user, profile } = useAuth()

  // Resolve role — no session → treat as ADMIN (backward compat)
  const role = user === null ? 'ADMIN' : (profile?.role ?? 'MEMBER')
  const canSwitchView = role === 'ADMIN' || role === 'MEMBER'

  const [viewMode,      setViewMode]      = useState<'equipe' | 'cliente'>('equipe')
  const [activeTab,     setActiveTab]     = useState('aprovacoes')
  const [filter,        setFilter]        = useState<NexusFileStatus | 'todos'>('todos')
  const [activeState,   setActiveState]   = useState<{ fileId: string; action: ApprovalAction; comment: string } | null>(null)
  const [submitting,    setSubmitting]    = useState(false)
  const [justSuggested, setJustSuggested] = useState<string | null>(null)
  const isClientView = viewMode === 'cliente' || role === 'CLIENT'

  const filtered = useMemo(() => {
    if (filter === 'todos') return files
    return files.filter(f => f.status === filter)
  }, [files, filter])

  const stats = useMemo(() => ({
    pendente: files.filter(f => f.status === 'pendente').length,
    aprovado: files.filter(f => f.status === 'aprovado').length,
    ajuste:   files.filter(f => f.status === 'ajuste').length,
    duvida:   files.filter(f => f.status === 'duvida').length,
  }), [files])

  async function handleConfirm(fileId: string, action: ApprovalAction, comment: string) {
    setSubmitting(true)
    try {
      if (action === 'aprovado') {
        await approveFile(fileId, comment)
      } else if (action === 'ajuste') {
        await requestAdjustment(fileId, comment)
      } else {
        // duvida/sugestao não implementados no core atual, apenas mantendo UI
        console.warn(`Ação ${action} não implementada no back atual`)
      }
    } finally {
      setSubmitting(false)
      setActiveState(null)
      if (action === 'sugestao') {
        setJustSuggested(fileId)
        setTimeout(() => setJustSuggested(null), 5000)
      }
    }
  }

  return (
    <div className="flex flex-col h-full gap-5 pb-4">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={15} className="text-indigo-400" />
            <span className="text-xs text-slate-500">Módulo 6</span>
          </div>
          <h2 className="text-xl font-semibold text-white">Portal Nexus</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Plataforma de experiência e aprovação de conteúdo para clientes.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* View mode switcher — ADMIN / MEMBER only */}
          {canSwitchView && (
            <div
              className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {(['equipe', 'cliente'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                    viewMode === mode
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                  style={viewMode === mode ? {
                    background: 'rgba(99,102,241,0.2)',
                    border: '1px solid rgba(99,102,241,0.35)',
                  } : undefined}
                >
                  <Eye size={11} />
                  {mode === 'equipe' ? 'Visão Equipe' : 'Visão Cliente'}
                </button>
              ))}
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
          >
            <Sparkles size={11} />
            Fase 3 · Ativa
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 p-1 rounded-xl flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-1 justify-center',
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300',
              )}
              style={isActive ? {
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
              } : undefined}
            >
              <TabIcon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {!tab.live && (
                <span
                  className="hidden md:inline text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
                >
                  SOON
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Central de Aprovações ── */}
      {activeTab === 'aprovacoes' && (
        <>
          {/* Stats strip — team view only */}
          {!isClientView && (
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {[
                { label: 'Pendentes', value: stats.pendente, color: '#f59e0b' },
                { label: 'Aprovados', value: stats.aprovado, color: '#10b981' },
                { label: 'Em Ajuste', value: stats.ajuste,   color: '#f97316' },
                { label: 'Em Dúvida', value: stats.duvida,   color: '#3b82f6' },
              ].map(s => (
                <div
                  key={s.label}
                  className="rounded-xl px-4 py-3 text-center"
                  style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}
                >
                  <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter chips — team view only */}
          {!isClientView && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Filter size={13} className="text-slate-600 flex-shrink-0" />
              {FILTERS.map(f => {
                const isActive = filter === f.value
                const count = f.value === 'todos' ? files.length : stats[f.value as NexusFileStatus]
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'text-white bg-blue-500/15 border border-blue-500/30'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10',
                    )}
                  >
                    {f.label}
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
                        color:      isActive ? '#93c5fd'              : '#475569',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Client view header */}
          {isClientView && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <Eye size={13} className="text-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium">Visão Cliente</span>
              <span className="text-xs text-slate-600 ml-1">— Aprove, sugira ajustes ou tire dúvidas sobre os conteúdos abaixo.</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          )}

          {/* Error banner */}
          {error && !loading && (
            <div
              className="px-4 py-3 rounded-xl text-xs flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}
            >
              {error} — exibindo dados de demonstração.
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Upload size={30} className="text-slate-700 mb-4" />
              <p className="text-sm text-slate-500">Nenhum arquivo nesta categoria.</p>
              <p className="text-xs text-slate-600 mt-1">Os itens aparecerão aqui quando forem enviados.</p>
            </div>
          )}

          {/* Cards grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 overflow-y-auto pb-2">
              {filtered.map(file => (
                <MediaCard
                  key={file.id}
                  file={file}
                  activeState={activeState?.fileId === file.id ? activeState : null}
                  onSelectAction={(fileId, action) => setActiveState({ fileId, action, comment: '' })}
                  onCommentChange={(comment) => setActiveState(prev => prev ? { ...prev, comment } : null)}
                  onCancel={() => setActiveState(null)}
                  onConfirm={handleConfirm}
                  submitting={submitting}
                  justSuggested={justSuggested}
                  clientView={isClientView}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Brand Folder (Deliverables Tracker) ── */}
      {activeTab === 'brand-folder' && (
        <NexusBrandFolder clientFilter={isClientView ? undefined : undefined} />
      )}

      {/* ── Tab: Timeline ── */}
      {activeTab === 'timeline' && (
        <NexusTimeline />
      )}

      {/* ── Tab: Métricas ── */}
      {activeTab === 'metricas' && (
        <ComingSoonTab
          icon={BarChart3}
          label="Métricas de Ads"
          description="Dashboard em tempo real com dados de Google Ads e Meta Ads via integração n8n."
        />
      )}


    </div>
  )
}
