// src/components/operations/TaskNexusIntegration.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload, CheckCircle2, Loader2, Link as LinkIcon,
  X, ExternalLink, Package, FileText, ImagePlus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TYPE_CONFIG, STATUS_CONFIG } from '../../lib/nexus-utils'
import { ContentDetailModal } from './ContentDetailModal'
import type { NexusFile, NexusFileType } from '../../hooks/useNexus'
import type { TaskWithRelations } from '../../hooks/useTaskManager'
import type { DeliverableCatalogItem, Sector } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from(t: string): any }

interface CatalogWithSector extends DeliverableCatalogItem {
  sector?: Sector
}

interface Props {
  task: TaskWithRelations
}

const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
const labelClass = "text-[10px] text-slate-500 uppercase font-bold mb-1.5 block tracking-wider"

export function TaskNexusIntegration({ task }: Props) {
  const [loading,    setLoading]    = useState(true)
  const [files,      setFiles]      = useState<NexusFile[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formErr,    setFormErr]    = useState<string | null>(null)
  const [detailFile, setDetailFile] = useState<NexusFile | null>(null)

  // Catalog item for pre-fill
  const [catalogItem, setCatalogItem] = useState<CatalogWithSector | null>(null)

  // Form state
  const [title,       setTitle]       = useState('')
  const [type,        setType]        = useState<NexusFileType>('imagem')
  const [url,         setUrl]         = useState('')
  const [description, setDescription] = useState('')

  // Image upload state
  const [uploadMode,    setUploadMode]    = useState<'url' | 'upload'>('url')
  const [uploadFile,    setUploadFile]    = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load nexus files linked to this task
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await db.from('nexus_files').select('*').eq('task_id', task.id)
      if (error) throw error
      setFiles((data as NexusFile[]) ?? [])
    } catch (err) {
      console.error('[TaskNexus] Error loading files:', err)
    } finally {
      setLoading(false)
    }
  }, [task.id])

  // Load catalog item for pre-fill
  useEffect(() => {
    if (!task.catalog_item_id) return
    async function fetchCatalog() {
      const [catalogRes, sectorsRes] = await Promise.all([
        db.from('deliverable_catalog').select('*').eq('id', task.catalog_item_id).single(),
        db.from('sectors').select('*'),
      ])
      if (catalogRes.data) {
        const sectorMap = Object.fromEntries(
          (sectorsRes.data ?? []).map((s: Sector) => [s.id, s])
        )
        const enriched: CatalogWithSector = {
          ...catalogRes.data,
          sector: catalogRes.data.sector_id ? sectorMap[catalogRes.data.sector_id] : undefined,
        }
        setCatalogItem(enriched)
        setTitle(catalogRes.data.name ?? '')
        setType((task.deliverable_type as NexusFileType) ?? (catalogRes.data.type as NexusFileType) ?? 'imagem')
      }
    }
    fetchCatalog()
  }, [task.catalog_item_id, task.deliverable_type])

  useEffect(() => {
    if (!task.catalog_item_id && task.deliverable_type) {
      setType(task.deliverable_type as NexusFileType)
    }
  }, [task.catalog_item_id, task.deliverable_type])

  useEffect(() => { loadFiles() }, [loadFiles])

  async function uploadImageToStorage(file: File): Promise<string> {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${task.id}/${Date.now()}.${ext}`
    setUploading(true)
    try {
      const { error: upErr } = await supabase.storage
        .from('nexus-deliverables')
        .upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage
        .from('nexus-deliverables')
        .getPublicUrl(path)
      return urlData.publicUrl
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) { setFormErr('O título é obrigatório.'); return }

    let finalUrl = url.trim()

    if (uploadMode === 'upload') {
      if (!uploadFile) { setFormErr('Selecione uma imagem para enviar.'); return }
      try {
        finalUrl = await uploadImageToStorage(uploadFile)
      } catch (err: any) {
        setFormErr(err.message || 'Erro ao fazer upload da imagem.')
        return
      }
    } else {
      if (!finalUrl) { setFormErr('O link do arquivo é obrigatório.'); return }
    }

    setSubmitting(true)
    setFormErr(null)
    try {
      const { error } = await db.from('nexus_files').insert({
        title:           title.trim(),
        type,
        url:             finalUrl,
        description:     description.trim() || null,
        task_id:         task.id,
        project_id:      task.project_id,
        client_id:       task.client_id,
        catalog_item_id: task.catalog_item_id ?? null,
        sector_id:       catalogItem?.sector_id ?? null,
        status:          'pendente',
        uploaded_by:     'Equipe Praxis',
      })
      if (error) throw error
      setTitle(catalogItem?.name ?? '')
      setUrl('')
      setDescription('')
      setUploadFile(null)
      setShowForm(false)
      loadFiles()
    } catch (err: any) {
      console.error('[TaskNexus] Submit error:', err)
      setFormErr(err.message || 'Erro ao enviar entregável.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="animate-pulse h-10 bg-white/5 rounded-xl" />

  const typeCfg   = TYPE_CONFIG[type]
  const hasIntent = !!(task.catalog_item_id || task.deliverable_type)

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Package size={12} className="text-indigo-400" />
          Entrega Nexus
          {hasIntent && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${typeCfg.color}18`, color: typeCfg.color }}
            >
              {typeCfg.label}
            </span>
          )}
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight flex items-center gap-1"
          >
            <Upload size={10} /> Submeter
          </button>
        )}
      </div>

      {/* Catalog intent badge */}
      {hasIntent && catalogItem && !showForm && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: `${typeCfg.color}08`,
            border: `1px solid ${typeCfg.color}20`,
          }}
        >
          <FileText size={12} style={{ color: typeCfg.color, flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{catalogItem.name}</p>
            {catalogItem.sector && (
              <p className="text-[10px] text-slate-600">{catalogItem.sector.name}</p>
            )}
          </div>
          <span
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
            style={{ background: `${typeCfg.color}20`, color: typeCfg.color }}
          >
            Planejado
          </span>
        </div>
      )}

      {/* Existing files — clickable to open ContentDetailModal */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const tCfg = TYPE_CONFIG[file.type]
            const sCfg = STATUS_CONFIG[file.status]
            const Icon = tCfg.icon
            return (
              <button
                key={file.id}
                onClick={() => setDetailFile(file)}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all hover:bg-white/5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${tCfg.color}15`, border: `1px solid ${tCfg.color}25` }}
                  >
                    <Icon size={14} style={{ color: tCfg.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{file.title}</p>
                    <p className="text-[10px] font-medium" style={{ color: sCfg.color }}>
                      {sCfg.label}
                    </p>
                  </div>
                </div>
                {file.url && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all flex-shrink-0"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10,14,22,0.98)',
            border: '1px solid rgba(99,102,241,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Form header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(99,102,241,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <Upload size={13} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Submeter Entregável</p>
                <p className="text-[10px] text-slate-500">Enviar para aprovação do cliente</p>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(false); setFormErr(null) }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={13} />
            </button>
          </div>

          {/* Form body */}
          <div className="p-4 space-y-3">
            {formErr && (
              <div
                className="px-3 py-2 rounded-lg text-[11px]"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {formErr}
              </div>
            )}

            {/* Catalog context */}
            {catalogItem && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${typeCfg.color}08`, border: `1px solid ${typeCfg.color}20` }}
              >
                <CheckCircle2 size={11} style={{ color: typeCfg.color, flexShrink: 0 }} />
                <span className="text-[11px] text-slate-400">
                  Catálogo: <span className="text-white font-medium">{catalogItem.name}</span>
                  {catalogItem.sector && (
                    <span className="text-slate-500"> · {catalogItem.sector.name}</span>
                  )}
                </span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className={labelClass}>Título da Entrega *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Criativo de Feed — Março"
                className={inputClass}
              />
            </div>

            {/* Type */}
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                value={type}
                onChange={e => {
                  const t = e.target.value as NexusFileType
                  setType(t)
                  // reset upload mode when switching away from imagem
                  if (t !== 'imagem') setUploadMode('url')
                }}
                className={inputClass}
                style={{ cursor: 'pointer', color: typeCfg.color }}
              >
                <option value="imagem"    style={{ background: '#0a0e16', color: '#6366f1' }}>Imagem</option>
                <option value="copy"      style={{ background: '#0a0e16', color: '#8b5cf6' }}>Copy</option>
                <option value="video"     style={{ background: '#0a0e16', color: '#3b82f6' }}>Vídeo</option>
                <option value="documento" style={{ background: '#0a0e16', color: '#10b981' }}>Documento</option>
              </select>
            </div>

            {/* URL / Upload toggle (only for imagem) */}
            {type === 'imagem' && (
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={uploadMode === 'url'
                    ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                    : { color: '#475569' }}
                >
                  <LinkIcon size={11} /> Link
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={uploadMode === 'upload'
                    ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                    : { color: '#475569' }}
                >
                  <ImagePlus size={11} /> Upload
                </button>
              </div>
            )}

            {/* URL field */}
            {uploadMode === 'url' && (
              <div>
                <label className={labelClass}>Link do Arquivo *</label>
                <div className="relative">
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/…"
                    className={inputClass}
                    style={{ paddingLeft: 28 }}
                    type="url"
                  />
                  <LinkIcon size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Upload field */}
            {uploadMode === 'upload' && (
              <div>
                <label className={labelClass}>Arquivo de Imagem *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs transition-all hover:bg-white/5"
                  style={{
                    border: uploadFile ? '1px solid rgba(99,102,241,0.4)' : '1px dashed rgba(255,255,255,0.12)',
                    color: uploadFile ? '#a5b4fc' : '#475569',
                    background: uploadFile ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  {uploading ? (
                    <><Loader2 size={13} className="animate-spin" /> Fazendo upload…</>
                  ) : uploadFile ? (
                    <><ImagePlus size={13} /> {uploadFile.name}</>
                  ) : (
                    <><ImagePlus size={13} /> Clique para selecionar imagem</>
                  )}
                </button>
              </div>
            )}

            {/* Description / Caption */}
            <div>
              <label className={labelClass}>
                {(type === 'imagem' || type === 'video') ? 'Legenda / Copy' : 'Observações'}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={(type === 'imagem' || type === 'video') 
                  ? "Digite ou cole a legenda do post aqui…" 
                  : "Contexto, instruções de aprovação…"}
                rows={3}
                className={inputClass}
                style={{ resize: 'vertical', lineHeight: '1.5' }}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading || !title.trim() || (uploadMode === 'url' && !url.trim()) || (uploadMode === 'upload' && !uploadFile)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
              }}
            >
              {(submitting || uploading)
                ? <Loader2 size={13} className="animate-spin" />
                : <Upload size={13} />
              }
              {uploading ? 'Fazendo upload…' : submitting ? 'Enviando…' : 'Enviar para Aprovação'}
            </button>
          </div>
        </div>
      )}

      {files.length === 0 && !showForm && (
        <div
          className="py-5 text-center rounded-xl"
          style={{ border: '1px dashed rgba(255,255,255,0.07)' }}
        >
          <p className="text-[11px] text-slate-600 italic">
            {hasIntent
              ? 'Entregável planejado. Clique em "Submeter" para enviar o link.'
              : 'Nenhum entregável submetido ainda.'}
          </p>
        </div>
      )}

      {/* Content Detail Modal */}
      {detailFile && (
        <ContentDetailModal
          file={detailFile}
          taskTitle={task.title}
          taskDescription={task.description ?? null}
          onClose={() => setDetailFile(null)}
        />
      )}
    </div>
  )
}
