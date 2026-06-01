import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  AlertCircle, TrendingUp, ShoppingBag, Store, ArrowUpRight, DollarSign,
} from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'

interface ShopRevenue {
  shop_id: string
  shop_name: string
  revenue: number
  orders: number
}

interface DailyRevenue {
  date: string
  revenue: number
  orders: number
}

interface ReportsSummary {
  period_days: number
  total_revenue: number
  total_orders: number
  orders_by_status: Record<string, number>
  shop_breakdown: ShopRevenue[]
  daily_revenue: DailyRevenue[]
}

const STATUS_COLORS: Record<string, string> = {
  received:  '#f59e0b',
  washing:   '#38bdf8',
  ready:     '#34d399',
  delivered: '#a8a29e',
  paid:      '#10b981',
}

const STATUS_LABEL: Record<string, string> = {
  received:  'Received',
  washing:   'Washing',
  ready:     'Ready',
  delivered: 'Delivered',
  paid:      'Paid',
}

const PERIODS = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

function fmtKES(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`
}

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-stone-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-orange-300">{fmtKES(payload[0]?.value ?? 0)}</p>
      <p className="text-tertiary">{payload[1]?.value ?? 0} orders</p>
    </div>
  )
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-stone-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-medium">{STATUS_LABEL[label] ?? label}: {payload[0]?.value}</p>
    </div>
  )
}

export function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const activeShopId = useAuthStore((s) => s.activeShopId)

  const [data, setData] = useState<ReportsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { days }
      if (activeShopId) params.shop_id = activeShopId
      const res = await client.get<ReportsSummary>('/reports/summary', { params })
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [days, activeShopId])

  const isOwner = user?.role === 'owner'

  // Prepare chart data
  const trendData = (data?.daily_revenue ?? []).map((d) => ({
    date: fmtShort(d.date),
    revenue: d.revenue,
    orders: d.orders,
  }))

  const statusData = Object.entries(data?.orders_by_status ?? {}).map(([status, count]) => ({
    status,
    count,
    label: STATUS_LABEL[status] ?? status,
    color: STATUS_COLORS[status] ?? '#a8a29e',
  }))

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-primary leading-none mb-0.5">Reports</h1>
        <p className="text-xs text-tertiary">{tenant?.name ?? 'Organization'}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${days === p.days ? 'bg-stone-900 text-white' : 'bg-surface border border-theme text-secondary hover:bg-subtle'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <AppShell orgName={tenant?.name ?? 'Organization'} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Total revenue</p>
                <div className="p-2 bg-orange-50 rounded-xl"><TrendingUp className="w-4 h-4 text-orange-500" /></div>
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">{fmtKES(data.total_revenue)}</p>
              <p className="text-xs text-tertiary mt-1">Last {data.period_days} days</p>
            </div>

            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Total orders</p>
                <div className="p-2 bg-sky-50 rounded-xl"><ShoppingBag className="w-4 h-4 text-sky-500" /></div>
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">{data.total_orders}</p>
              <p className="text-xs text-tertiary mt-1">Last {data.period_days} days</p>
            </div>

            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Avg. order value</p>
                <div className="p-2 bg-emerald-50 rounded-xl"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
              </div>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {data.total_orders > 0 ? fmtKES(data.total_revenue / data.total_orders) : 'KES 0'}
              </p>
              <p className="text-xs text-tertiary mt-1">Per order</p>
            </div>
          </div>

          {/* Revenue trend */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-primary mb-5">Revenue trend</p>
            {trendData.length === 0 ? (
              <p className="text-sm text-tertiary py-8 text-center">No revenue data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#a8a29e' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a8a29e' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={36}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500 rounded-full inline-block" /><span className="text-xs text-secondary">Revenue</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-sky-400 rounded-full inline-block" /><span className="text-xs text-secondary">Orders</span></div>
            </div>
          </div>

          {/* Orders by status */}
          {statusData.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-primary mb-5">Orders by status</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#78716c' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f5f5f4' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Shop breakdown */}
          {isOwner && data.shop_breakdown.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-theme flex items-center gap-2">
                <Store className="w-4 h-4 text-tertiary" />
                <p className="text-sm font-semibold text-primary">Revenue by shop</p>
              </div>
              <div className="divide-y divide-[var(--border-default)]">
                {data.shop_breakdown.map((shop, idx) => (
                  <div key={shop.shop_id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{shop.shop_name}</p>
                      <p className="text-xs text-tertiary">{shop.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{fmtKES(shop.revenue)}</p>
                      {data.total_revenue > 0 && (
                        <div className="flex items-center justify-end gap-0.5 text-xs text-emerald-600">
                          <ArrowUpRight className="w-3 h-3" />
                          {((shop.revenue / data.total_revenue) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily table */}
          {data.daily_revenue.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-theme">
                <p className="text-sm font-semibold text-primary">Daily breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme bg-subtle">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-secondary">Date</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-secondary">Orders</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-secondary">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {[...data.daily_revenue].reverse().map((d) => (
                      <tr key={d.date} className="hover:bg-subtle transition-colors">
                        <td className="px-5 py-3 text-secondary">{fmtShort(d.date)}</td>
                        <td className="px-5 py-3 text-right text-secondary tabular-nums">{d.orders}</td>
                        <td className="px-5 py-3 text-right font-semibold text-primary tabular-nums">{fmtKES(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </AppShell>
  )
}
