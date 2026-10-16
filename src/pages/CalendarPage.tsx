import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { QuickAddBar } from '../features/tasks/components/QuickAddBar'
import { TaskDetail } from '../features/tasks/components/TaskDetail'
import { TaskRow } from '../features/tasks/components/TaskRow'
import { LIST_COLORS } from '../features/tasks/listColors'
import { compareViews, viewForDay, type TaskView } from '../features/tasks/selectors'
import { useTasks } from '../features/tasks/store'
import { addDays, fromISODate, startOfWeek, toISODate, type ISODate } from '../lib/dates'
import { useToday } from '../lib/useToday'

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Month grid of your tasks. Google Calendar events join in step 6. */
export function CalendarPage() {
  const { state } = useTasks()
  const today = useToday()
  const [selected, setSelected] = useState<ISODate>(today)
  const [month, setMonth] = useState(() => today.slice(0, 7)) // "2026-10"
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  const days = useMemo(() => {
    const first = `${month}-01`
    const nextMonth = fromISODate(first)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const last = addDays(toISODate(nextMonth), -1)
    const out: ISODate[] = []
    for (let d = startOfWeek(first); d <= last || out.length % 7 !== 0; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const entries = useMemo(() => {
    const map = new Map<ISODate, TaskView[]>()
    for (const day of days) {
      const views = state.tasks.map((t) => viewForDay(t, day, today)).filter((v): v is TaskView => v !== null)
      map.set(day, views.sort(compareViews))
    }
    return map
  }, [days, state.tasks, today])

  const selectedViews =
    entries.get(selected) ??
    state.tasks.map((t) => viewForDay(t, selected, today)).filter((v): v is TaskView => v !== null).sort(compareViews)

  function shiftMonth(delta: number) {
    const d = fromISODate(`${month}-01`)
    d.setMonth(d.getMonth() + delta)
    setMonth(toISODate(d).slice(0, 7))
  }

  const monthLabel = fromISODate(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const colorOf = (v: TaskView) => {
    const list = state.lists.find((l) => l.id === v.task.listId)
    return list ? LIST_COLORS[list.color].hex : 'var(--accent)'
  }

  return (
    <>
      <PageHeader title="Calendar" />

      <div className="flex flex-col gap-5">
        <section className="rounded-card bg-surface p-3 shadow-card md:p-5">
          <div className="mb-3 flex items-center gap-1 px-1">
            <h2 className="mr-auto text-base font-semibold">{monthLabel}</h2>
            <button
              type="button"
              onClick={() => {
                setMonth(today.slice(0, 7))
                setSelected(today)
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-soft"
            >
              Today
            </button>
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink">
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-ink-subtle">
            {WEEKDAY_HEADERS.map((d) => (
              <div key={d} className="pb-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const views = entries.get(day) ?? []
              const inMonth = day.startsWith(month)
              const isToday = day === today
              const isSelected = day === selected
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={isSelected}
                  aria-label={`${fromISODate(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${views.length} task${views.length === 1 ? '' : 's'}`}
                  className={`flex min-h-14 flex-col items-center gap-1 rounded-xl px-0.5 pt-1.5 pb-1 transition-colors md:min-h-24 md:items-stretch md:px-1.5 ${
                    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-2'
                  }`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-full text-sm tabular-nums md:self-start ${
                      isToday ? 'bg-accent font-semibold text-on-accent' : inMonth ? 'text-ink' : 'text-ink-subtle/70'
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {/* Phones: colored dots. Desktop: the first two titles. */}
                  <span className="flex gap-0.5 md:hidden">
                    {views.slice(0, 3).map((v) => (
                      <span key={v.task.id} className={`size-1.5 rounded-full ${v.done ? 'opacity-35' : ''}`} style={{ background: colorOf(v) }} />
                    ))}
                  </span>
                  <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
                    {views.slice(0, 2).map((v) => (
                      <span
                        key={v.task.id}
                        className={`truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight ${v.done ? 'text-ink-subtle line-through' : 'text-ink'}`}
                        style={{ background: `color-mix(in srgb, ${colorOf(v)} 16%, transparent)` }}
                      >
                        {v.task.title}
                      </span>
                    ))}
                    {views.length > 2 && <span className="px-1.5 text-left text-[11px] text-ink-muted">+{views.length - 2} more</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-sm font-semibold text-ink-muted">
            {selected === today ? 'Today, ' : ''}
            {fromISODate(selected).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <QuickAddBar defaultDate={selected} placeholder="Add a task for this day" />
          {selectedViews.length > 0 ? (
            <ul className="rounded-card bg-surface p-1.5 shadow-card">
              {selectedViews.map((v) => (
                <TaskRow key={v.task.id} view={v} today={today} onOpen={setOpenTaskId} hideDate />
              ))}
            </ul>
          ) : (
            <p className="px-1 text-sm text-ink-muted">Nothing planned for this day.</p>
          )}
        </section>
      </div>

      <TaskDetail taskId={openTaskId} today={today} onClose={() => setOpenTaskId(null)} />
    </>
  )
}
