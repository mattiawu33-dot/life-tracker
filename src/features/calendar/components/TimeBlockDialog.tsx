import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { formatTime, fromISODate, type ISODate } from '../../../lib/dates'
import { askForNotifications } from '../../../lib/notifications'
import { makeTask } from '../../tasks/actions'
import { useTasks } from '../../tasks/store'
import { addMinutes, REMINDER_OPTIONS } from '../../tasks/timing'

export interface BlockDraft {
  day: ISODate
  start: string
  durationMin: number
}

/** "New time block": opens after dragging (or clicking) on the time grid. */
export function TimeBlockDialog({ draft, onClose }: { draft: BlockDraft | null; onClose: () => void }) {
  return (
    <Dialog open={draft !== null} onClose={onClose} title="New time block">
      {draft && <BlockForm draft={draft} onClose={onClose} />}
    </Dialog>
  )
}

function BlockForm({ draft, onClose }: { draft: BlockDraft; onClose: () => void }) {
  const { state, dispatch } = useTasks()
  const [title, setTitle] = useState('')
  const [listId, setListId] = useState('')
  const [reminder, setReminder] = useState<number | null>(10)

  const when = `${fromISODate(draft.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatTime(draft.start)} – ${formatTime(addMinutes(draft.start, draft.durationMin))}`

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        dispatch({
          type: 'task/add',
          task: makeTask({
            title: title.trim(),
            dueDate: draft.day,
            dueTime: draft.start,
            durationMin: draft.durationMin,
            reminderMin: reminder,
            listId: listId || null,
          }),
        })
        if (reminder !== null) askForNotifications()
        onClose()
      }}
    >
      <p className="-mt-2 text-sm text-ink-muted">{when}</p>
      <label htmlFor="block-title" className="sr-only">
        Title
      </label>
      <input
        id="block-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Study for chem test"
        autoFocus
        autoComplete="off"
        className={`${inputClass} text-base`}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="List" htmlFor="block-list">
          <select id="block-list" value={listId} onChange={(e) => setListId(e.target.value)} className={inputClass}>
            <option value="">Inbox</option>
            {state.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reminder" htmlFor="block-reminder">
          <select
            id="block-reminder"
            value={reminder ?? ''}
            onChange={(e) => setReminder(e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ?? ''}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonClass.secondary} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={buttonClass.primary} disabled={!title.trim()}>
          Add block
        </button>
      </div>
    </form>
  )
}
