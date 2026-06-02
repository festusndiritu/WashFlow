import React, { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, Link } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useThemeInit } from './hooks/useThemeInit'
import { useAuthStore } from './store/auth'

const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })))
const SignupPage = lazy(() => import('./pages/Signup').then(m => ({ default: m.SignupPage })))
const PlatformSetupPage = lazy(() => import('./pages/PlatformSetup').then(m => ({ default: m.PlatformSetupPage })))
const PlatformDashboardPage = lazy(() => import('./pages/PlatformDashboard').then(m => ({ default: m.PlatformDashboardPage })))
const PlatformTenantsPage = lazy(() => import('./pages/PlatformTenantsPage').then(m => ({ default: m.PlatformTenantsPage })))
const PlatformRevenuePage = lazy(() => import('./pages/PlatformRevenuePage').then(m => ({ default: m.PlatformRevenuePage })))
const PlatformOrdersPage = lazy(() => import('./pages/PlatformOrdersPage').then(m => ({ default: m.PlatformOrdersPage })))
const PlatformUsersPage = lazy(() => import('./pages/PlatformUsersPage').then(m => ({ default: m.PlatformUsersPage })))
const PlatformPlansPage = lazy(() => import('./pages/PlatformPlansPage').then(m => ({ default: m.PlatformPlansPage })))
const TenantDashboardPage = lazy(() => import('./pages/TenantDashboard').then(m => ({ default: m.TenantDashboardPage })))
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const TeamPage = lazy(() => import('./pages/TeamPage').then(m => ({ default: m.TeamPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })))
const OnboardingPage = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.OnboardingPage })))
const PrintReceiptPage = lazy(() => import('./pages/PrintReceiptPage').then(m => ({ default: m.PrintReceiptPage })))
const InvoicePage = lazy(() => import('./pages/InvoicePage').then(m => ({ default: m.InvoicePage })))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })))
const UnitsPage = lazy(() => import('./pages/UnitsPage').then(m => ({ default: m.UnitsPage })))

export function App() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  useThemeInit()

  return (
    <Suspense fallback={null}>
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
        path="/units"
        element={
          <ProtectedRoute>
            <UnitsPage />
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
    </Suspense>
  )
}
