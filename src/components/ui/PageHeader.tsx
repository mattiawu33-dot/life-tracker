import type { ReactNode } from 'react'
import { ThemeToggle } from '../../theme/ThemeToggle'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
}

/**
 * Title at the top of each page. On phones it also holds the theme toggle,
 * since there is no sidebar there.
 */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 md:mb-8">
      <div>
        {subtitle && <p className="mb-1 text-sm text-ink-muted">{subtitle}</p>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      </div>
      <div className="-mr-2 md:hidden">
        <ThemeToggle />
      </div>
    </header>
  )
}
