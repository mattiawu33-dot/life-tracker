import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { CalendarPage } from './pages/CalendarPage'
import { HabitsPage } from './pages/HabitsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'

/**
 * URL → page mapping. Every route is nested inside <AppShell>, so they all
 * share the same sidebar / tab bar and render into its <Outlet />.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
