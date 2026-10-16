import { createContext, useContext, type Dispatch } from 'react'
import type { ISODate } from '../../lib/dates'
import type { DayMark, Habit } from './types'

export interface HabitState {
  habits: Habit[]
}

export type HabitAction =
  | { type: 'habit/add'; habit: Habit }
  | { type: 'habit/update'; id: string; patch: Partial<Habit> }
  | { type: 'habit/delete'; id: string }
  /** Set a day to done / rest, or clear it with null. */
  | { type: 'habit/mark'; id: string; day: ISODate; mark: DayMark | null }

export function habitsReducer(state: HabitState, action: HabitAction): HabitState {
  switch (action.type) {
    case 'habit/add':
      return { habits: [...state.habits, action.habit] }
    case 'habit/update':
      return { habits: state.habits.map((h) => (h.id === action.id ? { ...h, ...action.patch } : h)) }
    case 'habit/delete':
      return { habits: state.habits.filter((h) => h.id !== action.id) }
    case 'habit/mark':
      return {
        habits: state.habits.map((h) => {
          if (h.id !== action.id) return h
          const log = { ...h.log }
          if (action.mark) log[action.day] = action.mark
          else delete log[action.day]
          return { ...h, log }
        }),
      }
  }
}

export const HabitsContext = createContext<{ state: HabitState; dispatch: Dispatch<HabitAction> } | null>(null)

export function useHabits() {
  const ctx = useContext(HabitsContext)
  if (!ctx) throw new Error('useHabits must be used inside <HabitsProvider>')
  return ctx
}
