import { CalendarDays, ListChecks, Repeat } from 'lucide-react'
import type { ReactNode } from 'react'
import { Checkbox } from '../../../components/ui/Checkbox'
import { formatTime, relativeDay, type ISODate } from '../../../lib/dates'
import { LIST_COLORS } from '../listColors'
import type { TaskView } from '../selectors'
import { useTasks } from '../store'

interface TaskRowProps {
  view: TaskView
  today: ISODate
  onOpen: (id: string) => void
  /** Hide the date (e.g. in the calendar, where the day is already known). */
  hideDate?: boolean
  /** Hide the list name (e.g. when you're already looking at that list). */
  hideList?: boolean
}

/** One task: checkbox, title, and a quiet line of details underneath. */
export function TaskRow({ view, today, onOpen, hideDate, hideList }: TaskRowProps) {
  const { state, dispatch } = useTasks()
  const { task, date, done, ended } = view
  const list = state.lists.find((l) => l.id === task.listId)
  const subDone = task.subtasks.filter((s) => s.done).length
  const overdue = !done && date !== null && date < today
  const isFuture = date !== null && date > today
  // Recurring occurrences can only be checked off on or after their day.
  const canToggle = !ended && !(task.recurrence && isFuture)

  const meta: ReactNode[] = []
  if (ended) {
    meta.push(<span key="ended">{task.recurrence?.stoppedOn ? 'Stopped repeating' : 'Finished repeating'}</span>)
  }
  if (date && !hideDate && !ended) {
    meta.push(
      <span key="date" className={`inline-flex items-center gap-1 ${overdue ? 'font-medium text-danger' : date === today && !done ? 'font-medium text-accent-ink' : ''}`}>
        <CalendarDays className="size-3.5" />
        {relativeDay(date, today)}
        {task.dueTime && `, ${formatTime(task.dueTime)}`}
      </span>,
    )
  } else if (task.dueTime && !ended) {
    meta.push(<span key="time">{formatTime(task.dueTime)}</span>)
  }
  if (task.recurrence && !ended) meta.push(<Repeat key="rep" className="size-3.5" aria-label="Repeats" />)
  if (task.subtasks.length > 0) {
    meta.push(
      <span key="sub" className="inline-flex items-center gap-1">
        <ListChecks className="size-3.5" />
        {subDone}/{task.subtasks.length}
      </span>,
    )
  }
  if (list && !hideList) {
    meta.push(
      <span key="list" className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: LIST_COLORS[list.color].hex }} />
        {list.name}
      </span>,
    )
  }

  return (
    <li className="animate-[row-in_200ms_ease-out]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(task.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen(task.id)
          }
        }}
        className="flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2"
      >
        <div className="pt-px">
          <Checkbox
            checked={done && !ended}
            disabled={!canToggle}
            priority={task.priority}
            label={`${done ? 'Mark not done' : 'Complete'}: ${task.title}`}
            onChange={() =>
              dispatch({ type: 'task/toggle', id: task.id, day: task.recurrence ? date : null, now: new Date().toISOString() })
            }
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug break-words transition-colors ${done ? 'text-ink-subtle line-through' : ''}`}>
            {task.title || 'Untitled task'}
          </p>
          {meta.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">{meta}</div>
          )}
        </div>
      </div>
    </li>
  )
}
