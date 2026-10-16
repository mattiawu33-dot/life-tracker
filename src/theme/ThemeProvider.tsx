import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { load, save } from '../lib/storage'
import { THEME_STORAGE_KEY, ThemeContext, type ThemePreference } from './theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Is the surrounding environment dark?
 *
 * Normally that's the phone/laptop setting. But when the app is embedded in a
 * page that has its own theme switch (like the Claude artifact preview), that
 * page puts `data-theme="light"` or `"dark"` on <html>. If it's there, it wins,
 * so the app always matches what's around it.
 */
function environmentIsDark(): boolean {
  const host = document.documentElement.getAttribute('data-theme')
  if (host === 'light' || host === 'dark') return host === 'dark'
  return darkQuery().matches
}

/**
 * Holds the theme choice and keeps the `dark` class on <html> in sync with it.
 * Wrap the whole app in this once (see main.tsx); any component can then call
 * `useTheme()` to read or change the theme.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    load<ThemePreference>(THEME_STORAGE_KEY, 'system'),
  )
  const [systemDark, setSystemDark] = useState(environmentIsDark)

  // Re-check when the OS switches theme (e.g. at sunset) or a host page flips data-theme.
  useEffect(() => {
    const update = () => setSystemDark(environmentIsDark())
    const mq = darkQuery()
    mq.addEventListener('change', update)
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      observer.disconnect()
    }
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
