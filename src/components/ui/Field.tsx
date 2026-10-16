import type { ReactNode } from 'react'

/** Small label + control pair used in forms. */
export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </label>
      {children}
    </div>
  )
}
