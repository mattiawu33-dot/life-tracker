import { Inbox, Plus } from 'lucide-react'
import { LIST_COLORS } from '../listColors'
import { useTasks } from '../store'

/** 'all', 'inbox' (tasks with no list) or a list id. */
export type ListFilter = string

interface ListChipsProps {
  value: ListFilter
  onChange: (value: ListFilter) => void
  onNewList: () => void
}

/** Horizontal row of list filters, ending with "+ New list". Scrolls sideways on phones. */
export function ListChips({ value, onChange, onNewList }: ListChipsProps) {
  const { state } = useTasks()
  const base = 'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors'
  const chip = (active: boolean) =>
    `${base} ${active ? 'bg-ink text-canvas' : 'bg-surface text-ink-muted shadow-card hover:text-ink'}`

  return (
    <div className="-mx-5 overflow-x-auto px-5 py-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      <div role="tablist" aria-label="Lists" className="flex gap-2">
        <button type="button" role="tab" aria-selected={value === 'all'} className={chip(value === 'all')} onClick={() => onChange('all')}>
          All
        </button>
        {state.lists.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={value === 'inbox'}
            className={chip(value === 'inbox')}
            onClick={() => onChange('inbox')}
          >
            <Inbox className="size-4" />
            Inbox
          </button>
        )}
        {state.lists.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={value === l.id}
            className={chip(value === l.id)}
            onClick={() => onChange(l.id)}
          >
            <span className="size-2.5 rounded-full" style={{ background: LIST_COLORS[l.color].hex }} />
            {l.name}
          </button>
        ))}
        <button
          type="button"
          onClick={onNewList}
          className={`${base} border border-dashed border-ink-subtle/60 text-accent-ink hover:border-accent hover:bg-accent-soft`}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          New list
        </button>
      </div>
    </div>
  )
}
