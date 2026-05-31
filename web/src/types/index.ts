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
