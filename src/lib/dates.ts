/**
 * Date helpers.
 *
 * Calendar days are stored as plain strings like "2026-10-30" (we call them
 * ISODate). A string has no time zone, so "Friday" stays Friday no matter where
 * you are, and comparing two days is just comparing strings ("2026-10-30" <
 * "2026-11-02" works because the format is year-month-day).
 */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local midnight of that day. */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Whole days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  // UTC avoids off-by-one errors on daylight-saving days (23 or 25 hours long).
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** 0 = Sunday ... 6 = Saturday (same as JavaScript's Date.getDay()). */
export function weekdayOf(iso: ISODate): number {
  return fromISODate(iso).getDay()
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -((weekdayOf(iso) + 6) % 7))
}

/** "Good morning" / "Good afternoon" / "Good evening" based on the hour. */
export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** e.g. "Friday, October 16" in the user's own locale. */
export function longDate(now = new Date()): string {
  return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

/** e.g. "Oct 30", or "Oct 30, 2027" when it's not this year. */
export function shortDate(iso: ISODate, today: ISODate): string {
  const d = fromISODate(iso)
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

/** Friendly label: "Today", "Tomorrow", "Yesterday", "Wed" (this week) or "Oct 30". */
export function relativeDay(iso: ISODate, today: ISODate): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short' })
  return shortDate(iso, today)
}

/** "16:00" -> "4:00 PM" (or "16:00", depending on the user's locale). */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
