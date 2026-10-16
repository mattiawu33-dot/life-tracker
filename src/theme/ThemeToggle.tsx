import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from './theme'

const ORDER: ThemePreference[] = ['system', 'light', 'dark']
const META = {
  system: { icon: Monitor, label: 'System theme' },
  light: { icon: Sun, label: 'Light theme' },
  dark: { icon: Moon, label: 'Dark theme' },
} as const

/** One button that cycles System → Light → Dark. */
export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { preference, setPreference } = useTheme()
  const { icon: Icon, label } = META[preference]
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`${label}. Switch to ${META[next].label.toLowerCase()}`}
      title={label}
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-[18px]" strokeWidth={2} />
      {showLabel && <span>{label}</span>}
    </button>
  )
}
