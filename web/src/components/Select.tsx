import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

export function Select({ value, onChange, options, placeholder = 'Select…', required, className = '', disabled }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const openDropdown = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const DROP_H = 220
      const top = r.bottom + 4 + DROP_H > window.innerHeight
        ? Math.max(4, r.top - 4 - DROP_H)
        : r.bottom + 4
      setDropPos({ top, left: r.left, width: r.width })
    }
    setOpen((v) => !v)
  }

  // Close on outside click — must check both anchor and portalled dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        ref.current && !ref.current.contains(t) &&
        dropRef.current && !dropRef.current.contains(t)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape, scroll, resize
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = (e: Event) => {
      // Don't close when scrolling inside the portalled dropdown
      if (dropRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    window.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Hidden native select for form validation / accessibility */}
      {required && (
        <select
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          value={value}
          onChange={() => {}}
          className="absolute inset-0 w-full opacity-0 pointer-events-none"
        >
          <option value="" />
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm bg-surface border rounded-lg outline-none transition-shadow text-left ${
          open ? 'ring-2 ring-orange-400 border-transparent' : 'border-stone-200 hover:border-stone-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${!selected ? 'text-tertiary' : 'text-primary'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-tertiary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && dropPos && createPortal(
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-surface border-theme rounded-xl shadow-xl overflow-hidden"
          style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
        >
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    opt.value === value
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-secondary hover:bg-subtle'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      , document.body)}
    </div>
  )
}

