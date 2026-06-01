import { cn } from '../../lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn('rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand)] animate-spin shrink-0', sizes[size], className)}
      role="status"
      aria-label="Loading"
    />
  )
}
