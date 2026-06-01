import { Navigate, Route, Routes, Link } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useThemeInit } from './hooks/useThemeInit'
import { LoginPage } from './pages/Login'
import { PlatformDashboardPage } from './pages/PlatformDashboard'
import { PlatformTenantsPage } from './pages/PlatformTenantsPage'
import { PlatformRevenuePage } from './pages/PlatformRevenuePage'
import { PlatformOrdersPage } from './pages/PlatformOrdersPage'
import { PlatformUsersPage } from './pages/PlatformUsersPage'
import { PlatformPlansPage } from './pages/PlatformPlansPage'
import { PlatformSetupPage } from './pages/PlatformSetup'
import { SignupPage } from './pages/Signup'
import { TenantDashboardPage } from './pages/TenantDashboard'
import { CustomersPage } from './pages/CustomersPage'
import { OrdersPage } from './pages/OrdersPage'
import { ReportsPage } from './pages/ReportsPage'
import { TeamPage } from './pages/TeamPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServicesPage } from './pages/ServicesPage'
import { OnboardingPage } from './pages/Onboarding'
import { PrintReceiptPage } from './pages/PrintReceiptPage'
import { InvoicePage } from './pages/InvoicePage'
import { ExpensesPage } from './pages/ExpensesPage'
import { useAuthStore } from './store/auth'

export function App() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  useThemeInit()

  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform-setup" element={<PlatformSetupPage />} />
      <Route
        path="/platform"
        element={
          <ProtectedRoute>
            <PlatformDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/tenants"
        element={
          <ProtectedRoute>
            <PlatformTenantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/revenue"
        element={
          <ProtectedRoute>
            <PlatformRevenuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/orders"
        element={
          <ProtectedRoute>
            <PlatformOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/users"
        element={
          <ProtectedRoute>
            <PlatformUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform/plans"
        element={
          <ProtectedRoute>
            <PlatformPlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'platform_owner' ? <PlatformDashboardPage /> : <TenantDashboardPage />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/services"
        element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/print/:orderId"
        element={
          <ProtectedRoute>
            <PrintReceiptPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice/:orderId"
        element={
          <ProtectedRoute>
            <InvoicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: 'var(--bg-page)' }}>
          <p className="text-7xl font-black" style={{ color: 'var(--text-disabled)' }}>404</p>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Page not found</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>The page you're looking for doesn't exist.</p>
          <Link to={token ? '/dashboard' : '/login'} className="btn btn-primary btn-md mt-2">← Go home</Link>
        </div>
      } />
    </Routes>
  )
}
