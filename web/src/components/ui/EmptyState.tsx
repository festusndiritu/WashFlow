import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-muted)] flex items-center justify-center text-[var(--text-disabled)] mb-4 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</p>
      {description && (
        <p className="text-sm text-[var(--text-tertiary)] max-w-xs leading-relaxed mb-5">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
