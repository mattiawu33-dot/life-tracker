import { ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { formatTime, toISODate, todayISO, relativeDay } from '../../../lib/dates'
import { REMINDER_OPTIONS } from '../../tasks/timing'
import { useGoogle } from '../context'
import { eventTimes } from '../mapping'
import type { GoogleEventItem } from '../types'

/** Details of a Google event: rename, change its reminder, delete, or open it in Google Calendar. */
export function GoogleEventDialog({ item, onClose }: { item: GoogleEventItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onClose={onClose} title={item?.event.summary ?? 'Event'} hideTitle>
      {item && <Body key={item.event.id} item={item} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ item, onClose }: { item: GoogleEventItem; onClose: () => void }) {
  const g = useGoogle()
  const e = item.event
  const times = eventTimes(e)
  const cal = g.calendars.find((c) => c.id === item.calendarId)
  const popup = e.reminders && !e.reminders.useDefault ? (e.reminders.overrides ?? []).find((o) => o.method === 'popup')?.minutes ?? null : undefined
  const [title, setTitle] = useState(e.summary ?? '')
  const [reminder, setReminder] = useState<number | null | undefined>(popup)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pad = (n: number) => String(n).padStart(2, '0')
  const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const when = times
    ? times.allDay
      ? `${relativeDay(toISODate(times.start), todayISO())} · all day`
      : `${relativeDay(toISODate(times.start), todayISO())} · ${formatTime(hhmm(times.start))} – ${formatTime(hhmm(times.end))}`
    : ''

  async function act(fn: () => Promise<void>) {
    setSaving(true)
    setError(null)
    try {
      await fn()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 pr-8">
        <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: item.color }} />
        <div className="min-w-0">
          {item.writable ? (
            <input
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              aria-label="Title"
              className="w-full bg-transparent text-xl font-semibold focus:outline-none"
            />
          ) : (
            <h2 className="text-xl font-semibold">{e.summary || '(No title)'}</h2>
          )}
          <p className="text-sm text-ink-muted">{when}</p>
          <p className="text-xs text-ink-subtle">
            {cal?.summary ?? 'Google Calendar'}
            {e.recurringEventId ? ' · repeating (changes apply to this one)' : ''}
            {!item.writable ? ' · view only' : ''}
          </p>
        </div>
      </div>

      {item.writable && !times?.allDay && (
        <Field label="Reminder (from Google)" htmlFor="gevent-reminder">
          <select
            id="gevent-reminder"
            value={reminder === undefined ? 'default' : (reminder ?? '')}
            onChange={(ev) => setReminder(ev.target.value === 'default' ? undefined : ev.target.value === '' ? null : Number(ev.target.value))}
            className={inputClass}
          >
            <option value="default">Calendar's default</option>
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ?? ''}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {e.htmlLink && (
          <a href={e.htmlLink} target="_blank" rel="noreferrer" className={buttonClass.ghost}>
            <ExternalLink className="size-4" /> Open in Google
          </a>
        )}
        {item.writable && !confirmDelete && (
          <button type="button" className={`${buttonClass.ghost} text-danger hover:text-danger`} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </button>
        )}
        {confirmDelete && (
          <button type="button" className={buttonClass.danger} disabled={saving} onClick={() => act(() => g.deleteEvent(item))}>
            Delete from Google Calendar
          </button>
        )}
        {item.writable && (
          <button
            type="button"
            className={`${buttonClass.primary} ml-auto`}
            disabled={saving}
            onClick={() =>
              act(() =>
                g.updateEvent(item, {
                  summary: title.trim() || e.summary,
                  ...(reminder === undefined
                    ? { reminders: { useDefault: true } }
                    : { reminders: { useDefault: false, overrides: reminder === null ? [] : [{ method: 'popup', minutes: reminder }] } }),
                }),
              )
            }
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}
