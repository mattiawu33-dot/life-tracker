/** Choices for how long a timed item lasts and when to be reminded. */

export const DEFAULT_DURATION_MIN = 30

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240].map((m) => ({
  value: m,
  label: m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${Math.floor(m / 60)} h ${m % 60} min`,
}))

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At start time' },
  { value: 5, label: '5 min before' },
  { value: 10, label: '10 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
]

export function reminderLabel(min: number | null): string {
  return REMINDER_OPTIONS.find((o) => o.value === min)?.label ?? `${min} min before`
}

/** "16:00" + 90 -> "17:30" (wraps past midnight). */
export function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
