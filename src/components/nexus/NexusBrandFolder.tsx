// src/components/nexus/NexusBrandFolder.tsx
// Aba Brand Folder — mostra deliverables do catálogo vs. arquivos entregues no Nexus
import { useState, useEffect, useMemo } from 'react'
import {
  Package, CheckCircle2, Clock, ExternalLink,
  ImageIcon, FileText, Video, File, ChevronDown, ChevronRight,
  AlertCircle, Loader2,
} from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { Sector, DeliverableCatalogItem, NexusFile } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as unknown as { from(t: string): any }

// ─── Config ───────────────────────────────────────────────────
const TYPE_CFG: Record<string, { icon: React.ElementType; color: string }> = {
  imagem:    { icon: ImageIcon, color: '#6366f1' },
  copy:      { icon: FileText,  color: '#8b5cf6' },
  video:     { icon: Video,     color: '#3b82f6' },
  documento: { icon: File,      color: '#10b981' },
}

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  pendente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Aguardando' },
  aprovado: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Aprovado'   },
  ajuste:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Em Ajuste'  },
  duvida:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Em Dúvida'  },
}

// ─── Types ────────────────────────────────────────────────────
interface CatalogWithSector extends DeliverableCatalogItem {
  sector?: Sector
}

interface DeliverableRow {
  catalog: CatalogWithSector
  files: NexusFile[]   // uploaded nexus_files linked to this catalog item
}

interface SectorGroup {
  sector: Sector | null
  sectorName: string
  rows: DeliverableRow[]
  delivered: number
  total: number
}

// ─── Props ────────────────────────────────────────────────────
interface Props {
  clientFilter?: string | null  // se CLIENT: filtra por client_name
}

// ─── Component ────────────────────────────────────────────────
export function NexusBrandFolder({ clientFilter }: Props) {
  const [catalog,   setCatalog]   = useState<CatalogWithSector[]>([])
  const [files,     setFiles]     = useState<NexusFile[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const [catalogRes, filesRes, sectorsRes] = await Promise.all([
        db.from('deliverable_catalog').select('*').order('name', { ascending: true }),
        db.from('nexus_files').select('*').order('created_at', { ascending: false }),
        db.from('sectors').select('*').order('name', { ascending: true }),
      ])
      if (catalogRes.error) { setError(catalogRes.error.message); setLoading(false); return }

      const sectorMap = Object.fromEntries((sectorsRes.data ?? []).map((s: Sector) => [s.id, s]))

      const enrichedCatalog: CatalogWithSector[] = (catalogRes.data ?? []).map((i: DeliverableCatalogItem) => ({
        ...i,
        sector: i.sector_id ? sectorMap[i.sector_id] : undefined,
      }))

      let nexusFiles = (filesRes.data ?? []) as NexusFile[]
      if (clientFilter) {
        nexusFiles = nexusFiles.filter(f => f.client_name === clientFilter)
      }

      setCatalog(enrichedCatalog)
      setFiles(nexusFiles)

      // Default: expand first sector
      if (sectorsRes.data?.length) {
        setExpanded({ [sectorsRes.data[0].id]: true })
      }
      setLoading(false)
    }
    load()
  }, [clientFilter])

  // Build grouped view: sector → catalog items → nexus files linked via catalog_item_id
  const groups = useMemo<SectorGroup[]>(() => {
    // Files keyed by catalog_item_id
    const filesByCatalog: Record<string, NexusFile[]> = {}
    for (const f of files) {
      if (f.catalog_item_id) {
        filesByCatalog[f.catalog_item_id] = filesByCatalog[f.catalog_item_id] ?? []
        filesByCatalog[f.catalog_item_id].push(f)
      }
    }

    // Group catalog items by sector
    const sectorMap: Record<string, SectorGroup> = {}

    for (const item of catalog) {
      const key = item.sector_id ?? '__none__'
      if (!sectorMap[key]) {
        sectorMap[key] = {
          sector: item.sector ?? null,
          sectorName: item.sector?.name ?? 'Sem Setor',
          rows: [],
          delivered: 0,
          total: 0,
        }
      }
      const linkedFiles = filesByCatalog[item.id] ?? []
      sectorMap[key].rows.push({ catalog: item, files: linkedFiles })
      sectorMap[key].total++
      if (linkedFiles.some(f => f.status === 'aprovado')) sectorMap[key].delivered++
    }

    return Object.values(sectorMap).sort((a, b) => a.sectorName.localeCompare(b.sectorName))
  }, [catalog, files])

  const totalDelivered = groups.reduce((s, g) => s + g.delivered, 0)
  const totalItems     = groups.reduce((s, g) => s + g.total, 0)
  const overallPct     = totalItems > 0 ? Math.round((totalDelivered / totalItems) * 100) : 0

  function toggleGroup(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
        <AlertCircle size={14} /> {error}
      </div>
    )
  }

  if (catalog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <Package size={26} className="text-indigo-500 opacity-70" />
        </div>
        <p className="text-sm font-semibold text-slate-400">Catálogo vazio</p>
        <p className="text-xs text-slate-600 mt-2 max-w-xs">
          Cadastre deliverables em Configurações → Deliverables para rastreá-los aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 overflow-y-auto pb-4">
      {/* Overall progress bar */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-white">Progresso de Entrega</p>
            <p className="text-xs text-slate-500 mt-0.5">{totalDelivered} de {totalItems} deliverables aprovados</p>
          </div>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: overallPct === 100 ? '#10b981' : overallPct >= 60 ? '#f59e0b' : '#6366f1' }}
          >
            {overallPct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: overallPct === 100
                ? 'linear-gradient(90deg, #10b981, #059669)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>
      </div>

      {/* Sector groups */}
      {groups.map(group => {
        const key     = group.sector?.id ?? '__none__'
        const isOpen  = !!expanded[key]
        const color   = group.sector?.color ?? '#6366f1'
        const pct     = group.total > 0 ? Math.round((group.delivered / group.total) * 100) : 0

        return (
          <div key={key}
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Sector header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 transition-all hover:bg-white/5"
              onClick={() => toggleGroup(key)}
            >
              <div className="flex items-center gap-3">
                {isOpen
                  ? <ChevronDown size={14} style={{ color: '#475569' }} />
                  : <ChevronRight size={14} style={{ color: '#475569' }} />
                }
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-sm font-semibold text-white">{group.sectorName}</span>
                <span className="text-[10px] text-slate-600">{group.delivered}/{group.total}</span>
              </div>

              {/* Mini progress */}
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color }}>{pct}%</span>
              </div>
            </button>

            {/* Rows */}
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {group.rows.map(({ catalog: item, files: linkedFiles }) => {
                  const typeCfg    = TYPE_CFG[item.type] ?? TYPE_CFG.documento
                  const TypeIcon   = typeCfg.icon
                  const approved   = linkedFiles.find(f => f.status === 'aprovado')
                  const latest     = linkedFiles[0]  // most recent upload
                  const statusCfg  = latest ? STATUS_CFG[latest.status] : null

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 transition-all"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Type icon */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${typeCfg.color}18`, border: `1px solid ${typeCfg.color}28` }}
                        >
                          <TypeIcon size={13} style={{ color: typeCfg.color }} />
                        </div>

                        {/* Name */}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {approved ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <CheckCircle2 size={10} /> Aprovado
                          </div>
                        ) : latest && statusCfg ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}30` }}>
                            <Clock size={10} /> {statusCfg.label}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Package size={10} /> Pendente
                          </div>
                        )}

                        {/* External link if URL exists */}
                        {latest?.url && (
                          <a
                            href={latest.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ color: '#475569' }}
                            title="Abrir arquivo"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
