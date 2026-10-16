import { CalendarDays, CheckSquare, ChevronRight, Flame, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { viewForList } from '../features/tasks/selectors'
import { isDueToday } from '../features/habits/streaks'
import { useHabits } from '../features/habits/store'
import { useTasks } from '../features/tasks/store'
import { CoachCard } from '../features/trainer/components/CoachCard'
import { greeting, longDate } from '../lib/dates'
import { useToday } from '../lib/useToday'

/** Placeholder rows for the dashboard; each becomes a real widget in later steps. */
const SECTIONS = [
  { title: 'Schedule', icon: CalendarDays, text: 'Your Google Calendar events', step: 6 },
  { title: 'Progress', icon: Sparkles, text: 'XP, level and streak', step: 4 },
]

export function TodayPage() {
  const { state } = useTasks()
  const today = useToday()
  const views = state.tasks.map((t) => viewForList(t, today)).filter((v) => !v.done && v.date)
  const dueToday = views.filter((v) => v.date === today).length
  const overdue = views.filter((v) => v.date! < today).length
  const { state: habitState } = useHabits()
  const dueHabits = habitState.habits.filter((h) => isDueToday(h, today))
  const habitsDone = dueHabits.filter((h) => h.log[today] === 'done').length

  return (
    <>
      <PageHeader title={greeting()} subtitle={longDate()} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CoachCard />
        <Link to="/tasks" className="group rounded-card focus-visible:outline-offset-4">
          <Card title="Tasks" className="h-full transition-shadow group-hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <CheckSquare className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {dueToday === 0 && overdue === 0
                    ? 'Nothing due today'
                    : `${dueToday} due today${overdue ? `, ${overdue} overdue` : ''}`}
                </p>
                <p className="text-xs text-ink-subtle">Full dashboard in step 5</p>
              </div>
              <ChevronRight className="size-4 text-ink-subtle" />
            </div>
          </Card>
        </Link>
        <Link to="/habits" className="group rounded-card focus-visible:outline-offset-4">
          <Card title="Habits" className="h-full transition-shadow group-hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Flame className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {habitState.habits.length === 0
                    ? 'No habits yet'
                    : dueHabits.length === 0
                      ? 'Rest day: nothing scheduled'
                      : `${habitsDone} of ${dueHabits.length} done today`}
                </p>
                <p className="text-xs text-ink-subtle">Full dashboard in step 5</p>
              </div>
              <ChevronRight className="size-4 text-ink-subtle" />
            </div>
          </Card>
        </Link>
        {SECTIONS.map(({ title, icon: Icon, text, step }) => (
          <Card key={title} title={title}>
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-muted">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-sm">{text}</p>
                <p className="text-xs text-ink-subtle">Coming in step {step}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
