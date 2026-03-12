// src/components/operations/NewTaskModal.tsx
import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Loader2, Package, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { NewTaskInput } from '../../hooks/useTaskManager'
import type { TeamMember, Sector, DeliverableCatalogItem, NexusFileType } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

interface ProjectOption {
  id: string
  name: string
  client_name: string
}

interface CatalogWithSector extends DeliverableCatalogItem {
  sector?: Sector
}

interface Props {
  projects: ProjectOption[]
  teamMembers: TeamMember[]
  prefillPublishDate?: string | null
  onClose: () => void
  onSave: (input: NewTaskInput) => Promise<void>
}

const PRIORITY_OPTIONS = [
  { value: 'baixa',   label: 'Baixa',   color: '#64748b' },
  { value: 'media',   label: 'Média',   color: '#f59e0b' },
  { value: 'alta',    label: 'Alta',    color: '#ef4444' },
  { value: 'urgente', label: 'Urgente', color: '#ec4899' },
]

const FILE_TYPE_OPTIONS: { value: NexusFileType; label: string; color: string }[] = [
  { value: 'imagem',    label: 'Imagem',    color: '#6366f1' },
  { value: 'copy',      label: 'Copy',      color: '#8b5cf6' },
  { value: 'video',     label: 'Vídeo',     color: '#3b82f6' },
  { value: 'documento', label: 'Documento', color: '#10b981' },
]

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

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
}

export function NewTaskModal({ projects, teamMembers, prefillPublishDate, onClose, onSave }: Props) {
  // ─── Base fields ──────────────────────────────────────────────
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId]     = useState('')
  const [assigneeId, setAssigneeId]   = useState('')
  const [priority, setPriority]       = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media')
  const [deadline, setDeadline]       = useState('')
  const [publishDate, setPublishDate] = useState(prefillPublishDate ?? '')
  const [saving, setSaving]           = useState(false)
  const [err, setErr]                 = useState<string | null>(null)

  // ─── Deliverable intent ───────────────────────────────────────
  const [isDeliverable, setIsDeliverable]     = useState(false)
  const [catalog, setCatalog]                 = useState<CatalogWithSector[]>([])
  const [catalogLoading, setCatalogLoading]   = useState(false)
  const [catalogId, setCatalogId]             = useState('')
  const [deliverableType, setDeliverableType] = useState<NexusFileType>('documento')
  const [catalogSearch, setCatalogSearch]     = useState('')

  const loadCatalog = useCallback(async () => {
    if (catalog.length > 0) return
    setCatalogLoading(true)
    const [catalogRes, sectorsRes] = await Promise.all([
      db.from('deliverable_catalog').select('*').order('name', { ascending: true }),
      db.from('sectors').select('*').order('name', { ascending: true }),
    ])
    if (!catalogRes.error && !sectorsRes.error) {
      const sectorMap = Object.fromEntries(
        (sectorsRes.data ?? []).map((s: Sector) => [s.id, s])
      )
      const enriched: CatalogWithSector[] = (catalogRes.data ?? []).map(
        (i: DeliverableCatalogItem) => ({ ...i, sector: i.sector_id ? sectorMap[i.sector_id] : undefined })
      )
      setCatalog(enriched)
    }
    setCatalogLoading(false)
  }, [catalog.length])

  useEffect(() => {
    if (isDeliverable) loadCatalog()
  }, [isDeliverable, loadCatalog])

  function handleCatalogSelect(id: string) {
    setCatalogId(id)
    const item = catalog.find(c => c.id === id)
    if (item) {
      if (!title.trim()) setTitle(item.name)
      setDeliverableType(item.type as NexusFileType)
    }
  }

  // Grouped + filtered catalog
  const filteredCatalog = catalog.filter(c =>
    catalogSearch === '' ||
    c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    (c.sector?.name ?? '').toLowerCase().includes(catalogSearch.toLowerCase())
  )

  const grouped: { sectorName: string; color: string; items: CatalogWithSector[] }[] = []
  filteredCatalog.forEach(item => {
    const sName  = item.sector?.name  ?? 'Sem setor'
    const sColor = item.sector?.color ?? '#475569'
    const existing = grouped.find(g => g.sectorName === sName)
    if (existing) existing.items.push(item)
    else grouped.push({ sectorName: sName, color: sColor, items: [item] })
  })

  // ─── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setErr('Título é obrigatório.'); return }
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        title:            title.trim(),
        description:      description.trim() || null,
        project_id:       projectId  || null,
        assignee_id:      assigneeId || null,
        priority,
        deadline:         deadline || null,
        publish_date:     publishDate || null,
        catalog_item_id:  isDeliverable ? (catalogId || null) : null,
        deliverable_type: isDeliverable ? deliverableType : null,
      })
      onClose()
    } catch (e: any) {
      const message = e.message || 'Erro ao criar tarefa.'
      const code = e.code ? ` (Código: ${e.code})` : ''
      setErr(`${message}${code}`)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(13,20,34,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus size={15} style={{ color: '#6366f1' }} />
            Nova Tarefa
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: '#475569' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {err && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {err}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={labelStyle}>Título *</label>
            <input
              autoFocus
              style={inputStyle}
              placeholder="Ex: Criar campanha de remarketing"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: '1.5' }}
              placeholder="Contexto, critérios de aceite, links relevantes…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label style={labelStyle}>Projeto / Cliente</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
              >
                <option value="" style={{ background: '#0d1422' }}>— Sem projeto —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#0d1422' }}>
                    {p.client_name} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Assignee */}
            <div>
              <label style={labelStyle}>Responsável</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
              >
                <option value="" style={{ background: '#0d1422' }}>— Nenhum —</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id} style={{ background: '#0d1422' }}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={labelStyle}>Prioridade</label>
              <select
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  color: PRIORITY_OPTIONS.find(p => p.value === priority)?.color ?? '#e2e8f0',
                }}
                value={priority}
                onChange={e => setPriority(e.target.value as typeof priority)}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.value} value={p.value} style={{ background: '#0d1422', color: p.color }}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label style={labelStyle}>Prazo</label>
            <input
              type="date"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          {/* Publish date */}
          <div>
            <label style={labelStyle}>Data de Publicação</label>
            <input
              type="date"
              style={{ ...inputStyle, colorScheme: 'dark' }}
              value={publishDate}
              onChange={e => setPublishDate(e.target.value)}
            />
          </div>

          {/* ── Deliverable Intent Section ── */}
          <div
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{
              border: isDeliverable
                ? '1px solid rgba(99,102,241,0.35)'
                : '1px solid rgba(255,255,255,0.07)',
              background: isDeliverable
                ? 'rgba(99,102,241,0.05)'
                : 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setIsDeliverable(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-all hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <Package size={14} style={{ color: isDeliverable ? '#818cf8' : '#475569' }} />
                <span className="text-xs font-semibold" style={{ color: isDeliverable ? '#a5b4fc' : '#64748b' }}>
                  Configuração de Entregável
                </span>
                {isDeliverable && catalogId && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                  >
                    {FILE_TYPE_OPTIONS.find(f => f.value === deliverableType)?.label ?? deliverableType}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isDeliverable && <span className="text-[10px] text-slate-600">Opcional</span>}
                {isDeliverable
                  ? <ChevronDown size={14} style={{ color: '#6366f1' }} />
                  : <ChevronRight size={14} style={{ color: '#475569' }} />
                }
              </div>
            </button>

            {/* Expanded body */}
            {isDeliverable && (
              <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-[11px] text-slate-500 pt-3 leading-relaxed">
                  Associe esta tarefa a um entregável do catálogo Nexus. O tipo e título serão sugeridos automaticamente.
                </p>

                {catalogLoading && (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 size={13} className="animate-spin text-indigo-400" />
                    <span className="text-xs text-slate-500">Carregando catálogo…</span>
                  </div>
                )}

                {!catalogLoading && catalog.length > 0 && (
                  <div>
                    <label style={{ ...labelStyle, color: '#6366f1' }}>Catálogo Nexus</label>

                    {/* Search */}
                    <div className="relative mb-2">
                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      <input
                        style={{ ...inputStyle, paddingLeft: 30, background: 'rgba(255,255,255,0.06)' }}
                        placeholder="Buscar entregável ou setor…"
                        value={catalogSearch}
                        onChange={e => setCatalogSearch(e.target.value)}
                      />
                    </div>

                    {/* Grouped list */}
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', maxHeight: 196, overflowY: 'auto' }}
                    >
                      <button
                        type="button"
                        onClick={() => { setCatalogId(''); setCatalogSearch('') }}
                        className="w-full text-left px-3 py-2 text-xs transition-all hover:bg-white/[0.04]"
                        style={{
                          color: catalogId === '' ? '#a5b4fc' : '#475569',
                          background: catalogId === '' ? 'rgba(99,102,241,0.1)' : 'transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        — Nenhum (preencher manualmente) —
                      </button>

                      {grouped.map(group => (
                        <div key={group.sectorName}>
                          <div
                            className="px-3 py-1.5 flex items-center gap-1.5"
                            style={{
                              background: 'rgba(255,255,255,0.025)',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              {group.sectorName}
                            </span>
                          </div>
                          {group.items.map(item => {
                            const typeOpt = FILE_TYPE_OPTIONS.find(f => f.value === item.type)
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleCatalogSelect(item.id)}
                                className="w-full text-left px-4 py-2 text-xs transition-all hover:bg-white/[0.04] flex items-center justify-between"
                                style={{
                                  color: catalogId === item.id ? '#a5b4fc' : '#94a3b8',
                                  background: catalogId === item.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                }}
                              >
                                <span>{item.name}</span>
                                {typeOpt && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold ml-2 flex-shrink-0"
                                    style={{ background: `${typeOpt.color}18`, color: typeOpt.color }}
                                  >
                                    {typeOpt.label}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))}

                      {grouped.length === 0 && catalogSearch && (
                        <div className="px-4 py-6 text-center text-xs text-slate-600 italic">
                          Nenhum resultado para "{catalogSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Deliverable type pills */}
                <div>
                  <label style={{ ...labelStyle, color: '#6366f1' }}>Tipo de Entregável</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FILE_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDeliverableType(opt.value)}
                        className="py-2 rounded-xl text-xs font-semibold transition-all"
                        style={
                          deliverableType === opt.value
                            ? { background: `${opt.color}20`, border: `1px solid ${opt.color}50`, color: opt.color }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? 'Criando…' : 'Criar Tarefa'}
          </button>
        </form>
      </div>
    </div>
  )
}
