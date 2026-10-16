import { BarChart3, CalendarDays, CheckSquare, Flame, Sun, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** The five main sections. Both the sidebar and the bottom tab bar read this list. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/habits', label: 'Habits', icon: Flame },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
]
