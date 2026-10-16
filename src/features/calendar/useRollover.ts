import { useEffect } from 'react'
import { useSetting } from '../../lib/useSetting'
import { useToday } from '../../lib/useToday'
import { useTasks } from '../tasks/store'

export const ROLLOVER_KEY = 'calendar:rollover'

/**
 * When rollover is on, unfinished checklist items (one-off, no time) from
 * earlier days move to today. Runs on startup and again after midnight.
 */
export function useRollover() {
  const { dispatch } = useTasks()
  const today = useToday()
  const [enabled] = useSetting(ROLLOVER_KEY, true)
  useEffect(() => {
    if (enabled) dispatch({ type: 'task/rollover', today })
  }, [enabled, today, dispatch])
}
