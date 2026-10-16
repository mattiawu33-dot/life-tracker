import { Outlet, useLocation } from 'react-router'
import { ReminderToasts } from '../../features/calendar/components/ReminderToasts'
import { useRollover } from '../../features/calendar/useRollover'
import { ReactionToast } from '../../features/trainer/components/ReactionToast'
import { useTrainerEvents } from '../../features/trainer/useTrainerEvents'
import { BottomTabBar } from './BottomTabBar'
import { Sidebar } from './Sidebar'

/**
 * The frame around every page.
 *
 * Mobile-first: by default (phones) we show the bottom tab bar. At the `md`
 * breakpoint (768px+) Tailwind's `md:` classes kick in: the sidebar appears
 * and the tab bar hides. <Outlet /> is where the current page is rendered.
 */
export function AppShell() {
  useTrainerEvents()
  useRollover()
  // The calendar needs room for its grid plus the day checklist.
  const wide = useLocation().pathname.startsWith('/calendar')
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">
        <div className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-3xl'}`}>
          <Outlet />
        </div>
      </main>
      <BottomTabBar />
      <ReactionToast />
      <ReminderToasts />
    </div>
  )
}
