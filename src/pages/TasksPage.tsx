import { ChevronDown, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { ListChips, type ListFilter } from '../features/tasks/components/ListChips'
import { ListDialog } from '../features/tasks/components/ListDialog'
import { QuickAddBar } from '../features/tasks/components/QuickAddBar'
import { TaskDetail } from '../features/tasks/components/TaskDetail'
import { TaskRow } from '../features/tasks/components/TaskRow'
import { LIST_COLORS } from '../features/tasks/listColors'
import { groupViews, viewForList } from '../features/tasks/selectors'
import { useTasks } from '../features/tasks/store'
import { load, save } from '../lib/storage'
import { useToday } from '../lib/useToday'

export function TasksPage() {
  const { state } = useTasks()
  const today = useToday()
  const [filter, setFilter] = useState<ListFilter>(() => load('tasks:filter', 'all'))
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [listDialog, setListDialog] = useState<'new' | 'edit' | null>(null)
  const [showDone, setShowDone] = useState(false)

  const activeList = state.lists.find((l) => l.id === filter)
  // If the selected list was deleted, fall back to "All".
  const current: ListFilter = filter === 'all' || filter === 'inbox' || activeList ? filter : 'all'

  useEffect(() => save('tasks:filter', current), [current])

  const groups = useMemo(() => {
    const tasks = state.tasks.filter((t) =>
      current === 'all' ? true : current === 'inbox' ? t.listId === null : t.listId === current,
    )
    return groupViews(
      tasks.map((t) => viewForList(t, today)),
      today,
    )
  }, [state.tasks, current, today])

  const openCount = groups.filter((g) => g.key !== 'done').reduce((n, g) => n + g.items.length, 0)

  return (
    <>
      <PageHeader title="Tasks" />

      <div className="flex flex-col gap-5">
        <QuickAddBar defaultListId={activeList?.id ?? null} />
        <ListChips value={current} onChange={setFilter} onNewList={() => setListDialog('new')} />

        {activeList && (
          <div className="flex items-center gap-2.5 px-1">
            <span className="size-3 rounded-full" style={{ background: LIST_COLORS[activeList.color].hex }} />
            <h2 className="font-semibold">{activeList.name}</h2>
            <span className="text-sm text-ink-muted">
              {openCount} open
            </span>
            <button
              type="button"
              onClick={() => setListDialog('edit')}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <Pencil className="size-3.5" />
              Edit list
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <EmptyState filter={current} />
        ) : (
          groups.map((g) =>
            g.key === 'done' ? (
              <section key={g.key}>
                <button
                  type="button"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                  className="mb-1 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  <ChevronDown className={`size-4 transition-transform ${showDone ? '' : '-rotate-90'}`} />
                  Completed
                  <span className="font-normal text-ink-subtle">{g.items.length}</span>
                </button>
                {showDone && (
                  <ul className="rounded-card bg-surface p-1.5 shadow-card">
                    {g.items.map((v) => (
                      <TaskRow key={v.task.id} view={v} today={today} onOpen={setOpenTaskId} hideList={!!activeList} />
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <section key={g.key}>
                <h2 className={`mb-1 px-1 text-sm font-semibold ${g.key === 'overdue' ? 'text-danger' : 'text-ink-muted'}`}>
                  {g.label} <span className="font-normal text-ink-subtle">{g.items.length}</span>
                </h2>
                <ul className="rounded-card bg-surface p-1.5 shadow-card">
                  {g.items.map((v) => (
                    <TaskRow key={v.task.id} view={v} today={today} onOpen={setOpenTaskId} hideList={!!activeList} />
                  ))}
                </ul>
              </section>
            ),
          )
        )}
      </div>

      <TaskDetail taskId={openTaskId} today={today} onClose={() => setOpenTaskId(null)} />
      <ListDialog
        open={listDialog !== null}
        list={listDialog === 'edit' ? activeList : undefined}
        onClose={() => setListDialog(null)}
        onCreated={setFilter}
        onDeleted={() => setFilter('all')}
      />
    </>
  )
}

function EmptyState({ filter }: { filter: ListFilter }) {
  return (
    <div className="rounded-card border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">{filter === 'all' ? 'No tasks yet' : 'Nothing in this list yet'}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
        Type one in the box above, like "chem lab report thursday 8pm". Add <Code>#list</Code> to file it in a
        list and <Code>!high</Code> to set priority.
      </p>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return <code className="rounded bg-surface-2 px-1 py-0.5 text-[13px] text-ink">{children}</code>
}
