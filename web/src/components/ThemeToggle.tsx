import { Sun, Moon, Monitor } from 'lucide-react'
import { type ThemeMode, useThemeStore } from '../store/theme'

const CYCLE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }
const LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const ICON = { light: Sun, dark: Moon, system: Monitor } as const

interface Props {
  /** 'sidebar' = always-dark context, 'topbar' = follows theme (default) */
  variant?: 'sidebar' | 'topbar'
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ variant = 'topbar', showLabel = true, className = '' }: Props) {
  const { mode, setMode } = useThemeStore()
  const Icon = ICON[mode]

  const base = `flex items-center gap-2 rounded-lg transition-colors text-xs font-medium ${showLabel ? 'px-2.5 py-2' : 'p-1.5'}`

  const variantCls = variant === 'sidebar'
    ? 'text-stone-400 hover:text-stone-200 hover:bg-white/6'
    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-white/8'

  return (
    <button
      onClick={() => setMode(CYCLE[mode])}
      title={`Theme: ${LABEL[mode]} — click to cycle`}
      className={`${base} ${variantCls} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{LABEL[mode]}</span>}
    </button>
  )
}
