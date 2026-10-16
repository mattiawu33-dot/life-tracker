import { useEffect, useState } from 'react'
import { todayISO, type ISODate } from './dates'

/**
 * Today's date that updates by itself after midnight, or when you come back
 * to the tab the next morning.
 */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const check = () => setToday(todayISO())
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])
  return today
}
