import { describe, expect, it } from 'vitest'
import { completionRate, isDueToday, streakInfo } from './streaks'
import type { DayMark, Habit, HabitSchedule } from './types'

// Oct 2026: Mon 12, Tue 13, Wed 14, Thu 15, Fri 16, Sat 17, Sun 18
const TODAY = '2026-10-16'

const habit = (schedule: HabitSchedule, log: Record<string, DayMark>, startDate = '2026-10-01'): Habit => ({
  id: 'h',
  name: 'Read',
  emoji: '📚',
  schedule,
  log,
  startDate,
  createdAt: '',
})

const done = (...days: string[]) => Object.fromEntries(days.map((d) => [d, 'done' as DayMark]))

describe('daily streaks', () => {
  it('counts consecutive days, and today is still pending', () => {
    const h = habit({ type: 'daily' }, done('2026-10-13', '2026-10-14', '2026-10-15'))
    expect(streakInfo(h, TODAY)).toMatchObject({ current: 3, unit: 'day' })
  })
  it('includes today once checked off', () => {
    const h = habit({ type: 'daily' }, done('2026-10-14', '2026-10-15', '2026-10-16'))
    expect(streakInfo(h, TODAY).current).toBe(3)
  })
  it('breaks on a missed past day', () => {
    const h = habit({ type: 'daily' }, done('2026-10-12', '2026-10-13', '2026-10-15'))
    expect(streakInfo(h, TODAY)).toMatchObject({ current: 1, best: 2 })
  })
  it('a rest day does not break the streak', () => {
    const h = habit({ type: 'daily' }, { ...done('2026-10-13', '2026-10-15'), '2026-10-14': 'rest' })
    expect(streakInfo(h, TODAY).current).toBe(2)
  })
})

describe('specific weekdays', () => {
  it('skips unscheduled days (Mon/Wed/Fri)', () => {
    const h = habit({ type: 'weekdays', days: [1, 3, 5] }, done('2026-10-09', '2026-10-12', '2026-10-14'))
    // Fri 9, Mon 12, Wed 14 done; Sat/Sun/Tue/Thu are rest days; today (Fri) pending
    expect(streakInfo(h, TODAY).current).toBe(3)
  })
  it('lists the habit only on scheduled days', () => {
    const h = habit({ type: 'weekdays', days: [1, 3] }, {})
    expect(isDueToday(h, TODAY)).toBe(false)
    expect(isDueToday(h, '2026-10-14')).toBe(true)
  })
})

describe('X times per week', () => {
  const s: HabitSchedule = { type: 'weekly', times: 3 }
  it('counts weeks that reached the target; the current week is pending', () => {
    const h = habit(s, done('2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-09', '2026-10-12'), '2026-09-28')
    expect(streakInfo(h, TODAY)).toMatchObject({ current: 2, best: 2, unit: 'week' })
  })
  it('counts the current week once the target is hit', () => {
    const h = habit(s, done('2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12', '2026-10-13', '2026-10-14'), '2026-10-05')
    expect(streakInfo(h, TODAY).current).toBe(2)
    expect(isDueToday(h, TODAY)).toBe(false)
  })
  it('a missed week breaks it', () => {
    const h = habit(s, done('2026-09-28', '2026-09-29', '2026-09-30', '2026-10-05'), '2026-09-28')
    expect(streakInfo(h, TODAY)).toMatchObject({ current: 0, best: 1 })
  })
})

describe('completionRate', () => {
  it('ignores rest days and today-so-far', () => {
    const h = habit({ type: 'daily' }, { ...done('2026-10-13', '2026-10-14'), '2026-10-15': 'rest' }, '2026-10-12')
    // planned: 12, 13, 14 (15 is rest, 16 is today) -> 2 of 3
    expect(completionRate(h, TODAY)).toBeCloseTo(2 / 3)
  })
  it('is null for a brand-new habit', () => {
    expect(completionRate(habit({ type: 'daily' }, {}, TODAY), TODAY)).toBeNull()
  })
})
