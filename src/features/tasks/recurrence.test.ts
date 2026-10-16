import { describe, expect, it } from 'vitest'
import { currentOccurrence, describeRecurrence, occurrencesBetween, occursOn } from './recurrence'
import type { Recurrence, Task } from './types'

const rec = (r: Partial<Recurrence>): Recurrence => ({
  mode: 'weekdays',
  weekdays: [1, 3, 5],
  interval: 2,
  start: '2026-10-01',
  end: null,
  stoppedOn: null,
  ...r,
})

const task = (r: Partial<Recurrence>, completions: Record<string, string> = {}): Task => ({
  id: 't',
  title: 'x',
  notes: '',
  listId: null,
  priority: 'none',
  effort: 'small',
  dueDate: null,
  dueTime: null,
  durationMin: null,
  reminderMin: null,
  order: 0,
  rolledFrom: null,
  subtasks: [],
  recurrence: rec(r),
  completedAt: null,
  completions,
  createdAt: '2026-10-01T00:00:00Z',
})

describe('occursOn', () => {
  it('follows the chosen weekdays (Oct 16 2026 is a Friday)', () => {
    expect(occursOn(rec({}), '2026-10-16')).toBe(true)
    expect(occursOn(rec({}), '2026-10-17')).toBe(false)
  })
  it('respects the date range', () => {
    const r = rec({ mode: 'weekdays', weekdays: [0, 1, 2, 3, 4, 5, 6], start: '2026-10-30', end: '2026-11-30' })
    expect(occursOn(r, '2026-10-29')).toBe(false)
    expect(occursOn(r, '2026-10-30')).toBe(true)
    expect(occursOn(r, '2026-11-30')).toBe(true)
    expect(occursOn(r, '2026-12-01')).toBe(false)
  })
  it('counts every N days from the start', () => {
    const r = rec({ mode: 'interval', interval: 3, start: '2026-10-01' })
    expect(occurrencesBetween(r, '2026-10-01', '2026-10-10')).toEqual(['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10'])
  })
  it('never schedules on or after the stop day', () => {
    const r = rec({ weekdays: [0, 1, 2, 3, 4, 5, 6], stoppedOn: '2026-10-16' })
    expect(occursOn(r, '2026-10-15')).toBe(true)
    expect(occursOn(r, '2026-10-16')).toBe(false)
  })
})

describe('currentOccurrence', () => {
  const today = '2026-10-16' // Friday
  it("shows today's occurrence", () => {
    expect(currentOccurrence(task({}), today)).toBe('2026-10-16')
  })
  it('moves to the next one once today is checked off', () => {
    expect(currentOccurrence(task({}, { '2026-10-16': 'x' }), today)).toBe('2026-10-19')
  })
  it('shows only the most recent missed occurrence as overdue', () => {
    // Mon/Wed/Fri, last done Oct 7 (Wed), today is Sat Oct 17: show Fri Oct 16
    expect(currentOccurrence(task({}, { '2026-10-07': 'x' }), '2026-10-17')).toBe('2026-10-16')
  })
  it('waits for a future start date', () => {
    expect(currentOccurrence(task({ start: '2026-10-30', weekdays: [0, 1, 2, 3, 4, 5, 6] }), today)).toBe('2026-10-30')
  })
  it('is finished after the end date', () => {
    expect(currentOccurrence(task({ end: '2026-10-10' }, { '2026-10-09': 'x' }), today)).toBeNull()
  })
  it('is finished right away after "Stop repeating", even with a missed day', () => {
    expect(currentOccurrence(task({ stoppedOn: today }), today)).toBeNull()
  })
})

describe('describeRecurrence', () => {
  it('names common patterns', () => {
    expect(describeRecurrence(rec({ weekdays: [0, 1, 2, 3, 4, 5, 6] }))).toBe('Every day')
    expect(describeRecurrence(rec({ weekdays: [1, 2, 3, 4, 5] }))).toBe('Every weekday')
    expect(describeRecurrence(rec({ weekdays: [5, 1, 3] }))).toBe('Every Mon, Wed, Fri')
    expect(describeRecurrence(rec({ weekdays: [0, 1] }))).toBe('Every Mon, Sun')
    expect(describeRecurrence(rec({ mode: 'interval', interval: 3 }))).toBe('Every 3 days')
  })
})
