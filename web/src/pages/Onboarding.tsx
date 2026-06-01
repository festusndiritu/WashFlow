import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tag, Package, Users, ArrowRight, CheckCircle2,
  Plus, ChevronRight, AlertCircle, Sparkles,
} from 'lucide-react'

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#f97316"/>
      <path d="M16 4C15.3 5.6 7 14.5 7 20C7 24.4 11 28 16 28C21 28 25 24.4 25 20C25 14.5 16.7 5.6 16 4Z" fill="white"/>
      <path d="M11 19.5L12.5 24L14.8 18L16 20.8L17.2 18L19.5 24L21 19.5" stroke="#f97316" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import type { ShopSummary } from '../types'

interface ServiceCreate {
  name: string
  category: string
  unit: string
  price_per_unit: string
}

const PRESET_SERVICES = [
  { name: 'Shirt wash & iron', category: 'washing', unit: 'piece', price: '80' },
  { name: 'Trouser wash & iron', category: 'ironing', unit: 'piece', price: '100' },
  { name: 'Bedsheet set', category: 'washing', unit: 'set', price: '350' },
  { name: 'Duvet (single)', category: 'dry_cleaning', unit: 'piece', price: '700' },
  { name: 'Duvet (double)', category: 'dry_cleaning', unit: 'piece', price: '1000' },
  { name: 'Suit dry clean', category: 'dry_cleaning', unit: 'piece', price: '800' },
  { name: 'Dress wash & iron', category: 'washing', unit: 'piece', price: '150' },
  { name: 'T-shirt wash', category: 'washing', unit: 'piece', price: '60' },
  { name: 'Pickup & delivery', category: 'delivery', unit: 'trip', price: '200' },
]

const STEPS = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Services' },
  { id: 3, label: 'Team' },
]

const inputCls = 'input-base'

export function OnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setShops = useAuthStore((s) => s.setShops)
  const setActiveShop = useAuthStore((s) => s.setActiveShop)

  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [shopName, setShopName] = useState('')
  const [shopLoading, setShopLoading] = useState(false)

  // Step 2
  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set())
  const [customServices, setCustomServices] = useState<ServiceCreate[]>([])
  const [savingServices, setSavingServices] = useState(false)

  // Step 3
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'worker'>('worker')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [invitedCount, setInvitedCount] = useState(0)

  const hasShop = shops.length > 0
  const activeShop = shops[0]

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await client.get('/auth/me')
        setAuth({
          token: res.data.access_token,
          user: res.data.user,
          tenant: res.data.tenant,
          shops: res.data.shops,
          activeShopId: res.data.active_shop_id,
        })
      } catch { /* keep stored state */ }
    }
    void refresh()
  }, [])

  const createShop = async (e: FormEvent) => {
    e.preventDefault()
    if (!shopName.trim()) return
    setShopLoading(true)
    setError(null)
    try {
      const res = await client.post('/shops', { name: shopName, timezone: 'Africa/Nairobi' })
      const nextShops: ShopSummary[] = [...shops, { id: res.data.id, name: res.data.name, code: res.data.code }]
      setShops(nextShops)
      setActiveShop(res.data.id)
      setStep(2)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not create shop')
    } finally {
      setShopLoading(false)
    }
  }

  const saveServices = async () => {
    setSavingServices(true)
    setError(null)
    try {
      const toCreate = [
        ...Array.from(selectedPresets).map((i) => ({
          name: PRESET_SERVICES[i].name,
          category: PRESET_SERVICES[i].category,
          unit: PRESET_SERVICES[i].unit,
          price_per_unit: parseFloat(PRESET_SERVICES[i].price),
        })),
        ...customServices
          .filter((s) => s.name.trim() && s.price_per_unit)
          .map((s) => ({
            name: s.name.trim(),
            category: s.category,
            unit: s.unit,
            price_per_unit: parseFloat(s.price_per_unit),
          })),
      ]
      await Promise.all(toCreate.map((svc) => client.post('/services', svc)))
      setStep(3)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not save services')
    } finally {
      setSavingServices(false)
    }
  }

  const inviteMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return
    setInviting(true)
    setError(null)
    try {
      await client.post('/team', { name: inviteName, email: inviteEmail, role: inviteRole, password: invitePassword })
      setInvitedCount((n) => n + 1)
      setInviteName(''); setInviteEmail(''); setInvitePassword('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not invite member')
    } finally {
      setInviting(false)
    }
  }

  const finish = () => navigate('/dashboard')

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #111110 0%, #1a1410 60%, #2a1800 100%)" }}>
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-white font-bold text-base tracking-tight">WashFlow</span>
        </div>
        <button onClick={finish} className="text-stone-400 hover:text-white text-sm transition-colors">
          Skip setup →
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8 mt-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              step === s.id
                ? 'bg-orange-500 text-white'
                : step > s.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-stone-800 text-stone-500'
            }`}>
              {step > s.id ? <CheckCircle2 className="w-3 h-3" /> : <span>{s.id}</span>}
              <span className="ml-0.5">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-stone-600" />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-5 py-3 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* Step 1 — Welcome + Shop */}
          {step === 1 && (
            <div>
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-8">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <p className="text-orange-100 text-sm font-medium">Welcome to WashFlow</p>
                </div>
                <h1 className="text-2xl font-bold text-white leading-tight">
                  Hey {user?.name?.split(' ')[0] ?? 'there'}!<br />
                  Let's set up <span className="text-orange-100">{tenant?.name ?? 'your business'}</span>
                </h1>
                <p className="text-orange-100 text-sm mt-2">Takes about 3 minutes. You can always change things later.</p>
              </div>
              <div className="p-8">
                {hasShop ? (
                  <div>
                    <p className="text-sm text-stone-600 mb-6">
                      Your first shop <strong className="text-stone-900">{activeShop?.name}</strong> is ready. Let's add your services next.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[
                        { icon: Tag, label: 'Service catalog', desc: 'Set your prices' },
                        { icon: Package, label: 'Order tracking', desc: 'From drop-off to delivery' },
                        { icon: Users, label: 'Team management', desc: 'Invite staff with roles' },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="text-center p-4 bg-stone-50 rounded-xl">
                          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                            <Icon className="w-5 h-5 text-orange-600" />
                          </div>
                          <p className="text-sm font-semibold text-stone-900">{label}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      Continue — Add services <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={createShop} className="space-y-5">
                    <div>
                      <p className="text-sm text-stone-600 mb-5">First, let's create your shop location.</p>
                      <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wide">Shop name</label>
                      <input
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. Westlands Branch"
                        className={inputCls}
                        required
                        autoFocus
                      />
                      <p className="text-xs text-stone-400 mt-1.5">You can add more branches later from your dashboard.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={shopLoading || !shopName.trim()}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      {shopLoading ? 'Creating…' : <>Create shop <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Services */}
          {step === 2 && (
            <div>
              <div className="bg-gradient-to-r from-sky-500 to-violet-500 px-8 py-6">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-5 h-5 text-white/80" />
                  <p className="text-sky-100 text-sm font-medium">Step 2 of 3</p>
                </div>
                <h2 className="text-xl font-bold text-white">Build your service catalog</h2>
                <p className="text-sky-100 text-sm mt-1">Pick common services to start with, then customise prices later.</p>
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Common services — click to select</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {PRESET_SERVICES.map((svc, i) => {
                    const selected = selectedPresets.has(i)
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPresets((p) => {
                          const next = new Set(p)
                          selected ? next.delete(i) : next.add(i)
                          return next
                        })}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                          selected
                            ? 'bg-orange-50 border-orange-400 text-orange-700'
                            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <span>{svc.name}</span>
                        <span className={`text-xs font-semibold ${selected ? 'text-orange-500' : 'text-stone-400'}`}>
                          KES {svc.price}/{svc.unit}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {customServices.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Custom services</p>
                    {customServices.map((svc, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          className={`col-span-5 ${inputCls} !py-2`}
                          placeholder="Service name"
                          value={svc.name}
                          onChange={(e) => setCustomServices((p) => p.map((s, j) => j === i ? { ...s, name: e.target.value } : s))}
                        />
                        <select
                          className={`col-span-3 ${inputCls} !py-2`}
                          value={svc.category}
                          onChange={(e) => setCustomServices((p) => p.map((s, j) => j === i ? { ...s, category: e.target.value } : s))}
                        >
                          {['washing', 'ironing', 'dry_cleaning', 'delivery', 'general'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input
                          className={`col-span-3 ${inputCls} !py-2`}
                          placeholder="KES"
                          type="number"
                          value={svc.price_per_unit}
                          onChange={(e) => setCustomServices((p) => p.map((s, j) => j === i ? { ...s, price_per_unit: e.target.value } : s))}
                        />
                        <button
                          type="button"
                          onClick={() => setCustomServices((p) => p.filter((_, j) => j !== i))}
                          className="col-span-1 text-stone-300 hover:text-red-400 flex items-center justify-center"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setCustomServices((p) => [...p, { name: '', category: 'washing', unit: 'piece', price_per_unit: '' }])}
                  className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-semibold mb-5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add custom service
                </button>

                <div className="flex gap-3 pt-2 border-t border-stone-100">
                  <button
                    onClick={saveServices}
                    disabled={savingServices || (selectedPresets.size === 0 && customServices.filter((s) => s.name.trim()).length === 0)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {savingServices
                      ? 'Saving…'
                      : `Save ${selectedPresets.size + customServices.filter((s) => s.name.trim()).length} services & continue`}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Team */}
          {step === 3 && (
            <div>
              <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-8 py-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-white/80" />
                  <p className="text-violet-100 text-sm font-medium">Step 3 of 3</p>
                </div>
                <h2 className="text-xl font-bold text-white">Invite your team</h2>
                <p className="text-violet-100 text-sm mt-1">Add staff now or later from the Team page.</p>
              </div>
              <div className="p-6">
                {invitedCount > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 text-emerald-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {invitedCount} member{invitedCount > 1 ? 's' : ''} invited
                  </div>
                )}
                <form onSubmit={inviteMember} className="space-y-3 mb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1.5">Name</label>
                      <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email</label>
                      <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1.5">Role</label>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'admin' | 'worker')} className={inputCls}>
                        <option value="worker">Worker</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1.5">Temporary password</label>
                      <input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="••••••••" className={inputCls} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={inviting || !inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()}
                    className="w-full border border-violet-300 bg-violet-50 hover:bg-violet-100 disabled:opacity-60 text-violet-700 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> {inviting ? 'Inviting…' : 'Invite member'}
                  </button>
                </form>

                <div className="border-t border-stone-100 pt-4">
                  <button
                    onClick={finish}
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> All done — go to dashboard
                  </button>
                  <p className="text-xs text-stone-400 text-center mt-3">
                    More team members can be added from <strong>Team</strong> in the sidebar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
