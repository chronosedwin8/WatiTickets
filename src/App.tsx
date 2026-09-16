import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { TenantProvider } from '@/contexts/TenantContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import './index.css'

// Lazy-loaded pages — reduces initial bundle size
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const TicketsPage = lazy(() => import('@/pages/TicketsPage').then(m => ({ default: m.TicketsPage })))
const ProblemsPage = lazy(() => import('@/pages/ProblemsPage').then(m => ({ default: m.ProblemsPage })))
const ChangesPage = lazy(() => import('@/pages/ChangesPage').then(m => ({ default: m.ChangesPage })))
const ServiceCatalogPage = lazy(() => import('@/pages/ServiceCatalogPage').then(m => ({ default: m.ServiceCatalogPage })))
const AssetsPage = lazy(() => import('@/pages/AssetsPage').then(m => ({ default: m.AssetsPage })))
const WorkOrdersPage = lazy(() => import('@/pages/WorkOrdersPage').then(m => ({ default: m.WorkOrdersPage })))
const DevelopmentPage = lazy(() => import('@/pages/DevelopmentPage').then(m => ({ default: m.DevelopmentPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const KnowledgeBasePage = lazy(() => import('@/pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })))
const EmailIntegrationSettings = lazy(() => import('@/pages/settings/EmailIntegration'))
const MenuPermissions = lazy(() => import('@/pages/settings/MenuPermissions'))
const PlannerPage = lazy(() => import('@/pages/PlannerPage').then(m => ({ default: m.PlannerPage })))
const AbsencesPage = lazy(() => import('@/pages/absences/AbsencesPage').then(m => ({ default: m.AbsencesPage })))
const AbsenceDashboard = lazy(() => import('@/pages/absences/AbsenceDashboard').then(m => ({ default: m.AbsenceDashboard })))

// Páginas públicas: presentación y guía de uso
const HomePage = lazy(() => import('@/pages/public/HomePage').then(m => ({ default: m.HomePage })))
const WikiPage = lazy(() => import('@/pages/public/WikiPage').then(m => ({ default: m.WikiPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/inicio" replace />
  }

  return <>{children}</>
}

// Public route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/** Si hay sesión lleva al panel; si no, a la página de presentación. */
function RutaNoEncontrada() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  return <Navigate to={user ? '/' : '/inicio'} replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/inicio" element={<HomePage />} />
        <Route path="/ayuda" element={<WikiPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <TenantProvider>
                <AppLayout />
              </TenantProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets/*" element={<TicketsPage />} />
          <Route path="/problems/*" element={<ProblemsPage />} />
          <Route path="/changes/*" element={<ChangesPage />} />
          <Route path="/service-catalog/*" element={<ServiceCatalogPage />} />
          <Route path="/assets/*" element={<AssetsPage />} />
          <Route path="/work-orders/*" element={<WorkOrdersPage />} />
          <Route path="/development/*" element={<DevelopmentPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/knowledge-base/*" element={<KnowledgeBasePage />} />
          <Route path="/absences" element={<AbsencesPage />} />
          <Route path="/absences/dashboard" element={<AbsenceDashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/email-integration" element={<EmailIntegrationSettings />} />
          <Route path="/settings/menu-permissions" element={<MenuPermissions />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<RutaNoEncontrada />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
