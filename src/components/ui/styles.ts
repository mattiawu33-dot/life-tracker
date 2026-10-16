/** Shared look for text, date, time and select inputs. */
export const inputClass =
  'w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors focus:border-accent focus:outline-none'

export const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-xl bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition-opacity hover:opacity-80',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink',
}
