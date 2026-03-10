// src/pages/settings/Deliverables.tsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, AlertCircle, RefreshCw, Package } from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { Sector, DeliverableCatalogItem, DeliverableType } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from(table: string): any }

const TYPE_OPTIONS: { value: DeliverableType; label: string; color: string }[] = [
  { value: 'imagem',    label: 'Imagem',    color: '#6366f1' },
  { value: 'copy',      label: 'Copy',      color: '#8b5cf6' },
  { value: 'video',     label: 'Vídeo',     color: '#3b82f6' },
  { value: 'documento', label: 'Documento', color: '#10b981' },
]

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#e2e8f0',
  outline: 'none',
  padding: '8px 10px',
  fontSize: 13,
  width: '100%',
} as const

interface ItemWithSector extends DeliverableCatalogItem {
  sector?: Sector
}

export function DeliverablesPage() {
  const [items,   setItems]   = useState<ItemWithSector[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tick,    setTick]    = useState(0)
  const [saving,  setSaving]  = useState(false)

  // Filter
  const [filterSector, setFilterSector] = useState<string>('todos')

  // New item form
  const [newName,     setNewName]     = useState('')
  const [newDesc,     setNewDesc]     = useState('')
  const [newType,     setNewType]     = useState<DeliverableType>('documento')
  const [newSectorId, setNewSectorId] = useState<string>('')

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const [itemsRes, sectorsRes] = await Promise.all([
        supabase.from('deliverable_catalog').select('*').order('name', { ascending: true }),
        supabase.from('sectors').select('*').order('name', { ascending: true }),
      ])
      if (itemsRes.error) { setError(itemsRes.error.message); setLoading(false); return }
      if (sectorsRes.error) { setError(sectorsRes.error.message); setLoading(false); return }

      const sectorMap = Object.fromEntries((sectorsRes.data ?? []).map((s: Sector) => [s.id, s]))
      const enriched: ItemWithSector[] = (itemsRes.data ?? []).map((i: DeliverableCatalogItem) => ({
        ...i,
        sector: i.sector_id ? sectorMap[i.sector_id] : undefined,
      }))

      setSectors((sectorsRes.data ?? []) as Sector[])
      setItems(enriched)
      setLoading(false)
    }
    load()
  }, [tick])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const { error: err } = await supabase.from('deliverable_catalog').insert({
      name:        newName.trim(),
      description: newDesc.trim() || null,
      type:        newType,
      sector_id:   newSectorId || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setNewName('')
    setNewDesc('')
    setNewType('documento')
    setNewSectorId('')
    refetch()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}" do catálogo?`)) return
    await supabase.from('deliverable_catalog').delete().eq('id', id)
    refetch()
  }

  const filtered = filterSector === 'todos'
    ? items
    : items.filter(i => i.sector_id === filterSector)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Catálogo de Deliverables</h2>
          <p className="text-sm text-slate-500 mt-0.5">Itens padrão que a agência entrega por setor de serviço.</p>
        </div>
        <button onClick={refetch} className="p-2 rounded-lg transition-all hover:bg-white/5" style={{ color: '#475569' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* New item form */}
      <form onSubmit={handleCreate}
        className="p-4 rounded-xl space-y-3"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Novo Deliverable</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Nome *</label>
            <input
              style={inputStyle}
              placeholder="Ex: Criativo de Feed"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Setor</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={newSectorId}
              onChange={e => setNewSectorId(e.target.value)}
            >
              <option value="" style={{ background: '#0a0e16' }}>— Sem setor —</option>
              {sectors.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#0a0e16' }}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Tipo</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={newType}
              onChange={e => setNewType(e.target.value as DeliverableType)}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#0a0e16' }}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 block mb-1">Descrição</label>
            <input
              style={inputStyle}
              placeholder="Opcional…"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </form>

      {/* Sector filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['todos', ...sectors.map(s => s.id)] as string[]).map(val => {
          const isAll    = val === 'todos'
          const sector   = isAll ? null : sectors.find(s => s.id === val)
          const label    = isAll ? 'Todos' : (sector?.name ?? val)
          const active   = filterSector === val
          const color    = sector?.color ?? '#6366f1'
          return (
            <button key={val} onClick={() => setFilterSector(val)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? `${color}20` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? color + '50' : 'rgba(255,255,255,0.06)'}`,
                color: active ? color : '#64748b',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Items list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
      >
        {loading ? (
          <div className="py-12 text-center text-slate-600 text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={28} className="mx-auto text-slate-800 mb-3" />
            <p className="text-slate-600 text-sm">Nenhum deliverable nesta categoria.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Nome</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 hidden sm:table-cell">Setor</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 hidden md:table-cell">Tipo</th>
                <th className="px-4 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const typeCfg = TYPE_OPTIONS.find(t => t.value === item.type)
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-200">{item.name}</p>
                      {item.description && <p className="text-[11px] text-slate-600 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {item.sector ? (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${item.sector.color}18`,
                            color: item.sector.color,
                            border: `1px solid ${item.sector.color}30`,
                          }}
                        >
                          {item.sector.name}
                        </span>
                      ) : <span className="text-xs text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {typeCfg && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${typeCfg.color}15`, color: typeCfg.color, border: `1px solid ${typeCfg.color}25` }}>
                          {typeCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(item.id, item.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10 ml-auto"
                        style={{ color: '#475569' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
