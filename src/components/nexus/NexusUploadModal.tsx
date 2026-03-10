// src/components/nexus/NexusUploadModal.tsx
// Modal para a equipe cadastrar um novo deliverable no Nexus (URL-based)
import { useState, useEffect } from 'react'
import { X, Link, Plus, Loader2, Package } from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { Sector, DeliverableCatalogItem, NexusFileType } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

interface CatalogWithSector extends DeliverableCatalogItem {
  sector?: Sector
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#e2e8f0',
  outline: 'none',
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
} as const

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
}

export function NexusUploadModal({ onClose, onSaved }: Props) {
  const [catalog,   setCatalog]   = useState<CatalogWithSector[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Form fields
  const [title,       setTitle]       = useState('')
  const [url,         setUrl]         = useState('')
  const [description, setDescription] = useState('')
  const [clientName,  setClientName]  = useState('')
  const [projectName, setProjectName] = useState('')
  const [uploadedBy,  setUploadedBy]  = useState('')
  const [catalogId,   setCatalogId]   = useState('')
  const [fileType,    setFileType]    = useState<NexusFileType>('documento')

  useEffect(() => {
    async function load() {
      const [catalogRes, sectorsRes] = await Promise.all([
        db.from('deliverable_catalog').select('*').order('name', { ascending: true }),
        db.from('sectors').select('*').order('name', { ascending: true }),
      ])
      if (catalogRes.error || sectorsRes.error) { setLoading(false); return }
      const sectorMap = Object.fromEntries((sectorsRes.data ?? []).map((s: Sector) => [s.id, s]))
      const enriched: CatalogWithSector[] = (catalogRes.data ?? []).map((i: DeliverableCatalogItem) => ({
        ...i,
        sector: i.sector_id ? sectorMap[i.sector_id] : undefined,
      }))
      setCatalog(enriched)
      setLoading(false)
    }
    load()
  }, [])

  // When catalog item is selected, auto-fill title and type
  function handleCatalogSelect(id: string) {
    setCatalogId(id)
    const item = catalog.find(c => c.id === id)
    if (item) {
      setTitle(item.name)
      setFileType(item.type as NexusFileType)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !uploadedBy.trim()) {
      setError('Título e "Enviado por" são obrigatórios.')
      return
    }
    setSaving(true)
    setError(null)

    const selectedCatalog = catalog.find(c => c.id === catalogId)

    const { error: insertErr } = await db.from('nexus_files').insert({
      title:           title.trim(),
      description:     description.trim() || null,
      type:            fileType,
      url:             url.trim() || null,
      thumbnail_url:   null,
      uploaded_by:     uploadedBy.trim(),
      status:          'pendente',
      client_name:     clientName.trim() || null,
      project_name:    projectName.trim() || null,
      catalog_item_id: catalogId || null,
      sector_id:       selectedCatalog?.sector_id ?? null,
    })

    setSaving(false)
    if (insertErr) { setError(insertErr.message); return }
    onSaved()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,22,0.99)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package size={15} style={{ color: '#6366f1' }} />
            Novo Deliverable
          </h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#475569' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Catalog picker */}
          {!loading && catalog.length > 0 && (
            <div>
              <label style={labelStyle}>Deliverable do Catálogo (opcional)</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={catalogId}
                onChange={e => handleCatalogSelect(e.target.value)}
              >
                <option value="" style={{ background: '#0a0e16' }}>— Selecione do catálogo ou preencha manualmente —</option>
                {catalog.map(c => (
                  <option key={c.id} value={c.id} style={{ background: '#0a0e16' }}>
                    {c.sector?.name ? `[${c.sector.name}] ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label style={labelStyle}>Título *</label>
              <input
                style={inputStyle}
                placeholder="Ex: Criativo de Feed — Março"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={fileType}
                onChange={e => setFileType(e.target.value as NexusFileType)}
              >
                <option value="imagem"    style={{ background: '#0a0e16' }}>Imagem</option>
                <option value="copy"      style={{ background: '#0a0e16' }}>Copy</option>
                <option value="video"     style={{ background: '#0a0e16' }}>Vídeo</option>
                <option value="documento" style={{ background: '#0a0e16' }}>Documento</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Enviado por *</label>
              <input
                style={inputStyle}
                placeholder="Ex: Design Team"
                value={uploadedBy}
                onChange={e => setUploadedBy(e.target.value)}
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label style={labelStyle}>Link do arquivo (Google Drive, Figma, etc.)</label>
            <div className="flex items-center gap-2">
              <Link size={14} style={{ color: '#475569', flexShrink: 0 }} />
              <input
                style={{ ...inputStyle, paddingLeft: 10 }}
                type="url"
                placeholder="https://drive.google.com/…"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Client + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Cliente</label>
              <input
                style={inputStyle}
                placeholder="Ex: TechVision"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Projeto</label>
              <input
                style={inputStyle}
                placeholder="Ex: Campanha Q1"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Contexto, instruções de aprovação…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim() || !uploadedBy.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Enviando…' : 'Enviar para Aprovação'}
          </button>
        </form>
      </div>
    </div>
  )
}
