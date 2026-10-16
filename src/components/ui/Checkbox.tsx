import { Check } from 'lucide-react'
import type { Priority } from '../../features/tasks/types'

const RING: Record<Priority, string> = {
  none: 'border-ink-subtle',
  low: 'border-prio-low',
  medium: 'border-prio-medium',
  high: 'border-prio-high',
}

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
  priority?: Priority
  disabled?: boolean
  size?: 'md' | 'sm'
}

/** Round task checkbox. The ring color shows priority; checking it pops a tick. */
export function Checkbox({ checked, onChange, label, priority = 'none', disabled, size = 'md' }: CheckboxProps) {
  const box = size === 'md' ? 'size-[22px]' : 'size-[18px]'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      // The visible circle is small; the padding makes it an easy 40px tap target.
      className="-m-2 grid shrink-0 place-items-center rounded-full p-2 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={`grid ${box} place-items-center rounded-full border-2 transition-all duration-200 ${
          checked ? 'scale-100 border-accent bg-accent' : `${RING[priority]} hover:bg-surface-2`
        }`}
      >
        <Check
          strokeWidth={3.5}
          className={`size-3 text-on-accent transition-all duration-200 ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        />
      </span>
    </button>
  )
}
