import { Minus, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Field } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { WeekdayPicker } from '../../../components/ui/WeekdayPicker'
import { EMOJIS } from '../emojis'
import type { HabitSchedule } from '../types'

export interface HabitDraft {
  name: string
  emoji: string
  schedule: HabitSchedule
}

interface HabitFormProps {
  initial?: Partial<HabitDraft>
  submitLabel: string
  onSubmit: (draft: HabitDraft) => void
  onCancel: () => void
  /** Shown on the left of the footer (e.g. Delete when editing). */
  extraAction?: ReactNode
}

type ScheduleKind = HabitSchedule['type']

/** Name, emoji and schedule. Used for both creating and editing a habit. */
export function HabitForm({ initial, submitLabel, onSubmit, onCancel, extraAction }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '⭐')
  const init = initial?.schedule ?? { type: 'daily' }
  const [kind, setKind] = useState<ScheduleKind>(init.type)
  const [days, setDays] = useState<number[]>(init.type === 'weekdays' ? init.days : [1, 3, 5])
  const [times, setTimes] = useState(init.type === 'weekly' ? init.times : 3)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const schedule: HabitSchedule =
      kind === 'daily' ? { type: 'daily' } : kind === 'weekdays' ? { type: 'weekdays', days } : { type: 'weekly', times }
    onSubmit({ name: trimmed, emoji, schedule })
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Field label="Name" htmlFor="habit-name">
        <div className="flex gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl" aria-hidden>
            {emoji}
          </span>
          <input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Read 20 minutes"
            autoFocus
            maxLength={50}
            autoComplete="off"
            className={inputClass}
          />
        </div>
      </Field>

      <Field label="Icon">
        <div role="radiogroup" aria-label="Icon" className="grid grid-cols-10 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              aria-label={e}
              onClick={() => setEmoji(e)}
              className={`grid aspect-square place-items-center rounded-lg text-lg transition-colors ${
                emoji === e ? 'bg-accent-soft ring-2 ring-accent' : 'hover:bg-surface-2'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>

      <Field label="How often">
        <Segmented<ScheduleKind>
          label="How often"
          value={kind}
          onChange={(k) => {
            setKind(k)
            setError(null)
          }}
          options={[
            { value: 'daily', label: 'Every day' },
            { value: 'weekdays', label: 'Some days' },
            { value: 'weekly', label: 'Per week' },
          ]}
        />
        {kind === 'weekdays' && (
          <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-surface-2/60 p-3">
            <WeekdayPicker label="On these days" value={days} onChange={setDays} onEmpty={() => setError('Pick at least one day.')} />
            <p className="text-xs text-ink-muted">The other days are rest days and never break your streak.</p>
          </div>
        )}
        {kind === 'weekly' && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface-2/60 p-3">
            <button
              type="button"
              aria-label="Fewer times"
              disabled={times <= 1}
              onClick={() => setTimes((t) => t - 1)}
              className="grid size-9 place-items-center rounded-xl bg-surface text-ink disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-28 text-center text-sm font-medium whitespace-nowrap tabular-nums">
              {times} time{times === 1 ? '' : 's'} a week
            </span>
            <button
              type="button"
              aria-label="More times"
              disabled={times >= 6}
              onClick={() => setTimes((t) => t + 1)}
              className="grid size-9 place-items-center rounded-xl bg-surface text-ink disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>
            <p className="basis-full text-xs text-ink-muted">Any days you like, Mon to Sun.</p>
          </div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </Field>

      <div className="flex items-center gap-2">
        {extraAction}
        <button type="button" className={`${buttonClass.secondary} ml-auto`} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={buttonClass.primary} disabled={!name.trim()}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
