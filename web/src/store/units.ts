import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UnitEntry {
  id: string          // stable identifier (slug)
  name: string        // display name, used as value in services
  parentId: string | null  // null = top-level unit; set = subunit of that unit
}

// Default catalog — pieces are subunits of 'piece'
const DEFAULT_UNITS: UnitEntry[] = [
  { id: 'kg',       name: 'kg',       parentId: null },
  { id: 'g',        name: 'g',        parentId: 'kg' },
  { id: 'piece',    name: 'piece',    parentId: null },
  { id: 'shirt',    name: 'shirt',    parentId: 'piece' },
  { id: 'trouser',  name: 'trouser',  parentId: 'piece' },
  { id: 'suit',     name: 'suit',     parentId: 'piece' },
  { id: 'dress',    name: 'dress',    parentId: 'piece' },
  { id: 'curtain',  name: 'curtain',  parentId: 'piece' },
  { id: 'blanket',  name: 'blanket',  parentId: 'piece' },
  { id: 'item',     name: 'item',     parentId: null },
  { id: 'pair',     name: 'pair',     parentId: null },
  { id: 'set',      name: 'set',      parentId: null },
]

interface UnitsState {
  units: UnitEntry[]
  addUnit: (name: string, parentId: string | null) => void
  removeUnit: (id: string) => void
}

export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      units: DEFAULT_UNITS,

      addUnit: (name, parentId) => {
        const slug = name.trim().toLowerCase().replace(/\s+/g, '_')
        const id = slug + '_' + Date.now()
        set((s) => ({
          units: [...s.units, { id, name: name.trim(), parentId }],
        }))
      },

      removeUnit: (id) => {
        // Removing a top-level unit also removes all its subunits
        set((s) => ({
          units: s.units.filter((u) => u.id !== id && u.parentId !== id),
        }))
      },
    }),
    { name: 'washflow-units' }
  )
)

/** Build flat Select options with subunits visually indented under their parent */
export function buildUnitOptions(units: UnitEntry[]) {
  const topLevel = units.filter((u) => u.parentId === null)
  const byParent: Record<string, UnitEntry[]> = {}
  for (const u of units) {
    if (u.parentId) {
      if (!byParent[u.parentId]) byParent[u.parentId] = []
      byParent[u.parentId].push(u)
    }
  }

  const options: { value: string; label: string }[] = []
  for (const p of topLevel) {
    options.push({ value: p.name, label: p.name })
    for (const c of byParent[p.id] ?? []) {
      options.push({ value: c.name, label: `  ↳ ${c.name}` })
    }
  }
  // Orphaned subunits (parent was deleted) — show flat
  for (const u of units) {
    if (u.parentId && !units.find((p) => p.id === u.parentId)) {
      if (!options.find((o) => o.value === u.name)) {
        options.push({ value: u.name, label: u.name })
      }
    }
  }
  return options
}
