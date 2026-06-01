import { useEffect, useRef, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react'
import client from '../api/client'
import { AppShell } from '../components/AppShell'
import { PlatformNav } from '../components/PlatformNav'

interface UserRow {
  id: string
  name: string
  email: string
  is_platform_owner: boolean
  is_active: boolean
  tenants: string[]
  roles: string[]
  created_at: string
}

const ROLE_BADGE: Record<string, string> = {
  owner:  'bg-violet-50 text-violet-700',
  admin:  'bg-blue-50 text-blue-700',
  worker: 'bg-stone-100 text-stone-600',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PlatformUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const PAGE_SIZE = 30

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
  }, [search])

  useEffect(() => {
    setLoading(true)
    client.get<{ items: UserRow[]; total: number }>(`/platform/users?page=${page}&page_size=${PAGE_SIZE}&q=${encodeURIComponent(debouncedSearch)}`)
      .then(r => { setUsers(r.data.items); setTotal(r.data.total) })
      .catch(e => setError(e.response?.data?.detail || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  const pages = Math.ceil(total / PAGE_SIZE)

  return (
    <AppShell orgName="Platform Console" orgRole="Platform Owner" sidebarNav={<PlatformNav />}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Platform Users</h1>
          <p className="text-sm text-stone-500">{total} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">No users found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden sm:table-cell">Organization(s)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">Role(s)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-sm shrink-0 select-none">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-stone-900">{u.name}</p>
                          {u.is_platform_owner && <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />}
                        </div>
                        <p className="text-xs text-stone-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {u.tenants.length === 0
                      ? <span className="text-stone-400 text-xs">—</span>
                      : <div className="flex flex-wrap gap-1">
                          {u.tenants.slice(0, 2).map(t => (
                            <span key={t} className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                          {u.tenants.length > 2 && <span className="text-xs text-stone-400">+{u.tenants.length - 2}</span>}
                        </div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map(r => (
                        <span key={r} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[r] ?? 'bg-stone-100 text-stone-500'}`}>{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full block ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-stone-500">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
