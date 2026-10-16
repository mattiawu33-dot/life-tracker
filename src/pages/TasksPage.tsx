import { CheckSquare } from 'lucide-react'
import { ComingSoon } from '../components/ui/ComingSoon'
import { PageHeader } from '../components/ui/PageHeader'

export function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" />
      <ComingSoon
        icon={CheckSquare}
        title="Quick-add, lists and priorities"
        step={2}
        description={'Type "bio essay friday" and the date fills itself in.'}
      />
    </>
  )
}
