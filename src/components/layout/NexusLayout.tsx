import { Outlet } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'

export function NexusLayout() {
  const { settings } = useSettings()

  return (
    <div className="min-h-screen" style={{ background: '#060910' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(255,255,255,0.015)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.agency_name}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {settings.agency_name[0]}
            </div>
          )}
          <span className="text-sm font-semibold text-white">{settings.agency_name}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Shield size={12} />
          Portal Seguro
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 mt-8">
        <p className="text-[11px] text-slate-600">
          Powered by{' '}
          <span className="text-indigo-500 font-medium">{settings.agency_name}</span>
          {' '}· Portal Nexus
        </p>
      </footer>
    </div>
  )
}
