import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIAssistant } from '../ai/AIAssistant'
import { useAuth } from '../../contexts/AuthContext'

export function AppShell() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // While auth resolves, render nothing to avoid flash
  if (loading) return null

  // CLIENT role users have restricted access
  if (user !== null && profile?.role === 'CLIENT') {
    const allowedPaths = ['/nexus', '/universidade', '/perfil']
    const isAllowed = allowedPaths.some(path => location.pathname.startsWith(path))
    
    if (!isAllowed) {
      return <Navigate to="/nexus" replace />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-100" style={{ background: 'var(--color-praxis-bg, #0a0d12)' }}>
      {/* Sidebar lateral fixa */}
      <Sidebar />

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background glow */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-praxis-cyan/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-praxis-purple/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Barra superior */}
        <Header />

        {/* Conteúdo da página com scroll independente */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative z-0">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-700">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Assistente de IA flutuante global */}
      <AIAssistant />
    </div>
  )
}
