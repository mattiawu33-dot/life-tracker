import { Check, Flame, Moon } from 'lucide-react'
import type { ISODate } from '../../../lib/dates'
import { describeSchedule, doneInWeek, streakInfo } from '../streaks'
import { useHabits } from '../store'
import type { Habit } from '../types'

interface HabitRowProps {
  habit: Habit
  today: ISODate
  onOpen: (id: string) => void
  /** Dimmed style for habits that aren't due today. */
  muted?: boolean
}

/** One habit: emoji, name, schedule/progress, streak, and a big one-tap check button. */
export function HabitRow({ habit, today, onOpen, muted }: HabitRowProps) {
  const { dispatch } = useHabits()
  const mark = habit.log[today]
  const done = mark === 'done'
  const streak = streakInfo(habit, today)

  const subtitle =
    mark === 'rest'
      ? 'Rest day'
      : habit.schedule.type === 'weekly'
        ? `${doneInWeek(habit, today, today)} of ${habit.schedule.times} this week`
        : describeSchedule(habit)

  return (
    <li className="animate-[row-in_200ms_ease-out]">
      <div className={`flex items-center gap-2 rounded-2xl pr-3 transition-colors hover:bg-surface-2 ${muted ? 'opacity-70' : ''}`}>
        {/* Opening the details and checking off are two separate buttons, side by side. */}
        <button
          type="button"
          onClick={() => onOpen(habit.id)}
          aria-label={`${habit.name}, ${subtitle}${streak.current > 0 ? `, ${streak.current} ${streak.unit} streak` : ''}. Open details`}
          className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl py-2.5 pl-3 text-left"
        >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl" aria-hidden>
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{habit.name}</p>
          <p className="text-xs text-ink-muted">{subtitle}</p>
        </div>
        {streak.current > 0 && (
          <span
            className="flex items-center gap-1 text-sm font-semibold text-flame tabular-nums"
            title={`${streak.current}-${streak.unit} streak`}
          >
            <Flame
              className="transition-transform duration-300"
              // The flame grows a little with the streak (max at about 30).
              style={{ width: 16 + Math.min(streak.current, 30) / 5, height: 16 + Math.min(streak.current, 30) / 5 }}
              fill="currentColor"
              fillOpacity={0.2}
            />
            {streak.current}
          </span>
        )}
        </button>
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? `Undo ${habit.name} for today` : `Check off ${habit.name}`}
          onClick={() => {
            dispatch({ type: 'habit/mark', id: habit.id, day: today, mark: done ? null : 'done' })
          }}
          className={`grid size-11 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ${
            done
              ? 'animate-[check-pop_300ms_ease-out] border-accent bg-accent text-on-accent'
              : mark === 'rest'
                ? 'border-line bg-surface-2 text-ink-muted'
                : 'border-line text-transparent hover:border-accent hover:text-accent/40'
          }`}
        >
          {mark === 'rest' ? <Moon className="size-5" /> : <Check className="size-5" strokeWidth={3} />}
        </button>
      </div>
    </li>
  )
}
