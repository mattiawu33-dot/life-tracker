import { BarChart3 } from 'lucide-react'
import { ComingSoon } from '../components/ui/ComingSoon'
import { PageHeader } from '../components/ui/PageHeader'

export function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" />
      <ComingSoon
        icon={BarChart3}
        title="Levels, heatmaps and your weekly recap"
        step={7}
        description="See how your week went at a glance."
      />
    </>
  )
}
