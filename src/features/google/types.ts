/** The parts of the Google Calendar API v3 we use (see developers.google.com/calendar/api/v3/reference). */

export interface GCalendar {
  id: string
  summary: string
  backgroundColor?: string
  foregroundColor?: string
  primary?: boolean
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
  selected?: boolean
}

export interface GEventTime {
  date?: string // all-day: "2026-10-16"
  dateTime?: string // RFC 3339 with offset
  timeZone?: string
}

export interface GEvent {
  id: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  htmlLink?: string
  updated?: string
  start?: GEventTime
  end?: GEventTime
  recurrence?: string[]
  recurringEventId?: string
  reminders?: { useDefault: boolean; overrides?: { method: 'email' | 'popup'; minutes: number }[] }
  extendedProperties?: { private?: Record<string, string> }
}

/** What we send when creating or changing an event. */
export type GEventWrite = Partial<Pick<GEvent, 'summary' | 'start' | 'end' | 'recurrence' | 'reminders' | 'extendedProperties'>>

/** A Google event placed on the calendar, together with its calendar. */
export interface GoogleEventItem {
  event: GEvent
  calendarId: string
  color: string
  writable: boolean
}
