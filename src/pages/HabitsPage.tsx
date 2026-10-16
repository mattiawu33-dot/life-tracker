import { Flame } from 'lucide-react'
import { ComingSoon } from '../components/ui/ComingSoon'
import { PageHeader } from '../components/ui/PageHeader'

export function HabitsPage() {
  return (
    <>
      <PageHeader title="Habits" />
      <ComingSoon
        icon={Flame}
        title="One-tap habits with forgiving streaks"
        step={3}
        description="Daily, X times a week, or specific weekdays. Rest days never break a streak."
      />
    </>
  )
}
