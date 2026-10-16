import { CalendarDays, CheckSquare, Flame, Sparkles } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { greeting, longDate } from '../lib/dates'

/** Placeholder rows for the dashboard; each becomes a real widget in later steps. */
const SECTIONS = [
  { title: 'Schedule', icon: CalendarDays, text: 'Your Google Calendar events', step: 6 },
  { title: 'Tasks', icon: CheckSquare, text: 'Due today and overdue', step: 2 },
  { title: 'Habits', icon: Flame, text: "Today's check-offs", step: 3 },
  { title: 'Progress', icon: Sparkles, text: 'XP, level and streak', step: 4 },
]

export function TodayPage() {
  return (
    <>
      <PageHeader title={greeting()} subtitle={longDate()} />
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ title, icon: Icon, text, step }) => (
          <Card key={title} title={title}>
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-subtle">
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
