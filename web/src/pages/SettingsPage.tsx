import { FormEvent, useEffect, useState } from 'react'
import { AlertCircle, X, Check, Building2, KeyRound, Store, Plus, Ruler, CreditCard } from 'lucide-react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import type { ShopSummary } from '../types'

interface TenantSettings {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
}

const inputCls = 'input-base'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const activeShopId = useAuthStore((s) => s.activeShopId)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setShops = useAuthStore((s) => s.setShops)
  const token = useAuthStore((s) => s.token)

  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Org name
  const [orgName, setOrgName] = useState('')
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgSuccess, setOrgSuccess] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Shop management
  const [newShopName, setNewShopName] = useState('')
  const [shopAdding, setShopAdding] = useState(false)
  const [shopError, setShopError] = useState<string | null>(null)

  // Subscription / plan
  const [planSaving, setPlanSaving] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planSuccess, setPlanSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await client.get<TenantSettings>('/settings')
        setSettings(data)
      setOrgName(data.name)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const saveOrgName = async (e: FormEvent) => {
    e.preventDefault()
    setOrgError(null); setOrgSuccess(false)
    setOrgSaving(true)
    try {
      const { data } = await client.put<TenantSettings>('/settings', { name: orgName })
      setSettings(data)
      // Update tenant in auth store
      if (tenant && token && user) {
        setAuth({ token, user, tenant: { ...tenant, name: data.name }, shops, activeShopId })
      }
      setOrgSuccess(true)
      setTimeout(() => setOrgSuccess(false), 3000)
    } catch (err: any) {
      setOrgError(err.response?.data?.detail || 'Could not save name')
    } finally {
      setOrgSaving(false)
    }
  }

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError(null); setPwSuccess(false)
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return }
    setPwSaving(true)
    try {
      await client.put('/settings/password', { current_password: currentPassword, new_password: newPassword })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err: any) {
      setPwError(err.response?.data?.detail || 'Could not change password')
    } finally {
      setPwSaving(false)
    }
  }

  const changePlan = async (newPlan: string) => {
    setPlanError(null); setPlanSuccess(false)
    setPlanSaving(true)
    try {
      const { data } = await client.patch<TenantSettings>('/settings/plan', { plan: newPlan })
      setSettings(data)
      setPlanSuccess(true)
      setTimeout(() => setPlanSuccess(false), 3000)
    } catch (err: any) {
      setPlanError(err.response?.data?.detail || 'Could not update plan')
    } finally {
      setPlanSaving(false)
    }
  }

  const addShop = async (e: FormEvent) => {
    e.preventDefault()
    setShopError(null)
    if (!newShopName.trim()) return
    setShopAdding(true)
    try {
      const res = await client.post<{ id: string; name: string; code: string }>('/shops', { name: newShopName.trim() })
      const nextShops: ShopSummary[] = [...shops, { id: res.data.id, name: res.data.name, code: res.data.code }]
      setShops(nextShops)
      setNewShopName('')
    } catch (err: any) {
      setShopError(err.response?.data?.detail || 'Could not add shop')
    } finally {
      setShopAdding(false)
    }
  }

  const isOwner = user?.role === 'owner'
  const canManageUnits = user?.role === 'owner' || user?.role === 'admin'

  const PLAN_SHOP_LIMITS: Record<string, number> = {
    free: 1, starter: 2, pro: 5, enterprise: Infinity,
  }
  const shopLimit = PLAN_SHOP_LIMITS[settings?.plan ?? 'free'] ?? 1
  const atShopLimit = shops.length >= shopLimit

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div>
      <h1 className="text-base font-semibold text-primary leading-none mb-0.5">Settings</h1>
      <p className="text-xs text-tertiary">{tenant?.name}</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          {/* Organization settings */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-secondary" />
              <h2 className="text-sm font-semibold text-primary">Organization</h2>
            </div>
            {isOwner ? (
              <form onSubmit={saveOrgName} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Business name</label>
                  <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required className={inputCls} />
                </div>
                <div className="text-xs text-tertiary">
                  <span className="font-medium text-secondary">Slug:</span> {settings?.slug}
                </div>
                {orgError && <p className="text-xs text-red-600">{orgError}</p>}
                {orgSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Check className="w-3.5 h-3.5" /> Name updated successfully
                  </div>
                )}
                <button type="submit" disabled={orgSaving} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  {orgSaving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-secondary w-20">Name</span>
                  <span className="text-sm text-primary">{settings?.name}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-medium text-secondary w-20">Slug</span>
                  <span className="text-sm text-secondary font-mono">{settings?.slug}</span>
                </div>
                <p className="text-xs text-tertiary mt-2">Only the owner can change the organization name.</p>
              </div>
            )}
          </div>

          {/* Password change */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4 text-secondary" />
              <h2 className="text-sm font-semibold text-primary">Change password</h2>
            </div>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Current password *</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputCls} autoComplete="current-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">New password *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputCls} autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Confirm new password *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} autoComplete="new-password" />
              </div>
              {pwError && <p className="text-xs text-red-600">{pwError}</p>}
              {pwSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Password changed successfully
                </div>
              )}
              <button type="submit" disabled={pwSaving} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                {pwSaving ? 'Changing…' : 'Change password'}
              </button>
            </form>
          </div>

          {/* Shop management — owners only */}
          {isOwner && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-4 h-4 text-secondary" />
                <h2 className="text-sm font-semibold text-primary">Shops</h2>
                <span className="ml-auto text-xs text-tertiary">{shops.length} {shops.length === 1 ? 'shop' : 'shops'}</span>
              </div>

              {/* Existing shops list */}
              {shops.length > 0 && (
                <div className="divide-y divide-[var(--border-default)] mb-4 -mx-5 px-5">
                  {shops.map((shop) => (
                    <div key={shop.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${shop.id === activeShopId ? 'bg-orange-500' : 'bg-stone-300'}`} />
                        <div>
                          <p className="text-sm font-medium text-primary">{shop.name}</p>
                          <p className="text-xs text-tertiary font-mono">{shop.code}</p>
                        </div>
                      </div>
                      {shop.id === activeShopId && (
                        <span className="text-xs text-orange-600 font-semibold">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new shop */}
              {atShopLimit ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Your <span className="font-semibold capitalize">{settings?.plan ?? 'free'}</span> plan allows up to{' '}
                  {shopLimit === 1 ? '1 shop' : `${shopLimit} shops`}. Upgrade to add more.
                </div>
              ) : (
              <form onSubmit={addShop} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">New shop name</label>
                  <input
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    placeholder="e.g. Westlands Branch"
                    required
                    minLength={2}
                    className={inputCls}
                  />
                </div>
                {shopError && <p className="text-xs text-red-600">{shopError}</p>}
                <button type="submit" disabled={shopAdding}
                  className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {shopAdding ? 'Adding…' : 'Add shop'}
                </button>
              </form>
              )}
            </div>
          )}

          {/* Subscription plan — owners only */}
          {isOwner && settings && (() => {
            const PLAN_DETAILS: Record<string, { label: string; price: string; features: string[] }> = {
              free:       { label: 'Free',       price: 'KES 0/mo',      features: ['1 shop', '3 users', '50 orders/mo'] },
              starter:    { label: 'Starter',    price: 'KES 1,500/mo',  features: ['2 shops', '10 users', '300 orders/mo'] },
              pro:        { label: 'Pro',        price: 'KES 4,500/mo',  features: ['5 shops', '30 users', '1,000 orders/mo'] },
              enterprise: { label: 'Enterprise', price: 'KES 12,000/mo', features: ['Unlimited shops', 'Unlimited users', 'Unlimited orders'] },
            }
            const PLANS = ['free', 'starter', 'pro', 'enterprise']
            const current = settings.plan ?? 'free'
            return (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-secondary" />
                  <h2 className="text-sm font-semibold text-primary">Subscription</h2>
                  <span className="ml-auto text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full capitalize">{PLAN_DETAILS[current]?.label ?? current}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PLANS.map((p) => {
                    const d = PLAN_DETAILS[p]
                    const isActive = p === current
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={isActive || planSaving}
                        onClick={() => changePlan(p)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${isActive ? 'border-orange-500 bg-orange-50' : 'border-theme bg-surface hover:bg-subtle disabled:opacity-50'}`}
                      >
                        <p className={`text-sm font-semibold mb-0.5 ${isActive ? 'text-orange-700' : 'text-primary'}`}>{d.label}</p>
                        <p className={`text-xs mb-1.5 ${isActive ? 'text-orange-600' : 'text-secondary'}`}>{d.price}</p>
                        <ul className="space-y-0.5">
                          {d.features.map(f => (
                            <li key={f} className={`text-[11px] ${isActive ? 'text-orange-600' : 'text-tertiary'}`}>· {f}</li>
                          ))}
                        </ul>
                        {isActive && <p className="text-[10px] font-semibold text-orange-600 mt-1.5">Current plan</p>}
                      </button>
                    )
                  })}
                </div>
                {planError && <p className="text-xs text-red-600">{planError}</p>}
                {planSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <Check className="w-3.5 h-3.5" /> Plan updated successfully
                  </div>
                )}
              </div>
            )
          })()}

          {/* Units & Subunits — link to dedicated page */}
          {canManageUnits && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-secondary" />
                  <h2 className="text-sm font-semibold text-primary">Units &amp; Subunits</h2>
                </div>
                <Link to="/units" className="text-xs text-orange-600 hover:text-orange-700 font-medium inline-flex items-center gap-0.5">
                  Manage →
                </Link>
              </div>
            </div>
          )}

        </div>
      )}
    </AppShell>
  )
}
