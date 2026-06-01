import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  lines?: number
  lineHeight?: string
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonText({ lines = 3, lineHeight = 'h-4' }: SkeletonProps) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn(lineHeight, i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-5 space-y-3', className)}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5 border-b border-[var(--border-default)]">
          <Skeleton className={cn('h-4', i === 0 ? 'w-28' : i === cols - 1 ? 'w-16' : 'w-20')} />
        </td>
      ))}
    </tr>
  )
}
