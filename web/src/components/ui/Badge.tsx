import { cn } from '../../lib/utils'

type OrderStatus = 'received' | 'washing' | 'ready' | 'delivered'
type PlanName = 'starter' | 'growth' | 'enterprise' | string
type TenantStatus = 'active' | 'suspended' | 'trial' | string
type PaymentStatus = 'paid' | 'unpaid' | 'partial' | string

const STATUS_MAP: Record<string, string> = {
  received:   'badge badge-received',
  washing:    'badge badge-washing',
  ready:      'badge badge-ready',
  delivered:  'badge badge-delivered',
}

const PLAN_MAP: Record<string, string> = {
  starter:    'badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]',
  growth:     'badge bg-violet-50 text-violet-700 border-violet-200',
  enterprise: 'badge bg-amber-50 text-amber-700 border-amber-200',
}

const TENANT_STATUS_MAP: Record<string, string> = {
  active:    'badge bg-[var(--status-ready-bg)] text-[var(--status-ready-fg)] border-[var(--status-ready-border)]',
  trial:     'badge bg-[var(--status-washing-bg)] text-[var(--status-washing-fg)] border-[var(--status-washing-border)]',
  suspended: 'badge bg-[var(--status-delivered-bg)] text-[var(--status-delivered-fg)] border-[var(--status-delivered-border)]',
}

const PAYMENT_MAP: Record<string, string> = {
  paid:    'badge bg-[var(--status-ready-bg)] text-[var(--status-ready-fg)] border-[var(--status-ready-border)]',
  unpaid:  'badge bg-[var(--status-received-bg)] text-[var(--status-received-fg)] border-[var(--status-received-border)]',
  partial: 'badge bg-[var(--status-washing-bg)] text-[var(--status-washing-fg)] border-[var(--status-washing-border)]',
}

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return <span className={cn('badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]', className)}>{children}</span>
}

export function OrderStatusBadge({ status }: { status: string }) {
  const cls = STATUS_MAP[status] ?? 'badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
  return <span className={cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

export function PlanBadge({ plan }: { plan: string }) {
  const cls = PLAN_MAP[plan?.toLowerCase()] ?? 'badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
  return <span className={cls}>{plan}</span>
}

export function TenantStatusBadge({ status }: { status: string }) {
  const cls = TENANT_STATUS_MAP[status?.toLowerCase()] ?? 'badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
  return <span className={cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

export function PaymentBadge({ status }: { status: string }) {
  const cls = PAYMENT_MAP[status?.toLowerCase()] ?? 'badge bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'
  return <span className={cls}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}
