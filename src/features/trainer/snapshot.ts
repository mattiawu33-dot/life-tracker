import type { DaySnapshot, EventSummary, TaskSummary, WeekSummary } from '../../../shared/trainer'
import { addDays, daysBetween, formatTime, fromISODate, toISODate, type ISODate } from '../../lib/dates'
import { describeSchedule, firstDay, isDueToday, isScheduled, isWeekly, streakInfo } from '../habits/streaks'
import type { Habit } from '../habits/types'
import { compareViews, viewForList } from '../tasks/selectors'
import type { Task, TaskList } from '../tasks/types'

/**
 * Turns app data into the small, plain summaries the coach receives.
 * Only what a feature needs is sent, and only when you use that feature.
 */

const MAX_TASKS = 25
const MAX_UNDATED = 8

function completedOn(task: Task, day: ISODate): number {
  if (task.recurrence) return task.completions[day] ? 1 : 0
  return task.completedAt && toISODate(new Date(task.completedAt)) === day ? 1 : 0
}

export function buildSnapshot(
  tasks: Task[],
  lists: TaskList[],
  habits: Habit[],
  today: ISODate,
  events: EventSummary[] = [],
  now = new Date(),
): DaySnapshot {
  const listName = (id: string | null) => lists.find((l) => l.id === id)?.name
  const views = tasks.map((t) => viewForList(t, today)).filter((v) => !v.done)
  const dated = views.filter((v) => v.date && daysBetween(today, v.date) <= 7).sort(compareViews)
  const undated = views.filter((v) => !v.date).sort(compareViews).slice(0, MAX_UNDATED)

  const summaries: TaskSummary[] = [...dated, ...undated].slice(0, MAX_TASKS).map(({ task, date }) => ({
    title: task.title.slice(0, 200),
    when: !date ? 'none' : date < today ? 'overdue' : date === today ? 'today' : 'upcoming',
    ...(date ? { date } : {}),
    ...(task.dueTime ? { time: formatTime(task.dueTime) } : {}),
    priority: task.priority,
    effort: task.effort,
    ...(listName(task.listId) ? { list: listName(task.listId) } : {}),
  }))

  return {
    date: today,
    weekday: fromISODate(today).toLocaleDateString('en-US', { weekday: 'long' }),
    localTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    tasks: summaries,
    tasksDoneToday: tasks.reduce((n, t) => n + completedOn(t, today), 0),
    habits: habits.slice(0, 30).map((h) => {
      const s = streakInfo(h, today)
      return {
        name: h.name.slice(0, 80),
        schedule: describeSchedule(h),
        dueToday: isDueToday(h, today),
        doneToday: h.log[today] === 'done',
        streak: s.current,
        streakUnit: s.unit,
      }
    }),
    events,
  }
}

/** The last 7 days, ending today. */
export function buildWeek(tasks: Task[], habits: Habit[], today: ISODate): WeekSummary {
  const start = addDays(today, -6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const titles = new Set<string>()
  let completed = 0
  for (const t of tasks) {
    for (const d of days) {
      if (completedOn(t, d)) {
        completed++
        titles.add(t.title.slice(0, 200))
      }
    }
  }
  const overdue = tasks.map((t) => viewForList(t, today)).filter((v) => !v.done && v.date && v.date < today).length

  return {
    start,
    end: today,
    tasksCompleted: completed,
    completedTitles: [...titles].slice(0, 40),
    tasksOverdue: overdue,
    habits: habits.slice(0, 30).map((h) => {
      const first = firstDay(h)
      const done = days.filter((d) => h.log[d] === 'done').length
      const planned = isWeekly(h)
        ? h.schedule.type === 'weekly'
          ? h.schedule.times
          : 7
        : days.filter((d) => d >= first && isScheduled(h, d) && h.log[d] !== 'rest' && !(d === today && h.log[d] !== 'done')).length
      const s = streakInfo(h, today)
      return { name: h.name.slice(0, 80), done, planned, streak: s.current, streakUnit: s.unit }
    }),
  }
}
