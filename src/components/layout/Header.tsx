import { Bell, Search, ChevronDown, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import clsx from 'clsx'

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false)
  const { settings } = useSettings()

  const notifications = [
    { id: 1, title: 'SLA em Risco', desc: 'Projeto "Rebranding" vence em 2h', type: 'urgent' },
    { id: 2, title: 'Novo Lead', desc: 'Gustavo Moura enviou uma mensagem', type: 'info' },
    { id: 3, title: 'Fatura Atrasada', desc: 'Cliente "Vortex" com 2 dias de atraso', type: 'warning' },
  ]

  const firstName = settings.user_name.split(' ')[0] || 'Usuário'

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

        {/* Avatar + Nome */}
        <Link
          to="/settings"
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
              : <Zap size={14} style={{ color: '#06b6d4' }} />
            }
          </div>
          <span className="text-sm font-medium text-white hidden sm:block">{firstName}</span>
          <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} className="hidden sm:block" />
        </Link>
      </div>
    </header>
  )
}
