import { createContext, useContext } from 'react'
import type { EventSummary } from '../../../shared/trainer'
import type { ISODate } from '../../lib/dates'
import type { GCalendar, GEventWrite, GoogleEventItem } from './types'

export interface GoogleSettings {
  /** You connected once; we try to keep syncing (reconnecting when the token expires). */
  connected: boolean
  /** Calendars shown in the app (missing = shown if Google marks it selected). */
  visible: Record<string, boolean>
  /** Where new timed items go. null = your main calendar. */
  targetCalendarId: string | null
  /** Put timed items from the app on Google Calendar. */
  pushTasks: boolean
}

export type GoogleStatus = 'not-configured' | 'off' | 'needs-auth' | 'connecting' | 'syncing' | 'ready' | 'error'

export interface GoogleContextValue {
  status: GoogleStatus
  error: string | null
  lastSync: number | null
  settings: GoogleSettings
  updateSettings: (patch: Partial<GoogleSettings>) => void
  calendars: GCalendar[]
  isVisible: (calendarId: string) => boolean
  writableCalendars: GCalendar[]
  /** Google events in the current range, from visible calendars (app-created ones excluded). */
  events: GoogleEventItem[]
  setRange: (from: ISODate, to: ISODate) => void
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  syncNow: () => void
  moveEvent: (item: GoogleEventItem, start: Date, end: Date, allDay: boolean) => Promise<void>
  updateEvent: (item: GoogleEventItem, write: GEventWrite) => Promise<void>
  deleteEvent: (item: GoogleEventItem) => Promise<void>
  /** Today's (or any day's) Google events, for the coach's morning plan. */
  eventsOn: (day: ISODate) => EventSummary[]
}

export const GoogleContext = createContext<GoogleContextValue | null>(null)

export function useGoogle() {
  const ctx = useContext(GoogleContext)
  if (!ctx) throw new Error('useGoogle must be used inside <GoogleProvider>')
  return ctx
}
