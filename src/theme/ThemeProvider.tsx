import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { load, save } from '../lib/storage'
import { THEME_STORAGE_KEY, ThemeContext, type ThemePreference } from './theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Holds the theme choice and keeps the `dark` class on <html> in sync with it.
 * Wrap the whole app in this once (see main.tsx); any component can then call
 * `useTheme()` to read or change the theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    load<ThemePreference>(THEME_STORAGE_KEY, 'system'),
  )
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)

  // Listen for the OS switching between light and dark (e.g. at sunset).
  useEffect(() => {
    const mq = darkQuery()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  useEffect(() => {
    save(THEME_STORAGE_KEY, preference)
  }, [preference])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
