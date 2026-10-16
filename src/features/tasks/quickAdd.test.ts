import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'
import type { TaskList } from './types'

const now = new Date(2026, 9, 16, 9, 0) // Fri Oct 16 2026, 9:00
const lists: TaskList[] = [
  { id: 'r', name: 'Robotics', color: 'teal', createdAt: '' },
  { id: 's', name: 'School', color: 'sky', createdAt: '' },
]
const parse = (s: string, ignoreDate = false) => parseQuickAdd(s, { lists, now, ignoreDate })

describe('parseQuickAdd', () => {
  it('reads a weekday', () => {
    expect(parse('bio essay friday')).toMatchObject({ title: 'bio essay', dueDate: '2026-10-16', dueTime: null })
  })
  it('reads a day and time', () => {
    expect(parse('robotics meeting tomorrow 4pm')).toMatchObject({
      title: 'robotics meeting',
      dueDate: '2026-10-17',
      dueTime: '16:00',
      dateText: 'tomorrow 4pm',
    })
  })
  it('drops a dangling "due"', () => {
    expect(parse('essay due 11/3')).toMatchObject({ title: 'essay', dueDate: '2026-11-03' })
  })
  it('does not treat "SAT" as Saturday', () => {
    expect(parse('study for SAT')).toMatchObject({ title: 'study for SAT', dueDate: null })
    expect(parse('study for SAT saturday')).toMatchObject({ title: 'study for SAT', dueDate: '2026-10-17' })
  })
  it('picks a list with #name and priority with !level', () => {
    expect(parse('build arm #rob !high')).toMatchObject({ title: 'build arm', listId: 'r', priority: 'high' })
  })
  it('leaves unknown #tags and !words in the title', () => {
    expect(parse('practice #badminton !wow')).toMatchObject({ title: 'practice #badminton !wow', listId: null, priority: null })
  })
  it('can ignore the date when asked', () => {
    expect(parse('read friday night lights', true)).toMatchObject({ title: 'read friday night lights', dueDate: null })
  })
})
