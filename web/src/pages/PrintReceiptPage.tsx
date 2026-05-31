import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
  name: string
  phone: string | null
}

export function PrintReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)

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
    }).catch(() => {
      // silently ignore partial failures
    }).finally(() => {
      setLoading(false)
    })
  }, [orderId])

  useEffect(() => {
    if (!loading && order) {
      window.print()
    }
  }, [loading, order])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-stone-500">Loading receipt…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-red-600">Order not found.</p>
      </div>
    )
  }

  const shortId = order.id.slice(0, 8).toUpperCase()
  const date = new Date(order.created_at).toLocaleString('en-KE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <>
      {/* Thermal receipt — visible in print, hidden on screen is inverted below */}
      <div className="receipt-wrapper">
        {/* Back button — hidden when printing */}
        <div className="no-print mb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-xs text-stone-500 hover:text-stone-700 underline">
            ← Back to orders
          </button>
          <Link to={`/invoice/${orderId}`}
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors">
            View A4 Invoice →
          </Link>
        </div>

        <div className="receipt">
          {/* Header */}
          <div className="text-center mb-2">
            <p className="font-bold text-sm">{shop?.name ?? 'LAUNDRY SHOP'}</p>
            {shop?.phone && <p className="text-xs">Tel: {shop.phone}</p>}
            <p className="text-xs">--- RECEIPT ---</p>
          </div>

          {/* Meta */}
          <div className="receipt-row"><span>Order #:</span><span>{shortId}</span></div>
          <div className="receipt-row"><span>Date:</span><span>{date}</span></div>
          {customer && (
            <>
              <div className="receipt-row"><span>Customer:</span><span>{customer.name}</span></div>
              {customer.phone && <div className="receipt-row"><span>Phone:</span><span>{customer.phone}</span></div>}
            </>
          )}
          <div className="divider" />

          {/* Items */}
          {order.items.map((item, i) => (
            <div key={i} className="receipt-row">
              <span>{item.service_name} ×{item.quantity}</span>
              <span>KES {Math.round(item.unit_price * item.quantity).toLocaleString('en-KE')}</span>
            </div>
          ))}

          <div className="divider" />

          {/* Total */}
          <div className="receipt-row font-bold text-sm">
            <span>TOTAL</span>
            <span>KES {Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Payment */}
          <div className="receipt-row">
            <span>Status:</span>
            <span>{payment ? payment.status.toUpperCase() : 'UNPAID'}</span>
          </div>
          {payment?.method && (
            <div className="receipt-row"><span>Method:</span><span>{payment.method.toUpperCase()}</span></div>
          )}
          {payment?.mpesa_ref && (
            <div className="receipt-row"><span>M-Pesa Ref:</span><span>{payment.mpesa_ref}</span></div>
          )}

          {order.notes && (
            <>
              <div className="divider" />
              <p className="text-xs italic">{order.notes}</p>
            </>
          )}

          <div className="divider" />
          <p className="text-center text-xs mt-1">Thank you for choosing us!</p>
        </div>
      </div>

      {/* Thermal receipt CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: 80mm auto; margin: 4mm; }
          body { background: white; }
          .receipt-wrapper { padding: 0; }
        }
        .receipt-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
          background: #f5f5f5;
          min-height: 100vh;
        }
        .receipt {
          background: white;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          width: 72mm;
          padding: 6mm 4mm;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
        }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-xs { font-size: 10px; }
        .text-sm { font-size: 12px; }
        .italic { font-style: italic; }
        .mb-2 { margin-bottom: 4px; }
        .mt-1 { margin-top: 2px; }
      `}</style>
    </>
  )
}
