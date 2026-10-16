/**
 * Tiny wrapper around localStorage.
 *
 * - Every key gets an `lt:` prefix so our data never collides with other apps
 *   on the same domain (e.g. localhost:5173 during development).
 * - Values are stored as JSON, so we can save objects/arrays, not just strings.
 * - Reads and writes are wrapped in try/catch: localStorage can throw in
 *   private browsing or when storage is full, and the app should keep working.
 */
const PREFIX = 'lt:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full: ignore, the app still works for this session.
  }
}
