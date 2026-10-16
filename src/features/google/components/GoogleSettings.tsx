import { CalendarDays, CheckCircle2, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { useGoogle } from '../context'

/** Settings -> Google Calendar: connect, pick calendars, choose where new items go. */
export function GoogleSettings() {
  const g = useGoogle()
  const connected = g.settings.connected

  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Google Calendar</h2>
          <p className="mt-1 text-sm text-ink-muted">
            See your Google events here, and put items with a time on Google Calendar (with reminders). Changes sync both ways.
          </p>
        </div>
      </div>

      {g.status === 'not-configured' ? (
        <p className="rounded-2xl bg-surface-2/60 p-4 text-sm text-ink-muted">
          Not set up yet: add <code className="rounded bg-surface px-1 text-[13px]">VITE_GOOGLE_CLIENT_ID</code> (see the README's "Google
          Calendar setup"), then restart or redeploy.
        </p>
      ) : !connected ? (
        <div className="flex flex-col gap-2">
          <button type="button" className={`${buttonClass.primary} self-start`} onClick={g.connect} disabled={g.status === 'connecting'}>
            {g.status === 'connecting' && <Loader2 className="size-4 animate-spin" />}
            Connect Google Calendar
          </button>
          {g.error && <p className="text-sm text-danger">{g.error}</p>}
          <p className="text-xs text-ink-subtle">
            Sign-in happens in a Google window. The app only gets a short-lived pass to your calendars; nothing goes through our server.
          </p>
        </div>
      ) : (
        <>
          {renderStatus()}

          {g.calendars.length > 0 && (
            <Field label="Show calendars">
              <ul className="flex flex-col gap-1">
                {g.calendars.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={g.isVisible(c.id)}
                        onChange={(e) => g.updateSettings({ visible: { ...g.settings.visible, [c.id]: e.target.checked } })}
                        className="size-4 rounded"
                        style={{ accentColor: c.backgroundColor }}
                      />
                      <span className="size-3 shrink-0 rounded-full" style={{ background: c.backgroundColor }} />
                      <span className="min-w-0 flex-1 truncate">
                        {c.summary}
                        {c.primary && <span className="text-ink-subtle"> (main)</span>}
                      </span>
                      {c.accessRole === 'reader' && <span className="text-xs text-ink-subtle">view only</span>}
                    </label>
                  </li>
                ))}
              </ul>
            </Field>
          )}

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">Add timed items to Google Calendar</span>
              <span className="block text-xs text-ink-muted">Items with a time become Google events, with their reminder.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={g.settings.pushTasks}
              onClick={() => g.updateSettings({ pushTasks: !g.settings.pushTasks })}
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${g.settings.pushTasks ? 'bg-accent' : 'bg-line'}`}
            >
              <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${g.settings.pushTasks ? 'translate-x-4' : ''}`} />
            </button>
          </label>

          {g.settings.pushTasks && g.writableCalendars.length > 0 && (
            <Field label="Put new items in" htmlFor="google-target">
              <select
                id="google-target"
                value={g.settings.targetCalendarId ?? g.writableCalendars.find((c) => c.primary)?.id ?? ''}
                onChange={(e) => g.updateSettings({ targetCalendarId: e.target.value })}
                className={inputClass}
              >
                {g.writableCalendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass.secondary} onClick={g.syncNow}>
              <RefreshCw className="size-4" /> Sync now
            </button>
            <button type="button" className={`${buttonClass.ghost} text-danger hover:text-danger`} onClick={g.disconnect}>
              Disconnect
            </button>
          </div>
        </>
      )}
    </section>
  )

  function renderStatus() {
    if (g.status === 'needs-auth' || g.status === 'connecting') {
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2/60 p-3 text-sm">
          <span className="text-ink-muted">Sync is paused: Google sign-in expired (it lasts about an hour).</span>
          <button type="button" className={buttonClass.primary} onClick={g.connect} disabled={g.status === 'connecting'}>
            {g.status === 'connecting' && <Loader2 className="size-4 animate-spin" />}
            Reconnect
          </button>
          {g.error && <span className="w-full text-danger">{g.error}</span>}
        </div>
      )
    }
    if (g.status === 'error') {
      return (
        <p className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {g.error}
        </p>
      )
    }
    return (
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        {g.status === 'syncing' ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4 text-accent-ink" />}
        {g.status === 'syncing' ? 'Syncing…' : 'Connected and in sync'}
      </p>
    )
  }
}
