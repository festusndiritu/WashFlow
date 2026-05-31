import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Shirt } from 'lucide-react'
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

const FEATURES = [
  'Multi-location shop management',
  'Role-based staff access controls',
  'Live order & customer tracking',
  'Cross-shop analytics for owners',
]

const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow text-stone-900 placeholder:text-stone-400'

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
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/google', { credential, ...extra })
      onSuccess(data)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (detail === 'new_google_user') {
        setGoogleCred(credential)
        setNeedsBiz(true)
      } else {
        setError(detail || 'Google sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  // Full-screen workspace setup — replaces login page entirely
  if (needsBiz && googleCred) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Shirt className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">WashFlow</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Set up your workspace</h1>
          <p className="text-stone-400 text-sm mb-8">You're almost in — just tell us about your business.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Business name</label>
              <input
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g. Muhindi Supermarket"
                className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">First shop / branch name</label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Main Branch"
                className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-stone-500 mt-1.5">You can add more branches later from Settings.</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            <button
              disabled={!bizName.trim() || !shopName.trim() || loading}
              onClick={() => void callGoogleAuth(googleCred, { business_name: bizName, first_shop_name: shopName })}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors text-sm mt-2"
            >
              {loading ? 'Creating your workspace…' : 'Create workspace →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 font-medium shrink-0">or continue with</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(res) => { if (res.credential) void callGoogleAuth(res.credential) }}
          onError={() => setError('Google sign-in failed')}
          theme="outline"
          size="large"
          width="320"
          text="signin_with"
        />
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAuth = (data: AuthResponse) => {
    setAuth({ token: data.access_token, user: data.user, tenant: data.tenant, shops: data.shops, activeShopId: data.active_shop_id })
    navigate('/dashboard')
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await client.post<AuthResponse>('/auth/login', { email, password })
      handleAuth(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 px-10 py-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Shirt className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">WashFlow</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-[1.15] mb-5 tracking-tight">
            Your entire laundry business. One screen.
          </h2>
          <p className="text-orange-100 text-sm leading-relaxed mb-8">
            Manage every shop, every order, every team member — without switching tabs or losing context.
          </p>
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-orange-200/70 text-xs">© 2026 WashFlow. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-stone-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <Shirt className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-stone-900 text-sm">WashFlow</span>
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-1 tracking-tight">Welcome back</h1>
          <p className="text-stone-500 text-sm mb-8">Sign in to your workspace</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Password</label>
              <input type="password" value={password} minLength={8} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <GoogleAuthSection onSuccess={handleAuth} />

          <div className="mt-7 space-y-2.5 border-t border-stone-200 pt-6">
            <p className="text-sm text-stone-500">
              New shop owner?{' '}
              <Link to="/signup" className="text-orange-600 hover:text-orange-700 font-medium">Create account →</Link>
            </p>
            <p className="text-sm text-stone-500">
              Platform owner?{' '}
              <Link to="/platform-setup" className="text-orange-600 hover:text-orange-700 font-medium">Initialize platform →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
