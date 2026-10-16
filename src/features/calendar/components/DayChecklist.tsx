import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useMemo } from 'react'
import { fromISODate, relativeDay, shortDate, type ISODate } from '../../../lib/dates'
import { useSetting } from '../../../lib/useSetting'
import { QuickAddBar } from '../../tasks/components/QuickAddBar'
import { TaskRow } from '../../tasks/components/TaskRow'
import type { TaskView } from '../../tasks/selectors'
import { useTasks } from '../../tasks/store'
import { checklistFor } from '../items'
import { ROLLOVER_KEY } from '../useRollover'

interface DayChecklistProps {
  day: ISODate
  today: ISODate
  onOpenTask: (id: string) => void
}

/** The checklist for one day: items without a time. Drag the handle to reorder. */
export function DayChecklist({ day, today, onOpenTask }: DayChecklistProps) {
  const { state, dispatch } = useTasks()
  const [rollover, setRollover] = useSetting(ROLLOVER_KEY, true)
  const items = useMemo(() => checklistFor(state.tasks, day, today), [state.tasks, day, today])
  const open = items.filter((v) => !v.done)
  const done = items.filter((v) => v.done)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const ids = open.map((v) => v.task.id)
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    dispatch({ type: 'task/reorder', ids: next })
  }

  const heading = fromISODate(day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section aria-label={`Checklist for ${heading}`} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <div>
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{relativeDay(day, today)}</p>
        <h2 className="font-semibold">{heading}</h2>
        <p className="text-xs text-ink-subtle">
          {open.length} to do{done.length ? `, ${done.length} done` : ''}
        </p>
      </div>

      <QuickAddBar defaultDate={day} placeholder="Add to this day" />

      {items.length === 0 ? (
        <p className="px-1 py-3 text-sm text-ink-muted">Nothing on the checklist. Items without a time land here.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={open.map((v) => v.task.id)} strategy={verticalListSortingStrategy}>
            <ul className="-mx-2 flex flex-col">
              {open.map((v) => (
                <SortableItem key={v.task.id} view={v} today={today} onOpen={onOpenTask} />
              ))}
            </ul>
          </SortableContext>
          {done.length > 0 && (
            <ul className="-mx-2 flex flex-col border-t border-line pt-1">
              {done.map((v) => (
                <TaskRow key={v.task.id} view={v} today={today} onOpen={onOpenTask} hideDate />
              ))}
            </ul>
          )}
        </DndContext>
      )}

      <label className="mt-1 flex cursor-pointer items-center justify-between gap-3 border-t border-line pt-3 text-sm">
        <span>
          <span className="block font-medium">Roll over unfinished items</span>
          <span className="block text-xs text-ink-muted">Items without a time move to the next day.</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={rollover}
          onClick={() => setRollover(!rollover)}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${rollover ? 'bg-accent' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${rollover ? 'translate-x-4' : ''}`} />
        </button>
      </label>
    </section>
  )
}

/** One draggable checklist row (a separate component so dragging stays smooth). */
function SortableItem({ view, today, onOpen }: { view: TaskView; today: ISODate; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: view.task.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-start ${isDragging ? 'z-10 rounded-2xl bg-surface shadow-card' : ''}`}
    >
      <button
        type="button"
        aria-label={`Reorder ${view.task.title}`}
        className="mt-3 grid h-6 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-ink-subtle hover:text-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <ul>
          <TaskRow view={view} today={today} onOpen={onOpen} hideDate />
        </ul>
        {view.task.rolledFrom && (
          <p className="-mt-2 mb-1 pl-12 text-[11px] text-ink-subtle">Rolled over from {shortDate(view.task.rolledFrom, today)}</p>
        )}
      </div>
    </li>
  )
}
