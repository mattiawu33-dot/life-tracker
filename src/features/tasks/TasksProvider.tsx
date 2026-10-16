import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { load, save } from '../../lib/storage'
import { upgradeTask } from './actions'
import { TasksContext, tasksReducer, type TaskState } from './store'

const STORAGE_KEY = 'tasks'
const EMPTY: TaskState = { tasks: [], lists: [] }

/** Loads tasks + lists from localStorage once, and saves after every change. */
export function TasksProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, EMPTY, () => {
    const saved = { ...EMPTY, ...load(STORAGE_KEY, EMPTY) }
    return { ...saved, tasks: saved.tasks.map(upgradeTask) }
  })

  useEffect(() => {
    save(STORAGE_KEY, state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}
