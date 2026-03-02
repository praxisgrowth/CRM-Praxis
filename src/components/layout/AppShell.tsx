import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AIAssistant } from '../ai/AIAssistant'

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      {/* Sidebar lateral fixa */}
      <Sidebar />

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Barra superior com busca, notificações e perfil */}
        <Header />

        {/* Conteúdo da página com scroll independente */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Assistente de IA flutuante global */}
      <AIAssistant />
    </div>
  )
}
