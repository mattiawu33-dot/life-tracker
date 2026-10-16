import { createContext, useContext } from 'react'

/** What the user picked. `system` follows the phone/laptop setting. */
export type ThemePreference = 'system' | 'light' | 'dark'

/** Must match the key read by the inline script in index.html (`lt:` + this). */
export const THEME_STORAGE_KEY = 'theme'

export interface ThemeContextValue {
  preference: ThemePreference
  /** What is actually on screen right now. */
  resolved: 'light' | 'dark'
  setPreference: (pref: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
