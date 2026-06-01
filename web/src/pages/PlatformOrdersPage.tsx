import { useEffect, useRef, useState } from 'react'
import { Package, Search, ChevronLeft, ChevronRight, AlertCircle, Clock } from 'lucide-react'
import client from '../api/client'
import { AppShell } from '../components/AppShell'
import { PlatformNav } from '../components/PlatformNav'

interface OrderRow {
  id: string
  tenant_id: string
  tenant_name: string
  status: string
  payment_status: string
  total_amount: number
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  received:  'bg-blue-50 text-blue-700',
  washing:   'bg-amber-50 text-amber-700',
  ready:     'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PlatformOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PAGE_SIZE = 30

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
  }, [search])

  useEffect(() => {
    setLoading(true)
    client.get<{ items: OrderRow[]; total: number }>(`/platform/orders?page=${page}&page_size=${PAGE_SIZE}&q=${encodeURIComponent(debouncedSearch)}`)
      .then(r => { setOrders(r.data.items); setTotal(r.data.total) })
      .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={<PlatformNav active="orders" />}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">All Orders</h1>
          <p className="text-sm text-stone-500">{total} total across all organizations</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order ID…"
            className="pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">No orders found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Organization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-stone-600">{o.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-stone-700 font-medium">{o.tenant_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_BADGE[o.status] ?? 'bg-stone-100 text-stone-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {o.payment_status === 'paid'
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">Paid</span>
                      : <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-500">Unpaid</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-900 tabular-nums">
                    KES {o.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 text-xs hidden lg:table-cell">
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />{formatDate(o.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
    </AppShell>
  )
}
