import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../../../shared/trainer'
import { Dialog } from '../../../components/ui/Dialog'
import { load, save } from '../../../lib/storage'
import { useTrainer } from '../context'

const MAX_SAVED = 30
const STARTERS = ['How should I plan tonight?', "I'm behind on homework. Where do I start?", 'Help me prep for a test this week']

/** Chat with the coach. The conversation is kept on this device only. */
export function ChatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Ask Coach">
      <ChatBody />
    </Dialog>
  )
}

function ChatBody() {
  const { chat, activeProvider } = useTrainer()
  const [messages, setMessages] = useState<ChatMessage[]>(() => load('trainer:chat', []))
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => save('trainer:chat', messages.slice(-MAX_SAVED)), [messages])
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages, streaming])
  useEffect(() => () => abortRef.current?.abort(), [])

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming !== null) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: content.slice(0, 2000) }]
    setMessages(next)
    setDraft('')
    setError(null)
    setStreaming('')
    abortRef.current = new AbortController()
    try {
      const answer = await chat(next, setStreaming, abortRef.current.signal)
      setMessages([...next, { role: 'assistant', content: answer.trim() || '(No answer.)' }])
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        setMessages(messages) // put things back so you can retry
        setDraft(content)
      }
    } finally {
      setStreaming(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-48 flex-col gap-3">
        {messages.length === 0 && streaming === null && (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-ink-muted">
              Ask about your schedule, studying, or habits. Coach can see today's tasks and habits{activeProvider ? ` and uses ${activeProvider.label}` : ''}.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft hover:text-accent-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {streaming !== null && <Bubble message={{ role: 'assistant', content: streaming || '…' }} />}
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="sticky bottom-0 flex items-end gap-2 bg-surface pt-1"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        {messages.length > 0 && (
          <button
            type="button"
            aria-label="Start a new chat"
            title="New chat"
            onClick={() => {
              abortRef.current?.abort()
              setMessages([])
              setError(null)
            }}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        <label htmlFor="coach-input" className="sr-only">
          Message
        </label>
        <textarea
          id="coach-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(draft)
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Ask Coach…"
          className="field-sizing-content max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || streaming !== null}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-on-accent disabled:bg-surface-2 disabled:text-ink-subtle"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'user'
  return (
    <div className={`flex gap-2 ${mine ? 'justify-end' : ''}`}>
      {!mine && (
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Sparkles className="size-3.5" />
        </span>
      )}
      <p
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line ${
          mine ? 'rounded-br-md bg-accent text-on-accent' : 'rounded-bl-md bg-surface-2'
        }`}
      >
        {message.content}
      </p>
    </div>
  )
}
