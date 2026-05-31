import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  Package, Plus, AlertCircle, ChevronRight, Clock,
  Trash2, Search, Pencil, X, Check, Printer, ShoppingCart,
  Banknote, UserCircle2, Calendar, CheckCircle2, User, Minus,
  Smartphone, RefreshCw,
} from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { InvoiceModal } from '../components/InvoiceModal'
import { DatePicker } from '../components/DatePicker'
import { Select } from '../components/Select'
import type { Service } from './ServicesPage'

interface OrderItem { id: string; service_name: string; quantity: number; unit_price: number }
interface Order {
  id: string; shop_id: string; customer_id: string; worker_id: string | null
  status: string; payment_status: string; source: string; notes: string | null; pickup_date: string | null
  delivery_date: string | null; total_amount: number; items: OrderItem[]; created_at: string; updated_at: string
}
interface TeamMember { user_id: string; name: string; role: string }
interface Customer { id: string; name: string; phone: string; email: string | null }
interface ItemRow { service_name: string; quantity: string; unit_price: string }
type OrderStatus = 'received' | 'washing' | 'ready' | 'delivered'

const STATUS_FLOW: OrderStatus[] = ['received', 'washing', 'ready', 'delivered']
const STATUS_ADVANCE_FLOW: OrderStatus[] = ['received', 'washing', 'ready', 'delivered']
const STATUS_LABEL: Record<OrderStatus, string> = { received: 'Received', washing: 'Washing', ready: 'Ready', delivered: 'Delivered' }
const STATUS_BADGE: Record<OrderStatus, string> = {
  received: 'bg-amber-50 text-amber-700 border border-amber-200',
  washing: 'bg-sky-50 text-sky-700 border border-sky-200',
  ready: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  delivered: 'bg-stone-100 text-stone-500 border border-stone-200',
}
const STATUS_TAB_ACTIVE: Record<OrderStatus, string> = {
  received: 'bg-amber-500 text-white', washing: 'bg-sky-500 text-white',
  ready: 'bg-emerald-500 text-white', delivered: 'bg-stone-600 text-white',
}

function nextStatus(current: string): OrderStatus | null {
  const idx = STATUS_ADVANCE_FLOW.indexOf(current as OrderStatus)
  if (idx === -1 || idx === STATUS_ADVANCE_FLOW.length - 1) return null
  return STATUS_ADVANCE_FLOW[idx + 1]
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function computeItemsTotal(items: ItemRow[]): number {
  return items.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_price) || 0), 0)
}
function itemRowsFromOrder(order: Order): ItemRow[] {
  return order.items.map((i) => ({ service_name: i.service_name, quantity: String(i.quantity), unit_price: String(i.unit_price) }))
}

const CATEGORY_COLOR: Record<string, string> = {
  washing: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  ironing: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  dry_cleaning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  general: 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200',
  delivery: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
}
const inputCls = 'w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-stone-900 placeholder:text-stone-400'

export function OrdersPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const activeShopId = useAuthStore((s) => s.activeShopId)

  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [catalog, setCatalog] = useState<Service[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<OrderStatus | null>(null)
  const [search, setSearch] = useState('')
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editPickupDate, setEditPickupDate] = useState('')
  const [editDeliveryDate, setEditDeliveryDate] = useState('')
  const [editItems, setEditItems] = useState<ItemRow[]>([])
  const [editManualTotal, setEditManualTotal] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [notes, setNotes] = useState('')
  const [pickupDate, setPickupDate] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [manualTotal, setManualTotal] = useState('')
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [walkInCreating, setWalkInCreating] = useState(false)

  const [payingOrder, setPayingOrder] = useState<Order | null>(null)
  const [payMethod, setPayMethod] = useState<'cash' | 'mpesa'>('cash')
  const [payAmount, setPayAmount] = useState('')
  const [payMpesaRef, setPayMpesaRef] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [stkReference, setStkReference] = useState<string | null>(null)
  const [stkChecking, setStkChecking] = useState(false)

  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null)
  const assignRef = useRef<HTMLDivElement>(null)

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin'

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const params = activeShopId ? { shop_id: activeShopId } : undefined
      const fetches: Promise<any>[] = [
        client.get<Order[]>('/orders', { params }),
        client.get<Customer[]>('/customers', { params }),
        client.get<Service[]>('/services', { params }),
      ]
      if (isOwnerOrAdmin) fetches.push(client.get<TeamMember[]>('/team'))
      const results = await Promise.all(fetches)
      setOrders(results[0].data); setCustomers(results[1].data); setCatalog(results[2].data)
      if (isOwnerOrAdmin && results[3]) setTeam(results[3].data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load orders')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [activeShopId])

  const customerMap: Record<string, Customer> = Object.fromEntries(customers.map((c) => [c.id, c]))
  const workerMap: Record<string, TeamMember> = Object.fromEntries(team.map((m) => [m.user_id, m]))

  const handleWalkIn = async () => {
    const existing = customers.find((c) => c.name.toLowerCase().includes('walk') || c.name.toLowerCase().includes('anonymous'))
    if (existing) { setCustomerId(existing.id); return }
    setWalkInCreating(true)
    try {
      const params = activeShopId ? { shop_id: activeShopId } : undefined
      const { data } = await client.post<Customer>('/customers', { name: 'Walk-in Customer', phone: '+254000000000', email: null, notes: 'Default walk-in' }, { params })
      setCustomers((p) => [data, ...p]); setCustomerId(data.id)
    } catch { /* user can still pick from dropdown */ } finally { setWalkInCreating(false) }
  }

  const addCatalogService = (svc: Service) => {
    setItemRows((p) => {
      const exists = p.findIndex((r) => r.service_name === svc.name)
      if (exists !== -1) return p.map((r, i) => i === exists ? { ...r, quantity: String(parseInt(r.quantity) + 1) } : r)
      return [...p, { service_name: svc.name, quantity: '1', unit_price: String(svc.price_per_unit) }]
    })
  }
  const removeCatalogService = (svcName: string) => {
    setItemRows((p) => {
      const idx = p.findIndex((r) => r.service_name === svcName)
      if (idx === -1) return p
      const qty = parseInt(p[idx].quantity)
      if (qty <= 1) return p.filter((_, i) => i !== idx)
      return p.map((r, i) => (i === idx ? { ...r, quantity: String(qty - 1) } : r))
    })
  }

  const addItemRow = () => setItemRows((p) => [...p, { service_name: '', quantity: '1', unit_price: '' }])
  const updateItem = (idx: number, f: keyof ItemRow, v: string) => setItemRows((p) => p.map((r, i) => (i === idx ? { ...r, [f]: v } : r)))
  const removeItem = (idx: number) => setItemRows((p) => p.filter((_, i) => i !== idx))

  const resetForm = () => { setCustomerId(''); setNotes(''); setPickupDate(''); setDeliveryDate(''); setManualTotal(''); setItemRows([]); setFormError(null) }
  const openPanel = () => { resetForm(); setShowPanel(true) }
  const closePanel = () => { setShowPanel(false); resetForm() }
  const hasItems = itemRows.length > 0

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null)
    if (!customerId) { setFormError('Please select a customer.'); return }
    if (hasItems && itemRows.some((r) => !r.service_name.trim() || !r.quantity || !r.unit_price)) { setFormError('Fill in all item fields.'); return }
    if (!hasItems && (!manualTotal || parseFloat(manualTotal) <= 0)) { setFormError('Enter a total amount or add items from the catalog.'); return }
    setSubmitting(true)
    try {
      const params = activeShopId ? { shop_id: activeShopId } : undefined
      const payload = hasItems
        ? { customer_id: customerId, notes: notes || null, pickup_date: pickupDate || null, delivery_date: deliveryDate || null, items: itemRows.map((r) => ({ service_name: r.service_name.trim(), quantity: parseInt(r.quantity), unit_price: parseFloat(r.unit_price) })) }
        : { customer_id: customerId, notes: notes || null, pickup_date: pickupDate || null, delivery_date: deliveryDate || null, total_amount: parseFloat(manualTotal) }
      const { data } = await client.post<Order>('/orders', payload, { params })
      setOrders((p) => [data, ...p]); closePanel()
    } catch (err: any) { setFormError(err.response?.data?.detail || 'Could not create order') } finally { setSubmitting(false) }
  }

  const startEdit = (order: Order) => {
    setEditingId(order.id); setEditNotes(order.notes ?? ''); setEditPickupDate(order.pickup_date ?? '')
    setEditDeliveryDate(order.delivery_date ?? ''); setEditItems(itemRowsFromOrder(order)); setEditManualTotal(String(order.total_amount)); setEditError(null)
  }
  const cancelEdit = () => { setEditingId(null); setEditError(null) }
  const addEditItem = () => setEditItems((p) => [...p, { service_name: '', quantity: '1', unit_price: '' }])
  const updateEditItem = (idx: number, f: keyof ItemRow, v: string) => setEditItems((p) => p.map((r, i) => (i === idx ? { ...r, [f]: v } : r)))
  const removeEditItem = (idx: number) => setEditItems((p) => p.filter((_, i) => i !== idx))

  const saveEdit = async (order: Order) => {
    setEditError(null)
    if (editItems.length > 0 && editItems.some((r) => !r.service_name.trim() || !r.quantity || !r.unit_price)) { setEditError('Fill in all item fields.'); return }
    setEditSaving(true)
    try {
      const payload = editItems.length > 0
        ? { notes: editNotes || null, pickup_date: editPickupDate || null, delivery_date: editDeliveryDate || null, items: editItems.map((r) => ({ service_name: r.service_name.trim(), quantity: parseInt(r.quantity), unit_price: parseFloat(r.unit_price) })) }
        : { notes: editNotes || null, pickup_date: editPickupDate || null, delivery_date: editDeliveryDate || null, total_amount: parseFloat(editManualTotal) || order.total_amount }
      const { data } = await client.put<Order>(`/orders/${order.id}`, payload)
      setOrders((p) => p.map((o) => (o.id === data.id ? data : o))); setEditingId(null)
    } catch (err: any) { setEditError(err.response?.data?.detail || 'Could not save changes') } finally { setEditSaving(false) }
  }

  const advance = async (order: Order) => {
    const next = nextStatus(order.status); if (!next) return
    setAdvancingId(order.id)
    try {
      const { data } = await client.patch<Order>(`/orders/${order.id}/status`, { status: next })
      setOrders((p) => p.map((o) => (o.id === data.id ? data : o)))
    } catch (err: any) { setError(err.response?.data?.detail || 'Could not update status') } finally { setAdvancingId(null) }
  }

  const deleteOrder = async (id: string) => {
    setDeletingId(id)
    try { await client.delete(`/orders/${id}`); setOrders((p) => p.filter((o) => o.id !== id)); setConfirmDeleteId(null) }
    catch (err: any) { setError(err.response?.data?.detail || 'Could not delete order') } finally { setDeletingId(null) }
  }

  const openPayModal = (order: Order) => {
    setPayingOrder(order); setPayMethod('cash'); setPayAmount(String(order.total_amount)); setPayMpesaRef(''); setPayNotes(''); setPayError(null); setStkReference(null)
  }

  const submitPayment = async (e: FormEvent) => {
    e.preventDefault(); if (!payingOrder) return
    setPaySubmitting(true); setPayError(null)
    try {
      await client.post('/payments', { order_id: payingOrder.id, amount: parseFloat(payAmount), method: payMethod, mpesa_ref: payMethod === 'mpesa' && payMpesaRef ? payMpesaRef : null, notes: payNotes || null })
      setOrders((p) => p.map((o) => o.id === payingOrder.id ? { ...o, payment_status: 'paid' } : o)); setPayingOrder(null)
    } catch (err: any) { setPayError(err.response?.data?.detail || 'Payment failed') } finally { setPaySubmitting(false) }
  }

  const sendStkPush = async () => {
    if (!payingOrder) return
    const customer = customerMap[payingOrder.customer_id]
    if (!customer?.phone) { setPayError('Customer has no phone number on file'); return }
    setPaySubmitting(true); setPayError(null); setStkReference(null)
    try {
      const { data } = await client.post<{ reference: string; transaction_id: string; message: string }>('/payments/stk-push', { order_id: payingOrder.id, phone: customer.phone })
      setStkReference(data.reference)
      setPayMpesaRef('STK sent \u2014 awaiting confirmation')
    }
    catch (err: any) { setPayError(err.response?.data?.detail || 'STK Push failed') } finally { setPaySubmitting(false) }
  }

  const checkStkStatus = async () => {
    if (!stkReference || !payingOrder) return
    setStkChecking(true); setPayError(null)
    try {
      const { data } = await client.get<{ status: string; mpesa_receipt: string | null }>(`/payments/status/${stkReference}`)
      if (data.status === 'COMPLETED') {
        setOrders((p) => p.map((o) => o.id === payingOrder.id ? { ...o, payment_status: 'paid' } : o))
        setPayingOrder(null)
      } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
        setPayError(`Payment ${data.status.toLowerCase()} \u2014 customer may have cancelled. Try again.`)
        setStkReference(null); setPayMpesaRef('')
      } else {
        setPayError(`Still ${data.status.toLowerCase()} \u2014 customer hasn\u2019t confirmed yet`)
      }
    } catch (err: any) { setPayError(err.response?.data?.detail || 'Could not check status') } finally { setStkChecking(false) }
  }

  const assignWorker = async (orderId: string, workerId: string | null) => {
    try { const { data } = await client.patch<Order>(`/orders/${orderId}/assign`, { worker_id: workerId }); setOrders((p) => p.map((o) => o.id === data.id ? data : o)) }
    catch (err: any) { setError(err.response?.data?.detail || 'Could not assign worker') } finally { setAssigningOrderId(null) }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssigningOrderId(null) }
    if (assigningOrderId) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [assigningOrderId])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && showPanel) closePanel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [showPanel])

  const shopName = shops.find((s) => s.id === activeShopId)?.name ?? tenant?.name ?? 'All shops'
  const visibleOrders = orders
    .filter((o) => !filterStatus || o.status === filterStatus)
    .filter((o) => { if (!search.trim()) return true; const cust = customerMap[o.customer_id]; return cust?.name.toLowerCase().includes(search.toLowerCase()) || cust?.phone.includes(search) })

  const catalogByCategory: Record<string, Service[]> = {}
  for (const svc of catalog) { if (!catalogByCategory[svc.category]) catalogByCategory[svc.category] = []; catalogByCategory[svc.category].push(svc) }

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Orders</h1>
        <p className="text-xs text-stone-400">{shopName}</p>
      </div>
      {isOwnerOrAdmin && (
        <button onClick={openPanel} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New order
        </button>
      )}
    </div>
  )

  return (
    <AppShell orgName={tenant?.name ?? 'Organization'} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {receiptOrder && (
        <InvoiceModal order={receiptOrder} customer={customerMap[receiptOrder.customer_id]} shopName={shopName} tenantName={tenant?.name ?? 'Laundry'} onClose={() => setReceiptOrder(null)} />
      )}

      {/* Payment modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-base font-semibold text-stone-900">Record payment</h3><p className="text-xs text-stone-400 mt-0.5">{customerMap[payingOrder.customer_id]?.name ?? 'Order'}</p></div>
              <button onClick={() => setPayingOrder(null)} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitPayment} className="space-y-4">
              <div className="flex gap-2">
                {(['cash', 'mpesa'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${payMethod === m ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                    {m === 'cash' ? '\u{1F4B5} Cash' : '\u{1F4F1} M-Pesa'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Amount (KES)</label>
                <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-stone-900" />
              </div>
              {payMethod === 'mpesa' && (
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">M-Pesa reference (optional)</label>
                  <input value={payMpesaRef} onChange={(e) => setPayMpesaRef(e.target.value)} placeholder="e.g. QJK1234567" className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-stone-900 placeholder:text-stone-400" />
                  <button type="button" onClick={sendStkPush} disabled={paySubmitting} className="mt-2 w-full border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {paySubmitting
                      ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" /> Sending…</>
                      : <><Smartphone className="w-4 h-4" /> Send M-Pesa prompt to customer</>}
                  </button>
                  {stkReference && (
                    <button type="button" onClick={checkStkStatus} disabled={stkChecking} className="mt-1.5 w-full border border-sky-400 text-sky-700 hover:bg-sky-50 disabled:opacity-60 text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                      {stkChecking
                        ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" /> Checking…</>
                        : <><RefreshCw className="w-4 h-4" /> Customer paid? Check status</>}
                    </button>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Notes (optional)</label>
                <input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="e.g. Partial payment" className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-stone-900 placeholder:text-stone-400" />
              </div>
              {payError && <p className="text-xs text-red-600">{payError}</p>}
              <button type="submit" disabled={paySubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                {paySubmitting ? 'Recording\u2026' : 'Mark as paid'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* \u2500\u2500 POS Slide Panel \u2500\u2500 */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-[480px] bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950 shrink-0">
              <div><h2 className="text-base font-semibold text-white">New order</h2><p className="text-xs text-stone-400 mt-0.5">{shopName}</p></div>
              <button onClick={closePanel} className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <form id="pos-form" onSubmit={onSubmit}>

                {/* Customer */}
                <div className="px-5 py-4 border-b border-stone-100">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Customer</p>
                  <button type="button" onClick={handleWalkIn} disabled={walkInCreating}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all mb-3 ${selectedCustomer?.name.toLowerCase().includes('walk') ? 'border-orange-400 bg-orange-50' : 'border-dashed border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'}`}>
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-stone-500" /></div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-stone-700 leading-tight">{walkInCreating ? 'Adding\u2026' : 'Walk-in customer'}</p>
                      <p className="text-[11px] text-stone-400">Quick select — no registration needed</p>
                    </div>
                    {selectedCustomer?.name.toLowerCase().includes('walk') && <Check className="w-4 h-4 text-orange-500 ml-auto shrink-0" />}
                  </button>
                  <Select value={customerId} onChange={setCustomerId} placeholder="Or search existing customer…" options={customers.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` }))} />
                  {selectedCustomer && !selectedCustomer.name.toLowerCase().includes('walk') && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold shrink-0">{selectedCustomer.name[0]?.toUpperCase()}</div>
                      <div><p className="text-xs font-semibold text-stone-800">{selectedCustomer.name}</p><p className="text-[11px] text-stone-400">{selectedCustomer.phone}</p></div>
                    </div>
                  )}
                </div>

                {/* Catalog */}
                {catalog.length > 0 && (
                  <div className="px-5 py-4 border-b border-stone-100">
                    <div className="flex items-center gap-2 mb-3"><ShoppingCart className="w-3.5 h-3.5 text-stone-400" /><p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Tap to add services</p></div>
                    <div className="space-y-3">
                      {Object.entries(catalogByCategory).map(([cat, svcs]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">{cat.replace('_', ' ')}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {svcs.map((svc) => {
                              const inCart = itemRows.find((r) => r.service_name === svc.name)
                              const qty = inCart ? parseInt(inCart.quantity) : 0
                              return (
                                <div key={svc.id} className={`flex items-center rounded-xl overflow-hidden border transition-all ${inCart ? 'border-orange-400' : 'border-transparent'}`}>
                                  <button type="button" onClick={() => addCatalogService(svc)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors ${inCart ? 'bg-orange-500 text-white' : `${CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.general} border`}`}>
                                    {svc.name}
                                    <span className={`text-[10px] font-semibold ${inCart ? 'text-orange-100' : 'opacity-60'}`}>{Number(svc.price_per_unit).toLocaleString()}</span>
                                    {inCart && <span className="bg-white/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{qty}</span>}
                                  </button>
                                  {inCart && (
                                    <button type="button" onClick={() => removeCatalogService(svc.name)} className="bg-orange-600 hover:bg-orange-700 text-white px-1.5 py-1.5 transition-colors h-full"><Minus className="w-3 h-3" /></button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="px-5 py-4 border-b border-stone-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Order items</p>
                    <button type="button" onClick={addItemRow} className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold"><Plus className="w-3 h-3" /> Add custom line</button>
                  </div>
                  {hasItems ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-1">
                        <span className="col-span-6 text-[10px] font-semibold text-stone-400 uppercase">Service</span>
                        <span className="col-span-2 text-[10px] font-semibold text-stone-400 uppercase">Qty</span>
                        <span className="col-span-3 text-[10px] font-semibold text-stone-400 uppercase">KES</span>
                      </div>
                      {itemRows.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <input className={`col-span-6 ${inputCls}`} placeholder="Service name" value={row.service_name} onChange={(e) => updateItem(idx, 'service_name', e.target.value)} />
                          <input className={`col-span-2 ${inputCls}`} type="number" min="1" value={row.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                          <input className={`col-span-3 ${inputCls}`} type="number" min="0" step="0.01" value={row.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                          <button type="button" onClick={() => removeItem(idx)} className="col-span-1 flex items-center justify-center text-stone-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5">Manual total (KES) <span className="font-normal text-stone-400">— or tap catalog items above</span></label>
                      <input type="number" min="0" step="0.01" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                  )}
                </div>

                {/* Dates & Notes */}
                <div className="px-5 py-4 border-b border-stone-100">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Dates &amp; Notes</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5"><Calendar className="inline w-3 h-3 mr-1 text-stone-400" />Pickup</label>
                      <DatePicker value={pickupDate} onChange={setPickupDate} placeholder="Pickup date" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1.5"><Calendar className="inline w-3 h-3 mr-1 text-sky-400" />Delivery</label>
                      <DatePicker value={deliveryDate} onChange={setDeliveryDate} placeholder="Delivery date" />
                    </div>
                  </div>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (e.g. handle with care…)" className={inputCls} />
                </div>

                {formError && (
                  <div className="mx-5 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                  </div>
                )}
              </form>
            </div>

            {/* Sticky footer */}
            <div className="px-5 py-4 border-t border-stone-100 bg-white shrink-0">
              {hasItems && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-stone-500">{itemRows.length} item{itemRows.length !== 1 ? 's' : ''}</span>
                  <span className="text-lg font-bold text-stone-900">KES {computeItemsTotal(itemRows).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <button type="submit" form="pos-form" disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {submitting ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create order</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Status stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {STATUS_FLOW.map((s) => {
          const count = orders.filter((o) => o.status === s).length
          return (
            <button key={s} onClick={() => setFilterStatus((p) => (p === s ? null : s))}
              className={`bg-white rounded-xl border px-4 py-3 shadow-sm text-left transition-all hover:border-stone-300 ${filterStatus === s ? 'ring-2 ring-orange-400 border-orange-300' : 'border-stone-200'}`}>
              <p className="text-xl font-bold text-stone-900 tabular-nums">{count}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[s]}`}>{STATUS_LABEL[s]}</span>
            </button>
          )
        })}
      </div>

      {/* Search + filter tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer name…"
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-stone-900 placeholder:text-stone-400" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterStatus(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === null ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            All ({orders.length})
          </button>
          {STATUS_FLOW.map((s) => (
            <button key={s} onClick={() => setFilterStatus((p) => (p === s ? null : s))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterStatus === s ? STATUS_TAB_ACTIVE[s] : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
              {STATUS_LABEL[s]} ({orders.filter((o) => o.status === s).length})
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between rounded-t-xl overflow-hidden">
          <p className="text-sm font-semibold text-stone-900">{filterStatus ? STATUS_LABEL[filterStatus] : 'All'} orders</p>
          <span className="text-xs text-stone-400">{visibleOrders.length} shown</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" /></div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-400">{search ? 'No orders match your search' : filterStatus ? `No ${STATUS_LABEL[filterStatus].toLowerCase()} orders` : 'No orders yet'}</p>
            {!filterStatus && !search && isOwnerOrAdmin && <button onClick={openPanel} className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">Create the first order →</button>}
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {visibleOrders.map((order) => {
              const customer = customerMap[order.customer_id]
              const next = nextStatus(order.status)
              const advancing = advancingId === order.id
              const isEditing = editingId === order.id
              const badge = STATUS_BADGE[order.status as OrderStatus] ?? STATUS_BADGE.received
              const statusLabel = STATUS_LABEL[order.status as OrderStatus] ?? order.status

              return (
                <div key={order.id} className="px-5 py-4 hover:bg-stone-50 transition-colors">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-stone-900">{customer?.name ?? 'Unknown'}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>{statusLabel}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Notes</label>
                        <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes" className={inputCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-stone-600 mb-1">Pickup date</label><DatePicker value={editPickupDate} onChange={setEditPickupDate} placeholder="Pickup date" /></div>
                        <div><label className="block text-xs font-medium text-stone-600 mb-1">Delivery date</label><DatePicker value={editDeliveryDate} onChange={setEditDeliveryDate} placeholder="Delivery date" /></div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-stone-600">Items</label>
                          <button type="button" onClick={addEditItem} className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold"><Plus className="w-3 h-3" /> Add</button>
                        </div>
                        {editItems.length > 0 ? (
                          <div className="space-y-2">
                            {editItems.map((row, idx) => (
                              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                <input className={`col-span-6 ${inputCls}`} value={row.service_name} onChange={(e) => updateEditItem(idx, 'service_name', e.target.value)} />
                                <input className={`col-span-2 ${inputCls}`} type="number" min="1" value={row.quantity} onChange={(e) => updateEditItem(idx, 'quantity', e.target.value)} />
                                <input className={`col-span-3 ${inputCls}`} type="number" min="0" step="0.01" value={row.unit_price} onChange={(e) => updateEditItem(idx, 'unit_price', e.target.value)} />
                                <button type="button" onClick={() => removeEditItem(idx)} className="col-span-1 flex items-center justify-center text-stone-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            ))}
                            <div className="flex justify-end pt-1 border-t border-stone-100">
                              <span className="text-xs text-stone-500 mr-2">Total:</span>
                              <span className="text-sm font-bold text-stone-900">KES {computeItemsTotal(editItems).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        ) : (
                          <input type="number" min="0" step="0.01" value={editManualTotal} onChange={(e) => setEditManualTotal(e.target.value)} className={inputCls} placeholder="Total amount" />
                        )}
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(order)} disabled={editSaving} className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                          <Check className="w-3.5 h-3.5" /> {editSaving ? 'Saving\u2026' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} className="text-xs text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100">Cancel</button>
                      </div>
                    </div>
                  ) : confirmDeleteId === order.id ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm text-stone-700">Delete this order?</p>
                      <button onClick={() => deleteOrder(order.id)} disabled={deletingId === order.id} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg">
                        {deletingId === order.id ? 'Deleting\u2026' : 'Yes, delete'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100">Cancel</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-stone-900">{customer?.name ?? 'Unknown'}</p>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge}`}>{statusLabel}</span>
                            {order.payment_status === 'paid' && (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">Paid</span>
                            )}
                          </div>
                          {customer?.phone && <p className="text-xs text-stone-400 mt-0.5">{customer.phone}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-stone-900 tabular-nums">KES {Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{formatDate(order.created_at)}</p>
                        </div>
                      </div>

                      {order.items?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {order.items.map((item, n) => (
                            <span key={n} className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 rounded-lg px-2 py-0.5 text-[11px] font-medium">
                              {item.service_name} <span className="text-stone-400">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {(order.notes || order.pickup_date || order.delivery_date || (order.worker_id && workerMap[order.worker_id])) && (
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          {order.pickup_date && <span className="flex items-center gap-1 text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-2 py-0.5"><Calendar className="w-3 h-3 text-stone-400" />Pickup {order.pickup_date}</span>}
                          {order.delivery_date && <span className="flex items-center gap-1 text-[11px] text-sky-600 bg-sky-50 border border-sky-200 rounded-lg px-2 py-0.5"><Calendar className="w-3 h-3" />Deliver {order.delivery_date}</span>}
                          {order.worker_id && workerMap[order.worker_id] && <span className="flex items-center gap-1 text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-0.5"><UserCircle2 className="w-3 h-3" />{workerMap[order.worker_id].name}</span>}
                          {order.notes && <span className="text-[11px] text-stone-400 italic truncate max-w-[200px]">{order.notes}</span>}
                        </div>
                      )}

                      <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-stone-100">
                        <button onClick={() => setReceiptOrder(order)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors" title="Print receipt"><Printer className="w-3.5 h-3.5" /></button>
                        {isOwnerOrAdmin && (
                          <>
                            <button onClick={() => startEdit(order)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setConfirmDeleteId(order.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            {team.length > 0 && (
                              <div className="relative" ref={assigningOrderId === order.id ? assignRef : undefined}>
                                <button onClick={() => setAssigningOrderId((p) => (p === order.id ? null : order.id))}
                                  className={`p-1.5 rounded-lg transition-colors ${order.worker_id ? 'text-violet-600 bg-violet-50 hover:bg-violet-100' : 'text-stone-400 hover:text-violet-600 hover:bg-violet-50'}`} title="Assign worker">
                                  <UserCircle2 className="w-3.5 h-3.5" />
                                </button>
                                {assigningOrderId === order.id && (
                                  <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-stone-100"><p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Assign to</p></div>
                                    {order.worker_id && <button onClick={() => assignWorker(order.id, null)} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">✕ Unassign</button>}
                                    {team.filter((m) => m.role !== 'owner').map((m) => (
                                      <button key={m.user_id} onClick={() => assignWorker(order.id, m.user_id)}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${order.worker_id === m.user_id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-stone-700 hover:bg-stone-50'}`}>
                                        {m.name} <span className="text-stone-400 font-normal">({m.role})</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {order.payment_status !== 'paid' && (
                              <button onClick={() => openPayModal(order)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors">
                                <Banknote className="w-3 h-3" /> Pay
                              </button>
                            )}
                          </>
                        )}
                        {next && (
                          <button onClick={() => advance(order)} disabled={advancing}
                            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            {advancing ? <span className="w-3 h-3 rounded-full border border-orange-400 border-t-transparent animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                            {STATUS_LABEL[next]}
                          </button>
                        )}
                      </div>
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
