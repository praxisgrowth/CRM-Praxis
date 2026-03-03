import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { NexusLayout } from './components/layout/NexusLayout'
import { DashboardPage as Dashboard } from './pages/Dashboard'
import { LeadsPage } from './pages/Leads'
import { PipelinePage as Pipeline } from './pages/Pipeline'
import { ClientDetail } from './pages/ClientDetail'
import { OperationsPage as Operations } from './pages/Operations'
import { FinancialPage } from './pages/Financial'
import { PortalNexusPage } from './pages/PortalNexus'
import { NexusPortal } from './pages/NexusPortal'
import { Settings } from './pages/Settings'
import { PlaceholderPage } from './pages/Placeholder'
import { SettingsProvider } from './contexts/SettingsContext'

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />

            {/* Comercial */}
            <Route path="comercial">
              <Route path="leads" element={<LeadsPage />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="clientes/:id" element={<ClientDetail />} />
            </Route>

            {/* Operação */}
            <Route path="operacao" element={<Operations />} />

            {/* Financeiro */}
            <Route path="financeiro" element={<FinancialPage />} />

            {/* Portal Nexus */}
            <Route path="nexus" element={<PortalNexusPage />} />

            {/* Configurações */}
            <Route path="settings" element={<Settings />} />

            {/* Universidade */}
            <Route
              path="universidade"
              element={
                <PlaceholderPage
                  title="Universidade Praxis"
                  description="Trilhas de aprendizado, onboarding de clientes e base de conhecimento."
                  phase="Fase 3"
                />
              }
            />
          </Route>

          {/* Portal Nexus público — acesso via link único do cliente */}
          <Route path="portal/:client_id" element={<NexusLayout />}>
            <Route index element={<NexusPortal />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  )
}
