import { FormEvent, useEffect, useState } from 'react'
import { AlertCircle, X, Check, Building2, KeyRound, Store, Plus, Ruler, Trash2, ChevronRight, CreditCard } from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Select } from '../components/Select'
import { useUnitsStore } from '../store/units'
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

  // Units store
  const { units, addUnit, removeUnit } = useUnitsStore()
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitParent, setNewUnitParent] = useState('')   // '' = top-level
  const [unitError, setUnitError] = useState<string | null>(null)

  const topLevelUnits = units.filter((u) => u.parentId === null)
  const subunitsByParent = (parentId: string) => units.filter((u) => u.parentId === parentId)

  const handleAddUnit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newUnitName.trim()
    if (!trimmed) return
    if (units.find((u) => u.name.toLowerCase() === trimmed.toLowerCase())) {
      setUnitError('A unit with that name already exists')
      return
    }
    setUnitError(null)
    addUnit(trimmed, newUnitParent || null)
    setNewUnitName('')
    setNewUnitParent('')
  }
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

          {/* Units & Subunits — owners and admins */}
          {canManageUnits && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Ruler className="w-4 h-4 text-secondary" />
                <h2 className="text-sm font-semibold text-primary">Units &amp; Subunits</h2>
                <span className="ml-auto text-xs text-tertiary">{units.length} total</span>
              </div>

              {/* Unit tree */}
              <div className="space-y-2 mb-5">
                {topLevelUnits.map((unit) => {
                  const subs = subunitsByParent(unit.id)
                  return (
                    <div key={unit.id} className="rounded-lg border border-theme overflow-hidden">
                      {/* Parent row */}
                      <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-primary">{unit.name}</span>
                          {subs.length > 0 && (
                            <span className="text-[11px] text-tertiary">{subs.length} subunit{subs.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUnit(unit.id)}
                          className="p-1 rounded hover:bg-[var(--bg-muted)] text-disabled hover:text-red-500 transition-colors"
                          title={subs.length > 0 ? `Delete ${unit.name} and its ${subs.length} subunit(s)` : `Delete ${unit.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Subunit rows */}
                      {subs.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between px-3 py-2 border-t border-theme">
                          <div className="flex items-center gap-2 pl-3">
                            <ChevronRight className="w-3 h-3 text-disabled" />
                            <span className="text-sm text-secondary">{sub.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUnit(sub.id)}
                            className="p-1 rounded hover:bg-[var(--bg-muted)] text-disabled hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Add unit / subunit form */}
              <form onSubmit={handleAddUnit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">Unit name *</label>
                    <input
                      value={newUnitName}
                      onChange={(e) => { setNewUnitName(e.target.value); setUnitError(null) }}
                      placeholder="e.g. duvet, load…"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1">
                      Parent unit <span className="text-tertiary font-normal">(optional — makes it a subunit)</span>
                    </label>
                    <Select
                      value={newUnitParent}
                      onChange={setNewUnitParent}
                      options={[
                        { value: '', label: 'None — top-level unit' },
                        ...topLevelUnits.map((u) => ({ value: u.id, label: u.name })),
                      ]}
                      placeholder="None — top-level unit"
                    />
                  </div>
                </div>
                {unitError && <p className="text-xs text-red-600">{unitError}</p>}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add unit
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </AppShell>
  )
}
