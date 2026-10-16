import type { LucideIcon } from 'lucide-react'

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  step: number
  description: string
}

/** Placeholder shown on pages we haven't built yet. */
export function ComingSoon({ icon: Icon, title, step, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
        <Icon className="size-6" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      <span className="mt-4 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-ink-subtle">
        Coming in step {step}
      </span>
    </div>
  )
}
