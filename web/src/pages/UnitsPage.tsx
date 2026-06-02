import { FormEvent, useState } from 'react'
import { Ruler, Trash2, ChevronRight, Plus } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { TenantNav } from '../components/TenantNav'
import { Select } from '../components/Select'
import { useAuthStore } from '../store/auth'
import { useUnitsStore } from '../store/units'

const inputCls = 'input-base'

export function UnitsPage() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)

  const { units, addUnit, removeUnit } = useUnitsStore()
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitParent, setNewUnitParent] = useState('')
  const [unitError, setUnitError] = useState<string | null>(null)

  const topLevelUnits = units.filter((u) => u.parentId === null)
  const subunitsByParent = (parentId: string) => units.filter((u) => u.parentId === parentId)

  const handleAddUnit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newUnitName.trim()
    if (!trimmed) return
    if (units.find((u) => u.name.toLowerCase() === trimmed.toLowerCase())) {
      setUnitError('A unit with that name already exists')
      return
    }
    setUnitError(null)
    addUnit(trimmed, newUnitParent || null)
    setNewUnitName('')
    setNewUnitParent('')
  }

  const sidebarNav = <TenantNav role={user?.role ?? 'worker'} />

  const headerSlot = (
    <div>
      <h1 className="text-base font-semibold text-primary leading-none mb-0.5">Units &amp; Subunits</h1>
      <p className="text-xs text-tertiary">{tenant?.name}</p>
    </div>
  )

  return (
    <AppShell orgName={tenant?.name ?? 'Organization'} orgRole={user?.role ?? 'worker'} sidebarNav={sidebarNav} headerSlot={headerSlot}>
      <div className="max-w-xl">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-semibold text-primary">Units &amp; Subunits</h2>
            <span className="ml-auto text-xs text-tertiary">{units.length} total</span>
          </div>

          {/* Unit tree */}
          <div className="space-y-2 mb-5">
            {topLevelUnits.map((unit) => {
              const subs = subunitsByParent(unit.id)
              return (
                <div key={unit.id} className="rounded-lg border border-theme overflow-hidden">
                  {/* Parent row */}
                  <div className="flex items-center justify-between px-3 py-2 bg-subtle">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">{unit.name}</span>
                      {subs.length > 0 && (
                        <span className="text-[11px] text-tertiary">{subs.length} subunit{subs.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUnit(unit.id)}
                      className="p-1 rounded hover:bg-[var(--bg-muted)] text-disabled hover:text-red-500 transition-colors"
                      title={subs.length > 0 ? `Delete ${unit.name} and its ${subs.length} subunit(s)` : `Delete ${unit.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Subunit rows */}
                  {subs.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between px-3 py-2 border-t border-theme">
                      <div className="flex items-center gap-2 pl-3">
                        <ChevronRight className="w-3 h-3 text-disabled" />
                        <span className="text-sm text-secondary">{sub.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUnit(sub.id)}
                        className="p-1 rounded hover:bg-[var(--bg-muted)] text-disabled hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Add unit / subunit form */}
          <form onSubmit={handleAddUnit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Unit name *</label>
                <input
                  value={newUnitName}
                  onChange={(e) => { setNewUnitName(e.target.value); setUnitError(null) }}
                  placeholder="e.g. duvet, load…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Parent unit <span className="text-tertiary font-normal">(optional — makes it a subunit)</span>
                </label>
                <Select
                  value={newUnitParent}
                  onChange={setNewUnitParent}
                  options={[
                    { value: '', label: 'None — top-level unit' },
                    ...topLevelUnits.map((u) => ({ value: u.id, label: u.name })),
                  ]}
                  placeholder="None — top-level unit"
                />
              </div>
            </div>
            {unitError && <p className="text-xs text-red-600">{unitError}</p>}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add unit
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}
