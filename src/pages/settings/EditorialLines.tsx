// src/pages/settings/EditorialLines.tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { useEditorialLines } from '../../hooks/useEditorialLines'
import type { EditorialLine } from '../../lib/database.types'

const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#ec4899']

const inputCls = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"

export function EditorialLinesPage() {
  const { lines, loading, addLine, updateLine, deleteLine } = useEditorialLines()

  const [adding,    setAdding]    = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newColor,  setNewColor]  = useState(DEFAULT_COLORS[0])
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editPatch, setEditPatch] = useState<{ name: string; color: string }>({ name: '', color: '' })

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await addLine(newName.trim(), newColor)
      setNewName('')
      setNewColor(DEFAULT_COLORS[0])
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true)
    try {
      await updateLine(id, editPatch)
      setEditId(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta linha editorial?')) return
    await deleteLine(id)
  }

  function startEdit(line: EditorialLine) {
    setEditId(line.id)
    setEditPatch({ name: line.name, color: line.color })
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Linhas Editoriais</h2>
          <p className="text-sm text-slate-500 mt-0.5">Categorias usadas no calendário editorial</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.25)' }}
          >
            <Plus size={14} /> Nova Linha
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map(line => (
            <div
              key={line.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {editId === line.id ? (
                <>
                  <input
                    type="color"
                    value={editPatch.color}
                    onChange={e => setEditPatch(p => ({ ...p, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    value={editPatch.name}
                    onChange={e => setEditPatch(p => ({ ...p, name: e.target.value }))}
                    className={`${inputCls} flex-1 py-1 text-sm`}
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(line.id)} disabled={saving} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/10 transition-all">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: line.color }} />
                  <span className="text-sm text-white flex-1">{line.name}</span>
                  <button onClick={() => startEdit(line)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(line.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}

          {adding && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome da linha editorial"
                className={`${inputCls} flex-1 py-1 text-sm`}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              />
              <div className="flex gap-1">
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                    style={{ background: c, outline: newColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                  />
                ))}
              </div>
              <button onClick={handleAdd} disabled={saving || !newName.trim()} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-white/10 transition-all">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
