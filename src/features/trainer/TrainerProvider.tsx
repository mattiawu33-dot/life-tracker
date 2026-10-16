import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ChatMessage, ModelTier, TrainerEvent, TrainerRequest } from '../../../shared/trainer'
import { load, save } from '../../lib/storage'
import { useToday } from '../../lib/useToday'
import { useGoogle } from '../google/context'
import { useHabits } from '../habits/store'
import { useTasks } from '../tasks/store'
import { fetchStatus, requestChat, requestText, TrainerError } from './api'
import { TrainerContext, type StatusState, type TrainerSettings } from './context'
import { buildSnapshot, buildWeek } from './snapshot'

const DEFAULT_SETTINGS: TrainerSettings = { enabled: false, provider: null, models: {}, dailyLimit: 30 }

/**
 * Owns the trainer: settings, backend status, the daily counter, and every
 * coach feature. Nothing is sent anywhere while the trainer is switched off.
 */
export function TrainerProvider({ children }: { children: ReactNode }) {
  const { state: taskState } = useTasks()
  const { state: habitState } = useHabits()
  const today = useToday()
  const { eventsOn } = useGoogle()
  const [settings, setSettings] = useState<TrainerSettings>(() => ({ ...DEFAULT_SETTINGS, ...load('trainer:settings', {}) }))
  const [status, setStatus] = useState<StatusState>({ state: 'idle' })
  const [usage, setUsage] = useState(() => load('trainer:usage', { date: '', count: 0 }))
  const [reaction, setReaction] = useState<{ id: number; text: string } | null>(null)
  const reacting = useRef(false)

  useEffect(() => save('trainer:settings', settings), [settings])
  useEffect(() => save('trainer:usage', usage), [usage])

  const usedToday = usage.date === today ? usage.count : 0

  const loadStatus = useCallback(() => {
    fetchStatus()
      .then((data) => setStatus({ state: 'ready', data }))
      .catch((err: Error) => setStatus({ state: 'error', message: err.message }))
  }, [])

  const refreshStatus = useCallback(() => {
    setStatus({ state: 'loading' })
    loadStatus()
  }, [loadStatus])

  // Check the backend whenever the trainer is switched on.
  useEffect(() => {
    if (settings.enabled) loadStatus()
  }, [settings.enabled, loadStatus])

  const configured = status.state === 'ready' ? status.data.providers.filter((p) => p.configured) : []
  const activeProvider = configured.find((p) => p.id === settings.provider) ?? configured[0] ?? null

  const modelFor = useCallback(
    (tier: ModelTier) => {
      if (!activeProvider) return null
      const chosen = settings.models[activeProvider.id]?.[tier]
      return chosen && activeProvider.models.some((m) => m.id === chosen) ? chosen : activeProvider.defaults[tier]
    },
    [activeProvider, settings.models],
  )

  const ready = settings.enabled && activeProvider !== null

  /** Shared gatekeeper: on? provider? under this device's daily limit? */
  const prepare = useCallback(
    (tier: ModelTier) => {
      if (!settings.enabled) throw new TrainerError('off', 'The AI trainer is switched off. Turn it on in Settings.')
      if (!activeProvider) throw new TrainerError('no_provider', 'No AI provider is set up yet. See Settings → AI Trainer.')
      if (usedToday >= settings.dailyLimit) {
        throw new TrainerError('daily_limit_reached', `You've used today's ${settings.dailyLimit} coach requests. Change the limit in Settings.`)
      }
      setUsage({ date: today, count: usedToday + 1 })
      return { provider: activeProvider.id, model: modelFor(tier)! }
    },
    [settings.enabled, settings.dailyLimit, activeProvider, usedToday, today, modelFor],
  )

  const snapshot = useCallback(
    () => buildSnapshot(taskState.tasks, taskState.lists, habitState.habits, today, eventsOn(today)),
    [taskState, habitState, today, eventsOn],
  )

  const morningPlan = useCallback(
    () => requestText({ ...prepare('main'), feature: 'morningPlan', data: { snapshot: snapshot() } }),
    [prepare, snapshot],
  )

  const weeklyReview = useCallback(
    () => requestText({ ...prepare('main'), feature: 'weeklyReview', data: { week: buildWeek(taskState.tasks, habitState.habits, today) } }),
    [prepare, taskState.tasks, habitState.habits, today],
  )

  const chat = useCallback(
    (messages: ChatMessage[], onText: (t: string) => void, signal?: AbortSignal) =>
      requestChat({ ...prepare('main'), feature: 'chat', data: { messages, snapshot: snapshot() } }, onText, signal),
    [prepare, snapshot],
  )

  const testConnection = useCallback(async () => {
    const started = performance.now()
    await requestText({ ...prepare('fast'), feature: 'ping' } as Extract<TrainerRequest, { feature: 'ping' }>)
    return { ms: Math.round(performance.now() - started) }
  }, [prepare])

  const notify = useCallback(
    (event: TrainerEvent) => {
      // Reactions are a bonus: skip quietly if off, busy, or over the limit.
      if (!ready || reacting.current || usedToday >= settings.dailyLimit) return
      reacting.current = true
      requestText({ ...prepare('fast'), feature: 'reaction', data: { event, snapshot: snapshot() } })
        .then((text) => text && setReaction({ id: Date.now(), text }))
        .catch((err) => console.warn('[trainer] reaction skipped:', (err as Error).message))
        .finally(() => {
          reacting.current = false
        })
    },
    [ready, usedToday, settings.dailyLimit, prepare, snapshot],
  )

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (patch: Partial<TrainerSettings>) => setSettings((s) => ({ ...s, ...patch })),
      status,
      refreshStatus,
      activeProvider,
      modelFor,
      ready,
      usedToday,
      morningPlan,
      weeklyReview,
      chat,
      testConnection,
      notify,
      reaction,
      dismissReaction: () => setReaction(null),
    }),
    [settings, status, refreshStatus, activeProvider, modelFor, ready, usedToday, morningPlan, weeklyReview, chat, testConnection, notify, reaction],
  )

  return <TrainerContext.Provider value={value}>{children}</TrainerContext.Provider>
}
