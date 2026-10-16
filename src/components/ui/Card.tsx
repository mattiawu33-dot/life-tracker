import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

/** The rounded, softly shadowed container used for every section. */
export function Card({ title, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-card bg-surface p-5 shadow-card ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-ink-muted">{title}</h2>}
      {children}
    </section>
  )
}
