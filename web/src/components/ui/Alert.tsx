import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const icons = {
  error:   AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info:    Info,
}

interface AlertProps {
  variant?: AlertVariant
  message: string
  onDismiss?: () => void
  className?: string
}

export function Alert({ variant = 'error', message, onDismiss, className }: AlertProps) {
  const Icon = icons[variant]
  return (
    <div className={cn('alert', `alert-${variant}`, className)} role="alert">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1 text-sm">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
