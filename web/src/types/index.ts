// ─── Auth ──────────────────────────────────────────────────────────────────
export interface ShopSummary {
  id: string
  name: string
  code: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'platform_owner' | 'owner' | 'admin' | 'worker'
  is_platform_owner: boolean
}

export interface Tenant {
  id: string
  name: string
  slug: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: AuthUser
  tenant: Tenant | null
  shops: ShopSummary[]
  active_shop_id: string | null
}

// ─── Orders ────────────────────────────────────────────────────────────────
export type OrderStatus = 'received' | 'washing' | 'ready' | 'delivered'
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'
export type PaymentMethod = 'cash' | 'mpesa'

export interface OrderItem {
  id: string
  service_name: string
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  shop_id: string
  customer_id: string
  worker_id: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  source: string
  notes: string | null
  pickup_date: string | null
  delivery_date: string | null
  total_amount: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

// ─── Customers ─────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  shop_id: string
  name: string
  phone: string
  email: string | null
  notes: string | null
  created_at: string
}

// ─── Services ──────────────────────────────────────────────────────────────
export type ServiceCategory = 'washing' | 'ironing' | 'dry_cleaning' | 'general' | 'delivery'

export interface Service {
  id: string
  tenant_id: string
  shop_id: string | null
  name: string
  category: ServiceCategory
  unit: string
  price_per_unit: number
  is_active: boolean
}

// ─── Team ───────────────────────────────────────────────────────────────────
export type UserRole = 'owner' | 'admin' | 'worker'

export interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: UserRole
  created_at: string
  shop_assignments: string[]
}

// ─── Expenses ───────────────────────────────────────────────────────────────
export type ExpenseCategory = 'utilities' | 'supplies' | 'salaries' | 'rent' | 'maintenance' | 'other'

export interface Expense {
  id: string
  shop_id: string | null
  shop_name: string | null
  amount: number
  category: ExpenseCategory
  description: string
  reference: string | null
  expense_date: string
  created_at: string
}

// ─── Reports ────────────────────────────────────────────────────────────────
export interface ReportSummary {
  total_revenue: number
  total_orders: number
  orders_by_status: Record<string, number>
  daily_revenue: { date: string; revenue: number; orders: number }[]
  shop_breakdown?: { shop_id: string; shop_name: string; revenue: number; orders: number }[]
}

// ─── Platform ───────────────────────────────────────────────────────────────
export type PlanName = 'starter' | 'growth' | 'enterprise'
export type TenantStatus = 'active' | 'trial' | 'suspended'

export interface PlatformTenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: PlanName
  shops_count: number
  users_count: number
  orders_count: number
  revenue: number
  created_at: string
}

export interface PlatformStats {
  total_tenants: number
  active_tenants: number
  total_revenue: number
  total_orders: number
  mrr: number
}

