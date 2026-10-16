import { APICallError, generateText, streamText, type LanguageModel } from 'ai'
import type { ModelMessage } from 'ai'
import type { TrainerErrorCode, TrainerRequest, TrainerStatusResponse } from '../../shared/trainer.js'
import {
  chatInstructions,
  chatMessages,
  COACH_PERSONA,
  morningPlanPrompt,
  PING_PROMPT,
  reactionPrompt,
  weeklyReviewPrompt,
} from './prompts.js'
import { apiKeyFor, findModel, findProvider, providerStatuses } from './providers.js'
import { parseTrainerRequest } from './schema.js'
import { getUsageStore, serverDailyLimit, utcDay, type UsageStore } from './usage.js'

/**
 * The trainer backend, written against the web-standard Request/Response so
 * it runs unchanged on Vercel, in the Vite dev server, and in tests.
 */

export interface Deps {
  env: Record<string, string | undefined>
  usage: UsageStore
  /** Builds the model. Tests swap this for a fake model. */
  getModel: (providerId: string, apiKey: string, modelId: string, env: Record<string, string | undefined>) => LanguageModel
}

function defaultDeps(): Deps {
  return {
    env: process.env,
    usage: getUsageStore(),
    getModel: (providerId, apiKey, modelId, env) => findProvider(providerId)!.create(apiKey, modelId, env),
  }
}

/** Per-feature settings. `reasoning` is the AI SDK's provider-neutral thinking level. */
interface FeatureSettings {
  maxOutputTokens: number
  reasoning: 'low' | 'medium' | 'provider-default'
}

const FEATURE_SETTINGS: Record<TrainerRequest['feature'], FeatureSettings> = {
  reaction: { maxOutputTokens: 1000, reasoning: 'low' },
  morningPlan: { maxOutputTokens: 2000, reasoning: 'low' },
  weeklyReview: { maxOutputTokens: 2500, reasoning: 'medium' },
  chat: { maxOutputTokens: 2000, reasoning: 'low' },
  ping: { maxOutputTokens: 300, reasoning: 'low' },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const fail = (code: TrainerErrorCode, message: string, status: number) => json({ error: { code, message } }, status)

/** GET /api/trainer-status: which providers are set up, their models, and today's usage. */
export async function handleStatus(_req: Request, deps: Deps = defaultDeps()): Promise<Response> {
  const body: TrainerStatusResponse = {
    providers: providerStatuses(deps.env),
    usage: { used: await deps.usage.get(utcDay()), limit: serverDailyLimit(deps.env), persistent: deps.usage.persistent },
  }
  return json(body)
}

/** Turns provider errors into a short message that's safe to show (never includes a key). */
function describeProviderError(err: unknown): { message: string; status: number } {
  if (APICallError.isInstance(err)) {
    const s = err.statusCode
    if (s === 401 || s === 403) return { message: 'The provider rejected the API key. Check that it is correct and active.', status: 502 }
    if (s === 404) return { message: 'The provider does not recognise this model. It may have been renamed; pick another in Settings.', status: 502 }
    if (s === 429) return { message: 'The provider is rate-limiting requests or your account is out of credit. Try again later.', status: 502 }
    if (s === 400) return { message: `The provider refused the request: ${err.message.slice(0, 200)}`, status: 502 }
    return { message: `The provider had a problem (${s ?? 'network error'}). Try again in a moment.`, status: 502 }
  }
  return { message: 'Could not reach the AI provider. Try again in a moment.', status: 502 }
}

function buildPrompt(req: Exclude<TrainerRequest, { feature: 'chat' }>): string {
  switch (req.feature) {
    case 'reaction':
      return reactionPrompt(req.data.event, req.data.snapshot)
    case 'morningPlan':
      return morningPlanPrompt(req.data.snapshot)
    case 'weeklyReview':
      return weeklyReviewPrompt(req.data.week)
    case 'ping':
      return PING_PROMPT
  }
}

/** POST /api/trainer: every coach feature goes through here. */
export async function handleTrainer(req: Request, deps: Deps = defaultDeps()): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return fail('invalid_request', 'The request body must be JSON.', 400)
  }
  const parsed = parseTrainerRequest(body)
  if (!parsed.ok) return fail('invalid_request', parsed.message, 400)
  const request = parsed.value

  const provider = findProvider(request.provider)
  if (!provider) return fail('unknown_provider', `Unknown provider "${request.provider}".`, 400)
  const apiKey = apiKeyFor(provider, deps.env)
  if (!apiKey) return fail('provider_not_configured', `${provider.label} isn't set up: ${provider.envVar} is missing on the server.`, 403)
  const modelDef = findModel(provider, request.model)
  if (!modelDef) return fail('unknown_model', `"${request.model}" isn't in the allowed model list for ${provider.label}.`, 400)

  // Count the request before calling the model, so bursts can't slip past the limit.
  const limit = serverDailyLimit(deps.env)
  const used = await deps.usage.increment(utcDay())
  if (used > limit) return fail('daily_limit_reached', `The trainer's daily limit (${limit} requests) has been reached. It resets tomorrow (UTC).`, 429)

  const model = deps.getModel(provider.id, apiKey, request.model, deps.env)
  const base = FEATURE_SETTINGS[request.feature]
  const settings: FeatureSettings = modelDef.reasoning === false ? { ...base, reasoning: 'provider-default' } : base

  if (request.feature === 'chat') return streamChat(request, model, settings)

  try {
    const result = await generateText({
      model,
      instructions: COACH_PERSONA,
      prompt: buildPrompt(request),
      maxRetries: 1,
      ...settings,
    })
    return json({ text: result.text.trim() })
  } catch (err) {
    const { message, status } = describeProviderError(err)
    return fail('provider_error', message, status)
  }
}

/**
 * Chat streams its answer as plain text, so words appear as they're written.
 * We wait for the first piece of text before replying, so a bad key or model
 * still comes back as a normal error instead of a broken stream.
 */
async function streamChat(
  request: Extract<TrainerRequest, { feature: 'chat' }>,
  model: LanguageModel,
  settings: FeatureSettings,
): Promise<Response> {
  const result = streamText({
    model,
    instructions: chatInstructions(request.data.snapshot),
    messages: chatMessages(request.data.messages) as ModelMessage[],
    maxRetries: 1,
    ...settings,
  })

  const parts = result.stream[Symbol.asyncIterator]()
  const encoder = new TextEncoder()
  let first: string | null = null
  try {
    for (;;) {
      const { value, done } = await parts.next()
      if (done) break
      if (value.type === 'error') throw value.error
      if (value.type === 'text-delta' && value.text) {
        first = value.text
        break
      }
    }
  } catch (err) {
    const { message, status } = describeProviderError(err)
    return fail('provider_error', message, status)
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (first) controller.enqueue(encoder.encode(first))
      try {
        for (;;) {
          const { value, done } = await parts.next()
          if (done) break
          if (value.type === 'text-delta') controller.enqueue(encoder.encode(value.text))
          if (value.type === 'error') throw value.error
        }
      } catch {
        controller.enqueue(encoder.encode('\n\n(The answer was cut off by a connection problem.)'))
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
