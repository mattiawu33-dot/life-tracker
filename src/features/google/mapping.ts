import { addDays, toISODate, type ISODate } from '../../lib/dates'
import { lastPossibleDay, nextOccurrence } from '../tasks/recurrence'
import { DEFAULT_DURATION_MIN } from '../tasks/timing'
import type { Task } from '../tasks/types'
import type { GEvent, GEventTime, GEventWrite } from './types'

/**
 * Pure conversions between app tasks and Google Calendar events.
 * No network code here, so all of it is unit-tested.
 */

/** Marks events created by this app, so we can find the matching task. */
export const TASK_ID_PROP = 'lifeTrackerTaskId'
const DONE_PREFIX = '✓ '

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Is this task something we put on Google Calendar? */
export function isSyncable(task: Task, today: ISODate): boolean {
  if (!task.dueTime || task.googleSync === false) return false
  if (task.recurrence) return lastPossibleDay(task.recurrence) === null || lastPossibleDay(task.recurrence)! >= task.recurrence.start
  // One-off items: from a week ago onward (we don't backfill old history).
  return !!task.dueDate && task.dueDate >= addDays(today, -7)
}

/** Fingerprint of everything we sync; when it changes, the event needs updating. */
export function syncHash(task: Task): string {
  return JSON.stringify([
    task.title,
    task.dueDate,
    task.dueTime,
    task.durationMin ?? DEFAULT_DURATION_MIN,
    task.reminderMin,
    task.completedAt !== null,
    task.recurrence,
  ])
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "2026-10-16" + "16:00" + 90 -> local date-time strings Google understands with a timeZone. */
function localDateTime(day: ISODate, hhmm: string, plusMin = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  const [h, mi] = hhmm.split(':').map(Number)
  const t = new Date(y, m - 1, d, h, mi + plusMin)
  return `${toISODate(t)}T${pad(t.getHours())}:${pad(t.getMinutes())}:00`
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** The task's repeat rule as an iCalendar RRULE (what Google uses), or null. */
export function toRRule(task: Task): string | null {
  const rec = task.recurrence
  if (!rec) return null
  const parts =
    rec.mode === 'interval'
      ? ['FREQ=DAILY', `INTERVAL=${Math.max(1, rec.interval)}`]
      : ['FREQ=WEEKLY', `BYDAY=${[...rec.weekdays].sort().map((d) => BYDAY[d]).join(',')}`]
  const last = lastPossibleDay(rec)
  if (last) {
    // UNTIL is the end of the last day, written in UTC.
    const [y, m, d] = last.split('-').map(Number)
    const until = new Date(y, m - 1, d, 23, 59, 59)
    parts.push(
      `UNTIL=${until.getUTCFullYear()}${pad(until.getUTCMonth() + 1)}${pad(until.getUTCDate())}T${pad(until.getUTCHours())}${pad(until.getUTCMinutes())}${pad(until.getUTCSeconds())}Z`,
    )
  }
  return `RRULE:${parts.join(';')}`
}

/** Build the Google event for a task. */
export function taskToEvent(task: Task, timeZone = localTimeZone()): GEventWrite {
  const day = task.recurrence ? (nextOccurrence(task.recurrence, task.recurrence.start) ?? task.recurrence.start) : task.dueDate!
  const duration = task.durationMin ?? DEFAULT_DURATION_MIN
  const rrule = toRRule(task)
  return {
    summary: (!task.recurrence && task.completedAt ? DONE_PREFIX : '') + (task.title || 'Untitled'),
    start: { dateTime: localDateTime(day, task.dueTime!), timeZone },
    end: { dateTime: localDateTime(day, task.dueTime!, duration), timeZone },
    recurrence: rrule ? [rrule] : [],
    reminders:
      task.reminderMin === null
        ? { useDefault: false, overrides: [] }
        : { useDefault: false, overrides: [{ method: 'popup', minutes: task.reminderMin }] },
    extendedProperties: { private: { [TASK_ID_PROP]: task.id } },
  }
}

/** Start/end of an event as Dates (all-day events end at midnight of their end date). */
export function eventTimes(e: GEvent): { start: Date; end: Date; allDay: boolean } | null {
  const parse = (t?: GEventTime) => (t?.dateTime ? new Date(t.dateTime) : t?.date ? new Date(`${t.date}T00:00:00`) : null)
  const start = parse(e.start)
  const end = parse(e.end)
  if (!start) return null
  return { start, end: end ?? new Date(start.getTime() + 30 * 60_000), allDay: !e.start?.dateTime }
}

/** Changes made in Google, turned into a task update. */
export function eventToTaskPatch(e: GEvent): Partial<Task> {
  const times = eventTimes(e)
  const patch: Partial<Task> = { title: (e.summary ?? '').replace(DONE_PREFIX, '').trim() || 'Untitled' }
  if (times) {
    patch.dueDate = toISODate(times.start)
    if (times.allDay) {
      patch.dueTime = null
      patch.durationMin = null
    } else {
      patch.dueTime = `${pad(times.start.getHours())}:${pad(times.start.getMinutes())}`
      patch.durationMin = Math.max(5, Math.round((times.end.getTime() - times.start.getTime()) / 60_000))
    }
  }
  if (e.reminders && !e.reminders.useDefault) {
    const popups = (e.reminders.overrides ?? []).filter((o) => o.method === 'popup').map((o) => o.minutes)
    patch.reminderMin = popups.length ? Math.min(...popups) : null
  }
  return patch
}

export type SyncDecision = 'push' | 'pull' | 'none'

/**
 * Who wins when both sides might have changed:
 * a change in the app that hasn't been sent yet wins, otherwise Google's newer version wins.
 */
export function decide(task: Task, event: GEvent): SyncDecision {
  const link = task.google
  if (!link) return 'push'
  if (syncHash(task) !== link.hash) return 'push'
  if (event.updated && event.updated !== link.updated) return task.recurrence ? 'none' : 'pull'
  return 'none'
}

/** For changes made in the app to a Google event (drag, resize, rename). */
export function timesToEventWrite(start: Date, end: Date, allDay: boolean, timeZone = localTimeZone()): Pick<GEventWrite, 'start' | 'end'> {
  if (allDay) return { start: { date: toISODate(start) }, end: { date: toISODate(end) } }
  const fmt = (d: Date) => `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  return { start: { dateTime: fmt(start), timeZone }, end: { dateTime: fmt(end), timeZone } }
}
