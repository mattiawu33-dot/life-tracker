// Monday first, as on a school timetable. Values are JS weekday numbers (0 = Sun).
const WEEK = [
  { day: 1, short: 'M', name: 'Monday' },
  { day: 2, short: 'T', name: 'Tuesday' },
  { day: 3, short: 'W', name: 'Wednesday' },
  { day: 4, short: 'T', name: 'Thursday' },
  { day: 5, short: 'F', name: 'Friday' },
  { day: 6, short: 'S', name: 'Saturday' },
  { day: 0, short: 'S', name: 'Sunday' },
]

interface WeekdayPickerProps {
  value: number[]
  onChange: (days: number[]) => void
  label: string
  /** Called instead of onChange when the last selected day would be turned off. */
  onEmpty?: () => void
}

/** Seven toggle buttons, Mon to Sun. */
export function WeekdayPicker({ value, onChange, label, onEmpty }: WeekdayPickerProps) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1.5">
      {WEEK.map(({ day, short, name }) => {
        const on = value.includes(day)
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={name}
            title={name}
            onClick={() => {
              const next = on ? value.filter((d) => d !== day) : [...value, day]
              if (next.length === 0) onEmpty?.()
              else onChange(next)
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
  )
}
