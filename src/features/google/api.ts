import type { GCalendar, GEvent, GEventWrite } from './types'

/** Tiny client for the Google Calendar REST API, using the access token from sign-in. */

const BASE = 'https://www.googleapis.com/calendar/v3'

/** The token expired or was revoked: the user needs to reconnect. */
export class GoogleAuthError extends Error {}

export class GoogleApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new GoogleApiError(0, "Can't reach Google Calendar. Check your internet connection.")
  }
  if (res.status === 401) throw new GoogleAuthError('Your Google session expired.')
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message: string = body?.error?.message ?? `Google Calendar error ${res.status}`
    if (res.status === 403 && /insufficient|scope/i.test(message)) throw new GoogleAuthError('Google needs calendar permission again.')
    throw new GoogleApiError(res.status, message)
  }
  return body as T
}

const enc = encodeURIComponent

export async function listCalendars(token: string): Promise<GCalendar[]> {
  const r = await call<{ items?: GCalendar[] }>(token, '/users/me/calendarList?minAccessRole=reader&maxResults=250')
  return r.items ?? []
}

/** All events (repeats expanded into single occurrences) between two times, including deleted ones. */
export async function listEvents(token: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<GEvent[]> {
  const out: GEvent[] = []
  let pageToken = ''
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      showDeleted: 'true',
      maxResults: '250',
      ...(pageToken ? { pageToken } : {}),
    })
    const r = await call<{ items?: GEvent[]; nextPageToken?: string }>(token, `/calendars/${enc(calendarId)}/events?${q}`)
    out.push(...(r.items ?? []))
    if (!r.nextPageToken) break
    pageToken = r.nextPageToken
  }
  return out
}

export function insertEvent(token: string, calendarId: string, event: GEventWrite): Promise<GEvent> {
  return call<GEvent>(token, `/calendars/${enc(calendarId)}/events`, { method: 'POST', body: JSON.stringify(event) })
}

export function patchEvent(token: string, calendarId: string, eventId: string, event: GEventWrite): Promise<GEvent> {
  return call<GEvent>(token, `/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'PATCH', body: JSON.stringify(event) })
}

export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  try {
    await call<void>(token, `/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'DELETE' })
  } catch (err) {
    // Already gone is fine.
    if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410)) return
    throw err
  }
}
