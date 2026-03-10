import { Bell, Search, ChevronDown, Zap, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { settings } = useSettings()
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const notifications = [
    { id: 1, title: 'SLA em Risco', desc: 'Projeto "Rebranding" vence em 2h', type: 'urgent' },
    { id: 2, title: 'Novo Lead', desc: 'Gustavo Moura enviou uma mensagem', type: 'info' },
    { id: 3, title: 'Fatura Atrasada', desc: 'Cliente "Vortex" com 2 dias de atraso', type: 'warning' },
  ]

  // Prefer real auth profile name, fallback to agency settings
  const displayName  = profile?.full_name ?? settings.user_name ?? 'Usuário'
  const firstName    = displayName.split(' ')[0]
  const initials     = displayName.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'
  const roleLabel    = profile?.role === 'ADMIN' ? 'Admin' : profile?.role === 'MEMBER' ? 'Membro' : profile?.role === 'CLIENT' ? 'Cliente' : null

  async function handleSignOut() {
    setShowUserMenu(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className="h-16 flex items-center justify-between px-6 sticky top-0 z-40"
      style={{
        background: 'rgba(4, 8, 20, 0.88)',
        borderBottom: '1px solid rgba(6,182,212,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ─── Logo AX ────────────────────────────── */}
      <div className="flex items-center gap-3 flex-shrink-0 mr-6">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
            boxShadow: '0 0 20px rgba(6,182,212,0.3)',
          }}
        >
          <span className="text-white" style={{ fontFamily: 'Inter', letterSpacing: '-1px' }}>AX</span>
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-bold text-white leading-none tracking-wide">Praxis CRM</p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: 'rgba(6,182,212,0.6)' }}>Tech Dashboard</p>
        </div>
      </div>

      {/* ─── Busca Central ──────────────────────── */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Quick Search (Cmd + K)"
            className="w-full rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(6,182,212,0.12)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(6,182,212,0.35)'; e.target.style.boxShadow = '0 0 0 2px rgba(6,182,212,0.06)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(6,182,212,0.12)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      </div>

      {/* ─── Ações à direita ────────────────────── */}
      <div className="flex items-center gap-3 ml-6 flex-shrink-0">
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Bell size={18} />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
              style={{ background: '#ef4444', borderColor: 'var(--bg-base)' }}
            />
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div
                className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                style={{ background: 'rgba(4,8,20,0.96)', border: '1px solid rgba(6,182,212,0.12)', backdropFilter: 'blur(20px)' }}
              >
                <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 className="text-white font-semibold text-sm">Notificações</h4>
                  <button className="text-[10px]" style={{ color: '#06b6d4' }}>Limpar tudo</button>
                </div>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="p-4 transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0')}
                        style={{ background: n.type === 'urgent' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#06b6d4' }}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{n.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Sair Direto */}
        {user && (
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl transition-all text-red-400/60 hover:text-red-400 hover:bg-red-500/5 group"
            title="Sair do sistema"
          >
            <LogOut size={18} className="transition-transform group-hover:scale-110" />
          </button>
        )}

        {/* Avatar + Nome + Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all"
            style={{ border: '1px solid rgba(6,182,212,0.12)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(6,182,212,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(124,58,237,0.3))', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              {settings.logo_url
                ? <img src={settings.logo_url} alt="Avatar" className="w-full h-full object-cover" />
                : user
                  ? <span style={{ fontSize: 11 }}>{initials}</span>
                  : <Zap size={14} style={{ color: '#06b6d4' }} />
              }
            </div>
            <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
              <span className="text-sm font-medium text-white">{firstName}</span>
              {roleLabel && (
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(6,182,212,0.7)' }}>{roleLabel}</span>
              )}
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} className="hidden sm:block" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                style={{ background: 'rgba(4,8,20,0.97)', border: '1px solid rgba(6,182,212,0.12)', backdropFilter: 'blur(20px)' }}
              >
                {/* User info */}
                <div className="px-4 py-3 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{profile?.email ?? ''}</p>
                </div>

                {/* Profile link */}
                <Link
                  to="/perfil"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all w-full"
                >
                  Meu Perfil
                </Link>

                {/* Settings link (admin only) */}
                {isAdmin && (
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all w-full"
                  >
                    Configurações
                  </Link>
                )}

                {/* Sign out — only when a real session exists */}
                {user && (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all w-full"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
