import { describe, expect, it } from 'vitest'
import { makeTask } from '../tasks/actions'
import { decide, eventTimes, eventToTaskPatch, isSyncable, syncHash, taskToEvent, TASK_ID_PROP, toRRule } from './mapping'

const TODAY = '2026-10-16'
const TZ = 'America/New_York'

describe('task -> Google event', () => {
  it('creates a timed event with duration, reminder and a link back to the task', () => {
    const t = makeTask({ title: 'Robotics', dueDate: TODAY, dueTime: '16:00', durationMin: 90, reminderMin: 10 })
    const e = taskToEvent(t, TZ)
    expect(e).toMatchObject({
      summary: 'Robotics',
      start: { dateTime: '2026-10-16T16:00:00', timeZone: TZ },
      end: { dateTime: '2026-10-16T17:30:00', timeZone: TZ },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
      recurrence: [],
    })
    expect(e.extendedProperties?.private?.[TASK_ID_PROP]).toBe(t.id)
  })

  it('marks finished one-off items with a check and turns off reminders when none are set', () => {
    const e = taskToEvent(makeTask({ title: 'Call', dueDate: TODAY, dueTime: '23:45', completedAt: 'x' }), TZ)
    expect(e.summary).toBe('✓ Call')
    expect(e.end?.dateTime).toBe('2026-10-17T00:15:00') // default 30 min, past midnight
    expect(e.reminders).toEqual({ useDefault: false, overrides: [] })
  })

  it('writes repeat rules Google understands', () => {
    const weekly = makeTask({ title: 'Practice', dueTime: '17:00', recurrence: { mode: 'weekdays', weekdays: [5, 1, 3], interval: 2, start: '2026-10-13', end: null, stoppedOn: null } })
    expect(toRRule(weekly)).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')
    // Starts on the first real occurrence (Wed Oct 14), not on the Tuesday start date
    expect(taskToEvent(weekly, TZ).start?.dateTime).toBe('2026-10-14T17:00:00')
    const every3 = makeTask({ title: 'Run', dueTime: '07:00', recurrence: { mode: 'interval', weekdays: [], interval: 3, start: TODAY, end: '2026-11-30', stoppedOn: null } })
    expect(toRRule(every3)).toMatch(/^RRULE:FREQ=DAILY;INTERVAL=3;UNTIL=2026(1130|1201)T\d{6}Z$/)
  })

  it('only syncs items with a time (and not old history)', () => {
    expect(isSyncable(makeTask({ title: 'a', dueDate: TODAY }), TODAY)).toBe(false)
    expect(isSyncable(makeTask({ title: 'a', dueDate: TODAY, dueTime: '09:00' }), TODAY)).toBe(true)
    expect(isSyncable(makeTask({ title: 'a', dueDate: '2026-09-01', dueTime: '09:00' }), TODAY)).toBe(false)
    expect(isSyncable(makeTask({ title: 'a', dueDate: TODAY, dueTime: '09:00', googleSync: false }), TODAY)).toBe(false)
  })
})

describe('Google event -> task', () => {
  it('reads time, length, title and reminder changes made in Google', () => {
    const patch = eventToTaskPatch({
      id: 'e',
      summary: '✓ Robotics (moved)',
      start: { dateTime: new Date(2026, 9, 17, 15, 0).toISOString() },
      end: { dateTime: new Date(2026, 9, 17, 17, 0).toISOString() },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 30 }] },
    })
    expect(patch).toEqual({ title: 'Robotics (moved)', dueDate: '2026-10-17', dueTime: '15:00', durationMin: 120, reminderMin: 30 })
  })

  it('turns an event made all-day in Google into a checklist item', () => {
    const e = { id: 'e', summary: 'Trip', start: { date: '2026-10-20' }, end: { date: '2026-10-21' } }
    expect(eventToTaskPatch(e)).toMatchObject({ dueDate: '2026-10-20', dueTime: null, durationMin: null })
    expect(eventTimes(e)?.allDay).toBe(true)
  })
})

describe('conflicts', () => {
  const base = makeTask({ title: 'Study', dueDate: TODAY, dueTime: '10:00' })
  const linked = { ...base, google: { eventId: 'e', calendarId: 'primary', hash: syncHash(base), updated: 'v1' } }
  it('does nothing when neither side changed', () => {
    expect(decide(linked, { id: 'e', updated: 'v1' })).toBe('none')
  })
  it('pulls when only Google changed', () => {
    expect(decide(linked, { id: 'e', updated: 'v2' })).toBe('pull')
  })
  it('pushes when the app changed, even if Google changed too', () => {
    expect(decide({ ...linked, title: 'Study chem' }, { id: 'e', updated: 'v2' })).toBe('push')
  })
})
