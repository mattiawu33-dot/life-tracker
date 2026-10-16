import type { ReactNode } from 'react'

interface Option<T extends string> {
  value: T
  label: ReactNode
  /** Spoken label when `label` is an icon or very short. */
  ariaLabel?: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
}

/** A row of mutually exclusive buttons, like iOS's segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-label={o.ariaLabel}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-all ${
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
