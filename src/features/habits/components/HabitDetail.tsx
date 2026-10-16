import { Check, Flame, Moon, Pencil, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { buttonClass } from '../../../components/ui/styles'
import type { ISODate } from '../../../lib/dates'
import { completionRate, describeSchedule, isWeekly, streakInfo } from '../streaks'
import { useHabits } from '../store'
import type { Habit } from '../types'
import { HabitForm } from './HabitForm'
import { Heatmap } from './Heatmap'

interface HabitDetailProps {
  habitId: string | null
  today: ISODate
  onClose: () => void
}

/** Stats, heatmap, today's status, and edit/delete for one habit. */
export function HabitDetail({ habitId, today, onClose }: HabitDetailProps) {
  const { state } = useHabits()
  const habit = state.habits.find((h) => h.id === habitId)
  return (
    <Dialog open={!!habit} onClose={onClose} title={habit?.name ?? 'Habit'} hideTitle>
      {habit && <DetailBody key={habit.id} habit={habit} today={today} onClose={onClose} />}
    </Dialog>
  )
}

function DetailBody({ habit, today, onClose }: { habit: Habit; today: ISODate; onClose: () => void }) {
  const { dispatch } = useHabits()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const streak = streakInfo(habit, today)
  const rate = completionRate(habit, today)
  const mark = habit.log[today]
  const unit = (n: number) => `${n} ${streak.unit}${n === 1 ? '' : 's'}`

  if (editing) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Edit habit</h2>
        <HabitForm
          initial={habit}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSubmit={(draft) => {
            dispatch({ type: 'habit/update', id: habit.id, patch: draft })
            setEditing(false)
          }}
          extraAction={
            <button type="button" className={`${buttonClass.ghost} -ml-3 text-danger hover:text-danger`} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          }
        />
        {confirmDelete && (
          <div className="flex flex-col gap-3 rounded-2xl bg-danger-soft p-4">
            <p className="text-sm">
              Delete <strong>{habit.name}</strong> and its whole history? This can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonClass.secondary} onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
              <button
                type="button"
                className={`${buttonClass.primary} bg-danger`}
                onClick={() => {
                  dispatch({ type: 'habit/delete', id: habit.id })
                  onClose()
                }}
              >
                Delete habit
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const toggle = (m: 'done' | 'rest') => dispatch({ type: 'habit/mark', id: habit.id, day: today, mark: mark === m ? null : m })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3.5 pr-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-3xl" aria-hidden>
          {habit.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{habit.name}</h2>
          <p className="text-sm text-ink-muted">{describeSchedule(habit)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={mark === 'done'}
          onClick={() => toggle('done')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            mark === 'done' ? 'bg-accent text-on-accent' : 'bg-surface-2 text-ink hover:bg-line'
          }`}
        >
          <Check className="size-4" strokeWidth={3} />
          {mark === 'done' ? 'Done today' : 'Mark done'}
        </button>
        {!isWeekly(habit) && (
          <button
            type="button"
            aria-pressed={mark === 'rest'}
            onClick={() => toggle('rest')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              mark === 'rest' ? 'bg-accent-soft text-accent-ink ring-1 ring-accent/40' : 'bg-surface-2 text-ink hover:bg-line'
            }`}
          >
            <Moon className="size-4" />
            {mark === 'rest' ? 'Resting today' : 'Rest day'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Flame className="size-4 text-flame" />} label="Streak" value={unit(streak.current)} />
        <Stat icon={<Trophy className="size-4 text-prio-medium" />} label="Best" value={unit(streak.best)} />
        <Stat label="Last 30 days" value={rate === null ? '–' : `${Math.round(rate * 100)}%`} />
      </div>

      <Heatmap habit={habit} today={today} />

      <button type="button" className={`${buttonClass.secondary} self-start`} onClick={() => setEditing(true)}>
        <Pencil className="size-4" />
        Edit habit
      </button>
    </div>
  )
}

function Stat({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-2/70 px-3 py-2.5">
      <span className="flex items-center gap-1 text-xs text-ink-muted">
        {icon}
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  )
}
