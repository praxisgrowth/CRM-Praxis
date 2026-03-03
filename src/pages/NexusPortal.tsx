import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  CheckCircle2, Loader2, Globe, ImageIcon, FileText,
  Video, File, Pencil, HelpCircle, PlusCircle, Check, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { NexusFile, NexusFileType, NexusFileStatus, ApprovalAction } from '../lib/database.types'

const TYPE_CONFIG: Record<NexusFileType, { icon: React.ElementType; color: string; label: string }> = {
  imagem:    { icon: ImageIcon, color: '#6366f1', label: 'Imagem'    },
  copy:      { icon: FileText,  color: '#8b5cf6', label: 'Copy'      },
  video:     { icon: Video,     color: '#3b82f6', label: 'Vídeo'     },
  documento: { icon: File,      color: '#10b981', label: 'Documento' },
}

const STATUS_CONFIG: Record<NexusFileStatus, { color: string; bg: string; label: string }> = {
  pendente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Aguardando' },
  aprovado: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Aprovado'   },
  ajuste:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Em Ajuste'  },
  duvida:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Em Dúvida'  },
}

const ACTIONS: {
  action: ApprovalAction; label: string
  icon: React.ElementType; color: string; border: string
}[] = [
  { action: 'aprovado', label: 'Aprovar',  icon: CheckCircle2, color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  { action: 'ajuste',   label: 'Ajuste',   icon: Pencil,       color: '#f97316', border: 'rgba(249,115,22,0.3)'  },
  { action: 'duvida',   label: 'Dúvida',   icon: HelpCircle,   color: '#3b82f6', border: 'rgba(59,130,246,0.3)'  },
  { action: 'sugestao', label: 'Sugerir',  icon: PlusCircle,   color: '#8b5cf6', border: 'rgba(139,92,246,0.3)'  },
]

export function NexusPortal() {
  const { client_id } = useParams<{ client_id: string }>()

  const [files,      setFiles]      = useState<NexusFile[]>([])
  const [clientName, setClientName] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  const [activeAction, setActiveAction] = useState<{ fileId: string; action: ApprovalAction } | null>(null)
  const [comment,      setComment]      = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [justDone,     setJustDone]     = useState<string | null>(null)

  useEffect(() => {
    if (!client_id) { setNotFound(true); setLoading(false); return }

    async function load() {
      setLoading(true)

      const [clientRes, filesRes] = await Promise.all([
        supabase.from('clients').select('name').eq('id', client_id!).maybeSingle(),
        supabase.from('nexus_files').select('*').eq('client_id', client_id!).order('created_at', { ascending: false }),
      ])

      if (!clientRes.data) {
        setNotFound(true)
      } else {
        setClientName(clientRes.data.name)
        setFiles((filesRes.data ?? []) as NexusFile[])
      }

      setLoading(false)
    }

    load()
  }, [client_id])

  async function handleConfirm() {
    if (!activeAction) return
    setSubmitting(true)

    const newStatus: NexusFileStatus = activeAction.action === 'sugestao' ? 'duvida' : activeAction.action as NexusFileStatus

    await Promise.all([
      supabase.from('nexus_files').update({ status: newStatus }).eq('id', activeAction.fileId),
      supabase.from('nexus_approvals').insert({
        file_id:     activeAction.fileId,
        action:      activeAction.action,
        comment:     comment || null,
        client_name: clientName,
      }),
    ])

    setFiles(prev => prev.map(f => f.id === activeAction.fileId ? { ...f, status: newStatus } : f))
    setJustDone(activeAction.fileId)
    setActiveAction(null)
    setComment('')
    setSubmitting(false)
    setTimeout(() => setJustDone(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-24">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <Globe size={26} className="text-indigo-500 opacity-60" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Portal não encontrado</h2>
        <p className="text-sm text-slate-500">Verifique o link enviado pela equipe e tente novamente.</p>
      </div>
    )
  }

  const pendingCount = files.filter(f => f.status === 'pendente').length

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Portal do Cliente</p>
        <h1 className="text-2xl font-bold text-white mb-1">{clientName}</h1>
        <p className="text-sm text-slate-400">
          {pendingCount > 0
            ? `Você tem ${pendingCount} item${pendingCount > 1 ? 's' : ''} aguardando sua revisão.`
            : 'Todos os itens foram revisados. Obrigado!'}
        </p>
      </div>

      {/* Stats strip */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {([
            { label: 'Pendentes', status: 'pendente' as NexusFileStatus, color: '#f59e0b' },
            { label: 'Aprovados', status: 'aprovado' as NexusFileStatus, color: '#10b981' },
            { label: 'Em Ajuste', status: 'ajuste'   as NexusFileStatus, color: '#f97316' },
            { label: 'Em Dúvida', status: 'duvida'   as NexusFileStatus, color: '#3b82f6' },
          ]).map(s => (
            <div
              key={s.label}
              className="rounded-xl px-4 py-3 text-center"
              style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}
            >
              <p className="text-2xl font-bold tabular-nums" style={{ color: s.color }}>
                {files.filter(f => f.status === s.status).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && (
        <div className="text-center py-20">
          <p className="text-slate-500 text-sm">Nenhum arquivo disponível no momento.</p>
          <p className="text-xs text-slate-600 mt-1">A equipe enviará os materiais em breve.</p>
        </div>
      )}

      {/* Files grid */}
      {files.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map(file => {
            const typeConf   = TYPE_CONFIG[file.type]
            const statusConf = STATUS_CONFIG[file.status]
            const TypeIcon   = typeConf.icon
            const isActive   = activeAction?.fileId === file.id
            const isDone     = justDone === file.id
            const activeAct  = ACTIONS.find(a => a.action === activeAction?.action)

            return (
              <div
                key={file.id}
                className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: isActive
                    ? `1px solid ${activeAct?.border ?? 'rgba(255,255,255,0.12)'}`
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Preview area */}
                <div
                  className="relative h-32 flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${typeConf.color}18 0%, ${typeConf.color}06 100%)`,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div
                    className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                    style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}33` }}
                  >
                    {statusConf.label}
                  </div>
                  <div
                    className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg"
                    style={{ background: `${typeConf.color}22`, border: `1px solid ${typeConf.color}33` }}
                  >
                    <TypeIcon size={10} style={{ color: typeConf.color }} />
                    <span className="text-[10px] font-semibold" style={{ color: typeConf.color }}>{typeConf.label}</span>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${typeConf.color}20`, border: `1px solid ${typeConf.color}30` }}
                  >
                    <TypeIcon size={20} style={{ color: typeConf.color }} />
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{file.title}</p>
                    {file.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{file.description}</p>
                    )}
                  </div>

                  {/* Success feedback */}
                  {isDone && !isActive && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399' }}
                    >
                      <Check size={11} />
                      Feedback registrado! Obrigado.
                    </div>
                  )}

                  {/* Pending actions */}
                  {file.status === 'pendente' && !isActive && !isDone && (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      {ACTIONS.map(({ action, label, icon: Icon, color, border }) => (
                        <button
                          key={action}
                          onClick={() => setActiveAction({ fileId: file.id, action })}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
                          style={{ background: `${color}10`, border: `1px solid ${border}`, color }}
                        >
                          <Icon size={12} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Already decided */}
                  {file.status !== 'pendente' && !isActive && !isDone && (
                    <div
                      className="mt-auto flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.color}30` }}
                    >
                      <CheckCircle2 size={13} />
                      Decisão registrada: {statusConf.label}
                    </div>
                  )}

                  {/* Inline confirm form */}
                  {isActive && activeAct && (
                    <div className="mt-auto space-y-2.5">
                      <div
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: `${activeAct.color}12`, color: activeAct.color, border: `1px solid ${activeAct.border}` }}
                      >
                        <activeAct.icon size={12} />
                        {activeAct.label} selecionado
                      </div>
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder={
                          activeAction?.action === 'sugestao'
                            ? 'Descreva a sugestão… (obrigatório)'
                            : 'Adicione um comentário (opcional)…'
                        }
                        rows={3}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-300 resize-none outline-none transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleConfirm}
                          disabled={submitting || (activeAction?.action === 'sugestao' && !comment.trim())}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
                        >
                          {submitting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setActiveAction(null); setComment('') }}
                          className="w-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
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
          })}
        </div>
      )}
    </div>
  )
}
