import type { ISODate } from '../../lib/dates'

export type Priority = 'none' | 'low' | 'medium' | 'high'
export type Effort = 'small' | 'medium' | 'big'

/** XP per completed task, by effort. Used by the XP system in step 4. */
export const EFFORT_XP: Record<Effort, number> = { small: 5, medium: 15, big: 40 }

export type ListColor =
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'sky'
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'slate'

export interface TaskList {
  id: string
  name: string
  color: ListColor
  createdAt: string
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

/**
 * How a task repeats.
 *
 * - mode "weekdays": on the chosen days of the week (0 = Sun ... 6 = Sat).
 *   "Every day" is all seven; "Weekdays" is Mon to Fri.
 * - mode "interval": every N days, counted from `start`.
 *
 * It only repeats between `start` and `end` (no end = forever). "Stop
 * repeating" sets `stoppedOn`: nothing from that day on is scheduled, but
 * completions already recorded on the task are kept.
 */
export interface Recurrence {
  mode: 'weekdays' | 'interval'
  weekdays: number[]
  interval: number
  start: ISODate
  end: ISODate | null
  stoppedOn: ISODate | null
}

export interface GoogleLink {
  eventId: string
  calendarId: string
  /** Fingerprint of the synced fields at the last sync; differs = local change to push. */
  hash: string
  /** Google's `updated` timestamp at the last sync; differs = change made in Google. */
  updated: string
}

export interface Task {
  id: string
  title: string
  notes: string
  listId: string | null
  priority: Priority
  effort: Effort
  /** One-off tasks only. Recurring tasks get their dates from `recurrence`. */
  dueDate: ISODate | null
  /** "16:00", or null for "any time that day". Applies to every occurrence. */
  dueTime: string | null
  /** Length of a timed item in minutes (shown as a block on the calendar). */
  durationMin: number | null
  /** Remind this many minutes before the start time (timed items only). */
  reminderMin: number | null
  /** Position in the day's checklist (lower comes first). */
  order: number
  /** Set when an unfinished item was rolled over from an earlier day. */
  rolledFrom: ISODate | null
  /** Link to the Google Calendar event this item is synced with. */
  google: GoogleLink | null
  /** Put this item on Google Calendar (when it has a time and Google is connected). */
  googleSync: boolean
  subtasks: Subtask[]
  recurrence: Recurrence | null
  /** One-off tasks: when it was checked off (ISO timestamp). */
  completedAt: string | null
  /** Recurring tasks: occurrence day -> when it was checked off. */
  completions: Record<ISODate, string>
  createdAt: string
}
