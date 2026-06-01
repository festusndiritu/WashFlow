import { FormEvent, useEffect, useState } from 'react'
import { Plus, AlertCircle, Users, X, Trash2, ShieldCheck, Wrench, Crown } from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Select } from '../components/Select'
import { Modal } from '../components/Modal'

interface TeamMember {
  id: string
  user_id: string
  role: string
  email: string
  created_at: string
  shop_assignments: { shop_id: string; shop_name: string }[]
}

interface Shop {
  id: string
  name: string
}

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-orange-50 text-orange-700 border border-orange-200',
  admin: 'bg-sky-50 text-sky-700 border border-sky-200',
  worker: 'bg-stone-100 text-secondary border border-stone-200',
}

const ROLE_ICON: Record<string, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  worker: Wrench,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputCls = 'input-base'

export function TeamPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops) as Shop[]

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('worker')
  const [inviteShopId, setInviteShopId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.get<TeamMember[]>('/team')
      setMembers(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      const { data } = await client.post<TeamMember>('/team', {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
        shop_id: inviteShopId || null,
      })
      setMembers((p) => [...p, data])
      setInviteName(''); setInviteEmail(''); setInvitePassword(''); setInviteRole('worker'); setInviteShopId('')
      setShowForm(false)
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Could not add member')
    } finally {
      setSubmitting(false)
    }
  }

  const removeMember = async (member: TeamMember) => {
    setDeletingId(member.user_id)
    try {
      await client.delete(`/team/${member.user_id}`)
      setMembers((p) => p.filter((m) => m.user_id !== member.user_id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not remove member')
    } finally {
      setDeletingId(null)
    }
  }

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-primary leading-none mb-0.5">Team</h1>
        <p className="text-xs text-tertiary">{tenant?.name}</p>
      </div>
      {canManage && (
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add member
        </button>
      )}
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null) }} title="Add team member" subtitle="Create login credentials for a new staff member">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Full name *</label>
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required placeholder="Full name" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Email *</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required placeholder="staff@example.com" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Password *</label>
              <input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} required minLength={8} placeholder="Min 8 chars" className={inputCls} autoComplete="new-password" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Role *</label>
              <Select value={inviteRole} onChange={setInviteRole} options={[
                ...(user?.role === 'owner' ? [{ value: 'admin', label: 'Admin' }] : []),
                { value: 'worker', label: 'Worker' },
              ]} />
            </div>
            {shops.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Assign to shop</label>
                <Select value={inviteShopId} onChange={setInviteShopId} options={[{ value: '', label: 'All shops' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} placeholder="All shops" />
              </div>
            )}
          </div>
          {formError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{formError}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> {submitting ? 'Adding…' : 'Add member'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-secondary px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-theme flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">Team members</p>
          <span className="text-xs text-tertiary">{members.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-disabled mx-auto mb-2" />
            <p className="text-sm text-tertiary">No team members yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {members.map((m) => {
              const RoleIcon = ROLE_ICON[m.role] ?? Wrench
              const isMe = m.user_id === user?.id
              const isOwner = m.role === 'owner'
              const canRemove = canManage && !isMe && !isOwner && !(user?.role === 'admin' && m.role === 'admin')
              const isConfirm = confirmDeleteId === m.user_id
              const isDeleting = deletingId === m.user_id

              if (isConfirm) {
                return (
                  <div key={m.user_id} className="px-5 py-4 flex items-center gap-3 flex-wrap bg-red-50">
                    <p className="text-sm text-secondary">Remove <strong>{m.email}</strong> from the team?</p>
                    <button onClick={() => removeMember(m)} disabled={isDeleting}
                      className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors">
                      {isDeleting ? 'Removing…' : 'Yes, remove'}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-secondary hover:text-secondary px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
                  </div>
                )
              }

              return (
                <div key={m.user_id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-subtle transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                      <RoleIcon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-primary truncate">{m.email}</p>
                        {isMe && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">You</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${ROLE_BADGE[m.role] ?? ROLE_BADGE.worker}`}>{m.role}</span>
                        {m.shop_assignments?.length > 0 && (
                          <span className="text-xs text-tertiary">{m.shop_assignments.map((s) => s.shop_name).join(', ')}</span>
                        )}
                        {m.created_at && <span className="text-xs text-disabled">since {formatDate(m.created_at)}</span>}
                      </div>
                    </div>
                  </div>
                  {canRemove && (
                    <button onClick={() => setConfirmDeleteId(m.user_id)}
                      className="p-1.5 text-disabled hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" title="Remove member">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
