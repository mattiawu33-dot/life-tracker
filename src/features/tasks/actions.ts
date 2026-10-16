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
