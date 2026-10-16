import { useEffect, useState } from 'react'
import { formatTime, todayISO } from '../../lib/dates'
import { notify } from '../../lib/notifications'
import { load, save } from '../../lib/storage'
import { useTasks } from '../tasks/store'
import { dueReminders, timeOf, type DueReminder } from './items'

const SHOWN_KEY = 'reminders:shown'

/**
 * In-app reminders: checks every 20 seconds while the app is open and shows a
 * reminder card (plus a system notification if you allowed them). Once Google
 * Calendar sync is on, Google sends the reminder for synced items too.
 */
export function useReminders() {
  const { state } = useTasks()
  const [active, setActive] = useState<DueReminder[]>([])

  useEffect(() => {
    function check() {
      const shown = new Set(load<string[]>(SHOWN_KEY, []))
      const due = dueReminders(state.tasks, new Date(), shown)
      if (!due.length) return
      for (const r of due) {
        shown.add(r.key)
        notify(r.title, `Starts at ${formatTime(timeOf(r.start))}`)
      }
      // Keep only recent keys so the list doesn't grow forever.
      const keep = todayISO(new Date(Date.now() - 2 * 86_400_000))
      save(SHOWN_KEY, [...shown].filter((k) => (k.split('@')[1] ?? '') >= keep))
      setActive((prev) => [...prev, ...due])
    }
    check()
    const timer = setInterval(check, 20_000)
    return () => clearInterval(timer)
  }, [state.tasks])

  return { active, dismiss: (key: string) => setActive((prev) => prev.filter((r) => r.key !== key)) }
}
