import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-stone-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-stone-900 leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
