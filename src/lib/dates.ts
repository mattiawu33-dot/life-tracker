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
