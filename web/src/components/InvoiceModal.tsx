import { useEffect } from 'react'
import { X, Printer, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import DOMPurify from 'dompurify'

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

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function InvoiceModal({ order, customer, shopName, tenantName, onClose }: InvoiceModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  const orderId = order.id.slice(0, 8).toUpperCase()
  const subtotal = order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=420,height=700')
    if (!win) return

    // Build receipt HTML manually using sanitized data — no innerHTML injection
    const itemRows = order.items.map((item) => `
      <tr>
        <td style="flex:1;font-size:11px;padding:3px 0">${esc(item.service_name)}</td>
        <td style="width:28px;text-align:center">${item.quantity}</td>
        <td style="width:68px;text-align:right">${Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
        <td style="width:68px;text-align:right">${(item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt – ${orderId}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;font-size:12px;color:#111;padding:16px;max-width:320px;margin:0 auto}
    .center{text-align:center}
    .bold{font-weight:bold}
    .lg{font-size:16px}
    .divider{border-top:1px dashed #aaa;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0}
    .muted{color:#666;font-size:11px}
    table{width:100%;border-collapse:collapse}
    td{vertical-align:top}
    .thanks{text-align:center;margin-top:14px;font-size:11px;color:#666}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <div class="center bold lg">${esc(tenantName)}</div>
  <div class="center muted">${esc(shopName)}</div>
  <div class="divider"></div>
  <div class="row"><span>Receipt #</span><span class="bold">${orderId}</span></div>
  <div class="row"><span>Date</span><span>${esc(formatDateTime(order.created_at))}</span></div>
  <div class="row"><span>Status</span><span class="bold">${esc(order.status)}</span></div>
  ${customer ? `
  <div class="divider"></div>
  <div class="row"><span>Customer</span><span class="bold">${esc(customer.name)}</span></div>
  <div class="row"><span>Phone</span><span>${esc(customer.phone)}</span></div>
  ` : ''}
  ${order.items.length > 0 ? `
  <div class="divider"></div>
  <table>
    <thead><tr style="color:#666;font-size:10px;text-transform:uppercase">
      <th style="text-align:left;padding:2px 0">Item</th>
      <th style="width:28px;text-align:center">Qty</th>
      <th style="width:68px;text-align:right">Price</th>
      <th style="width:68px;text-align:right">Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="divider"></div>
  <div class="row"><span>Subtotal</span><span>KES ${subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
  ` : '<div class="divider"></div>'}
  <div class="row bold" style="font-size:14px;margin:6px 0"><span>TOTAL</span><span>KES ${Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
  ${order.notes ? `<div class="divider"></div><div class="muted">Note: ${esc(order.notes)}</div>` : ''}
  <div class="thanks">Thank you for choosing ${esc(tenantName)}!<br>Please keep this receipt for your records.</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.origin + `/invoice/${order.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const row = (label: string, value: string) => (
    <div className="flex justify-between text-[12px]" style={{ margin: '3px 0', fontFamily: "'Courier New', monospace" }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Receipt #{orderId}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              <Printer className="w-3 h-3" /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors ml-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt preview */}
        <div
          className="p-5 overflow-y-auto max-h-[72vh]"
          style={{ fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'var(--text-primary)' }}
        >
          <div className="text-center font-bold" style={{ fontSize: '15px', marginBottom: '4px' }}>{tenantName}</div>
          <div className="text-center" style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginBottom: '2px' }}>{shopName}</div>
          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-strong)', margin: '8px 0' }} />
          {row('Receipt #', orderId)}
          {row('Date', formatDateTime(order.created_at))}
          {row('Status', order.status.charAt(0).toUpperCase() + order.status.slice(1))}
          {customer && (
            <>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-strong)', margin: '8px 0' }} />
              {row('Customer', customer.name)}
              {row('Phone', customer.phone)}
            </>
          )}
          {order.items.length > 0 && (
            <>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-strong)', margin: '8px 0' }} />
              <div className="flex text-[10px] uppercase" style={{ color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                <span style={{ flex: 1 }}>Item</span>
                <span style={{ width: 28, textAlign: 'center' }}>Qty</span>
                <span style={{ width: 68, textAlign: 'right' }}>Price</span>
                <span style={{ width: 68, textAlign: 'right' }}>Total</span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start" style={{ margin: '4px 0' }}>
                  <span style={{ flex: 1, fontSize: '11px' }}>{item.service_name}</span>
                  <span style={{ width: 28, textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ width: 68, textAlign: 'right' }}>{Number(item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                  <span style={{ width: 68, textAlign: 'right' }}>{(item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-strong)', margin: '8px 0' }} />
              {row('Subtotal', `KES ${subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`)}
            </>
          )}
          <div className="flex justify-between font-bold" style={{ fontSize: '13px', margin: '6px 0' }}>
            <span>TOTAL</span>
            <span>KES {Number(order.total_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
          </div>
          {order.notes && (
            <>
              <hr style={{ border: 'none', borderTop: '1px dashed var(--border-strong)', margin: '8px 0' }} />
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Note: {order.notes}</div>
            </>
          )}
          <div className="text-center" style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Thank you for choosing {tenantName}!<br />
            Please keep this receipt for your records.
          </div>
        </div>
      </div>
    </div>
  )
}

