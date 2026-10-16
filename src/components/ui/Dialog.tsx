import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  /** Hide the visible heading (it's still read out by screen readers). */
  hideTitle?: boolean
  children: ReactNode
}

/**
 * A pop-up panel: slides up as a bottom sheet on phones, centered on desktop.
 *
 * Built on the browser's own <dialog> element, which gives us the dimmed
 * backdrop, Esc-to-close and keeping keyboard focus inside for free.
 */
export function Dialog({ open, onClose, title, hideTitle = false, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      // A click that lands on the <dialog> itself (not its content) is the backdrop.
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-[sheet-in_220ms_ease-out] md:inset-0 md:m-auto md:h-fit md:max-w-lg md:open:animate-[pop-in_180ms_ease-out]"
    >
      <div
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-surface px-5 pt-4 shadow-card md:rounded-card md:p-6"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className={hideTitle ? 'relative' : 'mb-4 flex items-center justify-between gap-3'}>
          <h2 className={hideTitle ? 'sr-only' : 'text-lg font-semibold'}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`grid size-9 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink ${
              hideTitle ? 'absolute -top-1 -right-2 z-10' : '-mr-2'
            }`}
          >
            <X className="size-5" />
          </button>
        </div>
        {open && children}
      </div>
    </dialog>
  )
}
