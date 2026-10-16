import { createContext, useContext } from 'react'
import type { ChatMessage, ModelTier, ProviderStatus, TrainerEvent, TrainerStatusResponse } from '../../../shared/trainer'

export interface TrainerSettings {
  enabled: boolean
  /** Chosen provider id; falls back to the first configured one. */
  provider: string | null
  /** Chosen models per provider. Missing = the provider's defaults. */
  models: Record<string, Partial<Record<ModelTier, string>>>
  /** Max trainer requests per day from this device. */
  dailyLimit: number
}

export type StatusState =
  | { state: 'idle' | 'loading' }
  | { state: 'ready'; data: TrainerStatusResponse }
  | { state: 'error'; message: string }

export interface TrainerContextValue {
  settings: TrainerSettings
  updateSettings: (patch: Partial<TrainerSettings>) => void
  status: StatusState
  refreshStatus: () => void
  /** The provider in use (configured), or null if none is available. */
  activeProvider: ProviderStatus | null
  modelFor: (tier: ModelTier) => string | null
  /** True when the trainer is on and has a working provider. */
  ready: boolean
  usedToday: number
  morningPlan: () => Promise<string>
  weeklyReview: () => Promise<string>
  chat: (messages: ChatMessage[], onText: (t: string) => void, signal?: AbortSignal) => Promise<string>
  testConnection: () => Promise<{ ms: number }>
  /** Ask for a live reaction (silently skipped when off or over the limit). */
  notify: (event: TrainerEvent) => void
  reaction: { id: number; text: string } | null
  dismissReaction: () => void
}

export const TrainerContext = createContext<TrainerContextValue | null>(null)

export function useTrainer() {
  const ctx = useContext(TrainerContext)
  if (!ctx) throw new Error('useTrainer must be used inside <TrainerProvider>')
  return ctx
}
