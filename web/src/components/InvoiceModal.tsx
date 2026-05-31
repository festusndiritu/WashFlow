import { useEffect, useRef } from 'react'
import { X, Printer } from 'lucide-react'

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

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
}

interface InvoiceModalProps {
  order: Order
  customer: Customer | undefined
  shopName: string
  tenantName: string
  onClose: () => void
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export function InvoiceModal({ order, customer, shopName, tenantName, onClose }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=420,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt – ${order.id.slice(0, 8).toUpperCase()}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; padding: 16px; max-width: 320px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .divider { border-top: 1px dashed #aaa; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 4px; }
            .muted { color: #666; font-size: 11px; }
            .item-name { flex: 1; }
            .item-qty { width: 24px; text-align: center; }
            .item-price { width: 70px; text-align: right; }
            .item-total { width: 70px; text-align: right; }
            .thanks { text-align: center; margin-top: 14px; font-size: 11px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.onload = () => { window.print(); }<\/script>
        </body>
      </html>
    `)
    win.document.close()
  }

  const orderId = order.id.slice(0, 8).toUpperCase()
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-900">Receipt #{orderId}</p>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable receipt */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div ref={printRef} style={{ fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#111', maxWidth: '300px', margin: '0 auto' }}>
            {/* Header */}
            <div className="center bold large" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{tenantName}</div>
            <div className="center muted" style={{ textAlign: 'center', color: '#666', fontSize: '11px', marginBottom: '2px' }}>{shopName}</div>
            <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Receipt #</span><span className="bold" style={{ fontWeight: 'bold' }}>{orderId}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Date</span><span>{formatDateTime(order.created_at)}</span>
            </div>
            <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
              <span>Status</span><span className="bold" style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{order.status}</span>
            </div>
            {customer && (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                  <span>Customer</span><span className="bold" style={{ fontWeight: 'bold' }}>{customer.name}</span>
                </div>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                  <span>Phone</span><span>{customer.phone}</span>
                </div>
              </>
            )}

            {/* Items */}
            {order.items.length > 0 ? (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
                {/* Column headers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', color: '#666', fontSize: '10px', textTransform: 'uppercase' }}>
                  <span style={{ flex: 1 }}>ITEM</span>
                  <span style={{ width: '28px', textAlign: 'center' }}>QTY</span>
                  <span style={{ width: '68px', textAlign: 'right' }}>PRICE</span>
                  <span style={{ width: '68px', textAlign: 'right' }}>TOTAL</span>
                </div>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', margin: '4px 0', alignItems: 'flex-start' }}>
                    <span style={{ flex: 1, fontSize: '11px' }}>{item.service_name}</span>
                    <span style={{ width: '28px', textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ width: '68px', textAlign: 'right' }}>{Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                    <span style={{ width: '68px', textAlign: 'right' }}>{(item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
              </>
            ) : (
              <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
            )}

            {/* Totals */}
            {order.items.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <span>Subtotal</span>
                <span>KES {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', margin: '6px 0' }}>
              <span>TOTAL</span>
              <span>KES {Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>

            {order.notes && (
              <>
                <div className="divider" style={{ borderTop: '1px dashed #aaa', margin: '8px 0' }} />
                <div style={{ fontSize: '11px', color: '#555' }}>Note: {order.notes}</div>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '11px', color: '#666' }}>
              Thank you for choosing {tenantName}!<br />
              Please keep this receipt for your records.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
