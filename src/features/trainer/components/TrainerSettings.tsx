import { CheckCircle2, CircleAlert, Loader2, Minus, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { ModelTier, ProviderStatus } from '../../../../shared/trainer'
import { Field } from '../../../components/ui/Field'
import { buttonClass, inputClass } from '../../../components/ui/styles'
import { useTrainer } from '../context'

type TestState = { state: 'idle' } | { state: 'testing' } | { state: 'ok'; ms: number } | { state: 'error'; message: string }

/** Settings → AI Trainer. There's deliberately no field for an API key: keys live on the server. */
export function TrainerSettings() {
  const { settings, updateSettings, status, refreshStatus, activeProvider, modelFor, usedToday, testConnection } = useTrainer()
  const [test, setTest] = useState<TestState>({ state: 'idle' })

  const providers = status.state === 'ready' ? status.data.providers : []
  const configured = providers.filter((p) => p.configured)
  const missing = providers.filter((p) => !p.configured)
  const serverLimit = status.state === 'ready' ? status.data.usage.limit : 200

  function setModel(p: ProviderStatus, tier: ModelTier, id: string) {
    updateSettings({ models: { ...settings.models, [p.id]: { ...settings.models[p.id], [tier]: id } } })
    setTest({ state: 'idle' })
  }

  async function runTest() {
    setTest({ state: 'testing' })
    try {
      setTest({ state: 'ok', ...(await testConnection()) })
    } catch (err) {
      setTest({ state: 'error', message: (err as Error).message })
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">AI Trainer</h2>
          <p className="mt-1 text-sm text-ink-muted">
            A coach that plans your morning, reacts to big wins and lost streaks, reviews your week, and answers questions. Works with
            Claude, GPT, Gemini and more.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="AI Trainer"
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${settings.enabled ? 'bg-accent' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {!settings.enabled ? (
        <p className="rounded-2xl bg-surface-2/60 p-4 text-sm text-ink-muted">
          Off. Nothing is sent anywhere. When it's on, the coach sends the AI provider only what a feature needs (like today's task
          titles and habit names), only when that feature runs.
        </p>
      ) : (
        <>
          {renderStatus()}

          {configured.length > 0 && activeProvider && (
            <>
              <Field label="Provider" htmlFor="trainer-provider">
                <select
                  id="trainer-provider"
                  value={activeProvider.id}
                  onChange={(e) => {
                    updateSettings({ provider: e.target.value })
                    setTest({ state: 'idle' })
                  }}
                  className={inputClass}
                >
                  {configured.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {missing.length > 0 && (
                  <p className="text-xs text-ink-subtle">
                    To add {missing.map((p) => p.label).join(', ')}, set {missing.map((p) => p.envVar).join(' / ')} on the server.
                  </p>
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <ModelSelect provider={activeProvider} tier="fast" value={modelFor('fast')!} onChange={(id) => setModel(activeProvider, 'fast', id)} />
                <ModelSelect provider={activeProvider} tier="main" value={modelFor('main')!} onChange={(id) => setModel(activeProvider, 'main', id)} />
              </div>

              <Field label="Connection">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" className={buttonClass.secondary} onClick={runTest} disabled={test.state === 'testing'}>
                    {test.state === 'testing' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Test connection
                  </button>
                  {test.state === 'ok' && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink">
                      <CheckCircle2 className="size-4" /> Connected ({(test.ms / 1000).toFixed(1)}s)
                    </span>
                  )}
                  {test.state === 'error' && (
                    <span className="inline-flex items-start gap-1.5 text-sm text-danger">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" /> {test.message}
                    </span>
                  )}
                </div>
              </Field>
            </>
          )}

          <Field label="Daily limit">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
                <button
                  type="button"
                  aria-label="Lower the limit"
                  disabled={settings.dailyLimit <= 5}
                  onClick={() => updateSettings({ dailyLimit: Math.max(5, settings.dailyLimit - 5) })}
                  className="grid size-8 place-items-center rounded-lg bg-surface disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-24 text-center text-sm font-medium tabular-nums">{settings.dailyLimit} / day</span>
                <button
                  type="button"
                  aria-label="Raise the limit"
                  disabled={settings.dailyLimit >= serverLimit}
                  onClick={() => updateSettings({ dailyLimit: Math.min(serverLimit, settings.dailyLimit + 5) })}
                  className="grid size-8 place-items-center rounded-lg bg-surface disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <span className="text-sm text-ink-muted">
                {usedToday} used today
                {status.state === 'ready' && ` · server cap ${status.data.usage.used}/${status.data.usage.limit}`}
              </span>
            </div>
            <p className="text-xs text-ink-subtle">
              Every coach message counts as one request. Live reactions only happen on real events and use the cheaper fast model.
            </p>
          </Field>
        </>
      )}
    </section>
  )

  function renderStatus() {
    if (status.state === 'idle' || status.state === 'loading') {
      return (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="size-4 animate-spin" /> Checking the trainer server…
        </p>
      )
    }
    if (status.state === 'error') {
      return (
        <div className="flex flex-col gap-2 rounded-2xl bg-danger-soft p-4 text-sm">
          <p className="font-medium text-danger">Trainer server not available</p>
          <p className="text-ink-muted">{status.message}</p>
          <button type="button" className={`${buttonClass.secondary} self-start`} onClick={refreshStatus}>
            Try again
          </button>
        </div>
      )
    }
    if (configured.length === 0) {
      return (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-2/60 p-4 text-sm">
          <p className="font-medium">No AI keys are set up yet</p>
          <p className="text-ink-muted">
            Add at least one of these on the server ({' '}
            {providers.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <code className="rounded bg-surface px-1 text-[13px]">{p.envVar}</code>
              </span>
            ))}{' '}
            ), then restart. The README's "AI trainer setup" section walks you through it.
          </p>
          <button type="button" className={`${buttonClass.secondary} self-start`} onClick={refreshStatus}>
            Check again
          </button>
        </div>
      )
    }
    return (
      <p className="flex items-start gap-2 text-sm text-ink-muted">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-ink" />
        {configured.length} provider{configured.length === 1 ? '' : 's'} ready
        {status.state === 'ready' && status.data.usage.persistent ? '' : ' · daily cap counted in memory (add Upstash to make it permanent)'}
      </p>
    )
  }
}

function ModelSelect({ provider, tier, value, onChange }: { provider: ProviderStatus; tier: ModelTier; value: string; onChange: (id: string) => void }) {
  const id = `trainer-model-${tier}`
  const label = tier === 'fast' ? 'Fast model (live reactions)' : 'Main model (plan, review, chat)'
  const ordered = [...provider.models].sort((a, b) => (a.tier === tier ? 0 : 1) - (b.tier === tier ? 0 : 1))
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {ordered.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.note ? ` · ${m.note}` : ''}
            {m.id === provider.defaults[tier] ? ' (default)' : ''}
          </option>
        ))}
      </select>
    </Field>
  )
}
