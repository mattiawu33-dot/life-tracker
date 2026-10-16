import { addDays, type ISODate } from '../../lib/dates'
import { currentOccurrence, occursOn } from './recurrence'
import type { Priority, Task } from './types'

/** A task as it should appear right now: which date it shows and whether it's done. */
export interface TaskView {
  task: Task
  date: ISODate | null
  done: boolean
  /** Recurring task that has ended or was stopped. */
  ended: boolean
}

export function viewForList(task: Task, today: ISODate): TaskView {
  if (!task.recurrence) return { task, date: task.dueDate, done: task.completedAt !== null, ended: false }
  const date = currentOccurrence(task, today)
  return { task, date, done: date === null, ended: date === null }
}

/** The task's entry on one specific calendar day, or null if it isn't on that day. */
export function viewForDay(task: Task, day: ISODate, today: ISODate): TaskView | null {
  if (!task.recurrence) {
    return task.dueDate === day ? { task, date: day, done: task.completedAt !== null, ended: false } : null
  }
  if (task.completions[day]) return { task, date: day, done: true, ended: false }
  // Upcoming occurrences, plus the one the list currently shows (may be overdue).
  if ((day >= today && occursOn(task.recurrence, day)) || currentOccurrence(task, today) === day) {
    return { task, date: day, done: false, ended: false }
  }
  return null
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 }

export function compareViews(a: TaskView, b: TaskView): number {
  if (a.date !== b.date) return (a.date ?? '9999') < (b.date ?? '9999') ? -1 : 1
  // Timed tasks first, in time order; then "any time" tasks.
  const at = a.task.dueTime ?? '99:99'
  const bt = b.task.dueTime ?? '99:99'
  if (at !== bt) return at < bt ? -1 : 1
  const p = PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority]
  if (p !== 0) return p
  return a.task.createdAt < b.task.createdAt ? -1 : 1
}

export interface TaskGroup {
  key: string
  label: string
  items: TaskView[]
}

/** Overdue / Today / Tomorrow / Next 7 days / Later / No date / Completed. */
export function groupViews(views: TaskView[], today: ISODate): TaskGroup[] {
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)
  const groups: TaskGroup[] = [
    { key: 'overdue', label: 'Overdue', items: [] },
    { key: 'today', label: 'Today', items: [] },
    { key: 'tomorrow', label: 'Tomorrow', items: [] },
    { key: 'week', label: 'Next 7 days', items: [] },
    { key: 'later', label: 'Later', items: [] },
    { key: 'nodate', label: 'No date', items: [] },
    { key: 'done', label: 'Completed', items: [] },
  ]
  const byKey = Object.fromEntries(groups.map((g) => [g.key, g.items]))

  for (const v of views) {
    if (v.done) byKey.done.push(v)
    else if (!v.date) byKey.nodate.push(v)
    else if (v.date < today) byKey.overdue.push(v)
    else if (v.date === today) byKey.today.push(v)
    else if (v.date === tomorrow) byKey.tomorrow.push(v)
    else if (v.date <= weekEnd) byKey.week.push(v)
    else byKey.later.push(v)
  }
  for (const g of groups) g.items.sort(compareViews)
  // Most recently completed first.
  byKey.done.sort((a, b) => (lastActivity(b.task) > lastActivity(a.task) ? 1 : -1))
  return groups.filter((g) => g.items.length > 0)
}

function lastActivity(t: Task): string {
  return t.completedAt ?? Object.values(t.completions).sort().at(-1) ?? t.createdAt
}
