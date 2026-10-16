import { NavLink } from 'react-router'
import { ThemeToggle } from '../../theme/ThemeToggle'
import { NAV_ITEMS } from './navItems'

/** Desktop navigation (hidden on phones; see AppShell). */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
      <div className="flex items-center gap-2.5 px-3 pb-8">
        <img src="/favicon.svg" alt="" className="size-7" />
        <span className="text-base font-semibold tracking-tight">Life Tracker</span>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent-ink'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            <Icon className="size-[18px]" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <ThemeToggle showLabel />
      </div>
    </aside>
  )
}
