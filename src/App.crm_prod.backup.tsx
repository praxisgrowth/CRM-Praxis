import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { NexusLayout } from './components/layout/NexusLayout'
import { DashboardPage as Dashboard } from './pages/Dashboard'
import { LeadsPage } from './pages/Leads'
import { PipelinePage as Pipeline } from './pages/Pipeline'
import { SocialSellingPage } from './pages/SocialSelling'
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
import { StandardTasksPage } from './pages/settings/StandardTasks'
import { ProfilePage } from './pages/Profile'
import { PlaceholderPage } from './pages/Placeholder'
import { LoginPage } from './pages/Login'
import { SettingsProvider } from './contexts/SettingsContext'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { TestDashboard } from './pages/TestDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Sandbox isolada (fora de qualquer layout ou provider) ────── */}
        <Route path="/test-dashboard" element={<TestDashboard />} />

        {/* ── Login (fora do Shell principal) ─────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── App Shell Principal ───────────────────────────────────────── */}
        <Route
          path="/*"
          element={
            <AuthProvider>
              <SettingsProvider>
                <Routes>
                  <Route element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }>
                    {/* Dashboard */}
                    <Route index element={
                      <ProtectedRoute allowedRoles={['ADMIN', 'MEMBER']} redirectTo="/nexus">
                        <Dashboard />
                      </ProtectedRoute>
                    } />

                    {/* Comercial */}
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
                      <Route path="social" element={
                        <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                          <SocialSellingPage />
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

                    {/* Operação */}
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

                    {/* Financeiro */}
                    <Route path="financeiro" element={
                      <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                        <FinancialPage />
                      </ProtectedRoute>
                    } />

                    {/* Configurações */}
                    <Route path="settings">
                      <Route index element={
                        <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
                          <Settings />
                        </ProtectedRoute>
                      } />
                      <Route path="team" element={<TeamPage />} />
                      <Route path="sectors" element={<SectorsPage />} />
                      <Route path="deliverables" element={<DeliverablesPage />} />
                      <Route path="templates" element={<StandardTasksPage />} />
                    </Route>

                    <Route path="nexus" element={<PortalNexusPage />} />
                    <Route path="perfil" element={<ProfilePage />} />
                    <Route path="universidade" element={<PlaceholderPage title="Universidade" description="..." phase="3" />} />
                  </Route>

                  {/* Portal Nexus Público */}
                  <Route path="portal/:client_id" element={<NexusLayout />}>
                    <Route index element={<NexusPortal />} />
                  </Route>
                </Routes>
              </SettingsProvider>
            </AuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
