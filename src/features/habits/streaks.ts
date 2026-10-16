import { addDays, daysBetween, startOfWeek, weekdayOf, type ISODate } from '../../lib/dates'
import type { Habit } from './types'

/**
 * Forgiving streak rules
 * ----------------------
 * Every day / specific weekdays (counted in days):
 *   - Each day checked off adds 1.
 *   - Days the habit isn't scheduled, and days you marked as a rest day, are
 *     skipped: they never break the streak (and don't add to it).
 *   - Today never breaks the streak; you still have until midnight.
 *   - Only a scheduled, unmarked day in the past breaks it.
 *
 * X times per week (counted in weeks):
 *   - Each Mon-Sun week where you reached the target adds 1.
 *   - The current week can't break the streak; it counts once you hit the target.
 *   - The week you created the habit in doesn't count against you either.
 */

/** Safety limit for loops: about ten years of days. */
const MAX_DAYS = 3660

export function isScheduled(habit: Habit, day: ISODate): boolean {
  const s = habit.schedule
  if (s.type === 'weekdays') return s.days.includes(weekdayOf(day))
  return true // daily, and weekly habits can be done on any day
}

/** The earliest day we know about: the start date or an earlier backfilled entry. */
export function firstDay(habit: Habit): ISODate {
  let first = habit.startDate
  for (const d of Object.keys(habit.log)) if (d < first) first = d
  return first
}

export function isWeekly(habit: Habit): boolean {
  return habit.schedule.type === 'weekly'
}

/** How many days were checked off in the Mon-Sun week containing `day` (up to `until`). */
export function doneInWeek(habit: Habit, day: ISODate, until: ISODate = '9999-12-31'): number {
  const start = startOfWeek(day)
  let n = 0
  for (let i = 0; i < 7; i++) {
    const d = addDays(start, i)
    if (d <= until && habit.log[d] === 'done') n++
  }
  return n
}

function weeklyTarget(habit: Habit): number {
  return habit.schedule.type === 'weekly' ? habit.schedule.times : 7
}

/** Result of walking through a day for the day-based streak rules. */
function dayOutcome(habit: Habit, day: ISODate, today: ISODate): 'add' | 'skip' | 'break' {
  const mark = habit.log[day]
  if (mark === 'done') return 'add'
  if (mark === 'rest' || !isScheduled(habit, day) || day === today) return 'skip'
  return 'break'
}

function weekOutcome(habit: Habit, weekStart: ISODate, today: ISODate): 'add' | 'skip' | 'break' {
  if (doneInWeek(habit, weekStart, today) >= weeklyTarget(habit)) return 'add'
  const isCurrent = weekStart === startOfWeek(today)
  const isFirst = weekStart === startOfWeek(firstDay(habit))
  return isCurrent || isFirst ? 'skip' : 'break'
}

export interface StreakInfo {
  current: number
  best: number
  unit: 'day' | 'week'
}

export function streakInfo(habit: Habit, today: ISODate): StreakInfo {
  const first = firstDay(habit)

  if (isWeekly(habit)) {
    const firstWeek = startOfWeek(first)
    const thisWeek = startOfWeek(today)
    let current = 0
    for (let w = thisWeek, i = 0; w >= firstWeek && i < MAX_DAYS / 7; w = addDays(w, -7), i++) {
      const o = weekOutcome(habit, w, today)
      if (o === 'break') break
      if (o === 'add') current++
    }
    let best = 0
    let run = 0
    for (let w = firstWeek, i = 0; w <= thisWeek && i < MAX_DAYS / 7; w = addDays(w, 7), i++) {
      const o = weekOutcome(habit, w, today)
      if (o === 'add') best = Math.max(best, ++run)
      else if (o === 'break') run = 0
    }
    return { current, best, unit: 'week' }
  }

  let current = 0
  for (let d = today, i = 0; d >= first && i < MAX_DAYS; d = addDays(d, -1), i++) {
    const o = dayOutcome(habit, d, today)
    if (o === 'break') break
    if (o === 'add') current++
  }
  let best = 0
  let run = 0
  const span = Math.min(daysBetween(first, today), MAX_DAYS)
  for (let i = 0; i <= span; i++) {
    const o = dayOutcome(habit, addDays(first, i), today)
    if (o === 'add') best = Math.max(best, ++run)
    else if (o === 'break') run = 0
  }
  return { current, best, unit: 'day' }
}

/**
 * Share of planned check-ins you actually did over the last `days` days
 * (rest days and today-so-far don't count against you). null = nothing to measure yet.
 */
export function completionRate(habit: Habit, today: ISODate, days = 30): number | null {
  const first = firstDay(habit)
  const windowStart = addDays(today, -(days - 1)) > first ? addDays(today, -(days - 1)) : first

  if (isWeekly(habit)) {
    const target = weeklyTarget(habit)
    let planned = 0
    let done = 0
    for (let w = startOfWeek(windowStart); w <= today; w = addDays(w, 7)) {
      const o = weekOutcome(habit, w, today)
      const count = Math.min(doneInWeek(habit, w, today), target)
      if (o === 'skip' && count < target) continue // current or first week, still in progress
      planned += target
      done += count
    }
    return planned ? done / planned : null
  }

  let planned = 0
  let done = 0
  for (let d = windowStart; d <= today; d = addDays(d, 1)) {
    const mark = habit.log[d]
    if (!isScheduled(habit, d) || mark === 'rest') continue
    if (d === today && mark !== 'done') continue
    planned++
    if (mark === 'done') done++
  }
  return planned ? done / planned : null
}

/** Should the habit show up in today's list (vs. "Not today")? */
export function isDueToday(habit: Habit, today: ISODate): boolean {
  if (habit.log[today]) return true // checked off or marked rest today: keep it visible
  if (isWeekly(habit)) return doneInWeek(habit, today, today) < weeklyTarget(habit)
  return isScheduled(habit, today)
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function describeSchedule(habit: Habit): string {
  const s = habit.schedule
  if (s.type === 'daily') return 'Every day'
  if (s.type === 'weekly') return `${s.times}× a week`
  const days = [...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  if (days.length === 7) return 'Every day'
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
  return days.map((d) => DAY_NAMES[d]).join(', ')
}
