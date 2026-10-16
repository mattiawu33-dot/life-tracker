import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { EventSummary } from '../../../shared/trainer'
import { addDays, fromISODate, toISODate, type ISODate } from '../../lib/dates'
import { load, save } from '../../lib/storage'
import { useLatest } from '../../lib/useLatest'
import { useToday } from '../../lib/useToday'
import { useTasks } from '../tasks/store'
import type { GoogleLink, Task } from '../tasks/types'
import * as api from './api'
import { GoogleAuthError, GoogleApiError } from './api'
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config'
import { GoogleContext, type GoogleSettings, type GoogleStatus } from './context'
import { requestToken, revokeToken, type GoogleToken } from './gis'
import { decide, eventTimes, eventToTaskPatch, isSyncable, syncHash, TASK_ID_PROP, taskToEvent, timesToEventWrite } from './mapping'
import type { GCalendar, GEvent, GEventWrite, GoogleEventItem } from './types'

const DEFAULT_SETTINGS: GoogleSettings = { connected: false, visible: {}, targetCalendarId: null, pushTasks: true }
const SYNC_EVERY_MS = 2 * 60_000
const FALLBACK_COLOR = '#039be5'

interface PendingDelete {
  eventId: string
  calendarId: string
}

/**
 * Two-way Google Calendar sync, entirely in the browser.
 *
 * - App -> Google: timed items become events in your chosen calendar (with
 *   their reminder). Changes and deletions follow.
 * - Google -> app: your events show on the calendar, colored by calendar.
 *   Edits made in Google to app-created events flow back into the item.
 * - If both changed, the app's not-yet-sent change wins.
 *
 * The access token lasts about an hour; after that we pause and show
 * "Reconnect" (one click). Changes made meanwhile are sent on reconnect.
 */
export function GoogleProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useTasks()
  const today = useToday()
  const [settings, setSettings] = useState<GoogleSettings>(() => ({ ...DEFAULT_SETTINGS, ...load('google:settings', {}) }))
  const [token, setToken] = useState<GoogleToken | null>(() => load<GoogleToken | null>('google:token', null))
  const [calendars, setCalendars] = useState<GCalendar[]>(() => load('google:calendars', []))
  const [rawEvents, setRawEvents] = useState<Record<string, GEvent[]>>(() => load('google:events', {}))
  const [status, setStatus] = useState<GoogleStatus>('off')
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [range, setRangeState] = useState<{ from: ISODate; to: ISODate }>({ from: addDays(today, -7), to: addDays(today, 35) })

  // These let the async sync code always see the latest values.
  const tasksRef = useLatest(state.tasks)
  const settingsRef = useLatest(settings)
  const rangeRef = useLatest(range)
  const tokenRef = useLatest(token)
  const running = useRef(false)
  /** Always the latest `run` (it calls itself again when a sync was requested mid-way). */
  const runRef = useRef<(kind: 'push' | 'full') => Promise<void>>(async () => {})
  const rerun = useRef<'none' | 'push' | 'full'>('none')

  useEffect(() => save('google:settings', settings), [settings])
  useEffect(() => save('google:token', token), [token])
  useEffect(() => save('google:calendars', calendars), [calendars])
  useEffect(() => save('google:events', rawEvents), [rawEvents])

  const configured = GOOGLE_CLIENT_ID !== ''
  const primary = calendars.find((c) => c.primary)
  const targetId = settings.targetCalendarId ?? primary?.id ?? 'primary'

  const targetIdRef = useLatest(targetId)

  const isVisible = useCallback(
    (id: string) => settings.visible[id] ?? calendars.find((c) => c.id === id)?.selected ?? true,
    [settings.visible, calendars],
  )

  const validToken = useCallback(() => {
    const t = tokenRef.current
    return t && t.expiresAt > Date.now() + 60_000 ? t.accessToken : null
  }, [tokenRef])

  const linkTask = useCallback(
    (task: Task, link: GoogleLink | null, extra: Partial<Task> = {}) => dispatch({ type: 'task/update', id: task.id, patch: { ...extra, google: link } }),
    [dispatch],
  )

  /** Handles errors from any Google call; auth problems pause sync until you reconnect. */
  const fail = useCallback((err: unknown) => {
    if (err instanceof GoogleAuthError) {
      setToken(null)
      setStatus('needs-auth')
      setError(null)
    } else {
      setStatus('error')
      setError((err as Error).message)
    }
  }, [])

  /** Send app changes to Google: new items, edits, removals. */
  const push = useCallback(
    async (accessToken: string) => {
      const s = settingsRef.current
      const pending = load<PendingDelete[]>('google:pendingDeletes', [])
      for (const d of pending) {
        await api.deleteEvent(accessToken, d.calendarId, d.eventId)
        save('google:pendingDeletes', load<PendingDelete[]>('google:pendingDeletes', []).filter((p) => p.eventId !== d.eventId))
      }

      for (const task of tasksRef.current) {
        const syncable = s.pushTasks && isSyncable(task, toISODate(new Date()))
        const link = task.google
        if (!link && !syncable) continue

        if (link && !syncable) {
          await api.deleteEvent(accessToken, link.calendarId, link.eventId)
          linkTask(task, null)
          continue
        }
        const hash = syncHash(task)
        if (link && link.hash === hash) continue

        const body = taskToEvent(task)
        let saved: GEvent
        if (link) {
          try {
            saved = await api.patchEvent(accessToken, link.calendarId, link.eventId, body)
          } catch (err) {
            // The event is gone (deleted, or a different Google account): make a new one.
            if (!(err instanceof GoogleApiError && (err.status === 404 || err.status === 410))) throw err
            saved = await api.insertEvent(accessToken, targetIdRef.current, body)
          }
        } else {
          saved = await api.insertEvent(accessToken, targetIdRef.current, body)
        }
        const calendarId = link && saved.id === link.eventId ? link.calendarId : targetIdRef.current
        const still = tasksRef.current.find((t) => t.id === task.id)
        if (!still) {
          await api.deleteEvent(accessToken, calendarId, saved.id) // deleted while we were saving
          continue
        }
        linkTask(still, { eventId: saved.id, calendarId, hash, updated: saved.updated ?? '' })
      }
    },
    [linkTask, settingsRef, tasksRef, targetIdRef],
  )
  /** Fetch events, apply Google-side changes to linked items, then push app changes. */
  const fullSync = useCallback(
    async (accessToken: string) => {
      let cals = calendars
      if (!cals.length || !lastSync || Date.now() - lastSync > 30 * 60_000) {
        cals = await api.listCalendars(accessToken)
        setCalendars(cals)
      }
      const r = rangeRef.current
      const t = toISODate(new Date())
      const from = fromISODate(r.from < addDays(t, -7) ? r.from : addDays(t, -7))
      const to = fromISODate(addDays(r.to > addDays(t, 30) ? r.to : addDays(t, 30), 1))
      const target = settingsRef.current.targetCalendarId ?? cals.find((c) => c.primary)?.id ?? 'primary'
      const ids = new Set(cals.filter((c) => settingsRef.current.visible[c.id] ?? c.selected ?? true).map((c) => c.id))
      ids.add(target)

      const fetched: Record<string, GEvent[]> = {}
      for (const id of ids) fetched[id === 'primary' ? (cals.find((c) => c.primary)?.id ?? id) : id] = await api.listEvents(accessToken, id, from, to)

      // Changes made in Google to events this app created.
      for (const events of Object.values(fetched)) {
        for (const e of events) {
          const taskId = e.extendedProperties?.private?.[TASK_ID_PROP]
          if (!taskId || e.recurringEventId) continue
          const task = tasksRef.current.find((x) => x.id === taskId)
          if (!task?.google || task.google.eventId !== e.id) continue
          if (e.status === 'cancelled') {
            // Deleted in Google: keep the item in the app, but stop putting it on Google Calendar.
            linkTask(task, null, { googleSync: false })
            continue
          }
          if (decide(task, e) === 'pull') {
            const patch = eventToTaskPatch(e)
            const merged = { ...task, ...patch }
            linkTask(task, { ...task.google, hash: syncHash(merged), updated: e.updated ?? '' }, patch)
          }
        }
      }
      setRawEvents(fetched)
      // Let React apply the pulled changes before pushing.
      await new Promise((res) => setTimeout(res, 0))
      await push(accessToken)
    },
    [calendars, lastSync, push, linkTask, rangeRef, settingsRef, tasksRef],
  )

  const run = useCallback(
    async (kind: 'push' | 'full') => {
      if (!settingsRef.current.connected || !configured) return
      const accessToken = validToken()
      if (!accessToken) {
        setStatus('needs-auth')
        return
      }
      if (running.current) {
        rerun.current = kind === 'full' || rerun.current === 'full' ? 'full' : 'push'
        return
      }
      running.current = true
      setStatus('syncing')
      try {
        if (kind === 'full') await fullSync(accessToken)
        else await push(accessToken)
        setStatus('ready')
        setError(null)
        setLastSync(Date.now())
      } catch (err) {
        fail(err)
      } finally {
        running.current = false
        const next = rerun.current
        rerun.current = 'none'
        if (next !== 'none') setTimeout(() => runRef.current(next), 50)
      }
    },
    [configured, fullSync, push, fail, settingsRef, validToken],
  )
  useLayoutEffect(() => {
    runRef.current = run
  }, [run])

  // Start up: sync if we still have a valid token, otherwise wait for "Reconnect".
  useEffect(() => {
    if (!configured || !settings.connected) return
    runRef.current('full')
    const timer = setInterval(() => runRef.current('full'), SYNC_EVERY_MS)
    const onFocus = () => document.visibilityState === 'visible' && runRef.current('full')
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [configured, settings.connected, token?.accessToken, runRef])

  // Fetch again when the visible calendars or date range change.
  const visibleKey = JSON.stringify(settings.visible) + settings.targetCalendarId
  useEffect(() => {
    const t = setTimeout(() => runRef.current('full'), 400)
    return () => clearTimeout(t)
  }, [range.from, range.to, visibleKey, runRef])

  // Push app changes shortly after they happen; remember deletions of synced items.
  const previous = useRef<Map<string, GoogleLink>>(new Map())
  useEffect(() => {
    const now = new Map(state.tasks.filter((t) => t.google).map((t) => [t.id, t.google!]))
    const removed = [...previous.current].filter(([id]) => !now.has(id)).map(([, l]) => ({ eventId: l.eventId, calendarId: l.calendarId }))
    if (removed.length) save('google:pendingDeletes', [...load<PendingDelete[]>('google:pendingDeletes', []), ...removed])
    previous.current = now
    const t = setTimeout(() => runRef.current('push'), 1200)
    return () => clearTimeout(t)
  }, [state.tasks, settings.pushTasks, runRef])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    try {
      const t = await requestToken(GOOGLE_CLIENT_ID, GOOGLE_SCOPES, settingsRef.current.connected ? '' : 'consent')
      setToken(t)
      tokenRef.current = t
      settingsRef.current = { ...settingsRef.current, connected: true }
      setSettings((s) => ({ ...s, connected: true }))
      await run('full')
    } catch (err) {
      setStatus(settingsRef.current.connected ? 'needs-auth' : 'off')
      setError((err as Error).message)
    }
  }, [run, settingsRef, tokenRef])

  const disconnect = useCallback(async () => {
    if (token) await revokeToken(token.accessToken)
    setToken(null)
    setSettings((s) => ({ ...s, connected: false }))
    setRawEvents({})
    setStatus('off')
    setError(null)
  }, [token])

  // Google events to show: visible calendars, not cancelled, not created by this app.
  const events = useMemo<GoogleEventItem[]>(() => {
    const linked = new Set(state.tasks.filter((t) => t.google).map((t) => t.google!.eventId))
    const taskIds = new Set(state.tasks.map((t) => t.id))
    const out: GoogleEventItem[] = []
    for (const [calendarId, list] of Object.entries(rawEvents)) {
      if (!isVisible(calendarId)) continue
      const cal = calendars.find((c) => c.id === calendarId)
      for (const event of list) {
        if (event.status === 'cancelled' || !event.start) continue
        if (linked.has(event.id) || (event.recurringEventId && linked.has(event.recurringEventId))) continue
        const ownTask = event.extendedProperties?.private?.[TASK_ID_PROP]
        if (ownTask && taskIds.has(ownTask)) continue
        out.push({
          event,
          calendarId,
          color: cal?.backgroundColor ?? FALLBACK_COLOR,
          writable: cal ? cal.accessRole === 'owner' || cal.accessRole === 'writer' : false,
        })
      }
    }
    return out
  }, [rawEvents, calendars, isVisible, state.tasks])

  /** Apply a change to one Google event: update the screen first, then Google. */
  const editEvent = useCallback(
    async (item: GoogleEventItem, write: GEventWrite | null) => {
      const accessToken = validToken()
      if (!accessToken) {
        setStatus('needs-auth')
        throw new Error('Reconnect Google Calendar first.')
      }
      const before = rawEvents
      setRawEvents((all) => ({
        ...all,
        [item.calendarId]: (all[item.calendarId] ?? []).flatMap((e) => (e.id !== item.event.id ? [e] : write ? [{ ...e, ...write }] : [])),
      }))
      try {
        if (write) {
          const saved = await api.patchEvent(accessToken, item.calendarId, item.event.id, write)
          setRawEvents((all) => ({ ...all, [item.calendarId]: (all[item.calendarId] ?? []).map((e) => (e.id === saved.id ? saved : e)) }))
        } else {
          await api.deleteEvent(accessToken, item.calendarId, item.event.id)
        }
      } catch (err) {
        setRawEvents(before)
        fail(err)
        throw err
      }
    },
    [rawEvents, fail, validToken],
  )

  const effectiveStatus: GoogleStatus = !configured ? 'not-configured' : !settings.connected && status !== 'connecting' ? 'off' : status

  const value = useMemo(
    () => ({
      status: effectiveStatus,
      error,
      lastSync,
      settings,
      updateSettings: (patch: Partial<GoogleSettings>) => setSettings((s) => ({ ...s, ...patch })),
      calendars,
      isVisible,
      writableCalendars: calendars.filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer'),
      events,
      setRange: (from: ISODate, to: ISODate) => setRangeState((r) => (r.from === from && r.to === to ? r : { from, to })),
      connect,
      disconnect,
      syncNow: () => run('full'),
      moveEvent: (item: GoogleEventItem, start: Date, end: Date, allDay: boolean) => editEvent(item, timesToEventWrite(start, end, allDay)),
      updateEvent: (item: GoogleEventItem, write: GEventWrite) => editEvent(item, write),
      deleteEvent: (item: GoogleEventItem) => editEvent(item, null),
      eventsOn: (day: ISODate): EventSummary[] =>
        events
          .map((i) => ({ i, t: eventTimes(i.event) }))
          .filter(({ t }) => t && (t.allDay ? toISODate(t.start) <= day && day < toISODate(t.end) : toISODate(t.start) === day))
          .sort((a, b) => a.t!.start.getTime() - b.t!.start.getTime())
          .slice(0, 30)
          .map(({ i, t }) => ({
            title: (i.event.summary ?? 'Busy').slice(0, 200),
            ...(t!.allDay
              ? { allDay: true }
              : { start: t!.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), end: t!.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }),
          })),
    }),
    [effectiveStatus, error, lastSync, settings, calendars, isVisible, events, connect, disconnect, run, editEvent],
  )

  return <GoogleContext.Provider value={value}>{children}</GoogleContext.Provider>
}
