// src/pages/settings/Sectors.tsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Save, X, AlertCircle, RefreshCw, Tag } from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import type { Sector } from '../../lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from(table: string): any }

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#4285f4', '#34a853',
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

export function SectorsPage() {
  const [sectors,    setSectors]    = useState<Sector[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [tick,       setTick]       = useState(0)

  // New sector form
  const [newName,  setNewName]  = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [saving,   setSaving]   = useState(false)

  // Edit mode
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editName,  setEditName]  = useState('')
  const [editColor, setEditColor] = useState('#6366f1')

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('sectors')
        .select('*')
        .order('name', { ascending: true })
      if (err) { setError(err.message); setLoading(false); return }
      setSectors((data ?? []) as Sector[])
      setLoading(false)
    }
    load()
  }, [tick])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    const { error: err } = await supabase.from('sectors').insert({ name: newName.trim(), color: newColor })
    setSaving(false)
    if (err) { setError(err.message); return }
    setNewName('')
    setNewColor('#6366f1')
    refetch()
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await supabase.from('sectors').update({ name: editName.trim(), color: editColor }).eq('id', id)
    setEditId(null)
    refetch()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir setor "${name}"? Deliverables vinculados serão removidos.`)) return
    await supabase.from('sectors').delete().eq('id', id)
    refetch()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Setores</h2>
          <p className="text-sm text-slate-500 mt-0.5">Categorias de serviço para tarefas e deliverables.</p>
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

      {/* New sector form */}
      <form onSubmit={handleCreate}
        className="flex items-end gap-3 p-4 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex-1">
          <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Nome *</label>
          <input
            style={inputStyle}
            placeholder="Ex: Google Ads, Site, SEO…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Cor</label>
          <div className="flex items-center gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c} type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full flex-shrink-0 transition-all"
                style={{
                  background: c,
                  border: newColor === c ? '2px solid white' : '2px solid transparent',
                  transform: newColor === c ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
        >
          <Plus size={14} /> Adicionar
        </button>
      </form>

      {/* Sectors list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}
      >
        {loading ? (
          <div className="py-12 text-center text-slate-600 text-sm">Carregando…</div>
        ) : sectors.length === 0 ? (
          <div className="py-12 text-center">
            <Tag size={28} className="mx-auto text-slate-800 mb-3" />
            <p className="text-slate-600 text-sm">Nenhum setor cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Cor</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Setor</th>
                <th className="px-4 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {sectors.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3 w-12">
                    <span className="w-4 h-4 rounded-full inline-block" style={{ background: s.color }} />
                  </td>
                  <td className="px-4 py-3">
                    {editId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          style={{ ...inputStyle, width: 200 }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                        <div className="flex items-center gap-1">
                          {PRESET_COLORS.map(c => (
                            <button
                              key={c} type="button"
                              onClick={() => setEditColor(c)}
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ background: c, border: editColor === c ? '2px solid white' : '2px solid transparent' }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-200">{s.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editId === s.id ? (
                        <>
                          <button onClick={() => handleUpdate(s.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-green-500/15"
                            style={{ color: '#10b981' }} title="Salvar">
                            <Save size={13} />
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ color: '#475569' }} title="Cancelar">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditId(s.id); setEditName(s.name); setEditColor(s.color) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                            style={{ color: '#475569' }} title="Editar">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(s.id, s.name)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
                            style={{ color: '#475569' }} title="Excluir">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
