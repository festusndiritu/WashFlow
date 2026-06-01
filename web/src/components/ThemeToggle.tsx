import { Sun, Moon, Monitor } from 'lucide-react'
import { type ThemeMode, useThemeStore } from '../store/theme'

const CYCLE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }
const LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

interface Props {
  /** Show label beside icon (default true) */
  showLabel?: boolean
  /** Extra class names */
  className?: string
}

export function ThemeToggle({ showLabel = true, className = '' }: Props) {
  const { mode, setMode } = useThemeStore()
  const Icon = ICON[mode]

  return (
    <button
      onClick={() => setMode(CYCLE[mode])}
      title={`Theme: ${LABEL[mode]} — click to cycle`}
      className={`flex items-center gap-1.5 rounded-lg transition-colors text-xs font-medium
        text-stone-500 hover:text-stone-800 hover:bg-stone-200/60
        dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-700/50
        ${showLabel ? 'px-2.5 py-1.5' : 'p-1.5'} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{LABEL[mode]}</span>}
    </button>
  )
}
