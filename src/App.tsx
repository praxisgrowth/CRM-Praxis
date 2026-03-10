import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { NexusLayout } from './components/layout/NexusLayout'
import { DashboardPage as Dashboard } from './pages/Dashboard'
import { LeadsPage } from './pages/Leads'
import { PipelinePage as Pipeline } from './pages/Pipeline'
import { ClientsPage as Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { OperationsPage as Operations } from './pages/Operations'
import { FinancialPage } from './pages/Financial'
import { PortalNexusPage } from './pages/PortalNexus'
import { NexusPortal } from './pages/NexusPortal'
import { Settings } from './pages/Settings'
import { TeamPage } from './pages/settings/Team'
import { SectorsPage } from './pages/settings/Sectors'
import { DeliverablesPage } from './pages/settings/Deliverables'
import { ProfilePage } from './pages/Profile'
import { PlaceholderPage } from './pages/Placeholder'
import { LoginPage } from './pages/Login'
import { SettingsProvider } from './contexts/SettingsContext'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }>
              {/* Dashboard — ADMIN + MEMBER only; CLIENT → /nexus */}
              <Route index element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Comercial — ADMIN only; redirect others to / */}
              <Route path="comercial">
                <Route path="leads" element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <LeadsPage />
                  </ProtectedRoute>
                } />
                <Route path="pipeline" element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <Pipeline />
                  </ProtectedRoute>
                } />
                <Route path="clientes" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="clientes/:id" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                    <ClientDetail />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Operação — ADMIN + MEMBER only; CLIENT → /nexus */}
              <Route path="operacao">
                <Route index element={<Navigate to="tarefas" replace />} />
                <Route path="tarefas" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                    <Operations view="tarefas" />
                  </ProtectedRoute>
                } />
                <Route path="projetos" element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                    <Operations view="projetos" />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Financeiro — ADMIN only */}
              <Route path="financeiro" element={
                <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                  <FinancialPage />
                </ProtectedRoute>
              } />

              {/* Portal Nexus — all roles */}
              <Route path="nexus" element={<PortalNexusPage />} />

              {/* Perfil — all roles */}
              <Route path="perfil" element={<ProfilePage />} />

              {/* Configurações — ADMIN only */}
              <Route path="settings">
                <Route index element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="team" element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <TeamPage />
                  </ProtectedRoute>
                } />
                <Route path="sectors" element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <SectorsPage />
                  </ProtectedRoute>
                } />
                <Route path="deliverables" element={
                  <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                    <DeliverablesPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Comercial — ADMIN only (CLIENT + MEMBER blocked) */}
              {/* Routes already exist above; block via ProtectedRoute wrapper */}

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

            {/* Login */}
            <Route path="login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  )
}
