import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, ShopSummary, Tenant } from '../types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  tenant: Tenant | null
  shops: ShopSummary[]
  activeShopId: string | null
  setAuth: (payload: { token: string; user: AuthUser; tenant: Tenant | null; shops: ShopSummary[]; activeShopId: string | null }) => void
  setShops: (shops: ShopSummary[]) => void
  setActiveShop: (shopId: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (partial: Partial<AuthState>) => void) => ({
      token: null,
      user: null,
      tenant: null,
      shops: [],
      activeShopId: null,
      setAuth: ({ token, user, tenant, shops, activeShopId }: { token: string; user: AuthUser; tenant: Tenant | null; shops: ShopSummary[]; activeShopId: string | null }) =>
        set({ token, user, tenant, shops, activeShopId }),
      setShops: (shops: ShopSummary[]) => set({ shops }),
      setActiveShop: (shopId: string | null) => set({ activeShopId: shopId }),
      logout: () => set({ token: null, user: null, tenant: null, shops: [], activeShopId: null }),
    }),
    { name: 'laundry-saas-auth' },
  ),
)
