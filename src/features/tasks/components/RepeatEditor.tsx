import { Repeat, X } from 'lucide-react'
import { useState } from 'react'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { shortDate, type ISODate } from '../../../lib/dates'
import { defaultRecurrence, describeRecurrence, EVERY_DAY, WEEKDAYS } from '../recurrence'
import { useTasks } from '../store'
import type { Recurrence, Task } from '../types'

// Monday first, as on a school timetable. Values are JS weekday numbers.
const WEEK = [
  { day: 1, short: 'M', name: 'Monday' },
  { day: 2, short: 'T', name: 'Tuesday' },
  { day: 3, short: 'W', name: 'Wednesday' },
  { day: 4, short: 'T', name: 'Thursday' },
  { day: 5, short: 'F', name: 'Friday' },
  { day: 6, short: 'S', name: 'Saturday' },
  { day: 0, short: 'S', name: 'Sunday' },
]

const sameDays = (a: number[], b: number[]) => a.length === b.length && b.every((d) => a.includes(d))

/** The "Repeat" section of the task editor. */
export function RepeatEditor({ task, today }: { task: Task; today: ISODate }) {
  const { dispatch } = useTasks()
  const rec = task.recurrence
  const [error, setError] = useState<string | null>(null)
  const [confirmStop, setConfirmStop] = useState(false)
  const [intervalText, setIntervalText] = useState(String(rec?.interval ?? 2))
  const completionCount = Object.keys(task.completions).length

  const setRec = (patch: Partial<Recurrence>) => {
    if (!rec) return
    setError(null)
    dispatch({ type: 'task/update', id: task.id, patch: { recurrence: { ...rec, ...patch } } })
  }

  function turnOn() {
    dispatch({
      type: 'task/update',
      id: task.id,
      patch: { recurrence: defaultRecurrence(task.dueDate ?? today), dueDate: null },
    })
  }

  function turnOff() {
    // Only offered before the first check-off; afterwards "Stop repeating" keeps the history.
    dispatch({ type: 'task/update', id: task.id, patch: { recurrence: null, dueDate: rec?.start ?? null } })
  }

  const header = (
    <div className="flex items-center gap-3">
      <Repeat className="size-4 text-ink-muted" />
      <span className="text-sm font-medium">Repeat</span>
      {rec && !rec.stoppedOn && <span className="truncate text-sm text-ink-muted">{describeRecurrence(rec)}</span>}
      {(!rec || completionCount === 0) && !rec?.stoppedOn && (
        <button
          type="button"
          role="switch"
          aria-checked={rec !== null}
          aria-label="Repeat this task"
          onClick={rec ? turnOff : turnOn}
          className={`relative ml-auto h-6 w-10 shrink-0 rounded-full transition-colors ${rec ? 'bg-accent' : 'bg-line'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${rec ? 'translate-x-4' : ''}`}
          />
        </button>
      )}
    </div>
  )

  if (!rec) return <div className="rounded-2xl bg-surface-2/60 p-4">{header}</div>

  if (rec.stoppedOn) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-surface-2/60 p-4">
        {header}
        <p className="text-sm text-ink-muted">
          Stopped repeating on {shortDate(rec.stoppedOn, today)}.{' '}
          {completionCount === 0
            ? 'No future dates are scheduled.'
            : completionCount === 1
              ? 'Your past completion and its XP are kept.'
              : `Your ${completionCount} past completions and their XP are kept.`}
        </p>
      </div>
    )
  }

  const preset =
    rec.mode === 'interval'
      ? 'interval'
      : sameDays(rec.weekdays, EVERY_DAY)
        ? 'daily'
        : sameDays(rec.weekdays, WEEKDAYS)
          ? 'weekdays'
          : 'custom'

  const presetBtn = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-accent-soft text-accent-ink' : 'bg-surface text-ink-muted hover:text-ink'
    }`

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface-2/60 p-4">
      {header}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={presetBtn(preset === 'daily')} onClick={() => setRec({ mode: 'weekdays', weekdays: [...EVERY_DAY] })}>
          Every day
        </button>
        <button type="button" className={presetBtn(preset === 'weekdays')} onClick={() => setRec({ mode: 'weekdays', weekdays: [...WEEKDAYS] })}>
          Weekdays
        </button>
        <button
          type="button"
          className={presetBtn(preset === 'interval')}
          onClick={() => {
            const n = Math.max(2, rec.interval)
            setIntervalText(String(n))
            setRec({ mode: 'interval', interval: n })
          }}
        >
          Every N days
        </button>
      </div>

      {rec.mode === 'weekdays' ? (
        <div role="group" aria-label="Repeat on these days" className="grid grid-cols-7 gap-1.5">
          {WEEK.map(({ day, short, name }) => {
            const on = rec.weekdays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                aria-label={name}
                title={name}
                onClick={() => {
                  const next = on ? rec.weekdays.filter((d) => d !== day) : [...rec.weekdays, day]
                  if (next.length === 0) return setError('Pick at least one day.')
                  setRec({ weekdays: next })
                }}
                className={`aspect-square max-h-11 rounded-xl text-sm font-semibold transition-all ${
                  on ? 'bg-accent text-on-accent' : 'bg-surface text-ink-muted hover:text-ink'
                }`}
              >
                {short}
              </button>
            )
          })}
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          Every
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={intervalText}
            onChange={(e) => {
              setIntervalText(e.target.value)
              const n = Number(e.target.value)
              if (Number.isInteger(n) && n >= 1 && n <= 365) setRec({ interval: n })
            }}
            onBlur={() => setIntervalText(String(rec.interval))}
            className={`${inputClass} w-20 text-center`}
          />
          days
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">Starts</span>
          <input
            type="date"
            value={rec.start}
            max={rec.end ?? undefined}
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              if (rec.end && v > rec.end) return setError('The start date has to be on or before the end date.')
              setRec({ start: v })
            }}
            className={inputClass}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">Ends (optional)</span>
          <div className="relative">
            <input
              type="date"
              value={rec.end ?? ''}
              min={rec.start}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return setRec({ end: null })
                if (v < rec.start) return setError('The end date has to be on or after the start date.')
                setRec({ end: v })
              }}
              className={`${inputClass} ${rec.end ? 'pr-9' : ''}`}
            />
            {rec.end && (
              <button
                type="button"
                aria-label="Remove end date"
                onClick={() => setRec({ end: null })}
                className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-surface-2"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </label>
      </div>

      <p className="text-sm text-ink-muted" aria-live="polite">
        {error ? (
          <span className="text-danger">{error}</span>
        ) : (
          <>
            {describeRecurrence(rec)}, {rec.start <= today ? 'from' : 'starting'} {shortDate(rec.start, today)}{' '}
            {rec.end ? `until ${shortDate(rec.end, today)}.` : 'with no end date.'}
          </>
        )}
      </p>

      {confirmStop ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-3">
          <p className="text-sm text-ink-muted">
            Stop repeating? Past completions and their XP stay. Today's and all future dates are removed.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={buttonClass.secondary} onClick={() => setConfirmStop(false)}>
              Keep repeating
            </button>
            <button
              type="button"
              className={buttonClass.danger}
              onClick={() => {
                dispatch({ type: 'task/stopRepeating', id: task.id, today })
                setConfirmStop(false)
              }}
            >
              Stop repeating
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${buttonClass.ghost} -ml-3 self-start text-danger hover:text-danger`} onClick={() => setConfirmStop(true)}>
          Stop repeating
        </button>
      )}
    </div>
  )
}
