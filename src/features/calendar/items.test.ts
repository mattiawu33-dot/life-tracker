import { describe, expect, it } from 'vitest'
import { makeTask } from '../tasks/actions'
import { tasksReducer } from '../tasks/store'
import { addMinutes } from '../tasks/timing'
import { calendarItems, checklistFor, dueReminders, openCounts } from './items'

const TODAY = '2026-10-16' // Friday

describe('calendar items', () => {
  it('puts timed items on the grid with their duration (default 30 min)', () => {
    const a = makeTask({ title: 'Robotics', dueDate: TODAY, dueTime: '16:00', durationMin: 90 })
    const b = makeTask({ title: 'Call', dueDate: TODAY, dueTime: '09:00' })
    const items = calendarItems([a, b], [], TODAY, TODAY, TODAY)
    const robotics = items.find((i) => i.title === 'Robotics')!
    expect(robotics.start.getHours()).toBe(16)
    expect((robotics.end.getTime() - robotics.start.getTime()) / 60_000).toBe(90)
    expect((items.find((i) => i.title === 'Call')!.end.getTime() - items.find((i) => i.title === 'Call')!.start.getTime()) / 60_000).toBe(30)
  })

  it('shows each upcoming occurrence of a timed repeating task, not dragged', () => {
    const t = makeTask({
      title: 'Practice',
      dueTime: '17:00',
      recurrence: { mode: 'weekdays', weekdays: [1, 3, 5], interval: 2, start: '2026-10-01', end: null, stoppedOn: null },
    })
    const items = calendarItems([t], [], '2026-10-16', '2026-10-22', TODAY)
    expect(items.map((i) => i.day)).toEqual(['2026-10-16', '2026-10-19', '2026-10-21'])
    expect(items.every((i) => i.repeating)).toBe(true)
  })

  it('keeps untimed items in the day checklist, unfinished first, in order', () => {
    const a = makeTask({ title: 'A', dueDate: TODAY, order: 2 })
    const b = makeTask({ title: 'B', dueDate: TODAY, order: 1 })
    const c = makeTask({ title: 'C', dueDate: TODAY, order: 0, completedAt: 'x' })
    const timed = makeTask({ title: 'T', dueDate: TODAY, dueTime: '10:00' })
    expect(checklistFor([a, b, c, timed], TODAY, TODAY).map((v) => v.task.title)).toEqual(['B', 'A', 'C'])
    expect(openCounts([a, b, c, timed], TODAY, TODAY, TODAY).get(TODAY)).toBe(2)
  })
})

describe('rollover', () => {
  it('moves unfinished untimed one-off items to today and remembers where they came from', () => {
    const old = makeTask({ title: 'Old', dueDate: '2026-10-14' })
    const done = makeTask({ title: 'Done', dueDate: '2026-10-14', completedAt: 'x' })
    const timed = makeTask({ title: 'Timed', dueDate: '2026-10-14', dueTime: '09:00' })
    const s = tasksReducer({ tasks: [old, done, timed], lists: [] }, { type: 'task/rollover', today: TODAY })
    expect(s.tasks.map((t) => [t.title, t.dueDate, t.rolledFrom])).toEqual([
      ['Old', TODAY, '2026-10-14'],
      ['Done', '2026-10-14', null],
      ['Timed', '2026-10-14', null],
    ])
  })
})

describe('reminders', () => {
  const t = makeTask({ title: 'Robotics', dueDate: TODAY, dueTime: '16:00', reminderMin: 10 })
  it('fires from 10 minutes before until shortly after the start', () => {
    expect(dueReminders([t], new Date(2026, 9, 16, 15, 49), new Set())).toHaveLength(0)
    const due = dueReminders([t], new Date(2026, 9, 16, 15, 51), new Set())
    expect(due).toHaveLength(1)
    expect(dueReminders([t], new Date(2026, 9, 16, 15, 52), new Set([due[0].key]))).toHaveLength(0)
    expect(dueReminders([t], new Date(2026, 9, 16, 16, 10), new Set())).toHaveLength(0)
  })
  it('handles "1 day before" for tomorrow, and skips finished items', () => {
    const tomorrow = makeTask({ title: 'Test', dueDate: '2026-10-17', dueTime: '08:00', reminderMin: 1440 })
    expect(dueReminders([tomorrow], new Date(2026, 9, 16, 8, 1), new Set())).toHaveLength(1)
    expect(dueReminders([{ ...t, completedAt: 'x' }], new Date(2026, 9, 16, 15, 55), new Set())).toHaveLength(0)
  })
  it('adds minutes across midnight', () => {
    expect(addMinutes('23:30', 45)).toBe('00:15')
  })
})
