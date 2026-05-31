import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function startDow(y: number, m: number) { return new Date(y, m, 1).getDay() }

interface Props {
  value: string        // YYYY-MM-DD or ''
  onChange: (val: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date' }: Props) {
  const [open, setOpen] = useState(false)
  const [calPos, setCalPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const todayDate = new Date()
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`

  const parsed = value ? new Date(value + 'T00:00:00') : null
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? todayDate.getMonth())

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  // Close on scroll or resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const selectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const displayVal = parsed
    ? parsed.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  const total = daysInMonth(viewYear, viewMonth)
  const start = startDow(viewYear, viewMonth)
  const cells: (number | null)[] = []
  for (let i = 0; i < start; i++) cells.push(null)
  for (let i = 1; i <= total; i++) cells.push(i)
  while (cells.length % 7 !== 0) cells.push(null)

  const selDay = parsed?.getDate()
  const isSameView = parsed?.getFullYear() === viewYear && parsed?.getMonth() === viewMonth

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            const CAL_H = 288
            const top = r.bottom + 6 + CAL_H > window.innerHeight
              ? Math.max(4, r.top - 6 - CAL_H)
              : r.bottom + 6
            setCalPos({ top, left: Math.min(r.left, window.innerWidth - 292) })
          }
          setOpen((o) => !o)
        }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-orange-400 hover:border-stone-300 transition-colors"
      >
        <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
        <span className={`flex-1 ${displayVal ? 'text-stone-900' : 'text-stone-400'}`}>
          {displayVal || placeholder}
        </span>
        {value && (
          <span
            role="button"
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="text-stone-300 hover:text-stone-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && calPos && (
        <div className="fixed z-[9999] bg-white border border-stone-200 rounded-2xl shadow-2xl w-72 p-3"
          style={{ top: calPos.top, left: calPos.left }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-stone-900">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <span key={d} className="text-center text-[11px] font-semibold text-stone-400 py-1">{d}</span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />
              const m = String(viewMonth + 1).padStart(2, '0')
              const d = String(day).padStart(2, '0')
              const thisStr = `${viewYear}-${m}-${d}`
              const isToday = thisStr === todayStr
              const isSelected = isSameView && selDay === day

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={[
                    'h-8 w-full rounded-lg text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : isToday
                      ? 'bg-orange-50 text-orange-600 font-bold ring-1 ring-orange-200'
                      : 'text-stone-700 hover:bg-stone-100',
                  ].join(' ')}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-2 py-1 rounded hover:bg-stone-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => { onChange(todayStr); setOpen(false) }}
              className="text-xs text-orange-600 font-semibold hover:text-orange-700 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
