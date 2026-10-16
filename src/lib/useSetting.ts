import { useCallback, useSyncExternalStore } from 'react'
import { load, save } from './storage'

const EVENT = 'lt-setting-change'

/**
 * A small saved setting (in localStorage) that every component using the same
 * key sees and updates together.
 */
export function useSetting<T>(key: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const handler = (e: Event) => (e as CustomEvent<string>).detail === key && onChange()
      window.addEventListener(EVENT, handler)
      return () => window.removeEventListener(EVENT, handler)
    },
    [key],
  )
  // Read as a string so React can compare snapshots cheaply.
  const raw = useSyncExternalStore(subscribe, () => JSON.stringify(load(key, fallback)))
  const set = useCallback(
    (value: T) => {
      save(key, value)
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }))
    },
    [key],
  )
  return [JSON.parse(raw) as T, set]
}
