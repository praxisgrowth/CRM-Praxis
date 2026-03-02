import { Bell, Search, User as UserIcon } from 'lucide-react'
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

  // Extrair primeiro nome para o display
  const firstName = settings.user_name.split(' ')[0]
  // Iniciais para o placeholder do avatar
  const initials = settings.user_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#080c14]/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Pesquisa rápida (Cmd + K)"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificações */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all relative"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#080c14]" />
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 mt-3 w-80 glass rounded-2xl border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h4 className="text-white font-semibold text-sm">Notificações</h4>
                  <button className="text-[10px] text-blue-400 hover:underline">Limpar tudo</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={clsx(
                          "w-2 h-2 rounded-full mt-1.5",
                          n.type === 'urgent' ? "bg-red-500" : n.type === 'warning' ? "bg-yellow-500" : "bg-blue-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-white/5">
                  <button className="text-xs text-slate-500 hover:text-white">Ver todas as notificações</button>
                </div>
              </div>
            </>
          )}
        </div>

        <Link to="/settings" className="flex items-center gap-3 p-1 pr-3 rounded-xl hover:bg-white/5 transition-all group">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold group-hover:bg-blue-500 group-hover:text-white transition-all overflow-hidden">
            {settings.logo_url ? (
               <img src={settings.logo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               initials || <UserIcon size={14} />
            )}
          </div>
          <p className="text-sm font-medium text-slate-300 group-hover:text-white hidden sm:block whitespace-nowrap">
            {firstName}
          </p>
        </Link>
      </div>
    </header>
  )
}
