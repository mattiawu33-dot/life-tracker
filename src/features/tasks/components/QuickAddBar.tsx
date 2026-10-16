import { CalendarDays, Flag, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatTime, relativeDay, type ISODate } from '../../../lib/dates'
import { useToday } from '../../../lib/useToday'
import { makeTask } from '../actions'
import { LIST_COLORS } from '../listColors'
import { parseQuickAdd } from '../quickAdd'
import { useTasks } from '../store'

interface QuickAddBarProps {
  /** Used when the text doesn't mention a date (e.g. the day picked in the calendar). */
  defaultDate?: ISODate | null
  /** Used when the text doesn't include a #list (e.g. the list you're looking at). */
  defaultListId?: string | null
  placeholder?: string
}

const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low', none: '' }
// Full class names written out so Tailwind can find them (it can't see `text-prio-${x}`).
const PRIORITY_TEXT = { high: 'text-prio-high', medium: 'text-prio-medium', low: 'text-prio-low', none: '' }

/**
 * Type a task in plain English. As you type, chips show what was understood
 * (date, list, priority); tap × on the date chip if it guessed wrong.
 */
export function QuickAddBar({ defaultDate = null, defaultListId = null, placeholder }: QuickAddBarProps) {
  const { state, dispatch } = useTasks()
  const today = useToday()
  const [text, setText] = useState('')
  const [ignoreDate, setIgnoreDate] = useState(false)

  const parsed = useMemo(
    () => parseQuickAdd(text, { lists: state.lists, ignoreDate }),
    [text, state.lists, ignoreDate],
  )
  const list = state.lists.find((l) => l.id === (parsed.listId ?? defaultListId))
  const dueDate = parsed.dueDate ?? defaultDate

  function submit() {
    if (!parsed.title) return
    dispatch({
      type: 'task/add',
      task: makeTask({
        title: parsed.title,
        dueDate,
        dueTime: parsed.dueTime,
        listId: list?.id ?? null,
        priority: parsed.priority ?? 'none',
      }),
    })
    setText('')
    setIgnoreDate(false)
  }

  const chip = 'inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted'

  return (
    <form
      className="rounded-card bg-surface p-2 shadow-card"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="quick-add" className="sr-only">
          Add a task
        </label>
        <input
          id="quick-add"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (!e.target.value) setIgnoreDate(false)
          }}
          placeholder={placeholder ?? 'Add a task, e.g. "bio essay friday"'}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] text-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={!parsed.title}
          aria-label="Add task"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-on-accent transition-all hover:opacity-90 disabled:bg-surface-2 disabled:text-ink-subtle"
        >
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      {(text || dueDate || list) && (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pt-1 pb-1">
          {dueDate && (
            <span className={`${chip} bg-accent-soft text-accent-ink`}>
              <CalendarDays className="size-3.5" />
              {relativeDay(dueDate, today)}
              {parsed.dueTime && `, ${formatTime(parsed.dueTime)}`}
              {parsed.dateText && (
                <button
                  type="button"
                  onClick={() => setIgnoreDate(true)}
                  aria-label={`Don't read "${parsed.dateText}" as a date`}
                  className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-accent/15"
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          )}
          {list && (
            <span className={chip}>
              <span className="size-2 rounded-full" style={{ background: LIST_COLORS[list.color].hex }} />
              {list.name}
            </span>
          )}
          {parsed.priority && parsed.priority !== 'none' && (
            <span className={chip}>
              <Flag className={`size-3.5 ${PRIORITY_TEXT[parsed.priority]}`} />
              {PRIORITY_LABEL[parsed.priority]}
            </span>
          )}
        </div>
      )}

    </form>
  )
}
