// src/components/operations/ContentDetailModal.tsx
import { X, ExternalLink, FileText } from 'lucide-react'
import { TYPE_CONFIG, STATUS_CONFIG } from '../../lib/nexus-utils'
import type { NexusFile } from '../../hooks/useNexus'

interface Props {
  file?: NexusFile | null
  taskTitle: string
  taskDescription?: string | null
  onClose: () => void
}

/* ─── URL detection helpers ─────────────────────────── */

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0]
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch { /* ignore */ }
  return null
}

function getDriveEmbedUrl(url: string): string | null {
  // https://drive.google.com/file/d/<ID>/view  →  /preview
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
  // Already a /preview URL
  if (url.includes('drive.google.com') && url.includes('/preview')) return url
  return null
}

function isDirectImage(url: string, type: string): boolean {
  if (type === 'imagem') return true
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(url)
}

/* ─── Smart Preview ─────────────────────────────────── */

function SmartPreview({ url, type }: { url: string; type: string }) {
  const ytId     = getYouTubeId(url)
  const driveUrl = getDriveEmbedUrl(url)

  if (ytId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}`}
        className="w-full rounded-xl"
        style={{ height: 340, border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  if (driveUrl) {
    return (
      <iframe
        src={driveUrl}
        className="w-full rounded-xl"
        style={{ height: 380, border: 'none', background: '#111' }}
        allow="autoplay"
      />
    )
  }

  if (isDirectImage(url, type)) {
    return (
      <div
        className="w-full rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)', minHeight: 200, maxHeight: 400 }}
      >
        <img
          src={url}
          alt="preview"
          className="max-w-full max-h-96 object-contain rounded-xl"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>
    )
  }

  // Fallback: link button
  return (
    <div
      className="w-full rounded-xl flex flex-col items-center justify-center gap-3 py-12"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}
    >
      <FileText size={32} className="text-slate-700" />
      <p className="text-xs text-slate-500">Pré-visualização não disponível para este tipo de arquivo.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        <ExternalLink size={12} />
        Abrir arquivo
      </a>
    </div>
  )
}

/* ─── Modal ─────────────────────────────────────────── */

export function ContentDetailModal({ file, taskTitle, taskDescription, onClose }: Props) {
  const tCfg = file ? TYPE_CONFIG[file.type] : { label: 'Tarefa', color: '#6366f1', icon: FileText }
  const sCfg = (file && STATUS_CONFIG[file.status]) ? STATUS_CONFIG[file.status] : { label: 'Agendado', bg: 'rgba(99,102,241,0.12)', color: '#818cf8' }
  const TypeIcon = tCfg.icon

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,22,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${tCfg.color}18`, border: `1px solid ${tCfg.color}30` }}
            >
              <TypeIcon size={15} style={{ color: tCfg.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{file?.title || taskTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${tCfg.color}18`, color: tCfg.color }}
                >
                  {tCfg.label}
                </span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: sCfg.bg, color: sCfg.color }}
                >
                  {sCfg.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {file?.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Smart Preview */}
          {file?.url ? (
            <SmartPreview url={file.url} type={file.type} />
          ) : (
            <div
              className="w-full rounded-xl flex flex-col items-center justify-center gap-3 py-10"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}
            >
              <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center">
                <FileText size={18} className="text-slate-600" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Aguardando envio do arquivo final</p>
            </div>
          )}

          {/* File description / Caption */}
          {file?.description && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ 
                background: (file.type === 'imagem' || file.type === 'video') 
                  ? 'rgba(99,102,241,0.08)' 
                  : 'rgba(255,255,255,0.03)', 
                border: (file.type === 'imagem' || file.type === 'video')
                  ? '1px solid rgba(99,102,241,0.2)'
                  : '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <p className="text-[10px] text-indigo-400 border-indigo-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText size={10} />
                {(file.type === 'imagem' || file.type === 'video') ? 'Legenda do Post' : 'Observações'}
              </p>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{file.description}</p>
            </div>
          )}

          {/* Task description */}
          {taskDescription && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}
            >
              <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-1.5">Briefing da Tarefa</p>
              <p className="text-xs text-slate-300 leading-relaxed">{taskDescription}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            {file?.uploaded_by && <span>Por: <span className="text-slate-500">{file.uploaded_by}</span></span>}
            {file?.created_at && (
              <span>
                {new Date(file.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
