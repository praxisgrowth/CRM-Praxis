// src/pages/Profile.tsx
import { useState } from 'react'
import { Mail, Shield, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function ProfilePage() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwords.new.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }

    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    
    if (error) {
      setMessage({ type: 'error', text: `Erro: ${error.message}` })
    } else {
      setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' })
      setPasswords({ new: '', confirm: '' })
    }
    setLoading(false)
  }

  const nameParts = (profile?.full_name ?? '').trim().split(/\s+/)
  const initials  = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
    : (profile?.full_name ?? profile?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Meu Perfil</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie suas informações e segurança</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div 
          className="md:col-span-1 rounded-2xl p-6 flex flex-col items-center text-center gap-4"
          style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div 
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl relative group"
            style={{ 
              background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
              boxShadow: '0 0 30px rgba(6,182,212,0.2)'
            }}
          >
            {initials}
            <div className="absolute inset-0 rounded-3xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{profile?.full_name || 'Usuário'}</h3>
            <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mt-1 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 inline-block">
              {profile?.role === 'ADMIN' ? 'Administrador' : profile?.role === 'CLIENT' ? 'Acesso do Cliente' : 'Membro da Equipe'}
            </p>
          </div>
          
          <div className="w-full pt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/5 border border-white/5">
              <Mail size={16} className="text-cyan-400" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400 p-3 rounded-xl bg-white/5 border border-white/5">
              <Shield size={16} className="text-purple-400" />
              <span>Nível de Acesso: {profile?.role}</span>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div 
          className="md:col-span-2 rounded-2xl p-8 space-y-6"
          style={{ 
            background: 'rgba(255,255,255,0.015)', 
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <KeyRound size={20} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
              <p className="text-xs text-slate-500">Mantenha sua conta protegida</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nova Senha</label>
                <input 
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-700 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  value={passwords.new}
                  onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Confirmar Senha</label>
                <input 
                  type="password"
                  placeholder="Repita a nova senha"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-700 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>
            </div>

            {message && (
              <div 
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-sm animate-in fade-in zoom-in-95 duration-200 ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/25'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <p className="font-medium">{message.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 15px rgba(99,102,241,0.2)'
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              Atualizar Senha
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
