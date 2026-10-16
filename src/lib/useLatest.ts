import { useLayoutEffect, useRef } from 'react'

/**
 * A ref that always holds the latest value. Handy for async code (like a sync
 * loop) that runs across many renders and must never use stale data.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
