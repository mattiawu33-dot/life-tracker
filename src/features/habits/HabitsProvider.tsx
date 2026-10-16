import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { load, save } from '../../lib/storage'
import { HabitsContext, habitsReducer, type HabitState } from './store'

const STORAGE_KEY = 'habits'
const EMPTY: HabitState = { habits: [] }

/** Loads habits from localStorage once, and saves after every change. */
export function HabitsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(habitsReducer, EMPTY, () => ({ ...EMPTY, ...load(STORAGE_KEY, EMPTY) }))

  useEffect(() => {
    save(STORAGE_KEY, state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
}
