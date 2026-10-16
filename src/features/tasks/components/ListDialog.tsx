import { Check } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { newId } from '../../../lib/id'
import { LIST_COLOR_KEYS, LIST_COLORS } from '../listColors'
import { useTasks } from '../store'
import type { ListColor, TaskList } from '../types'

interface ListDialogProps {
  open: boolean
  onClose: () => void
  /** Edit this list; leave out to create a new one. */
  list?: TaskList
  onCreated?: (id: string) => void
  onDeleted?: () => void
}

/** Create, rename, recolor or delete a list. */
export function ListDialog({ open, onClose, list, onCreated, onDeleted }: ListDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={list ? 'Edit list' : 'New list'}>
      <ListForm list={list} onClose={onClose} onCreated={onCreated} onDeleted={onDeleted} />
    </Dialog>
  )
}

// A separate component so its state resets every time the dialog opens.
function ListForm({ list, onClose, onCreated, onDeleted }: Omit<ListDialogProps, 'open'>) {
  const { state, dispatch } = useTasks()
  const [name, setName] = useState(list?.name ?? '')
  // New lists get the first color that isn't used yet, so they look different.
  const [color, setColor] = useState<ListColor>(
    list?.color ?? LIST_COLOR_KEYS.find((c) => !state.lists.some((l) => l.color === c)) ?? 'sky',
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const taskCount = list ? state.tasks.filter((t) => t.listId === list.id).length : 0

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (list) {
      dispatch({ type: 'list/update', id: list.id, patch: { name: trimmed, color } })
    } else {
      const id = newId()
      dispatch({ type: 'list/add', list: { id, name: trimmed, color, createdAt: new Date().toISOString() } })
      onCreated?.(id)
    }
    onClose()
  }

  if (confirmDelete && list) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Delete <strong className="text-ink">{list.name}</strong>?{' '}
          {taskCount > 0
            ? `Its ${taskCount} task${taskCount === 1 ? '' : 's'} will move to your Inbox, so nothing is lost.`
            : 'It has no tasks.'}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass.secondary} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={buttonClass.danger}
            onClick={() => {
              dispatch({ type: 'list/delete', id: list.id })
              onDeleted?.()
              onClose()
            }}
          >
            Delete list
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Field label="Name" htmlFor="list-name">
        <input
          id="list-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Robotics"
          autoFocus
          maxLength={40}
          autoComplete="off"
          className={inputClass}
        />
      </Field>

      <Field label="Color">
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2.5">
          {LIST_COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={LIST_COLORS[c].label}
              onClick={() => setColor(c)}
              className={`grid size-9 place-items-center rounded-full transition-transform hover:scale-110 ${
                color === c ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''
              }`}
              style={{ background: LIST_COLORS[c].hex }}
            >
              {color === c && <Check className="size-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex items-center gap-2">
        {list && (
          <button type="button" className={buttonClass.ghost + ' text-danger hover:text-danger'} onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
        <button type="button" className={buttonClass.secondary + ' ml-auto'} onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className={buttonClass.primary} disabled={!name.trim()}>
          {list ? 'Save' : 'Create list'}
        </button>
      </div>
    </form>
  )
}
