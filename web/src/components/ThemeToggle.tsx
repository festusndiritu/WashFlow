import { Sun, Moon, Monitor } from 'lucide-react'
import { type ThemeMode, useThemeStore } from '../store/theme'

const CYCLE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' }
const LABEL: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const ICON = { light: Sun, dark: Moon, system: Monitor } as const

/** Standalone theme toggle — icon only, adapts to current theme context */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { mode, setMode } = useThemeStore()
  const Icon = ICON[mode]

  return (
    <button
      onClick={() => setMode(CYCLE[mode])}
      title={`Theme: ${LABEL[mode]}`}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-white/8 ${className}`}
    >
      <Icon className="w-[14px] h-[14px]" />
    </button>
  )
}

