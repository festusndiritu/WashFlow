import { useEffect, useState } from 'react'
import {
  Building2, LayoutDashboard, Users, Package, TrendingUp,
  ChevronLeft, ChevronRight, AlertCircle, Trash2, ShieldOff, ShieldCheck, MoreHorizontal,
} from 'lucide-react'
import client from '../api/client'
import { AppShell, NavItem } from '../components/AppShell'
import { PlatformNav } from '../components/PlatformNav'

interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  created_at: string
  shops_count: number
  users_count: number
  orders_count: number
  revenue: number
}

const PLAN_BADGE: Record<string, string> = {
  free:       'bg-stone-100 text-stone-600 border border-stone-200',
  starter:    'bg-blue-50 text-blue-700 border border-blue-200',
  pro:        'bg-violet-50 text-violet-700 border border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const PLANS = ['free', 'starter', 'pro', 'enterprise']

export function PlatformTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const PAGE_SIZE = 20

  const load = (p = page) => {
    setLoading(true)
    client.get<{ items: Tenant[]; total: number }>(`/platform/tenants?page=${p}&page_size=${PAGE_SIZE}`)
      .then(r => { setTenants(r.data.items); setTotal(r.data.total) })
      .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const toggleStatus = async (t: Tenant) => {
    const next = t.status === 'active' ? 'suspended' : 'active'
    const { data } = await client.patch<Tenant>(`/platform/tenants/${t.id}/status`, { status: next })
    setTenants(prev => prev.map(x => x.id === t.id ? data : x))
    setActionId(null)
  }

  const setPlan = async (t: Tenant, plan: string) => {
    const { data } = await client.patch<Tenant>(`/platform/tenants/${t.id}/plan`, { plan })
    setTenants(prev => prev.map(x => x.id === t.id ? data : x))
    setActionId(null)
  }

  const deleteTenant = async (id: string) => {
    await client.delete(`/platform/tenants/${id}`)
    setConfirmDelete(null)
    load()
  }

  const pages = Math.ceil(total / PAGE_SIZE)

  const sidebarNav = <PlatformNav />

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={sidebarNav}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Organizations</h1>
          <p className="text-sm text-stone-500">{total} total</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">No organizations yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Shops</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Users</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden lg:table-cell">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden lg:table-cell">Revenue</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {tenants.map(t => (
                <tr key={t.id} className={`hover:bg-stone-50 transition-colors ${t.status === 'suspended' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0 select-none">
                        {t.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{t.name}</p>
                        <p className="text-xs text-stone-400 font-mono">{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <select
                      value={t.plan}
                      onChange={e => setPlan(t, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${PLAN_BADGE[t.plan] ?? PLAN_BADGE.free}`}
                    >
                      {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums hidden md:table-cell">{t.shops_count}</td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums hidden md:table-cell">{t.users_count}</td>
                  <td className="px-4 py-3 text-right text-stone-600 tabular-nums hidden lg:table-cell">{t.orders_count}</td>
                  <td className="px-4 py-3 text-right font-medium text-stone-900 tabular-nums hidden lg:table-cell">
                    KES {t.revenue.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full block ${t.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {t.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right relative">
                    {confirmDelete === t.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-stone-500">Delete?</span>
                        <button onClick={() => deleteTenant(t.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-stone-400 hover:text-stone-600">No</button>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <button onClick={() => setActionId(actionId === t.id ? null : t.id)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionId === t.id && (
                          <div className="absolute right-0 top-8 z-20 bg-white border border-stone-200 rounded-xl shadow-lg py-1 w-44 text-sm">
                            <button onClick={() => toggleStatus(t)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 text-stone-700">
                              {t.status === 'active'
                                ? <><ShieldOff className="w-3.5 h-3.5 text-amber-500" /> Suspend</>
                                : <><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Activate</>}
                            </button>
                            <button onClick={() => { setConfirmDelete(t.id); setActionId(null) }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600">
                              <Trash2 className="w-3.5 h-3.5" /> Delete org
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-stone-500">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {actionId && <div className="fixed inset-0 z-10" onClick={() => setActionId(null)} />}
    </AppShell>
  )
}
