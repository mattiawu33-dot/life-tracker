/**
 * The one request/response format between the app and the trainer backend.
 *
 * The app sends structured facts ("these tasks are due, this habit streak
 * ended"), never a ready-made prompt. The server turns the facts into a
 * prompt. That keeps the prompts identical for every AI provider, and it
 * means nobody can use the backend as a free general-purpose chatbot.
 *
 * This file has types only (no code), so the app can import it without
 * pulling any server code into the browser bundle.
 */

export type TrainerFeature = 'reaction' | 'morningPlan' | 'weeklyReview' | 'chat' | 'ping'

/** Which of the provider's models a feature uses: fast + cheap, or the main one. */
export type ModelTier = 'fast' | 'main'

export interface TaskSummary {
  title: string
  when: 'overdue' | 'today' | 'upcoming' | 'none'
  date?: string
  time?: string
  priority: 'none' | 'low' | 'medium' | 'high'
  effort: 'small' | 'medium' | 'big'
  list?: string
}

export interface HabitSummary {
  name: string
  schedule: string
  dueToday: boolean
  doneToday: boolean
  streak: number
  streakUnit: 'day' | 'week'
}

/** A calendar event (filled in once Google Calendar sync exists, step 6). */
export interface EventSummary {
  title: string
  start?: string
  end?: string
  allDay?: boolean
}

/** Everything the coach needs to know about today. */
export interface DaySnapshot {
  date: string
  weekday: string
  localTime: string
  tasks: TaskSummary[]
  tasksDoneToday: number
  habits: HabitSummary[]
  events: EventSummary[]
}

export type TrainerEvent =
  | { type: 'bigTaskDone'; title: string }
  | { type: 'xpGoalReached'; xp: number; goal: number }
  | { type: 'streakLost'; habit: string; length: number; unit: 'day' | 'week' }

export interface WeekSummary {
  start: string
  end: string
  tasksCompleted: number
  completedTitles: string[]
  tasksOverdue: number
  habits: { name: string; done: number; planned: number; streak: number; streakUnit: 'day' | 'week' }[]
  xpEarned?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Base {
  provider: string
  model: string
}

export type TrainerRequest =
  | (Base & { feature: 'reaction'; data: { event: TrainerEvent; snapshot: DaySnapshot } })
  | (Base & { feature: 'morningPlan'; data: { snapshot: DaySnapshot } })
  | (Base & { feature: 'weeklyReview'; data: { week: WeekSummary } })
  | (Base & { feature: 'chat'; data: { messages: ChatMessage[]; snapshot: DaySnapshot } })
  | (Base & { feature: 'ping'; data?: undefined })

/** Non-chat features answer with JSON; chat streams plain text. */
export interface TrainerTextResponse {
  text: string
}

export type TrainerErrorCode =
  | 'invalid_request'
  | 'unknown_provider'
  | 'provider_not_configured'
  | 'unknown_model'
  | 'daily_limit_reached'
  | 'provider_error'

export interface TrainerErrorResponse {
  error: { code: TrainerErrorCode; message: string }
}

export interface ModelOption {
  id: string
  label: string
  tier: ModelTier
  note?: string
}

export interface ProviderStatus {
  id: string
  label: string
  /** Name of the environment variable that holds this provider's key. */
  envVar: string
  /** True when that variable is set on the server. The key itself is never sent. */
  configured: boolean
  models: ModelOption[]
  defaults: Record<ModelTier, string>
}

export interface TrainerStatusResponse {
  providers: ProviderStatus[]
  usage: {
    used: number
    /** The server's hard daily cap (TRAINER_DAILY_LIMIT). */
    limit: number
    /** True when counted in a database; false = best-effort, resets on restart. */
    persistent: boolean
  }
}
