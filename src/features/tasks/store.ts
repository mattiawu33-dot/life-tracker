import { createContext, useContext, type Dispatch } from 'react'
import type { ISODate } from '../../lib/dates'
import type { Subtask, Task, TaskList } from './types'

/**
 * All task data lives in one object, changed only through "actions" handled by
 * the reducer below. Every change goes through one place, so it's easy to save
 * to localStorage and easy to reason about (this is the useReducer pattern).
 */
export interface TaskState {
  tasks: Task[]
  lists: TaskList[]
}

export type TaskAction =
  | { type: 'task/add'; task: Task }
  | { type: 'task/update'; id: string; patch: Partial<Task> }
  | { type: 'task/delete'; id: string }
  /** Check / uncheck. `day` picks the occurrence of a recurring task. */
  | { type: 'task/toggle'; id: string; day: ISODate | null; now: string }
  | { type: 'task/stopRepeating'; id: string; today: ISODate }
  /** New checklist order: the given ids get increasing `order` values. */
  | { type: 'task/reorder'; ids: string[] }
  /** Move unfinished, untimed one-off items from earlier days to today. */
  | { type: 'task/rollover'; today: ISODate }
  | { type: 'subtask/add'; taskId: string; subtask: Subtask }
  | { type: 'subtask/update'; taskId: string; subtaskId: string; patch: Partial<Subtask> }
  | { type: 'subtask/delete'; taskId: string; subtaskId: string }
  | { type: 'list/add'; list: TaskList }
  | { type: 'list/update'; id: string; patch: Partial<TaskList> }
  | { type: 'list/delete'; id: string }

const mapTask = (state: TaskState, id: string, fn: (t: Task) => Task): TaskState => ({
  ...state,
  tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
})

export function tasksReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'task/add':
      return { ...state, tasks: [...state.tasks, action.task] }
    case 'task/update':
      return mapTask(state, action.id, (t) => ({ ...t, ...action.patch }))
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) }
    case 'task/toggle':
      return mapTask(state, action.id, (t) => {
        if (!t.recurrence || !action.day) return { ...t, completedAt: t.completedAt ? null : action.now }
        const completions = { ...t.completions }
        if (completions[action.day]) {
          delete completions[action.day]
          return { ...t, completions }
        }
        completions[action.day] = action.now
        // Fresh checklist for the next occurrence.
        return { ...t, completions, subtasks: t.subtasks.map((s) => ({ ...s, done: false })) }
      })
    case 'task/stopRepeating':
      return mapTask(state, action.id, (t) =>
        t.recurrence ? { ...t, recurrence: { ...t.recurrence, stoppedOn: action.today } } : t,
      )
    case 'task/reorder': {
      const rank = new Map(action.ids.map((id, i) => [id, i]))
      const base = Date.now()
      return {
        ...state,
        tasks: state.tasks.map((t) => (rank.has(t.id) ? { ...t, order: base + rank.get(t.id)! } : t)),
      }
    }
    case 'task/rollover': {
      let changed = false
      const tasks = state.tasks.map((t) => {
        if (t.recurrence || t.completedAt || t.dueTime || !t.dueDate || t.dueDate >= action.today) return t
        changed = true
        return { ...t, rolledFrom: t.rolledFrom ?? t.dueDate, dueDate: action.today }
      })
      return changed ? { ...state, tasks } : state
    }
    case 'subtask/add':
      return mapTask(state, action.taskId, (t) => ({ ...t, subtasks: [...t.subtasks, action.subtask] }))
    case 'subtask/update':
      return mapTask(state, action.taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === action.subtaskId ? { ...s, ...action.patch } : s)),
      }))
    case 'subtask/delete':
      return mapTask(state, action.taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.filter((s) => s.id !== action.subtaskId),
      }))
    case 'list/add':
      return { ...state, lists: [...state.lists, action.list] }
    case 'list/update':
      return { ...state, lists: state.lists.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)) }
    case 'list/delete':
      // Deleting a list keeps its tasks: they move to the Inbox (no list).
      return {
        lists: state.lists.filter((l) => l.id !== action.id),
        tasks: state.tasks.map((t) => (t.listId === action.id ? { ...t, listId: null } : t)),
      }
  }
}

export const TasksContext = createContext<{ state: TaskState; dispatch: Dispatch<TaskAction> } | null>(null)

export function useTasks() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>')
  return ctx
}
