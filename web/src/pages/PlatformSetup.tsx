import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ShieldCheck, Shirt } from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import type { AuthResponse } from '../types'

export function PlatformSetupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.post<AuthResponse>('/auth/platform-bootstrap', { name, email, password })
      setAuth({ token: data.access_token, user: data.user, tenant: data.tenant, shops: data.shops, activeShopId: data.active_shop_id })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Platform setup failed')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-stone-900 border border-stone-700 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow text-white placeholder:text-stone-600'

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
            <Shirt className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">WashFlow</span>
        </div>

        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3.5 mb-7">
          <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 text-xs font-semibold mb-0.5">One-time operation</p>
            <p className="text-amber-400/70 text-xs leading-relaxed">
              Creates the platform owner account. Can only be run once.
            </p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-white mb-1 tracking-tight">Initialize platform</h1>
        <p className="text-stone-400 text-sm mb-7">This account will have access to all tenant metrics.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Platform Admin" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@washflow.io" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5">Password</label>
            <input type="password" value={password} minLength={8} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={inputCls} />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Initializing…' : 'Create platform owner'}
          </button>
        </form>
      </div>
    </div>
  )
}
