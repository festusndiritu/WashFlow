import { FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#f97316"/>
      <path d="M16 4C15.3 5.6 7 14.5 7 20C7 24.4 11 28 16 28C21 28 25 24.4 25 20C25 14.5 16.7 5.6 16 4Z" fill="white"/>
      <path d="M11 19.5L12.5 24L14.8 18L16 20.8L17.2 18L19.5 24L21 19.5" stroke="#f97316" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

const FEATURES = [
  { label: 'Multi-location management', desc: 'Run multiple branches from one account' },
  { label: 'Role-based access', desc: 'Owner, admin, and worker permissions' },
  { label: 'Live order tracking', desc: 'Real-time status for every order' },
  { label: 'M-Pesa & cash payments', desc: 'STK push and manual payment recording' },
]

function GoogleAuthSection({ onSuccess }: { onSuccess: (data: AuthResponse) => void }) {
  const { clientId } = useGoogleOAuth()
  const [googleCred, setGoogleCred] = useState<string | null>(null)
  const [needsBiz, setNeedsBiz] = useState(false)
  const [bizName, setBizName] = useState('')
  const [shopName, setShopName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!clientId) return null

  const callGoogleAuth = async (credential: string, extra?: { business_name: string; first_shop_name: string }) => {
    setLoading(true); setError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', { credential, ...extra })
      onSuccess(data)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (detail === 'new_google_user') { setGoogleCred(credential); setNeedsBiz(true) }
      else setError(detail || 'Google sign-in failed')
    } finally { setLoading(false) }
  }

  if (needsBiz && googleCred) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0f0f0e' }}>
        <div className="w-full max-w-md animate-slide-up">
          <div className="flex items-center gap-3 mb-8">
            <BrandMark size={36} />
            <span className="text-white font-bold text-xl tracking-tight">WashFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Set up your workspace</h1>
          <p className="text-sm mb-8" style={{ color: '#737370' }}>Almost there — just a few details about your business.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#737370' }}>Business name</label>
              <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="e.g. Muhindi Laundry"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-[#525250] outline-none text-sm transition-all"
                style={{ background: '#1a1a18', border: '1px solid #2c2c2a' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2c2c2a'; e.currentTarget.style.boxShadow = '' }}
                autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest" style={{ color: '#737370' }}>First shop / branch name</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Main Branch"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-[#525250] outline-none text-sm transition-all"
                style={{ background: '#1a1a18', border: '1px solid #2c2c2a' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.15)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#2c2c2a'; e.currentTarget.style.boxShadow = '' }}
              />
              <p className="text-xs mt-1.5" style={{ color: '#525250' }}>You can add more branches later from Settings.</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(190,18,60,0.12)', border: '1px solid rgba(190,18,60,0.25)' }}>
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            <button disabled={!bizName.trim() || !shopName.trim() || loading}
              onClick={() => void callGoogleAuth(googleCred, { business_name: bizName, first_shop_name: shopName })}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-colors mt-2 disabled:opacity-40"
              style={{ background: '#f97316' }}>
              {loading ? 'Creating workspace…' : 'Create workspace →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-disabled)' }}>or continue with</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 alert alert-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(res) => { if (res.credential) void callGoogleAuth(res.credential) }}
          onError={() => setError('Google sign-in failed')}
          theme="outline" size="large" width="320" text="signin_with"
        />
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as any)?.from ?? '/dashboard'

  const handleAuth = (data: AuthResponse) => {
    setAuth({ token: data.access_token, user: data.user, tenant: data.tenant, shops: data.shops, activeShopId: data.active_shop_id })
    navigate(from, { replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const { data } = await client.post<AuthResponse>('/auth/login', { email, password })
      handleAuth(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>

      {/* Left panel — brand story */}
      <div
        className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 flex-col justify-between px-10 xl:px-14 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #111110 0%, #1a1410 60%, #2a1800 100%)' }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        <div className="absolute bottom-20 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 70%)', transform: 'translateX(30%)' }} />

        <div className="relative flex items-center gap-3">
          <BrandMark size={32} />
          <span className="text-white font-bold text-lg tracking-tight">WashFlow</span>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Trusted by laundry businesses across East Africa
          </div>
          <h2 className="text-[2.4rem] font-bold text-white leading-[1.1] mb-4 tracking-tight">
            Your entire laundry<br />business. One screen.
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#a8a8a5' }}>
            Manage every shop, every order, every team member — without switching tabs or losing context.
          </p>
          <ul className="space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(249,115,22,0.20)' }}>
                  <CheckCircle2 className="w-3 h-3 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-none mb-0.5">{f.label}</p>
                  <p className="text-xs" style={{ color: '#737370' }}>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs" style={{ color: '#525250' }}>© 2026 WashFlow. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <BrandMark size={28} />
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>WashFlow</span>
          </div>

          <h1 className="text-2xl font-bold mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>Sign in to your workspace</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="you@example.com" className="input-base" autoComplete="email" />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required placeholder="••••••••" className="input-base" autoComplete="current-password" />
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn btn-primary btn-md w-full justify-center text-[0.9375rem]">
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>

          <GoogleAuthSection onSuccess={handleAuth} />

          <div className="mt-7 pt-6 space-y-2.5" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              New shop owner?{' '}
              <Link to="/signup" className="font-medium" style={{ color: 'var(--brand)' }}>Create account →</Link>
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Platform owner?{' '}
              <Link to="/platform-setup" className="font-medium" style={{ color: 'var(--brand)' }}>Initialize platform →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
