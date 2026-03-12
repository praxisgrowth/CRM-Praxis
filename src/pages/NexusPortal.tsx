// src/pages/NexusPortal.tsx
import { useState } from 'react'
import {
  CheckCircle2, Loader2, Globe, HelpCircle,
  Pencil, Check, X, Calendar, ImageIcon,
} from 'lucide-react'
import clsx from 'clsx'
import { useNexus, type NexusFileStatus } from '../hooks/useNexus'
import { NexusTimeline } from '../components/nexus/NexusTimeline'
import { TYPE_CONFIG, STATUS_CONFIG } from '../lib/nexus-utils'

// ─── Tabs ──────────────────────────────────────────────────────
const TABS = [
  { id: 'entregaveis', label: 'Entregáveis',  icon: ImageIcon },
  { id: 'timeline',   label: 'Timeline',      icon: Calendar  },
]

// ─── Portal (visão cliente) ────────────────────────────────────
export function NexusPortal() {
  const {
    files,
    team,
    loading,
    error,
    approveFile,
    requestAdjustment
  } = useNexus()

  const [activeTab,  setActiveTab]  = useState('entregaveis')
  const [activeAction, setActiveAction] = useState<{ fileId: string; type: 'approve' | 'adjust' } | null>(null)
  const [comment,      setComment]      = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  async function handleConfirm() {
    if (!activeAction) return
    setSubmitting(true)
    try {
      if (activeAction.type === 'approve') {
        await approveFile(activeAction.fileId, comment)
      } else {
        await requestAdjustment(activeAction.fileId, comment)
      }
    } finally {
      setActiveAction(null)
      setComment('')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
        >
          <Globe size={26} className="text-red-500 opacity-60" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Erro ao carregar portal</h2>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    )
  }

  const pendingCount = files.filter(f => f.status === 'pendente').length
  const totalFiles   = files.length
  const approvedCount = files.filter(f => f.status === 'aprovado').length
  const progress = totalFiles > 0 ? Math.round((approvedCount / totalFiles) * 100) : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <div className="relative z-10">
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Portal do Cliente</p>
          <h1 className="text-2xl font-bold text-white mb-1">Área Exclusiva</h1>
          <p className="text-sm text-slate-400">
            {pendingCount > 0
              ? `Você tem ${pendingCount} item${pendingCount > 1 ? 's' : ''} aguardando sua revisão.`
              : 'Todos os materiais estão atualizados. Obrigado pela parceria!'}
          </p>

          {/* Progress bar */}
          {totalFiles > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">Aprovações concluídas</span>
                <span className="text-xs font-bold text-white">{progress}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
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
              <p className="text-[11px] text-slate-600 mt-1">
                {approvedCount} de {totalFiles} entregável{totalFiles !== 1 ? 'is' : ''} aprovado{approvedCount !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
      </div>

      {/* Stats strip */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: 'Pendentes', status: 'pendente' as NexusFileStatus, color: '#f59e0b' },
            { label: 'Aprovados', status: 'aprovado' as NexusFileStatus, color: '#10b981' },
            { label: 'Em Ajuste', status: 'ajuste'   as NexusFileStatus, color: '#f97316' },
            { label: 'Em Dúvida', status: 'duvida'   as NexusFileStatus, color: '#3b82f6' },
          ]).map(s => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3 text-center transition-all hover:scale-[1.02]"
              style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}
            >
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                {files.filter(f => f.status === s.status).length}
              </p>
              <p className="text-[10px] uppercase font-bold text-slate-500 mt-0.5 tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl"
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
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-1 justify-center',
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300',
              )}
              style={isActive ? {
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
              } : undefined}
            >
              <TabIcon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab: Entregáveis ── */}
      {activeTab === 'entregaveis' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Deliverables Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={16} className="text-indigo-400" />
                Entregáveis para Aprovação
              </h3>
            </div>

            {files.length === 0 ? (
              <div className="text-center py-20 glass rounded-2xl">
                <p className="text-slate-500 text-sm italic">Nenhum arquivo disponível para aprovação no momento.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {files.map(file => {
                  const typeConf   = TYPE_CONFIG[file.type]
                  const statusConf = STATUS_CONFIG[file.status]
                  const TypeIcon   = typeConf.icon
                  const isActive   = activeAction?.fileId === file.id

                  return (
                    <div
                      key={file.id}
                      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-300 glass hover:border-indigo-500/30 group"
                      style={{ border: isActive ? `1px solid ${statusConf.color}40` : '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {/* Preview area */}
                      <div
                        className="relative h-40 flex items-center justify-center flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${typeConf.color}10 0%, transparent 100%)` }}
                      >
                        <div
                          className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}33` }}
                        >
                          {statusConf.label}
                        </div>

                        <TypeIcon size={40} style={{ color: typeConf.color }} className="opacity-40 group-hover:scale-110 transition-transform duration-500" />
                      </div>

                      {/* Card body */}
                      <div className="p-5 flex flex-col gap-4 flex-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <TypeIcon size={12} style={{ color: typeConf.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">{typeConf.label}</span>
                          </div>
                          <p className="text-sm font-bold text-white leading-snug">{file.title}</p>
                          {file.description && (
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{file.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        {file.status === 'pendente' && !isActive && (
                          <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                            <button
                              onClick={() => setActiveAction({ fileId: file.id, type: 'approve' })}
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                              <CheckCircle2 size={13} /> Aprovar
                            </button>
                            <button
                              onClick={() => setActiveAction({ fileId: file.id, type: 'adjust' })}
                              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20"
                            >
                              <Pencil size={13} /> Ajuste
                            </button>
                          </div>
                        )}

                        {/* Action Form */}
                        {isActive && (
                          <div className="mt-auto space-y-3 pt-2">
                            <textarea
                              value={comment}
                              onChange={e => setComment(e.target.value)}
                              placeholder={activeAction.type === 'approve' ? 'Comentário adicional (opcional)' : 'Descreva o que precisa ser ajustado...'}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/40"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleConfirm}
                                disabled={submitting || (activeAction.type === 'adjust' && !comment.trim())}
                                className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50"
                                style={{ background: activeAction.type === 'approve' ? '#10b981' : '#f97316' }}
                              >
                                {submitting ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                              </button>
                              <button
                                onClick={() => { setActiveAction(null); setComment('') }}
                                className="px-3 py-2 rounded-xl text-slate-500 hover:text-white transition-colors glass"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {file.status !== 'pendente' && !isActive && (
                          <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] font-bold text-slate-500 italic uppercase">
                            <Check size={12} /> Decisão registrada
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar: Praxis Team */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <HelpCircle size={16} className="text-indigo-400" />
              Sua Equipe Praxis
            </h3>
            <div className="space-y-3">
              {team.map(member => (
                <div
                  key={member.id}
                  className="glass rounded-2xl p-4 flex items-center gap-3 border border-white/5 group hover:border-indigo-500/20 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-indigo-400"
                    style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    {member.initials || '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{member.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{member.role || 'Estrategista'}</p>
                  </div>
                </div>
              ))}
              {team.length === 0 && <p className="text-xs text-slate-600 text-center italic">Carregando especialistas...</p>}
            </div>

            <div className="rounded-2xl p-5 bg-indigo-500/5 border border-indigo-500/10 space-y-3">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Suporte Direto</p>
              <p className="text-xs text-slate-400 leading-relaxed">Dúvidas sobre o projeto? Entre em contato pelo WhatsApp da nossa equipe.</p>
              <button className="w-full py-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-[10px] font-bold uppercase hover:bg-[#25D366]/20 transition-all">
                Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Timeline ── */}
      {activeTab === 'timeline' && (
        <NexusTimeline />
      )}
    </div>
  )
}
