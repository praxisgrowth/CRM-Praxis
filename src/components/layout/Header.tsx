import { Bell, Search, ChevronDown, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { settings } = useSettings()
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notifications = [
    { id: 1, title: 'SLA em Risco', desc: 'Projeto "Rebranding" vence em 2h', type: 'urgent' },
    { id: 2, title: 'Novo Lead', desc: 'Gustavo Moura enviou uma mensagem', type: 'info' },
    { id: 3, title: 'Fatura Atrasada', desc: 'Cliente "Vortex" com 2 dias de atraso', type: 'warning' },
  ]

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
    <header className="h-20 glass-panel border-b flex items-center justify-between px-8 z-10 bg-praxis-bg/50 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <span className="font-bold text-xl hidden md:inline">Praxis <span className="text-praxis-cyan">CRM</span></span>
        <div className="relative w-96 hidden lg:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Quick Search - Cmd + K" 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-praxis-cyan transition-all text-sm text-gray-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-praxis-cyan transition-colors"
          >
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-praxis-cyan rounded-full border-2 border-praxis-bg"></span>
          </button>
 
          {showNotifications && (
            <div
              className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 glass-panel"
              style={{ background: 'rgba(10,13,18,0.96)' }}
            >
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                  <h4 className="text-white font-semibold text-sm">Notificações</h4>
                  <button className="text-[10px] text-praxis-cyan hover:underline">Limpar tudo</button>
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className="p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0')}
                          style={{ background: n.type === 'urgent' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#00d2ff' }}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs mt-0.5 text-gray-500">{n.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative flex items-center gap-3 pl-6 border-l border-white/10" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 group text-left"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold group-hover:text-praxis-cyan transition-colors">{firstName}</p>
              {roleLabel && (
                <p className="text-[10px] text-praxis-cyan uppercase font-bold tracking-tighter opacity-80">{roleLabel}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-full border border-praxis-cyan/50 overflow-hidden shadow-[0_0_10px_rgba(0,210,255,0.2)] group-hover:shadow-[0_0_15px_rgba(0,210,255,0.4)] transition-all">
               {settings.logo_url
                ? <img src={settings.logo_url} alt="Avatar" className="w-full h-full object-cover" />
                : user
                  ? <div className="w-full h-full flex items-center justify-center bg-praxis-cyan/20 text-praxis-cyan font-bold">{initials}</div>
                  : <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-500">?</div>
              }
            </div>
            <ChevronDown size={14} className="text-gray-500 group-hover:text-praxis-cyan transition-colors" />
          </button>
 
          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 glass-panel"
              style={{ background: 'rgba(10,13,18,0.97)' }}
            >
                <div className="px-4 py-3 mb-1 border-b border-white/5">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{profile?.email ?? user?.email ?? ''}</p>
                </div>

                <Link
                  to="/perfil"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full"
                >
                  Meu Perfil
                </Link>

                {isAdmin && (
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all w-full"
                  >
                    Configurações
                  </Link>
                )}

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all w-full border-t border-white/5 mt-1"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
          )}
        </div>
      </div>
    </header>
  )
}
