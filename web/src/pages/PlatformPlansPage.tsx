import { useEffect, useState } from 'react'
import { AlertCircle, Building2, Crown, Layers, Zap } from 'lucide-react'
import client from '../api/client'
import { AppShell } from '../components/AppShell'
import { PlatformNav } from '../components/PlatformNav'

interface PlanStat {
  key: string
  label: string
  price_kes: number
  shops: number
  users: number
  orders_per_month: number
  tenant_count: number
}

const PLAN_META: Record<string, { color: string; ring: string; badge: string; icon: JSX.Element; features: string[] }> = {
  free: {
    color: 'bg-stone-50 border-stone-200',
    ring: 'bg-stone-100 text-stone-600',
    badge: 'bg-stone-100 text-stone-600',
    icon: <Layers className="w-5 h-5" />,
    features: ['1 shop', '3 users', '50 orders / month'],
  },
  starter: {
    color: 'bg-blue-50 border-blue-200',
    ring: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    icon: <Zap className="w-5 h-5" />,
    features: ['2 shops', '10 users', '300 orders / month'],
  },
  pro: {
    color: 'bg-violet-50 border-violet-200',
    ring: 'bg-violet-100 text-violet-700',
    badge: 'bg-violet-100 text-violet-700',
    icon: <Crown className="w-5 h-5" />,
    features: ['5 shops', '30 users', '1 000 orders / month'],
  },
  enterprise: {
    color: 'bg-amber-50 border-amber-200',
    ring: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    icon: <Building2 className="w-5 h-5" />,
    features: ['Unlimited shops', 'Unlimited users', 'Unlimited orders'],
  },
}

function fmt(n: number) {
  return n === -1 ? '∞' : n.toLocaleString('en-KE')
}

export function PlatformPlansPage() {
  const [plans, setPlans] = useState<PlanStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.get<{ plans: PlanStat[] }>('/platform/plans')
      .then(r => setPlans(r.data.plans))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const totalTenants = plans.reduce((s, p) => s + p.tenant_count, 0)

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={<PlatformNav />}>
      <div className="mb-6">
        <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Subscription Plans</h1>
        <p className="text-sm text-stone-500">{totalTenants} organizations across all tiers</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(plan => {
            const meta = PLAN_META[plan.key] ?? PLAN_META.free
            const pct = totalTenants > 0 ? Math.round((plan.tenant_count / totalTenants) * 100) : 0
            return (
              <div key={plan.key} className={`rounded-2xl border p-5 flex flex-col gap-4 ${meta.color}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.ring}`}>
                    {meta.icon}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}>
                    {plan.tenant_count} org{plan.tenant_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Name + price */}
                <div>
                  <p className="font-semibold text-stone-900 text-base">{plan.label}</p>
                  <p className="text-stone-500 text-sm mt-0.5">
                    {plan.price_kes === 0
                      ? 'Free forever'
                      : `KES ${plan.price_kes.toLocaleString('en-KE')} / month`}
                  </p>
                </div>

                {/* Limits */}
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                    {fmt(plan.shops)} shop{plan.shops !== 1 ? 's' : ''}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                    {fmt(plan.users)} user{plan.users !== 1 ? 's' : ''}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                    {fmt(plan.orders_per_month)} orders / mo
                  </li>
                </ul>

                {/* Usage bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-stone-400">Share of orgs</span>
                    <span className="text-xs font-semibold text-stone-600">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-stone-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary table */}
      {!loading && plans.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Price / mo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Shops</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Users</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Orders / mo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Orgs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {plans.map(plan => {
                const meta = PLAN_META[plan.key] ?? PLAN_META.free
                return (
                  <tr key={plan.key} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                        {meta.icon && <span className="scale-75 -ml-0.5">{meta.icon}</span>}
                        {plan.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700 tabular-nums font-medium">
                      {plan.price_kes === 0 ? <span className="text-stone-400">—</span> : `KES ${plan.price_kes.toLocaleString('en-KE')}`}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden sm:table-cell">{fmt(plan.shops)}</td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden sm:table-cell">{fmt(plan.users)}</td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden md:table-cell">{fmt(plan.orders_per_month)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900">{plan.tenant_count}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-stone-100 bg-stone-50">
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Total</td>
                <td className="px-4 py-3 text-right font-bold text-stone-900">{totalTenants}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </AppShell>
  )
}
