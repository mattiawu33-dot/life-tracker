import { todayISO, type ISODate } from '../../lib/dates'
import { newId } from '../../lib/id'
import { currentOccurrence } from './recurrence'
import type { Task } from './types'

/** A new task with sensible defaults; pass only what you know. */
export function makeTask(fields: Partial<Task> & { title: string }): Task {
  return {
    id: newId(),
    notes: '',
    listId: null,
    priority: 'none',
    effort: 'small',
    dueDate: null,
    dueTime: null,
    durationMin: null,
    reminderMin: null,
    order: Date.now(),
    rolledFrom: null,
    google: null,
    googleSync: true,
    subtasks: [],
    recurrence: null,
    completedAt: null,
    completions: {},
    createdAt: new Date().toISOString(),
    ...fields,
  }
}

/** Which occurrence a checkbox in the task list should toggle. */
export function toggleDay(task: Task, today: ISODate = todayISO()): ISODate | null {
  return task.recurrence ? currentOccurrence(task, today) : null
}

/** Fills in fields added after a task was saved, so older data keeps working. */
export function upgradeTask(t: Partial<Task> & Pick<Task, 'id' | 'title' | 'createdAt'>): Task {
  return {
    durationMin: null,
    reminderMin: null,
    rolledFrom: null,
    google: null,
    googleSync: true,
    ...t,
    order: t.order ?? new Date(t.createdAt).getTime(),
  } as Task
}
