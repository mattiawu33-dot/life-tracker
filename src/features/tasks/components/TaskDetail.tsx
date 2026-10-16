import { Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { Segmented } from '../../../components/ui/Segmented'
import { shortDate, type ISODate } from '../../../lib/dates'
import { newId } from '../../../lib/id'
import { toggleDay } from '../actions'
import { viewForList } from '../selectors'
import { useTasks } from '../store'
import { askForNotifications } from '../../../lib/notifications'
import { DEFAULT_DURATION_MIN, DURATION_OPTIONS, REMINDER_OPTIONS } from '../timing'
import { EFFORT_XP, type Effort, type Priority, type Task } from '../types'
import { RepeatEditor } from './RepeatEditor'

interface TaskDetailProps {
  taskId: string | null
  today: ISODate
  onClose: () => void
}

/** Edit everything about a task. Changes save as you make them. */
export function TaskDetail({ taskId, today, onClose }: TaskDetailProps) {
  const { state } = useTasks()
  const task = state.tasks.find((t) => t.id === taskId)
  return (
    <Dialog open={!!task} onClose={onClose} title="Edit task" hideTitle>
      {task && <TaskForm task={task} today={today} onClose={onClose} />}
    </Dialog>
  )
}

const PRIORITY_OPTIONS: { value: Priority; label: ReactNode; ariaLabel: string }[] = [
  { value: 'none', label: 'None', ariaLabel: 'No priority' },
  { value: 'low', label: <Dot className="bg-prio-low" text="Low" />, ariaLabel: 'Low' },
  { value: 'medium', label: <Dot className="bg-prio-medium" text="Med" />, ariaLabel: 'Medium' },
  { value: 'high', label: <Dot className="bg-prio-high" text="High" />, ariaLabel: 'High' },
]

function Dot({ className, text }: { className: string; text: string }) {
  return (
    <>
      <span className={`size-2 rounded-full ${className}`} />
      {text}
    </>
  )
}

const EFFORT_OPTIONS: { value: Effort; label: ReactNode; ariaLabel: string }[] = (['small', 'medium', 'big'] as Effort[]).map(
  (e) => ({
    value: e,
    ariaLabel: `${e}, ${EFFORT_XP[e]} XP`,
    label: (
      <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
        <span className="capitalize">{e}</span>
        <span className="text-[11px] text-ink-subtle">{EFFORT_XP[e]} XP</span>
      </span>
    ),
  }),
)

function TaskForm({ task, today, onClose }: { task: Task; today: ISODate; onClose: () => void }) {
  const { state, dispatch } = useTasks()
  const [newSubtask, setNewSubtask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = (patch: Partial<Task>) => dispatch({ type: 'task/update', id: task.id, patch })
  const view = viewForList(task, today)

  function addSubtask() {
    const title = newSubtask.trim()
    if (!title) return
    dispatch({ type: 'subtask/add', taskId: task.id, subtask: { id: newId(), title, done: false } })
    setNewSubtask('')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="pt-2.5">
          <Checkbox
            checked={view.done && !view.ended}
            disabled={view.ended || (!!task.recurrence && view.date !== null && view.date > today)}
            priority={task.priority}
            label={view.done ? 'Mark not done' : 'Complete task'}
            onChange={() => dispatch({ type: 'task/toggle', id: task.id, day: toggleDay(task, today), now: new Date().toISOString() })}
          />
        </div>
        <label htmlFor="task-title" className="sr-only">
          Title
        </label>
        <textarea
          id="task-title"
          value={task.title}
          onChange={(e) => update({ title: e.target.value.replace(/\n/g, ' ') })}
          rows={1}
          placeholder="Task name"
          className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent py-1.5 pr-8 text-xl font-semibold text-ink focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-4">
        <Field label="List" htmlFor="task-list">
          <select
            id="task-list"
            value={task.listId ?? ''}
            onChange={(e) => update({ listId: e.target.value || null })}
            className={inputClass}
          >
            <option value="">Inbox (no list)</option>
            {state.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>

        {task.recurrence ? (
          <div className="grid grid-cols-2 gap-3">
            <TimeField value={task.dueTime} onChange={(dueTime) => update({ dueTime })} label="Time" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="task-date">
              <input
                id="task-date"
                type="date"
                value={task.dueDate ?? ''}
                onChange={(e) => update({ dueDate: e.target.value || null })}
                className={inputClass}
              />
            </Field>
            <TimeField value={task.dueTime} onChange={(dueTime) => update({ dueTime })} label="Time" />
          </div>
        )}
      </div>

      {task.dueTime && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration" htmlFor="task-duration">
            <select
              id="task-duration"
              value={task.durationMin ?? DEFAULT_DURATION_MIN}
              onChange={(e) => update({ durationMin: Number(e.target.value) })}
              className={inputClass}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {task.durationMin && !DURATION_OPTIONS.some((o) => o.value === task.durationMin) && (
                <option value={task.durationMin}>{task.durationMin} min</option>
              )}
            </select>
          </Field>
          <Field label="Reminder" htmlFor="task-reminder">
            <select
              id="task-reminder"
              value={task.reminderMin ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value)
                update({ reminderMin: v })
                if (v !== null) askForNotifications()
              }}
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
      )}

      <Field label="Priority">
        <Segmented label="Priority" value={task.priority} options={PRIORITY_OPTIONS} onChange={(priority) => update({ priority })} />
      </Field>

      <Field label="Effort">
        <Segmented label="Effort" value={task.effort} options={EFFORT_OPTIONS} onChange={(effort) => update({ effort })} />
      </Field>

      <RepeatEditor key={task.recurrence ? 'on' : 'off'} task={task} today={today} />

      <Field label="Subtasks" htmlFor="new-subtask">
        <ul className="flex flex-col">
          {task.subtasks.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-xl px-1 py-1">
              <Checkbox
                size="sm"
                checked={s.done}
                label={`${s.done ? 'Uncheck' : 'Check'} ${s.title}`}
                onChange={() => dispatch({ type: 'subtask/update', taskId: task.id, subtaskId: s.id, patch: { done: !s.done } })}
              />
              <input
                value={s.title}
                aria-label="Subtask"
                onChange={(e) => dispatch({ type: 'subtask/update', taskId: task.id, subtaskId: s.id, patch: { title: e.target.value } })}
                className={`min-w-0 flex-1 bg-transparent py-1 text-sm focus:outline-none ${s.done ? 'text-ink-subtle line-through' : ''}`}
              />
              <button
                type="button"
                aria-label={`Delete subtask ${s.title}`}
                onClick={() => dispatch({ type: 'subtask/delete', taskId: task.id, subtaskId: s.id })}
                className="grid size-8 place-items-center rounded-lg text-ink-subtle opacity-100 hover:bg-surface-2 hover:text-ink md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="flex items-center gap-3 px-1"
          onSubmit={(e) => {
            e.preventDefault()
            addSubtask()
          }}
        >
          <Plus className="size-[18px] text-ink-subtle" />
          <input
            id="new-subtask"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onBlur={addSubtask}
            placeholder="Add a subtask"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-sm focus:outline-none"
          />
        </form>
      </Field>

      <Field label="Notes" htmlFor="task-notes">
        <textarea
          id="task-notes"
          value={task.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Anything else to remember"
          rows={3}
          className={`${inputClass} field-sizing-content min-h-20 resize-none`}
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-subtle">Created {shortDate(task.createdAt.slice(0, 10), today)}</span>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button type="button" className={buttonClass.secondary} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass.danger}
              onClick={() => {
                dispatch({ type: 'task/delete', id: task.id })
                onClose()
              }}
            >
              Delete task
            </button>
          </div>
        ) : (
          <button type="button" className={`${buttonClass.ghost} text-danger hover:text-danger`} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function TimeField({ value, onChange, label }: { value: string | null; onChange: (v: string | null) => void; label: string }) {
  return (
    <Field label={label} htmlFor="task-time">
      <input id="task-time" type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={inputClass} />
    </Field>
  )
}
