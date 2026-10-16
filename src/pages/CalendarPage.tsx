import { CalendarDays } from 'lucide-react'
import { ComingSoon } from '../components/ui/ComingSoon'
import { PageHeader } from '../components/ui/PageHeader'

export function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" />
      <ComingSoon
        icon={CalendarDays}
        title="Your tasks and Google Calendar in one view"
        step={6}
        description="Task deadlines appear here first; Google sign-in is optional."
      />
    </>
  )
}
