import { FormEvent, useEffect, useState } from 'react'
import {
  Plus, AlertCircle, UserCheck, Phone, Mail, Search,
  Trash2, ChevronDown, ChevronRight, X, Receipt
} from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Modal } from '../components/Modal'

interface Customer {
  id: string
  shop_id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  created_at: string
}

interface OrderItem {
  id: string
  service_name: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  status: string
  notes: string | null
  total_amount: number
  items: OrderItem[]
  created_at: string
}

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-amber-50 text-amber-700 border border-amber-200',
  washing:  'bg-sky-50 text-sky-700 border border-sky-200',
  ready:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  delivered:'bg-stone-100 text-stone-500 border border-stone-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-stone-900 placeholder:text-stone-400'

export function CustomersPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const activeShopId = useAuthStore((s) => s.activeShopId)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Expand / orders
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ordersCache, setOrdersCache] = useState<Record<string, Order[]>>({})
  const [ordersLoading, setOrdersLoading] = useState<string | null>(null)

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = activeShopId ? { shop_id: activeShopId } : undefined
      const { data } = await client.get<Customer[]>('/customers', { params })
      setCustomers(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [activeShopId])

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (ordersCache[id]) return
    setOrdersLoading(id)
    try {
      const { data } = await client.get<Order[]>(`/customers/${id}/orders`)
      setOrdersCache((p) => ({ ...p, [id]: data }))
    } catch {
      setOrdersCache((p) => ({ ...p, [id]: [] }))
    } finally {
      setOrdersLoading(null)
    }
  }

  const deleteCustomer = async (id: string) => {
    setDeletingId(id)
    try {
      await client.delete(`/customers/${id}`)
      setCustomers((p) => p.filter((c) => c.id !== id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not delete customer')
    } finally {
      setDeletingId(null)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const params = activeShopId ? { shop_id: activeShopId } : undefined
      const { data } = await client.post<Customer>('/customers', { name, phone, email: email || null, notes: notes || null }, { params })
      setCustomers((prev) => [data, ...prev])
      setName(''); setPhone(''); setEmail(''); setNotes('')
      setShowForm(false)
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Could not create customer')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? '').toLowerCase().includes(q)
  })

  const shopName = shops.find((s) => s.id === activeShopId)?.name ?? tenant?.name ?? 'All shops'
  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Customers</h1>
        <p className="text-xs text-stone-400">{shopName}</p>
      </div>
      <button onClick={() => setShowForm(true)}
        className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors">
        <Plus className="w-4 h-4" /> New customer
      </button>
    </div>
  )

  return (
    <AppShell orgName={tenant?.name ?? 'Organization'} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null) }} title="New customer" subtitle="Add a customer to this shop">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Phone *</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+254 7XX XXX XXX" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          </div>
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{formError}
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> {submitting ? 'Saving…' : 'Add customer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 hover:text-stone-700 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone or email…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-stone-900 placeholder:text-stone-400" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900">All customers</p>
          <span className="text-xs text-stone-400">{filtered.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">{search ? 'No customers match your search' : 'No customers yet'}</p>
            {!search && <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">Add the first customer →</button>}
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {filtered.map((c) => {
              const isExpanded = expandedId === c.id
              const orders = ordersCache[c.id] ?? []
              const isLoadingOrders = ordersLoading === c.id
              const isConfirmDelete = confirmDeleteId === c.id
              const isDeleting = deletingId === c.id

              return (
                <div key={c.id}>
                  {isConfirmDelete ? (
                    <div className="px-5 py-4 flex items-center gap-3 flex-wrap bg-red-50">
                      <p className="text-sm text-stone-700">Delete <strong>{c.name}</strong> and all their orders?</p>
                      <button onClick={() => deleteCustomer(c.id)} disabled={isDeleting}
                        className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
                        {isDeleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <div className="px-5 py-3.5 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <button onClick={() => toggleExpand(c.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left group">
                          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0 select-none">
                            {c.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate group-hover:text-orange-600 transition-colors">{c.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-stone-400"><Phone className="w-3 h-3" />{c.phone}</span>
                              {c.email && <span className="flex items-center gap-1 text-xs text-stone-400 truncate"><Mail className="w-3 h-3" />{c.email}</span>}
                              <span className="text-xs text-stone-300">{formatDate(c.created_at)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 text-stone-300 ml-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        </button>
                        {(user?.role === 'owner' || user?.role === 'admin') && (
                          <button onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Delete customer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 ml-11">
                          {isLoadingOrders ? (
                            <div className="flex items-center gap-2 text-xs text-stone-400">
                              <div className="w-3.5 h-3.5 rounded-full border border-stone-200 border-t-orange-500 animate-spin" /> Loading orders…
                            </div>
                          ) : orders.length === 0 ? (
                            <p className="text-xs text-stone-400">No orders for this customer.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-stone-500 mb-1">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
                              {orders.map((o) => (
                                <div key={o.id} className="bg-stone-50 rounded-lg px-3 py-2.5 border border-stone-100">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[o.status] ?? STATUS_BADGE.received}`}>{o.status}</span>
                                    <span className="text-xs font-bold text-stone-700">KES {Number(o.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                                    <span className="text-xs text-stone-400">{formatDateTime(o.created_at)}</span>
                                  </div>
                                  {o.items?.length > 0 && (
                                    <div className="flex items-start gap-1">
                                      <Receipt className="w-3 h-3 text-stone-300 mt-0.5 shrink-0" />
                                      <p className="text-xs text-stone-500">{o.items.map((i) => `${i.service_name} ×${i.quantity}`).join(', ')}</p>
                                    </div>
                                  )}
                                  {o.notes && <p className="text-xs text-stone-400 mt-1">{o.notes}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
