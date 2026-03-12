// src/pages/settings/Team.tsx
import { useState } from 'react'
import {
  Users, Shield, UserCheck, Mail,
  AlertCircle, RefreshCw, Crown, User, Plus, X, Loader2, UserPlus, Pencil, Trash2,
} from 'lucide-react'
import { supabase as _supabase } from '../../lib/supabase'
import { useTeam }     from '../../hooks/useTeam'
import { useAuth }     from '../../contexts/AuthContext'
import type { Profile, UserRole } from '../../lib/database.types'

/* ─── Role badge ── */
function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === 'ADMIN'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: isAdmin ? 'rgba(6,182,212,0.15)' : 'rgba(148,163,184,0.12)',
        color:      isAdmin ? '#22d3ee'                : '#94a3b8',
        border:     `1px solid ${isAdmin ? 'rgba(6,182,212,0.3)' : 'rgba(148,163,184,0.2)'}`,
      }}
    >
      {isAdmin ? <Crown size={9} /> : <User size={9} />}
      {isAdmin ? 'Admin' : 'Membro'}
    </span>
  )
}

/* ─── Row ── */
function MemberRow({
  profile,
  isSelf,
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: {
  profile: Profile
  isSelf: boolean
  canEdit: boolean
  isDeleting: boolean
  onEdit: (p: Profile) => void
  onDelete: (p: Profile) => void
}) {
  const nameParts = (profile.full_name ?? '').trim().split(/\s+/)
  const initials  = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : (profile.full_name ?? profile.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <tr
      className="group transition-all duration-150 hover:bg-white/[0.02]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Avatar + Name */}
      <td className="px-4 py-4 text-left">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))', 
              color: '#22d3ee',
              border: '1px solid rgba(6,182,212,0.2)'
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onEdit(profile)}
              className="text-sm font-semibold text-white flex items-center gap-2 truncate hover:text-cyan-400 transition-colors text-left"
            >
              {profile.full_name || '—'}
              {isSelf && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-tighter">
                  Você
                </span>
              )}
            </button>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{profile.position || 'Sem cargo'}</p>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-4 hidden md:table-cell text-left">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Mail size={12} className="text-slate-600" />
          {profile.email ?? '—'}
        </div>
      </td>

      {/* Cargo */}
      <td className="px-4 py-4 hidden lg:table-cell text-left">
        <span className="text-xs text-slate-400 font-medium">{profile.position || '—'}</span>
      </td>

      {/* Role */}
      <td className="px-4 py-4 text-left">
        <RoleBadge role={profile.role} />
      </td>

      {/* Joined */}
      <td className="px-4 py-4 hidden xl:table-cell">
        <span className="text-xs text-slate-500 tabular-nums">
          {new Date(profile.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && !isDeleting && (
            <>
              <button
                onClick={() => onEdit(profile)}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              {!isSelf && (
                <button
                  onClick={() => onDelete(profile)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
          {isDeleting && <Loader2 size={14} className="animate-spin text-red-500/50" />}
        </div>
      </td>
    </tr>
  )
}

/* ─── Member Modal (Add/Edit) ── */
interface MemberForm {
  full_name: string
  email: string
  password?: string
  position: string
  role: UserRole
}

function MemberModal({ 
  member, 
  onClose, 
  onSuccess 
}: { 
  member: Profile | null; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const isEditing = !!member
  const [form, setForm]       = useState<MemberForm>({
    full_name: member?.full_name || '',
    email:     member?.email     || '',
    position:  member?.position  || '',
    role:      member?.role      || 'MEMBER',
  })
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 transition-all"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Nome e e-mail são obrigatórios.')
      return
    }

    setSending(true)
    setError(null)
    
    try {
      if (isEditing) {
        // Update existing profile directly
        const { error: upErr } = await (_supabase as any)
          .from('profiles')
          .update({
            full_name: form.full_name.trim(),
            position:  form.position.trim(),
            role:      form.role
          })
          .eq('id', member.id)
        
        if (upErr) throw upErr
      } else {
        // Create new user via Edge Function
        if (!form.password || form.password.length < 6) {
          setError('A senha provisória é obrigatória e deve ter no mínimo 6 caracteres.')
          setSending(false)
          return
        }

        const { data, error: fnErr } = await _supabase.functions.invoke('invite-user', {
          body: {
            email:     form.email.trim(),
            password:  form.password,
            full_name: form.full_name.trim(),
            position:  form.position.trim() || undefined,
            role:      form.role,
          },
        })

        if (fnErr) {
          const msg = fnErr.message?.includes('Failed to send')
            ? 'Não foi possível alcançar o servidor. Verifique sua conexão.'
            : fnErr.message || 'Erro ao chamar a função de convite.'
          throw new Error(msg)
        }
        if (data?.error) {
          setError(`Erro do servidor: ${data.error}`)
          setSending(false)
          return
        }
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[MemberModal Catch]:', err)
      setError(err.message || 'Erro ao salvar alterações.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          background: 'rgba(5, 10, 20, 0.98)',
          border: '1px solid rgba(6,182,212,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <UserPlus size={18} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white tracking-tight">
                {isEditing ? 'Editar Membro' : 'Adicionar Membro'}
              </p>
              <p className="text-xs text-slate-500">
                {isEditing ? 'Atualize os dados e nível de acesso.' : 'O cadastro será criado imediatamente.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo *</label>
              <input
                type="text"
                placeholder="Ex: Ana Silva"
                className={inputClasses}
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">E-mail *</label>
              <input
                type="email"
                placeholder="ana@empresa.com"
                className={inputClasses}
                value={form.email}
                onChange={p => setForm(f => ({ ...f, email: p.target.value }))}
                disabled={isEditing} // Auth email usually can't be changed through profiles update
              />
            </div>

            {!isEditing && (
              <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha Provisória *</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className={inputClasses}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cargo</label>
                <input
                  type="text"
                  placeholder="Ex: Gestor"
                  className={inputClasses}
                  value={form.position}
                  onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Acesso</label>
                <select
                  className={inputClasses}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                >
                  <option value="MEMBER" style={{ background: '#0d1422' }}>Membro</option>
                  <option value="ADMIN"  style={{ background: '#0d1422' }}>Admin</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all bg-white/5 border border-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {sending ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar Edição' : 'Criar Conta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Page ── */
export function TeamPage() {
  const { profiles, loading, error, refetch } = useTeam()
  const { user, isAdmin } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(member: Profile) {
    if (!window.confirm(`Tem certeza que deseja excluir ${member.full_name || member.email}? Esta ação é irreversível.`)) return
    
    setDeletingId(member.id)
    try {
      const { data, error: fnErr } = await _supabase.functions.invoke('delete-user', {
        body: { userId: member.id },
      })

      if (fnErr) throw fnErr
      if (data?.error) {
        alert(`Erro ao excluir: ${data.error}`)
      } else {
        refetch()
      }
    } catch (err: any) {
      console.error('[Delete Error]:', err)
      alert('Erro inesperado ao excluir usuário.')
    } finally {
      setDeletingId(null)
    }
  }

  const openModal = (member: Profile | null = null) => {
    setSelectedMember(member)
    setModalOpen(true)
  }

  const totalAdmins  = profiles.filter(p => p.role === 'ADMIN').length
  const totalMembers = profiles.filter(p => p.role === 'MEMBER').length

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {modalOpen && (
        <MemberModal
          member={selectedMember}
          onClose={() => setModalOpen(false)}
          onSuccess={refetch}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Gestão de Equipe</h2>
          <p className="text-sm text-slate-500 mt-0.5">Membros ativos, cargos e permissões de acesso ao sistema</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #7c3aed)', color: 'white' }}
            >
              <Plus size={16} />
              Adicionar Membro
            </button>
          )}
          <button
            onClick={refetch}
            className="p-2.5 rounded-xl transition-all bg-white/5 border border-white/5 text-slate-400 hover:text-white"
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Membros', value: profiles.length, icon: Users,     color: '#06b6d4' },
          { label: 'Administradores',  value: totalAdmins,      icon: Shield,    color: '#a855f7' },
          { label: 'Membros',          value: totalMembers,     icon: UserCheck, color: '#10b981' },
        ].map(s => (
          <div
            key={s.label}
            className="rounded-2xl p-5 flex items-center gap-4 transition-transform hover:scale-[1.01]"
            style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}
            >
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-white tabular-nums leading-none mb-1">{s.value}</p>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Table Container */}
      <div
        className="flex-1 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)', minHeight: 0 }}
      >
        <div className="overflow-auto h-full scroll-smooth">
          {loading ? (
            <div className="p-8 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl animate-pulse bg-white/[0.03]" />
              ))}
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-40">
              <Users size={60} className="text-slate-600" />
              <p className="text-slate-400 font-medium">Nenhum membro registrado.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead style={{ background: 'rgba(255,255,255,0.03)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <tr>
                  {['Membro', 'Email', 'Cargo', 'Nível', 'Desde', ''].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 ${i === 1 ? 'hidden md:table-cell' : i === 2 ? 'hidden lg:table-cell' : i === 4 ? 'hidden xl:table-cell' : ''}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {profiles.map(p => (
                  <MemberRow
                    key={p.id}
                    profile={p}
                    isSelf={p.id === user?.id}
                    canEdit={isAdmin}
                    isDeleting={deletingId === p.id}
                    onEdit={openModal}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
