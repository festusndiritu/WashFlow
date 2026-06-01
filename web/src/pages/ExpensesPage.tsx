import { FormEvent, useEffect, useState } from 'react'
import {
  Plus, Trash2, AlertCircle, X, TrendingDown,
  Zap, Wrench, Package, Users, MoreHorizontal, Filter, Pencil,
} from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Modal } from '../components/Modal'
import { DatePicker } from '../components/DatePicker'

interface Expense {
  id: string
  amount: number
  category: string
  description: string
  reference: string | null
  expense_date: string
  shop_id: string | null
  shop_name: string | null
}

interface Shop { id: string; name: string }

const CATEGORIES: { value: string; label: string; icon: typeof Zap; color: string; bg: string }[] = [
  { value: 'supplies',    label: 'Supplies',    icon: Package,      color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200' },
  { value: 'utilities',   label: 'Utilities',   icon: Zap,          color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench,       color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { value: 'equipment',   label: 'Equipment',   icon: MoreHorizontal, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  { value: 'staff',       label: 'Staff',       icon: Users,        color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  { value: 'other',       label: 'Other',       icon: MoreHorizontal, color: 'text-secondary', bg: 'bg-stone-100 border-stone-200' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]))

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputCls = 'input-base'

export function ExpensesPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops) as Shop[]
  const activeShopId = useAuthStore((s) => s.activeShopId)

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('supplies')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [expenseDate, setExpenseDate] = useState(today)
  const [formShopId, setFormShopId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('supplies')
  const [editDescription, setEditDescription] = useState('')
  const [editReference, setEditReference] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (activeShopId) params.shop_id = activeShopId
      const { data } = await client.get<Expense[]>('/expenses', { params })
      setExpenses(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [activeShopId])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError('Enter a valid amount')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await client.post<Expense>('/expenses', {
        amount: parseFloat(amount),
        category,
        description: description.trim(),
        reference: reference.trim() || null,
        expense_date: expenseDate,
        shop_id: formShopId || activeShopId || null,
      })
      setExpenses((p) => [data, ...p])
      setAmount(''); setDescription(''); setReference(''); setExpenseDate(today()); setCategory('supplies'); setFormShopId('')
      setShowForm(false)
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Could not save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteExpense = async (id: string) => {
    setDeleting(true)
    try {
      await client.delete(`/expenses/${id}`)
      setExpenses((p) => p.filter((e) => e.id !== id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not delete')
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp)
    setEditAmount(String(exp.amount))
    setEditCategory(exp.category)
    setEditDescription(exp.description)
    setEditReference(exp.reference ?? '')
    setEditDate(exp.expense_date)
    setEditError(null)
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    setEditError(null)
    if (!editAmount || parseFloat(editAmount) <= 0) { setEditError('Enter a valid amount'); return }
    setEditSaving(true)
    try {
      const { data } = await client.put<Expense>(`/expenses/${editingExpense.id}`, {
        amount: parseFloat(editAmount),
        category: editCategory,
        description: editDescription.trim(),
        reference: editReference.trim() || null,
        expense_date: editDate,
      })
      setExpenses((p) => p.map((exp) => exp.id === data.id ? data : exp))
      setEditingExpense(null)
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Could not save changes')
    } finally {
      setEditSaving(false)
    }
  }

  const visible = filterCat === 'all' ? expenses : expenses.filter((e) => e.category === filterCat)
  const totalVisible = visible.reduce((s, e) => s + e.amount, 0)

  // This month totals per category
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(thisMonth))
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const catTotals = CATEGORIES.map((c) => ({
    ...c,
    total: monthExpenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)

  const canManage = user?.role === 'owner' || user?.role === 'admin'
  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-primary leading-none mb-0.5">Expenses</h1>
        <p className="text-xs text-tertiary">{tenant?.name} · Purchases, utilities, maintenance &amp; more</p>
      </div>
      {canManage && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add expense
        </button>
      )}
    </div>
  )

  return (
    <>
    <AppShell orgName={tenant?.name ?? ''} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      {error && (
        <div className="flex items-center gap-2 mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* This month summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="col-span-2 lg:col-span-1 card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide">This month</p>
            <div className="p-1.5 bg-red-50 rounded-lg"><TrendingDown className="w-3.5 h-3.5 text-red-500" /></div>
          </div>
          <p className="text-2xl font-bold text-primary tabular-nums leading-none">
            KES {Number(monthTotal).toLocaleString('en-KE')}
          </p>
          <p className="text-xs text-tertiary mt-1">{monthExpenses.length} entries</p>
        </div>
        {catTotals.slice(0, 3).map((c) => {
          const Icon = c.icon
          return (
            <div key={c.value} className="card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">{c.label}</p>
                <div className={`p-1.5 rounded-lg border ${c.bg}`}><Icon className={`w-3.5 h-3.5 ${c.color}`} /></div>
              </div>
              <p className="text-xl font-bold text-primary tabular-nums leading-none">
                KES {Number(c.total).toLocaleString('en-KE')}
              </p>
            </div>
          )
        })}
      </div>

      <Modal open={showForm && canManage} onClose={() => { setShowForm(false); setFormError(null) }} title="New expense" subtitle="Record a business expense">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Amount (KES) *</label>
              <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Date *</label>
            <DatePicker value={expenseDate} onChange={setExpenseDate} placeholder="Pick date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Detergent powder 10kg, KPLC token…" required minLength={2} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Reference / Receipt #</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            {shops.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Shop</label>
                <select value={formShopId} onChange={(e) => setFormShopId(e.target.value)} className={inputCls}>
                  <option value="">All / General</option>
                  {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {submitting ? 'Saving…' : 'Save expense'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-secondary px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 flex-wrap">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterCat === 'all' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-secondary'}`}>
            All
          </button>
          {CATEGORIES.map((c) => {
            const Icon = c.icon
            return (
              <button key={c.value} onClick={() => setFilterCat(c.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filterCat === c.value ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-secondary'}`}>
                <Icon className="w-3 h-3" /> {c.label}
              </button>
            )
          })}
        </div>
        <span className="ml-auto text-xs text-tertiary font-medium">
          {visible.length} entries · KES {Number(totalVisible).toLocaleString('en-KE')}
        </span>
      </div>

      {/* Expenses list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card py-16 text-center">
          <TrendingDown className="w-10 h-10 text-stone-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-secondary">No expenses recorded yet</p>
          {canManage && (
            <button onClick={() => setShowForm(true)}
              className="mt-3 text-xs text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add your first expense
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border-default)]">
            {visible.map((exp) => {
              const cat = CAT_MAP[exp.category] ?? CAT_MAP['other']
              const Icon = cat.icon
              return (
                <div key={exp.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-subtle transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${cat.bg}`}>
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cat.bg} ${cat.color}`}>
                          {cat.label}
                        </span>
                        {exp.reference && (
                          <span className="text-[10px] text-tertiary font-mono truncate">Ref: {exp.reference}</span>
                        )}
                        {exp.shop_name && shops.length > 1 && (
                          <span className="text-[10px] text-tertiary truncate">· {exp.shop_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary tabular-nums">
                        KES {Number(exp.amount).toLocaleString('en-KE')}
                      </p>
                      <p className="text-[10px] text-tertiary">{formatDate(exp.expense_date)}</p>
                    </div>
                    {canManage && (
                      confirmDeleteId === exp.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteExpense(exp.id)} disabled={deleting}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">
                            {deleting ? '…' : 'Delete'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-tertiary hover:text-secondary px-1">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(exp)}
                            className="text-disabled hover:text-orange-500 p-1 rounded transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(exp.id)}
                            className="text-disabled hover:text-red-500 p-1 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>

      <Modal
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="Edit expense"
        subtitle="Update the expense details"
      >
        <form onSubmit={saveEdit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Amount (KES) *</label>
              <input type="number" min="0" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Date *</label>
            <DatePicker value={editDate} onChange={setEditDate} placeholder="Pick date" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Description *</label>
            <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required minLength={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Reference / Receipt #</label>
            <input value={editReference} onChange={(e) => setEditReference(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
          {editError && <p className="text-xs text-red-600">{editError}</p>}
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={editSaving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditingExpense(null)} className="text-sm text-secondary hover:text-secondary px-4 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
