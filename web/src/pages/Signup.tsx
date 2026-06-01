import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export function SignupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { clientId: googleClientId } = useGoogleOAuth()

  const [ownerName, setOwnerName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [firstShopName, setFirstShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleCred, setGoogleCred] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  const handleAuth = (data: AuthResponse) => {
    setAuth({ token: data.access_token, user: data.user, tenant: data.tenant, shops: data.shops, activeShopId: data.active_shop_id })
    navigate('/onboarding')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      const { data } = await client.post<AuthResponse>('/auth/signup', {
        owner_name: ownerName, business_name: businessName, first_shop_name: firstShopName, email, password,
      })
      handleAuth(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account')
    } finally { setLoading(false) }
  }

  const onGoogleCredential = async (credential: string) => {
    setGoogleLoading(true); setGoogleError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', { credential })
      handleAuth(data)
    } catch (err: any) {
      if (err.response?.data?.detail === 'new_google_user') setGoogleCred(credential)
      else setGoogleError(err.response?.data?.detail || 'Google sign-in failed')
    } finally { setGoogleLoading(false) }
  }

  const onGoogleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!googleCred) return
    setGoogleLoading(true); setGoogleError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', {
        credential: googleCred, business_name: businessName, first_shop_name: firstShopName,
      })
      handleAuth(data)
    } catch (err: any) {
      setGoogleError(err.response?.data?.detail || 'Failed to create workspace')
    } finally { setGoogleLoading(false) }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      <div
        className="hidden lg:flex w-[400px] xl:w-[460px] shrink-0 flex-col justify-between px-10 xl:px-14 py-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #111110 0%, #1a1410 60%, #2a1800 100%)' }}
      >
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)', transform: 'translate(-30%,-30%)' }} />
        <div className="relative flex items-center gap-3">
          <BrandMark size={32} />
          <span className="text-white font-bold text-lg tracking-tight">WashFlow</span>
        </div>
        <div className="relative space-y-6">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#fb923c' }}>Free to get started</span>
            <h2 className="text-[2.2rem] font-bold text-white leading-tight mt-2 tracking-tight">Your business,<br />your rules.</h2>
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#a8a8a5' }}>
              One account, all your shops. Add staff, track orders, and grow without the chaos.
            </p>
          </div>
          <ul className="space-y-3">
            {['No setup fees', 'Unlimited orders', 'Multi-branch support', 'M-Pesa integrated'].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs" style={{ color: '#525250' }}>© 2026 WashFlow. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <BrandMark size={28} />
            <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>WashFlow</span>
          </div>
          <h1 className="text-2xl font-bold mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>Create your workspace</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>Start as owner, then add shops, admins and workers.</p>

          {googleClientId && !googleCred && (
            <>
              <div className="flex justify-center mb-4">
                <GoogleLogin
                  onSuccess={(res) => { if (res.credential) void onGoogleCredential(res.credential) }}
                  onError={() => setGoogleError('Google sign-in failed')}
                  theme="outline" size="large" width="360" text="signup_with"
                />
              </div>
              {googleError && <div className="alert alert-error mb-3 text-sm"><AlertCircle className="w-4 h-4 shrink-0" /><span>{googleError}</span></div>}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-disabled)' }}>or sign up with email</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-default)' }} />
              </div>
            </>
          )}

          {googleCred ? (
            <form onSubmit={onGoogleSignup} className="space-y-4">
              <div className="alert alert-info text-sm"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>Google account connected — tell us about your business.</span></div>
              <div>
                <label className="form-label">Business name</label>
                <input placeholder="Acme Laundry" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="input-base" />
              </div>
              <div>
                <label className="form-label">First shop name</label>
                <input placeholder="e.g. Main Branch" value={firstShopName} onChange={(e) => setFirstShopName(e.target.value)} required className="input-base" />
              </div>
              {googleError && <div className="alert alert-error text-sm"><AlertCircle className="w-4 h-4 shrink-0" /><span>{googleError}</span></div>}
              <button type="submit" disabled={googleLoading} className="btn btn-primary btn-md w-full justify-center">
                {googleLoading ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Creating…</> : 'Create workspace →'}
              </button>
              <button type="button" onClick={() => setGoogleCred(null)} className="w-full text-xs text-center transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Use a different account</button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Your full name</label>
                  <input placeholder="Jane Doe" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="input-base" autoComplete="name" />
                </div>
                <div>
                  <label className="form-label">Business name</label>
                  <input placeholder="Acme Laundry" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="input-base" />
                </div>
              </div>
              <div>
                <label className="form-label">First shop / branch</label>
                <input placeholder="e.g. Main Branch" value={firstShopName} onChange={(e) => setFirstShopName(e.target.value)} required className="input-base" />
                <p className="form-hint">You can add more branches later in Settings.</p>
              </div>
              <div>
                <label className="form-label">Work email</label>
                <input type="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-base" autoComplete="email" />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input type="password" placeholder="8+ characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="input-base" autoComplete="new-password" />
              </div>
              {error && <div className="alert alert-error text-sm"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
              <button type="submit" disabled={loading} className="btn btn-primary btn-md w-full justify-center text-[0.9375rem]">
                {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Creating workspace…</> : 'Create workspace →'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium" style={{ color: 'var(--brand)' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
