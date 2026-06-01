import { useEffect } from 'react'
import { resolveMode, useThemeStore } from '../store/theme'

export function useThemeInit() {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    function apply() {
      document.documentElement.classList.toggle('dark', resolveMode(mode) === 'dark')
    }
    apply()

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [mode])
}
