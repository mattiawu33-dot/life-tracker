import { BellRing, X } from 'lucide-react'
import { formatTime, relativeDay, toISODate, todayISO } from '../../../lib/dates'
import { timeOf } from '../items'
import { useReminders } from '../useReminders'

/** Reminder cards at the top of the screen. They stay until you dismiss them. */
export function ReminderToasts() {
  const { active, dismiss } = useReminders()
  if (!active.length) return null
  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex flex-col items-center gap-2 px-4 md:top-4 md:right-6 md:left-auto md:items-end md:px-0"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {active.map((r) => (
        <div
          key={r.key}
          role="alert"
          className="pointer-events-auto flex w-full max-w-sm animate-[pop-in_200ms_ease-out] items-start gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{r.title}</p>
            <p className="text-xs text-ink-muted">
              {relativeDay(toISODate(r.start), todayISO())} at {formatTime(timeOf(r.start))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(r.key)}
            aria-label="Dismiss reminder"
            className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
