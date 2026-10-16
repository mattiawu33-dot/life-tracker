import { addDays, daysBetween, weekdayOf, type ISODate } from '../../lib/dates'
import type { Recurrence, Task } from './types'

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAYS = [1, 2, 3, 4, 5]

/** Safety limit so a loop can never run forever (about two years of days). */
const MAX_SCAN_DAYS = 800

export function defaultRecurrence(start: ISODate): Recurrence {
  return { mode: 'weekdays', weekdays: [...EVERY_DAY], interval: 2, start, end: null, stoppedOn: null }
}

/** Last day the task can still occur, or null if it repeats forever. */
export function lastPossibleDay(rec: Recurrence): ISODate | null {
  const stopLimit = rec.stoppedOn ? addDays(rec.stoppedOn, -1) : null
  if (rec.end && stopLimit) return rec.end < stopLimit ? rec.end : stopLimit
  return rec.end ?? stopLimit
}

/** Does the task repeat on this day? */
export function occursOn(rec: Recurrence, day: ISODate): boolean {
  if (day < rec.start) return false
  const last = lastPossibleDay(rec)
  if (last && day > last) return false
  if (rec.mode === 'interval') return daysBetween(rec.start, day) % Math.max(1, rec.interval) === 0
  return rec.weekdays.includes(weekdayOf(day))
}

/** First occurrence on or after `from`, or null if there are no more. */
export function nextOccurrence(rec: Recurrence, from: ISODate): ISODate | null {
  const last = lastPossibleDay(rec)
  let day = from < rec.start ? rec.start : from
  for (let i = 0; i < MAX_SCAN_DAYS; i++) {
    if (last && day > last) return null
    if (occursOn(rec, day)) return day
    day = addDays(day, 1)
  }
  return null
}

/** Every occurrence between two days (inclusive). */
export function occurrencesBetween(rec: Recurrence, from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (occursOn(rec, day)) out.push(day)
  }
  return out
}

/**
 * The one occurrence a recurring task shows in the task list right now.
 *
 * - If an occurrence since your last check-off is due today or already
 *   passed, show the most recent one (it's "today" or "overdue").
 * - Older missed ones are quietly skipped, so missing a few days never leaves
 *   you with a pile of overdue copies to clear.
 * - Otherwise show the next upcoming one.
 * - Returns null when the task has finished (past its end date, or stopped).
 */
export function currentOccurrence(task: Task, today: ISODate): ISODate | null {
  const rec = task.recurrence
  if (!rec) return null
  // "Stop repeating" ends the task right away, including any missed occurrence.
  if (rec.stoppedOn && rec.stoppedOn <= today) return null
  const done = Object.keys(task.completions)
  const lastDone = done.length ? done.reduce((a, b) => (a > b ? a : b)) : null
  const from = lastDone && lastDone >= rec.start ? addDays(lastDone, 1) : rec.start

  // Walk back from today to find the most recent unfinished occurrence.
  for (let day = today, i = 0; day >= from && i < MAX_SCAN_DAYS; day = addDays(day, -1), i++) {
    if (occursOn(rec, day)) return day
  }
  return nextOccurrence(rec, from > today ? from : today)
}

/** Has the task stopped for good (end date passed, or "Stop repeating")? */
export function isFinished(task: Task, today: ISODate): boolean {
  return task.recurrence !== null && currentOccurrence(task, today) === null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Human summary, e.g. "Every Mon, Wed, Fri" or "Every 3 days". */
export function describeRecurrence(rec: Recurrence): string {
  if (rec.mode === 'interval') return rec.interval <= 1 ? 'Every day' : `Every ${rec.interval} days`
  const days = [...rec.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'Every weekday'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Every weekend'
  return 'Every ' + days.map((d) => DAY_NAMES[d]).join(', ')
}
