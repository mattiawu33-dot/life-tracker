import { addDays, fromISODate, shortDate, startOfWeek, type ISODate } from '../../../lib/dates'
import { firstDay, isScheduled, isWeekly } from '../streaks'
import { useHabits } from '../store'
import type { Habit } from '../types'

const WEEKS = 18
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

type CellState = 'done' | 'rest' | 'missed' | 'off' | 'future'

function cellState(habit: Habit, day: ISODate, today: ISODate, first: ISODate): CellState {
  if (day > today) return 'future'
  const mark = habit.log[day]
  if (mark) return mark
  if (day < first || day === today || isWeekly(habit) || !isScheduled(habit, day)) return 'off'
  return 'missed'
}

const CELL_CLASS: Record<CellState, string> = {
  done: 'bg-accent',
  rest: 'bg-accent-soft ring-1 ring-inset ring-accent/40',
  missed: 'bg-ink-subtle/35',
  off: 'bg-surface-2',
  future: 'bg-transparent',
}

/**
 * The last 18 weeks, one square per day (columns are weeks, Mon at the top).
 * Tap a past day to fix it: empty → done → rest day → empty.
 */
export function Heatmap({ habit, today }: { habit: Habit; today: ISODate }) {
  const { dispatch } = useHabits()
  const first = firstDay(habit)
  const start = addDays(startOfWeek(today), -(WEEKS - 1) * 7)
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  const canRest = !isWeekly(habit)

  // Month name above the first week that starts in a new month.
  const monthLabels = Array.from({ length: WEEKS }, (_, w) => {
    const d = days[w * 7]
    const prev = w > 0 ? days[(w - 1) * 7] : null
    return !prev || d.slice(5, 7) !== prev.slice(5, 7)
      ? fromISODate(d).toLocaleDateString(undefined, { month: 'short' })
      : ''
  })

  function cycle(day: ISODate) {
    const mark = habit.log[day]
    const next = !mark ? 'done' : mark === 'done' && canRest ? 'rest' : null
    dispatch({ type: 'habit/mark', id: habit.id, day, mark: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        <div className="grid shrink-0 grid-rows-[auto_repeat(7,1fr)] gap-[3px] pt-0 text-[10px] leading-none text-ink-subtle">
          <span className="h-3" />
          {ROW_LABELS.map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-[3px] grid h-3 gap-[3px] text-[10px] leading-none text-ink-subtle" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {monthLabels.map((m, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {days.map((day) => {
              const state = cellState(habit, day, today, first)
              const label = `${shortDate(day, today)}: ${
                state === 'done' ? 'done' : state === 'rest' ? 'rest day' : state === 'missed' ? 'missed' : 'not checked'
              }`
              return state === 'future' ? (
                <span key={day} className="aspect-square" />
              ) : (
                <button
                  key={day}
                  type="button"
                  title={label}
                  aria-label={`${label}. Tap to change`}
                  onClick={() => cycle(day)}
                  className={`aspect-square rounded-[4px] transition-colors hover:ring-2 hover:ring-ink-subtle ${CELL_CLASS[state]} ${
                    day === today ? 'ring-2 ring-ink/60' : ''
                  }`}
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <Legend className={CELL_CLASS.done} label="Done" />
        {canRest && <Legend className={CELL_CLASS.rest} label="Rest day" />}
        {!isWeekly(habit) && <Legend className={CELL_CLASS.missed} label="Missed" />}
        <span className="text-ink-subtle">Tap a day to fix a missed check-in</span>
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded-[3px] ${className}`} />
      {label}
    </span>
  )
}
