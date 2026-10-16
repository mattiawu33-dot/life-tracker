import { addDays, fromISODate, toISODate, type ISODate } from '../../lib/dates'
import { LIST_COLORS } from '../tasks/listColors'
import { currentOccurrence, occurrencesBetween } from '../tasks/recurrence'
import { viewForDay, type TaskView } from '../tasks/selectors'
import { DEFAULT_DURATION_MIN } from '../tasks/timing'
import type { Task, TaskList } from '../tasks/types'

/**
 * How tasks show up on the calendar:
 * - an item WITH a time is a block on the time grid
 * - an item WITHOUT a time belongs to that day's checklist
 */

export function atTime(day: ISODate, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = fromISODate(day)
  d.setHours(h, m, 0, 0)
  return d
}

/** "HH:mm" in local time. */
export function timeOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface CalendarItem {
  /** Unique per occurrence: task id, plus ":day" for repeating tasks. */
  id: string
  taskId: string
  day: ISODate
  title: string
  start: Date
  end: Date
  color: string
  done: boolean
  /** Repeating tasks are edited from the task itself, not by dragging. */
  repeating: boolean
}

export function calendarItems(tasks: Task[], lists: TaskList[], from: ISODate, to: ISODate, today: ISODate): CalendarItem[] {
  const colorOf = (t: Task) => {
    const list = lists.find((l) => l.id === t.listId)
    return list ? LIST_COLORS[list.color].hex : 'var(--accent)'
  }
  const out: CalendarItem[] = []
  const push = (t: Task, day: ISODate, done: boolean) => {
    const start = atTime(day, t.dueTime!)
    const end = new Date(start.getTime() + (t.durationMin ?? DEFAULT_DURATION_MIN) * 60_000)
    out.push({
      id: t.recurrence ? `${t.id}:${day}` : t.id,
      taskId: t.id,
      day,
      title: t.title || 'Untitled',
      start,
      end,
      color: colorOf(t),
      done,
      repeating: !!t.recurrence,
    })
  }

  for (const t of tasks) {
    if (!t.dueTime) continue
    if (!t.recurrence) {
      if (t.dueDate && t.dueDate >= from && t.dueDate <= to) push(t, t.dueDate, t.completedAt !== null)
      continue
    }
    const days = new Set(Object.keys(t.completions).filter((d) => d >= from && d <= to))
    for (const d of occurrencesBetween(t.recurrence, from, to)) {
      // Past occurrences only show if they were done, or if it's the one still open.
      if (d >= today || t.completions[d] || currentOccurrence(t, today) === d) days.add(d)
    }
    for (const d of days) push(t, d, !!t.completions[d])
  }
  return out
}

/** Untimed items for one day, in checklist order (unfinished first). */
export function checklistFor(tasks: Task[], day: ISODate, today: ISODate): TaskView[] {
  const views = tasks
    .filter((t) => !t.dueTime)
    .map((t) => viewForDay(t, day, today))
    .filter((v): v is TaskView => v !== null)
  return views.sort((a, b) => Number(a.done) - Number(b.done) || a.task.order - b.task.order)
}

/** Number of unfinished checklist items per day, for the month view. */
export function openCounts(tasks: Task[], from: ISODate, to: ISODate, today: ISODate): Map<ISODate, number> {
  const counts = new Map<ISODate, number>()
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const n = checklistFor(tasks, d, today).filter((v) => !v.done).length
    if (n) counts.set(d, n)
  }
  return counts
}

export interface DueReminder {
  key: string
  taskId: string
  title: string
  start: Date
}

/**
 * Reminders that should fire right now: the reminder time has passed, the
 * item hasn't started more than 5 minutes ago, it isn't done, and we haven't
 * shown it yet (`shown` holds keys of reminders already shown).
 */
export function dueReminders(tasks: Task[], now: Date, shown: Set<string>): DueReminder[] {
  const today = toISODate(now)
  const tomorrow = addDays(today, 1)
  const out: DueReminder[] = []
  for (const item of calendarItems(tasks, [], today, tomorrow, today)) {
    const task = tasks.find((t) => t.id === item.taskId)!
    if (task.reminderMin === null || item.done) continue
    const fireAt = item.start.getTime() - task.reminderMin * 60_000
    const key = `${item.id}@${toISODate(item.start)}`
    if (now.getTime() >= fireAt && now.getTime() < item.start.getTime() + 5 * 60_000 && !shown.has(key)) {
      out.push({ key, taskId: task.id, title: item.title, start: item.start })
    }
  }
  return out
}
