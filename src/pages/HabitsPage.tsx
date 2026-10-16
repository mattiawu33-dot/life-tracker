import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../components/ui/Dialog'
import { PageHeader } from '../components/ui/PageHeader'
import { buttonClass } from '../components/ui/styles'
import { HabitDetail } from '../features/habits/components/HabitDetail'
import { HabitForm, type HabitDraft } from '../features/habits/components/HabitForm'
import { HabitRow } from '../features/habits/components/HabitRow'
import { isDueToday } from '../features/habits/streaks'
import { useHabits } from '../features/habits/store'
import { newId } from '../lib/id'
import { useToday } from '../lib/useToday'

const SUGGESTIONS: HabitDraft[] = [
  { name: 'Read 20 minutes', emoji: '📚', schedule: { type: 'daily' } },
  { name: 'Drink water', emoji: '💧', schedule: { type: 'daily' } },
  { name: 'Badminton practice', emoji: '🏸', schedule: { type: 'weekly', times: 3 } },
  { name: 'Review class notes', emoji: '📝', schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] } },
  { name: 'Stretch', emoji: '🧘', schedule: { type: 'daily' } },
  { name: 'Phone away by 11pm', emoji: '📵', schedule: { type: 'daily' } },
]

export function HabitsPage() {
  const { state, dispatch } = useHabits()
  const today = useToday()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState<Partial<HabitDraft> | null>(null)
  const [showRest, setShowRest] = useState(false)

  const due = state.habits.filter((h) => isDueToday(h, today))
  const notToday = state.habits.filter((h) => !isDueToday(h, today))
  const doneCount = due.filter((h) => h.log[today] === 'done').length

  function create(draft: HabitDraft) {
    dispatch({
      type: 'habit/add',
      habit: { id: newId(), ...draft, log: {}, startDate: today, createdAt: new Date().toISOString() },
    })
    setCreating(null)
  }

  return (
    <>
      <PageHeader title="Habits" subtitle={state.habits.length > 0 ? `${doneCount} of ${due.length} done today` : undefined} />

      {state.habits.length === 0 ? (
        <div className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
          <div>
            <h2 className="font-semibold">Start with one small habit</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pick one to begin, or make your own. Rest days never break a streak.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setCreating(s)}
                className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-accent-soft hover:text-accent-ink"
              >
                <span aria-hidden>{s.emoji}</span>
                {s.name}
              </button>
            ))}
          </div>
          <button type="button" className={`${buttonClass.primary} self-start`} onClick={() => setCreating({})}>
            <Plus className="size-4" strokeWidth={2.5} />
            New habit
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <section>
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-ink-muted">Today</h2>
              <button
                type="button"
                onClick={() => setCreating({})}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-accent-ink hover:bg-accent-soft"
              >
                <Plus className="size-4" strokeWidth={2.5} />
                New habit
              </button>
            </div>
            {due.length > 0 ? (
              <ul className="rounded-card bg-surface p-1.5 shadow-card">
                {due.map((h) => (
                  <HabitRow key={h.id} habit={h} today={today} onOpen={setOpenId} />
                ))}
              </ul>
            ) : (
              <p className="rounded-card bg-surface px-5 py-6 text-sm text-ink-muted shadow-card">
                Nothing scheduled today. Enjoy the rest day.
              </p>
            )}
          </section>

          {notToday.length > 0 && (
            <section>
              <button
                type="button"
                aria-expanded={showRest}
                onClick={() => setShowRest((v) => !v)}
                className="mb-1 flex items-center gap-1.5 px-1 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                <ChevronDown className={`size-4 transition-transform ${showRest ? '' : '-rotate-90'}`} />
                Not today
                <span className="font-normal text-ink-subtle">{notToday.length}</span>
              </button>
              {showRest && (
                <ul className="rounded-card bg-surface p-1.5 shadow-card">
                  {notToday.map((h) => (
                    <HabitRow key={h.id} habit={h} today={today} onOpen={setOpenId} muted />
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      <Dialog open={creating !== null} onClose={() => setCreating(null)} title="New habit">
        {creating && <HabitForm initial={creating} submitLabel="Create habit" onSubmit={create} onCancel={() => setCreating(null)} />}
      </Dialog>
      <HabitDetail habitId={openId} today={today} onClose={() => setOpenId(null)} />
    </>
  )
}
