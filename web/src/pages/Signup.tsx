import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Shirt } from 'lucide-react'
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-stone-900 placeholder:text-stone-400'

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
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await client.post<AuthResponse>('/auth/signup', {
        owner_name: ownerName,
        business_name: businessName,
        first_shop_name: firstShopName,
        email,
        password,
      })
      handleAuth(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const onGoogleCredential = async (credential: string) => {
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', { credential })
      handleAuth(data)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (detail === 'new_google_user') {
        setGoogleCred(credential)
      } else {
        setGoogleError(detail || 'Google sign-in failed')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const onGoogleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (!googleCred) return
    setGoogleLoading(true)
    setGoogleError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', {
        credential: googleCred,
        business_name: businessName,
        first_shop_name: firstShopName,
      })
      handleAuth(data)
    } catch (err: any) {
      setGoogleError(err.response?.data?.detail || 'Failed to create workspace')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[380px] shrink-0 flex-col justify-between bg-stone-950 px-10 py-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">WashFlow</span>
        </div>
        <div>
          <span className="inline-block text-[11px] font-semibold tracking-widest text-orange-400 uppercase mb-4">Get started free</span>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4 tracking-tight">Your business,<br />your rules.</h2>
          <p className="text-stone-400 text-sm leading-relaxed">One account, all your shops. Add staff, track orders, and grow — without the chaos.</p>
        </div>
        <p className="text-stone-600 text-xs">© 2026 WashFlow. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-stone-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <Shirt className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-stone-900 text-sm">WashFlow</span>
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">Create your workspace</h1>
          <p className="text-stone-500 text-sm mb-8">Start as owner, then add shops, admins, and workers.</p>

          {googleClientId && !googleCred && (
            <>
              <div className="flex justify-center mb-4">
                <GoogleLogin
                  onSuccess={(res) => { if (res.credential) void onGoogleCredential(res.credential) }}
                  onError={() => setGoogleError('Google sign-in failed')}
                  theme="outline" size="large" width="360" text="signup_with"
                />
              </div>
              {googleError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-700 text-xs">{googleError}</p>
                </div>
              )}
              <div className="relative flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium shrink-0">or sign up with email</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            </>
          )}

          {googleCred ? (
            <form onSubmit={onGoogleSignup} className="space-y-4">
              <p className="text-sm text-stone-600 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5">
                Google account connected — now tell us about your business.
              </p>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Business name</label>
                <input placeholder="Acme Laundry" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">First shop name</label>
                <input placeholder="e.g. Main Branch" value={firstShopName} onChange={(e) => setFirstShopName(e.target.value)} required className={inputCls} />
              </div>
              {googleError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-700 text-sm">{googleError}</p>
                </div>
              )}
              <button type="submit" disabled={googleLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                {googleLoading ? 'Creating workspace…' : 'Create workspace →'}
              </button>
              <button type="button" onClick={() => setGoogleCred(null)} className="w-full text-xs text-stone-400 hover:text-stone-600">← Use a different account</button>
            </form>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">Your name</label>
                  <input placeholder="Full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">Business name</label>
                  <input placeholder="Acme Laundry" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">First shop name</label>
                <input placeholder="e.g. Main Branch" value={firstShopName} onChange={(e) => setFirstShopName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Work email</label>
                <input type="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Password</label>
                <input type="password" placeholder="8+ characters" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors">
                {loading ? 'Creating workspace…' : 'Create workspace'}
              </button>
            </form>
          )}

          <p className="mt-6 text-sm text-stone-500 border-t border-stone-200 pt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
