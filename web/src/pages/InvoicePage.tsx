import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Share2, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import client from '../api/client'

interface OrderItem {
  service_name: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  customer_id: string
  status: string
  source: string
  notes: string | null
  pickup_date: string | null
  delivery_date: string | null
  total_amount: number
  items: OrderItem[]
  created_at: string
}

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface Payment {
  status: string
  method: string
  mpesa_ref: string | null
  amount: number
}

interface Shop {
  id: string
  name: string
  phone: string | null
  code: string
}

export function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!orderId) return
    Promise.all([
      client.get<Order>(`/orders/${orderId}`),
      client.get<Payment[]>(`/payments/order/${orderId}`),
      client.get<Shop[]>('/shops'),
    ]).then(([orderRes, payRes, shopRes]) => {
      const o = orderRes.data
      setOrder(o)
      setPayment(payRes.data[0] ?? null)
      setShop(shopRes.data[0] ?? null)
      return client.get<Customer>(`/customers/${o.customer_id}`)
    }).then((custRes) => {
      setCustomer(custRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100">
        <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100">
        <p className="text-sm text-red-600">Invoice not found.</p>
      </div>
    )
  }

  const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`
  const issuedDate = new Date(order.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })
  const isPaid = payment?.status === 'paid' || payment?.status === 'completed'
  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const shopInitial = (shop?.name ?? 'L')[0].toUpperCase()

  const handlePrint = () => window.print()

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-stone-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary border border-stone-200 rounded-lg hover:bg-subtle transition-colors">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice body */}
      <div className="invoice-page min-h-screen bg-stone-100 pt-20 pb-12 print:bg-white print:pt-0 print:pb-0">
        <div className="invoice-paper max-w-3xl mx-auto bg-white shadow-xl print:shadow-none">

          {/* Header stripe */}
          <div className="invoice-header bg-stone-950 text-white px-10 py-8 flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-500 flex items-center justify-center text-white text-2xl font-black select-none shrink-0">
                {shopInitial}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">{shop?.name ?? 'Laundry Shop'}</h1>
                <p className="text-tertiary text-sm mt-0.5">Professional Laundry &amp; Dry Cleaning</p>
                {shop?.phone && <p className="text-tertiary text-xs mt-1">📞 {shop.phone}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-orange-400 text-3xl font-black tracking-widest uppercase">Invoice</p>
              <p className="text-disabled font-mono text-sm mt-1">{invoiceNumber}</p>
              <p className="text-tertiary text-xs mt-0.5">{issuedDate}</p>
              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isPaid ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {isPaid ? 'PAID' : 'PENDING'}
              </div>
            </div>
          </div>

          <div className="px-10 py-8">
            {/* Bill to */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-2">Billed To</p>
                <div className="border border-stone-200 rounded-xl p-4 bg-subtle">
                  <p className="font-bold text-primary text-base">{customer?.name ?? '—'}</p>
                  {customer?.phone && <p className="text-sm text-secondary mt-0.5">{customer.phone}</p>}
                  {customer?.email && <p className="text-sm text-secondary">{customer.email}</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-2">Order Details</p>
                <div className="border border-stone-200 rounded-xl p-4 bg-subtle space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Order #</span>
                    <span className="font-mono font-semibold text-primary">{order.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-secondary">Status</span>
                    <span className="font-semibold text-primary capitalize">{order.status}</span>
                  </div>
                  {order.pickup_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Pickup</span>
                      <span className="font-semibold text-primary">{order.pickup_date}</span>
                    </div>
                  )}
                  {order.delivery_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary">Delivery</span>
                      <span className="font-semibold text-primary">{order.delivery_date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">Services</p>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-subtle border-b border-stone-200">
                      <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-tertiary">#</th>
                      <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-wider text-tertiary">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-black uppercase tracking-wider text-tertiary">Qty</th>
                      <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider text-tertiary">Unit Price</th>
                      <th className="text-right px-4 py-3 text-xs font-black uppercase tracking-wider text-tertiary">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {order.items.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-subtle/50'}>
                        <td className="px-4 py-3 text-tertiary text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-primary">{item.service_name}</td>
                        <td className="px-4 py-3 text-center text-secondary">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-secondary font-mono">
                          KES {Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-primary font-mono">
                          KES {Number(item.unit_price * item.quantity).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-stone-200">
                    <tr className="bg-subtle">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-sm text-secondary font-semibold">Subtotal</td>
                      <td className="px-4 py-2.5 text-right font-mono text-secondary">
                        KES {Number(subtotal).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="bg-orange-50">
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-black uppercase tracking-wide text-primary">Total</td>
                      <td className="px-4 py-3 text-right font-black font-mono text-orange-600 text-base">
                        KES {Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment info */}
            <div className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3">Payment Information</p>
              <div className={`border rounded-xl p-4 flex flex-wrap items-center gap-x-8 gap-y-2 ${isPaid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center gap-2">
                  {isPaid
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <AlertCircle className="w-5 h-5 text-amber-500" />}
                  <div>
                    <p className="text-xs text-secondary">Status</p>
                    <p className={`font-bold text-sm uppercase ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {payment?.status ?? 'Unpaid'}
                    </p>
                  </div>
                </div>
                {payment?.method && (
                  <div>
                    <p className="text-xs text-secondary">Method</p>
                    <p className="font-bold text-sm text-primary uppercase">{payment.method}</p>
                  </div>
                )}
                {payment?.mpesa_ref && (
                  <div>
                    <p className="text-xs text-secondary">M-Pesa Ref</p>
                    <p className="font-bold text-sm font-mono text-primary">{payment.mpesa_ref}</p>
                  </div>
                )}
                {payment?.amount != null && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-secondary">Amount Paid</p>
                    <p className="font-black text-lg text-primary">
                      KES {Number(payment.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mb-8 border border-stone-200 rounded-xl p-4 bg-subtle">
                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-1">Notes</p>
                <p className="text-sm text-secondary italic">{order.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-theme pt-6 text-center">
              <p className="text-base font-semibold text-primary">Thank you for your business! 🙏</p>
              <p className="text-sm text-tertiary mt-1">We look forward to serving you again.</p>
              <p className="text-xs text-disabled mt-4">Powered by LaundryOS · {shop?.name}</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print, .print\\:hidden { display: none !important; }
          @page { size: A4; margin: 0; }
          body { background: white; }
          .invoice-page { background: white !important; padding: 0 !important; }
          .invoice-paper { max-width: 100% !important; box-shadow: none !important; }
        }
      `}</style>
    </>
  )
}
