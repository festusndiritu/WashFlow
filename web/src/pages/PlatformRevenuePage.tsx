import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, Crown } from 'lucide-react'
import client from '../api/client'
import { AppShell } from '../components/AppShell'
import { PlatformNav } from '../components/PlatformNav'

interface RevenueBreakdown {
  id: string
  name: string
  slug: string
  plan: string
  revenue: number
  paid_orders: number
}

interface RevenueData {
  total_revenue: number
  breakdown: RevenueBreakdown[]
}

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-stone-100 text-stone-500',
  starter:    'bg-blue-50 text-blue-600',
  pro:        'bg-violet-50 text-violet-600',
  enterprise: 'bg-amber-50 text-amber-600',
}

export function PlatformRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.get<RevenueData>('/platform/revenue')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
  }, [])

  const maxRevenue = data ? Math.max(...data.breakdown.map(b => b.revenue), 1) : 1

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={<PlatformNav />}>
      <div className="mb-5">
        <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Revenue Overview</h1>
        <p className="text-sm text-stone-500">Paid orders across all organizations</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Total card */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1">Total Platform Revenue</p>
          {data
            ? <p className="text-3xl font-black text-stone-900 tabular-nums">KES {data.total_revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
            : <div className="h-8 w-48 bg-stone-100 rounded animate-pulse" />}
        </div>
      </div>

      {/* Per-tenant breakdown */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">Per-Organization Breakdown</h2>
        </div>
        {!data ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : data.breakdown.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">No paid orders yet</p>
        ) : (
          <div className="divide-y divide-stone-50">
            {data.breakdown.map((row, i) => (
              <div key={row.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-stone-900">{row.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${PLAN_BADGE[row.plan] ?? PLAN_BADGE.free}`}>
                          {row.plan}
                        </span>
                        <span className="text-xs text-stone-400">{row.paid_orders} paid order{row.paid_orders !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-stone-900 tabular-nums">
                    KES {row.revenue.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                {/* Bar */}
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${(row.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
