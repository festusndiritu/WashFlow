import { useEffect, useState } from 'react'
import { Building2, Package, ShoppingBag, Users, Briefcase, LayoutDashboard, AlertCircle } from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell, NavItem } from '../components/AppShell'

interface PlatformMetrics {
  total_tenants: number
  total_shops: number
  total_users: number
  total_orders: number
  active_workers: number
  recent_tenants: Array<{ id: string; name: string; slug: string }>
}

const STAT_DEFS = [
  { key: 'total_tenants',  label: 'Organizations',   icon: Building2,   ring: 'bg-violet-100 text-violet-600' },
  { key: 'total_shops',   label: 'Total Shops',      icon: ShoppingBag, ring: 'bg-blue-100 text-blue-600' },
  { key: 'total_users',   label: 'Platform Users',   icon: Users,       ring: 'bg-sky-100 text-sky-600' },
  { key: 'total_orders',  label: 'Total Orders',     icon: Package,     ring: 'bg-emerald-100 text-emerald-600' },
  { key: 'active_workers',label: 'Active Workers',   icon: Briefcase,   ring: 'bg-amber-100 text-amber-600' },
] as const

export function PlatformDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client
      .get<PlatformMetrics>('/platform/dashboard')
      .then((r) => setMetrics(r.data))
      .catch((err: any) => setError(err.response?.data?.detail || 'Could not load metrics'))
  }, [])

  const sidebarNav = (
    <NavItem icon={<LayoutDashboard />} label="Overview" active />
  )

  const headerSlot = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-base font-semibold text-stone-900 leading-none mb-0.5">Platform Overview</p>
        <p className="text-sm text-stone-500">Welcome back, {user?.name}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-3 py-1 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 block" />
        Platform Owner
      </span>
    </div>
  )

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4 mb-6">
        {STAT_DEFS.map(({ key, label, icon: Icon, ring }) => (
          <div key={key} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${ring} mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-stone-900 leading-none mb-1 tabular-nums">
              {metrics ? (metrics as any)[key] : <span className="text-stone-300">&mdash;</span>}
            </p>
            <p className="text-xs text-stone-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orgs */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Latest Organizations</h2>
          <span className="text-xs text-stone-400">{metrics?.recent_tenants.length ?? 0} shown</span>
        </div>
        <div className="divide-y divide-stone-50">
          {!metrics && (
            <div className="px-5 py-10 text-center">
              <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto" />
            </div>
          )}
          {metrics?.recent_tenants.length === 0 && (
            <p className="px-5 py-10 text-center text-stone-400 text-sm">No organizations yet</p>
          )}
          {(metrics?.recent_tenants ?? []).map((tenant) => (
            <div
              key={tenant.id}
              className="px-5 py-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm select-none">
                  {tenant.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900">{tenant.name}</p>
                  <p className="text-xs text-stone-400 font-mono">{tenant.slug}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block" />
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
