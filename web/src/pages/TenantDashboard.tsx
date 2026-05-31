import { useEffect, useState } from 'react'
import {
  Store, Package, UserCheck, Users, Plus, AlertCircle,
  TrendingUp, Clock, CheckCircle2, Truck, Tag, ArrowUpRight, Banknote,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'

interface ReportSummary {
  total_revenue: number
  total_orders: number
  orders_by_status: Record<string, number>
  daily_revenue: { date: string; revenue: number; orders: number }[]
  shop_breakdown?: { shop_id: string; shop_name: string; revenue: number; orders: number }[]
}

interface RecentOrder {
  id: string
  customer_id: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
  items: { service_name: string; quantity: number }[]
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

const STATUS_BADGE: Record<string, string> = {
  received:  'bg-amber-50 text-amber-700',
  washing:   'bg-sky-50 text-sky-700',
  ready:     'bg-emerald-50 text-emerald-700',
  delivered: 'bg-stone-100 text-stone-500',
}

const STATUS_ICON: Record<string, typeof Clock> = {
  received:  Clock,
  washing:   Package,
  ready:     CheckCircle2,
  delivered: Truck,
}

const STATUS_LABEL: Record<string, string> = {
  received: 'Received', washing: 'Washing', ready: 'Ready',
  delivered: 'Delivered',
}

export function TenantDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const activeShopId = useAuthStore((s) => s.activeShopId)
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)

  const [report, setReport] = useState<ReportSummary | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({})
  const [customersCount, setCustomersCount] = useState(0)
  const [teamCount, setTeamCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isManagement = user?.role === 'owner' || user?.role === 'admin'

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const me = await client.get('/auth/me')
        setAuth({
          token: me.data.access_token,
          user: me.data.user,
          tenant: me.data.tenant,
          shops: me.data.shops,
          activeShopId: me.data.active_shop_id,
        })

        const params = activeShopId ? { shop_id: activeShopId } : undefined
        const [customersRes, ordersRes, reportRes, teamRes] = await Promise.all([
          client.get('/customers', { params }),
          client.get<RecentOrder[]>('/orders', { params }),
          isManagement ? client.get<ReportSummary>('/reports/summary', { params: { days: 30, ...(activeShopId ? { shop_id: activeShopId } : {}) } }) : Promise.resolve(null),
          isManagement ? client.get('/team') : Promise.resolve(null),
        ])

        const allCustomers: Customer[] = Array.isArray(customersRes.data) ? customersRes.data : []
        setCustomersCount(allCustomers.length)

        const cMap: Record<string, Customer> = {}
        allCustomers.forEach((c) => { cMap[c.id] = c })
        setCustomerMap(cMap)

        const allOrders: RecentOrder[] = Array.isArray(ordersRes.data) ? ordersRes.data : []
        setRecentOrders(allOrders.slice(0, 8))

        if (reportRes) setReport(reportRes.data)
        if (teamRes) setTeamCount(Array.isArray(teamRes.data) ? teamRes.data.length : 0)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [activeShopId, isManagement])

  const switchShop = async (shopId: string) => {
    if (shopId === activeShopId) return
    try {
      const res = await client.post('/auth/switch-shop', { shop_id: shopId })
      setAuth({ token: res.data.access_token, user: res.data.user, tenant: res.data.tenant, shops: res.data.shops, activeShopId: res.data.active_shop_id })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to switch shop')
    }
  }

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-stone-900 leading-none mb-0.5">{user?.name}</p>
        <p className="text-xs text-stone-400 capitalize">{user?.role} · {tenant?.name}</p>
      </div>
      {shops.length > 1 && (
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
          {shops.map((shop) => (
            <button key={shop.id} onClick={() => switchShop(shop.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${shop.id === activeShopId ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {shop.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const ordsByStatus = report?.orders_by_status ?? {}
  const totalOrdersFromStatus = Object.values(ordsByStatus).reduce((s, n) => s + n, 0)

  return (
    <AppShell orgName={tenant?.name ?? 'Organization'} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          {isManagement && report && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 items-stretch">
              {/* Revenue with sparkline */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 col-span-2 lg:col-span-1 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/60 to-transparent pointer-events-none rounded-2xl" />
                <div className="relative flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Revenue (30d)</p>
                    <div className="p-1.5 bg-orange-100 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-orange-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-stone-900 tabular-nums leading-none mb-2">
                    KES {Number(report.total_revenue).toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                  </p>
                  {report.daily_revenue.length > 1 && (
                    <div className="flex-1 min-h-[40px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={report.daily_revenue.slice(-14)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip content={({ active, payload }) =>
                            active && payload?.length ? (
                              <div className="bg-stone-900 text-white text-[10px] px-2 py-1 rounded">
                                KES {Number(payload[0]?.value ?? 0).toLocaleString()}
                              </div>
                            ) : null
                          } />
                          <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={1.5} fill="url(#spark)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent pointer-events-none rounded-2xl" />
                <div className="relative flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Orders</p>
                      <div className="p-1.5 bg-amber-100 rounded-lg"><Package className="w-3.5 h-3.5 text-amber-500" /></div>
                    </div>
                    <p className="text-2xl font-bold text-stone-900 tabular-nums leading-none">{report.total_orders}</p>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Last 30 days</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent pointer-events-none rounded-2xl" />
                <div className="relative flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Customers</p>
                      <div className="p-1.5 bg-sky-100 rounded-lg"><UserCheck className="w-3.5 h-3.5 text-sky-500" /></div>
                    </div>
                    <p className="text-2xl font-bold text-stone-900 tabular-nums leading-none">{customersCount}</p>
                  </div>
                  <a href="/customers" className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-1 inline-flex items-center gap-0.5">
                    View <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent pointer-events-none rounded-2xl" />
                <div className="relative flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Team</p>
                      <div className="p-1.5 bg-violet-100 rounded-lg"><Users className="w-3.5 h-3.5 text-violet-500" /></div>
                    </div>
                    <p className="text-2xl font-bold text-stone-900 tabular-nums leading-none">{teamCount}</p>
                  </div>
                  <a href="/team" className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-1 inline-flex items-center gap-0.5">
                    Manage <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Worker quick stats */}
          {!isManagement && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <p className="text-xs font-medium text-stone-500 mb-1">Customers</p>
                <p className="text-2xl font-bold text-stone-900">{customersCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-4">
                <p className="text-xs font-medium text-stone-500 mb-1">Active shop</p>
                <p className="text-sm font-semibold text-stone-900 truncate">{shops.find((s) => s.id === activeShopId)?.name ?? 'All'}</p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'New order',       desc: 'Create & assign',    icon: Plus,       href: '/orders',   iconBg: 'bg-orange-500',   iconColor: 'text-white',   bg: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' },
              { label: 'Customers',       desc: 'Manage contacts',    icon: UserCheck,  href: '/customers', iconBg: 'bg-sky-100',     iconColor: 'text-sky-600', bg: 'bg-white hover:bg-sky-50 text-stone-700 border-stone-200' },
              { label: 'Service catalog', desc: 'Pricing & items',    icon: Tag,        href: '/services',  iconBg: 'bg-violet-100',  iconColor: 'text-violet-600', bg: 'bg-white hover:bg-violet-50 text-stone-700 border-stone-200' },
              { label: 'Reports',         desc: 'Revenue & stats',    icon: TrendingUp, href: '/reports',   iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', bg: 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200' },
            ].map(({ label, desc, icon: Icon, href, iconBg, iconColor, bg }) => (
              <a key={href} href={href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold border shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_2px_6px_rgba(0,0,0,0.07)] active:scale-[0.98] ${bg}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                  <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="leading-tight truncate">{label}</p>
                  <p className={`text-[11px] font-normal leading-tight truncate mt-0.5 ${bg.includes('orange-500') ? 'text-orange-100' : 'text-stone-400'}`}>{desc}</p>
                </div>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Recent orders — main panel */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-stone-900">Recent orders</h2>
                  {recentOrders.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 text-[11px] font-semibold rounded-full tabular-nums">
                      {recentOrders.length}
                    </span>
                  )}
                </div>
                <a href="/orders" className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-0.5">
                  View all <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              {recentOrders.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Package className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">No orders yet</p>
                  <a href="/orders" className="mt-2 inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
                    <Plus className="w-3 h-3" /> Create first order
                  </a>
                </div>
              ) : (
                <div>
                  {recentOrders.map((order) => {
                    const customer = customerMap[order.customer_id]
                    const StatusIcon = STATUS_ICON[order.status] ?? Clock
                    const badge = STATUS_BADGE[order.status] ?? 'bg-stone-100 text-stone-500'
                    const label = STATUS_LABEL[order.status] ?? order.status
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(order.created_at).getTime()
                      const mins = Math.floor(diff / 60000)
                      if (mins < 60) return `${mins}m ago`
                      const hrs = Math.floor(mins / 60)
                      if (hrs < 24) return `${hrs}h ago`
                      return `${Math.floor(hrs / 24)}d ago`
                    })()
                    const AVATAR_PALETTE = ['bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700']
                    const avatarColor = customer?.name ? AVATAR_PALETTE[customer.name.charCodeAt(0) % AVATAR_PALETTE.length] : 'bg-stone-100 text-stone-500'
                    const shortId = `#${order.id.slice(-5).toUpperCase()}`
                    return (
                      <div key={order.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-stone-50/70 transition-colors border-b border-stone-50 last:border-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold select-none ${avatarColor}`}>
                          {customer?.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold text-stone-900 truncate">{customer?.name ?? 'Unknown'}</p>
                            <span className="text-[10px] font-mono text-stone-300 shrink-0">{shortId}</span>
                          </div>
                          <p className="text-xs text-stone-400 truncate">
                            {order.items.map((i) => `${i.service_name} ×${i.quantity}`).join(' · ') || 'No items'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}>
                              <StatusIcon className="w-3 h-3" />
                              {label}
                            </span>
                            {order.payment_status === 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                <Banknote className="w-3 h-3" /> Paid
                              </span>
                            )}
                          </div>
                          <div className="text-right hidden sm:block min-w-[88px]">
                            <p className="text-sm font-bold text-stone-900 tabular-nums">
                              KES {Number(order.total_amount).toLocaleString('en-KE')}
                            </p>
                            <p className="text-[10px] text-stone-400">{timeAgo}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Orders by status */}
              {isManagement && report && Object.keys(ordsByStatus).length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5">
                  <h2 className="text-sm font-semibold text-stone-900 mb-4">Pipeline</h2>
                  <div className="space-y-3">
                    {(['received', 'washing', 'ready', 'delivered'] as const).map((status) => {
                      const count = ordsByStatus[status] ?? 0
                      const pct = totalOrdersFromStatus > 0 ? Math.round((count / totalOrdersFromStatus) * 100) : 0
                      const Icon = STATUS_ICON[status] ?? Clock
                      const badge = STATUS_BADGE[status]
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-stone-400" />
                              <span className="text-sm text-stone-700 capitalize">{status}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>{count}</span>
                              <span className="text-xs text-stone-400 tabular-nums w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Shops */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-stone-400" /> Shops
                  </h2>
                  {user?.role === 'owner' && (
                    <a href="/settings" className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-0.5">
                      Manage <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {shops.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-sm text-stone-400 mb-2">No shops yet</p>
                    <a href="/settings" className="text-xs text-orange-600 font-medium">Add in Settings →</a>
                  </div>
                ) : (
                  <div className="p-3 flex flex-col gap-2">
                    {shops.map((shop) => {
                      const shopRevenue = report?.shop_breakdown?.find((b) => b.shop_id === shop.id)
                      const isActive = shop.id === activeShopId
                      return (
                        <div key={shop.id} className={`rounded-lg p-3.5 border transition-colors ${isActive ? 'bg-orange-50 border-orange-200' : 'border-stone-100 hover:bg-stone-50'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-orange-500' : 'bg-stone-300'}`} />
                              <p className={`text-sm font-semibold truncate ${isActive ? 'text-orange-900' : 'text-stone-900'}`}>{shop.name}</p>
                            </div>
                            {isActive ? (
                              <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Active</span>
                            ) : (
                              <button onClick={() => switchShop(shop.id)}
                                className="shrink-0 text-[11px] font-semibold px-2 py-0.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
                                Switch
                              </button>
                            )}
                          </div>
                          {shopRevenue && (
                            <div className="flex items-center gap-3 mt-2 pl-4">
                              <span className="text-xs font-semibold text-stone-700">KES {Number(shopRevenue.revenue).toLocaleString('en-KE')}</span>
                              <span className="text-xs text-stone-400">{shopRevenue.orders} orders</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Revenue by shop (multi-shop) */}
              {isManagement && report?.shop_breakdown && report.shop_breakdown.length > 1 && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="px-5 py-3.5 border-b border-stone-100">
                    <h2 className="text-sm font-semibold text-stone-900">Revenue by shop (30d)</h2>
                  </div>
                  <div className="divide-y divide-stone-50">
                    {report.shop_breakdown.map((b) => {
                      const maxRev = Math.max(...report.shop_breakdown!.map((r) => r.revenue), 1)
                      const pct = Math.round((b.revenue / maxRev) * 100)
                      return (
                        <div key={b.shop_id} className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-stone-900 truncate">{b.shop_name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-stone-400">{b.orders} orders</span>
                              <span className="text-sm font-bold text-stone-900">KES {Number(b.revenue).toLocaleString('en-KE')}</span>
                            </div>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
