import { useEffect, useRef } from 'react'
import { addDays } from '../../lib/dates'
import { load, save } from '../../lib/storage'
import { useToday } from '../../lib/useToday'
import { streakInfo } from '../habits/streaks'
import { useHabits } from '../habits/store'
import { useTasks } from '../tasks/store'
import type { Task } from '../tasks/types'
import { useTrainer } from './context'

/** Tasks checked off this soon after being created don't count (no gaming it). */
const MIN_TASK_AGE_MS = 60_000
/** Only streaks at least this long get a "streak ended" reaction. */
const MIN_LOST_STREAK = 3

function doneKeys(t: Task): string {
  return t.recurrence ? Object.keys(t.completions).sort().join(',') : (t.completedAt ?? '')
}

/**
 * Watches for coach-worthy moments and asks for a live reaction:
 * - a big task was just completed
 * - a habit streak (3+) ended since yesterday
 * - hitting the daily XP goal is wired up in step 4 (call notify from there)
 */
export function useTrainerEvents() {
  const { notify, ready } = useTrainer()
  const { state: taskState } = useTasks()
  const { state: habitState } = useHabits()
  const today = useToday()
  const previous = useRef<Map<string, string> | null>(null)

  // Big task completed
  useEffect(() => {
    const now = new Map(taskState.tasks.map((t) => [t.id, doneKeys(t)]))
    const before = previous.current
    previous.current = now
    if (!before) return // first render: just remember the current state

    for (const t of taskState.tasks) {
      if (t.effort !== 'big') continue
      const was = before.get(t.id)
      const is = now.get(t.id)!
      const justDone = t.recurrence ? is.length > (was ?? '').length : !was && !!is
      if (!justDone || was === undefined) continue
      if (Date.now() - new Date(t.createdAt).getTime() < MIN_TASK_AGE_MS) continue
      notify({ type: 'bigTaskDone', title: t.title })
      break
    }
  }, [taskState.tasks, notify])

  // Streak lost: checked once per habit per day (e.g. when you open the app in the morning).
  useEffect(() => {
    if (!ready) return
    const seen = new Set(load<string[]>('trainer:streaksSeen', []).filter((k) => k.endsWith(today)))
    const yesterday = addDays(today, -1)
    let biggest: { habit: string; length: number; unit: 'day' | 'week' } | null = null
    for (const h of habitState.habits) {
      const key = `${h.id}:${today}`
      if (seen.has(key)) continue
      seen.add(key)
      const before = streakInfo(h, yesterday)
      if (before.current >= MIN_LOST_STREAK && streakInfo(h, today).current === 0) {
        if (!biggest || before.current > biggest.length) biggest = { habit: h.name, length: before.current, unit: before.unit }
      }
    }
    save('trainer:streaksSeen', [...seen])
    if (biggest) notify({ type: 'streakLost', ...biggest })
  }, [ready, today, habitState.habits, notify])
}
