import { FormEvent, useEffect, useState } from 'react'
import { Plus, AlertCircle, X, Pencil, Trash2, Check, Tag } from 'lucide-react'
import client from '../api/client'
import { useAuthStore } from '../store/auth'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Select } from '../components/Select'
import { Modal } from '../components/Modal'

export interface Service {
  id: string
  tenant_id: string
  shop_id: string | null
  name: string
  category: string
  unit: string
  price_per_unit: number
  is_active: boolean
  created_at: string
}

const CATEGORY_COLOR: Record<string, string> = {
  washing:      'bg-sky-50 text-sky-700 border-sky-200',
  ironing:      'bg-violet-50 text-violet-700 border-violet-200',
  dry_cleaning: 'bg-amber-50 text-amber-700 border-amber-200',
  general:      'bg-stone-100 text-stone-600 border-stone-200',
  delivery:     'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const UNITS = ['kg', 'item', 'piece', 'shirt', 'trouser', 'suit', 'dress', 'curtain', 'blanket', 'pair', 'set']
const CATEGORIES = ['washing', 'ironing', 'dry_cleaning', 'delivery', 'general']

const inputCls = 'input-base'

export function ServicesPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const shops = useAuthStore((s) => s.shops)
  const activeShopId = useAuthStore((s) => s.activeShopId)

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Create form
  const [name, setName] = useState('')
  const [category, setCategory] = useState('washing')
  const [unit, setUnit] = useState('kg')
  const [price, setPrice] = useState('')
  const [shopScope, setShopScope] = useState<string>('') // '' = all shops
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await client.get<Service[]>('/services')
      setServices(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load services')
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
      const { data } = await client.post<Service>('/services', {
        name, category, unit,
        price_per_unit: parseFloat(price),
        shop_id: shopScope || null,
      })
      setServices((p) => [...p, data])
      setName(''); setCategory('washing'); setUnit('kg'); setPrice(''); setShopScope('')
      setShowForm(false)
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Could not create service')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (svc: Service) => {
    setEditingId(svc.id)
    setEditName(svc.name)
    setEditCategory(svc.category)
    setEditUnit(svc.unit)
    setEditPrice(String(svc.price_per_unit))
    setEditError(null)
  }

  const saveEdit = async (svc: Service) => {
    setEditSaving(true)
    setEditError(null)
    try {
      const { data } = await client.put<Service>(`/services/${svc.id}`, {
        name: editName,
        category: editCategory,
        unit: editUnit,
        price_per_unit: parseFloat(editPrice),
      })
      setServices((p) => p.map((s) => (s.id === data.id ? data : s)))
      setEditingId(null)
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Could not save')
    } finally {
      setEditSaving(false)
    }
  }

  const deleteService = async (id: string) => {
    setDeletingId(id)
    try {
      await client.delete(`/services/${id}`)
      setServices((p) => p.filter((s) => s.id !== id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not delete')
    } finally {
      setDeletingId(null)
    }
  }

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  // Group by category
  const grouped: Record<string, Service[]> = {}
  for (const svc of services) {
    if (!grouped[svc.category]) grouped[svc.category] = []
    grouped[svc.category].push(svc)
  }

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />
  const headerSlot = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-semibold text-stone-900 leading-none mb-0.5">Service Catalog</h1>
        <p className="text-xs text-stone-400">Price list &amp; POS items — {tenant?.name}</p>
      </div>
      {canManage && (
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Add service
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

      <Modal open={showForm} onClose={() => { setShowForm(false); setFormError(null) }} title="New service" subtitle="Add to the price catalog">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Service name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Wash &amp; Fold" className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
              <Select value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Unit</label>
              <Select value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Price per unit (KES) *</label>
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Available in</label>
              <Select value={shopScope} onChange={setShopScope} options={[{ value: '', label: 'All shops' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} placeholder="All shops" />
            </div>
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> {submitting ? 'Saving…' : 'Add service'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 hover:text-stone-700 px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-stone-200 border-t-orange-500 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm py-16 text-center">
          <Tag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm text-stone-400 mb-1">No services in the catalog yet</p>
          <p className="text-xs text-stone-300">Add wash &amp; fold, ironing, dry cleaning services with prices</p>
          {canManage && <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-orange-600 hover:text-orange-700 font-medium">Add first service →</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, svcs]) => (
            <div key={cat} className="card">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${CATEGORY_COLOR[cat] ?? CATEGORY_COLOR.general}`}>{cat.replace('_', ' ')}</span>
                <span className="text-xs text-stone-400">{svcs.length} service{svcs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-stone-50">
                {svcs.map((svc) => {
                  const isEditing = editingId === svc.id
                  const isConfirm = confirmDeleteId === svc.id
                  const isDeleting = deletingId === svc.id

                  if (isConfirm) {
                    return (
                      <div key={svc.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap bg-red-50">
                        <p className="text-sm text-stone-700">Delete <strong>{svc.name}</strong>?</p>
                        <button onClick={() => deleteService(svc.id)} disabled={isDeleting}
                          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 px-3 py-1.5 rounded-lg">
                          {isDeleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100">Cancel</button>
                      </div>
                    )
                  }

                  if (isEditing) {
                    return (
                      <div key={svc.id} className="px-5 py-3.5 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`sm:col-span-2 ${inputCls}`} placeholder="Name" />
                          <Select value={editCategory} onChange={setEditCategory} options={CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') }))} />
                          <Select value={editUnit} onChange={setEditUnit} options={UNITS.map((u) => ({ value: u, label: u }))} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className={`w-36 ${inputCls}`} placeholder="Price" />
                          <span className="text-xs text-stone-400">KES / {editUnit}</span>
                          <div className="ml-auto flex gap-2">
                            <button onClick={() => saveEdit(svc)} disabled={editSaving}
                              className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                              <Check className="w-3.5 h-3.5" /> {editSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-100">Cancel</button>
                          </div>
                        </div>
                        {editError && <p className="text-xs text-red-600">{editError}</p>}
                      </div>
                    )
                  }

                  return (
                    <div key={svc.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="text-sm font-medium text-stone-900">{svc.name}</p>
                          <p className="text-xs text-stone-400">per {svc.unit}{svc.shop_id ? ` · ${shops.find((s) => s.id === svc.shop_id)?.name ?? 'one shop'}` : ' · all shops'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-stone-900">KES {Number(svc.price_per_unit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                        {canManage && (
                          <>
                            <button onClick={() => startEdit(svc)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setConfirmDeleteId(svc.id)} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
