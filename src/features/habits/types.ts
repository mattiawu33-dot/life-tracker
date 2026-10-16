import type { ISODate } from '../../lib/dates'

/**
 * When a habit is meant to happen:
 * - daily: every day
 * - weekdays: on chosen days of the week (0 = Sun ... 6 = Sat)
 * - weekly: any N days per week (Mon-Sun), e.g. "gym 3 times a week"
 */
export type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'weekly'; times: number }

/**
 * What happened on a day: done, or a rest day you chose (sick, travelling...).
 * Days with no entry simply weren't checked off.
 */
export type DayMark = 'done' | 'rest'

export interface Habit {
  id: string
  name: string
  emoji: string
  schedule: HabitSchedule
  log: Record<ISODate, DayMark>
  /** The day the habit was created; streaks don't look back further than this. */
  startDate: ISODate
  createdAt: string
}
