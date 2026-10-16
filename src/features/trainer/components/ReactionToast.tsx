import { Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { useTrainer } from '../context'

const SHOW_MS = 12_000

/** The coach's live reactions: a small card that slides in, then fades away. */
export function ReactionToast() {
  const { reaction, dismissReaction } = useTrainer()

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(dismissReaction, SHOW_MS)
    return () => clearTimeout(timer)
  }, [reaction, dismissReaction])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 md:inset-x-auto md:right-6 md:bottom-6 md:justify-end md:px-0"
      style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
    >
      {reaction && (
        <div
          key={reaction.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm animate-[sheet-in_250ms_ease-out] items-start gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-accent-ink">Coach</p>
            <p className="mt-0.5 text-sm leading-relaxed">{reaction.text}</p>
          </div>
          <button
            type="button"
            onClick={dismissReaction}
            aria-label="Dismiss"
            className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
