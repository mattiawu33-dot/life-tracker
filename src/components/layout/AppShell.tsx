import { Outlet } from 'react-router'
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
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pt-6 pb-28 md:px-10 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>
      <BottomTabBar />
    </div>
  )
}
