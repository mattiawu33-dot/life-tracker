import { CalendarCheck, MessageCircle, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Dialog } from '../../../components/ui/Dialog'
import { load, save } from '../../../lib/storage'
import { useToday } from '../../../lib/useToday'
import { useTrainer } from '../context'
import { ChatDialog } from './ChatDialog'

interface Cached {
  key: string
  text: string
}

/** The coach on the Today screen: morning plan, weekly review, and chat. Hidden while the trainer is off. */
export function CoachCard() {
  const { settings, ready, status, activeProvider, morningPlan, weeklyReview } = useTrainer()
  const today = useToday()
  const [plan, setPlan] = useState<Cached | null>(() => load<Cached | null>('trainer:morningPlan', null))
  const [review, setReview] = useState<Cached | null>(() => load<Cached | null>('trainer:weeklyReview', null))
  const [busy, setBusy] = useState<'plan' | 'review' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReview, setShowReview] = useState(false)
  const [showChat, setShowChat] = useState(false)

  if (!settings.enabled) return null

  const todaysPlan = plan?.key === today ? plan.text : null

  async function run(kind: 'plan' | 'review') {
    setBusy(kind)
    setError(null)
    try {
      const text = kind === 'plan' ? await morningPlan() : await weeklyReview()
      const cached = { key: today, text }
      if (kind === 'plan') {
        setPlan(cached)
        save('trainer:morningPlan', cached)
      } else {
        setReview(cached)
        save('trainer:weeklyReview', cached)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50'

  return (
    <section className="rounded-card bg-surface p-5 shadow-card sm:col-span-2">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Sparkles className="size-4" />
        </span>
        <h2 className="text-sm font-semibold">Coach</h2>
        {activeProvider && <span className="ml-auto text-xs text-ink-subtle">{activeProvider.label}</span>}
      </div>

      {!ready ? (
        <p className="text-sm text-ink-muted">
          {status.state === 'loading' || status.state === 'idle'
            ? 'Connecting…'
            : status.state === 'error'
              ? status.message
              : 'No AI provider is set up yet.'}{' '}
          <Link to="/settings" className="font-medium text-accent-ink underline-offset-2 hover:underline">
            Open Settings
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {todaysPlan ? (
            <div className="rounded-2xl bg-surface-2/60 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Today's plan</p>
                <button
                  type="button"
                  onClick={() => run('plan')}
                  disabled={busy !== null}
                  aria-label="Make a new plan"
                  title="Make a new plan"
                  className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-50"
                >
                  <RefreshCw className={`size-3.5 ${busy === 'plan' ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-line">{todaysPlan}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!todaysPlan && (
              <button type="button" className={btn} onClick={() => run('plan')} disabled={busy !== null}>
                <CalendarCheck className="size-4" />
                {busy === 'plan' ? 'Planning…' : 'Plan my day'}
              </button>
            )}
            <button
              type="button"
              className={btn}
              disabled={busy !== null}
              onClick={() => {
                setShowReview(true)
                if (review?.key !== today) run('review')
              }}
            >
              <TrendingUp className="size-4" />
              Weekly review
            </button>
            <button type="button" className={btn} onClick={() => setShowChat(true)}>
              <MessageCircle className="size-4" />
              Ask Coach
            </button>
          </div>
          {error && !showReview && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}

      <Dialog open={showReview} onClose={() => setShowReview(false)} title="Your week">
        {busy === 'review' ? (
          <p className="text-sm text-ink-muted">Looking back at your last 7 days…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed whitespace-pre-line">{review?.text}</p>
            <button type="button" className={`${btn} self-start`} onClick={() => run('review')}>
              <RefreshCw className="size-4" />
              Write a new review
            </button>
          </div>
        )}
      </Dialog>
      <ChatDialog open={showChat} onClose={() => setShowChat(false)} />
    </section>
  )
}
