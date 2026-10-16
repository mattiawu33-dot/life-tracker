import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { ModelOption, ModelTier, ProviderStatus } from '../../shared/trainer.js'

/**
 * Provider registry: the ONLY place that knows about specific AI companies.
 *
 * To add a provider:
 *   1. npm install its AI SDK package (see https://ai-sdk.dev/providers)
 *   2. Add an entry below: id, label, env var, allowed models, and `create`
 *   3. Set the env var on Vercel (and in .env.local for local dev)
 * Nothing else in the app needs to change.
 *
 * Model lists: only models listed here can be used, so a typo or a very
 * expensive model can't be requested. Providers rename models often; if
 * "Test connection" in Settings reports an unknown model, update the ID here.
 */
export interface ProviderDef {
  id: string
  label: string
  envVar: string
  models: ModelOption[]
  defaults: Record<ModelTier, string>
  create: (apiKey: string, modelId: string) => LanguageModel
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    envVar: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', tier: 'fast', note: 'Fast, cheap' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', tier: 'main', note: 'Balanced' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', tier: 'main', note: 'Most capable' },
    ],
    defaults: { fast: 'claude-haiku-5-5', main: 'claude-opus-5-5' },
    create: (apiKey, model) => createAnthropic({ apiKey })(model),
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', tier: 'fast', note: 'Fast, cheap' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', tier: 'main', note: 'Balanced' },
      { id: 'gpt-6-astra', label: 'GPT-6 Astra', tier: 'main', note: 'Most capable, pricey' },
    ],
    defaults: { fast: 'gpt-6-luna', main: 'gpt-6.1-sol' },
    create: (apiKey, model) => createOpenAI({ apiKey })(model),
  },
  {
    id: 'google',
    label: 'Google Gemini',
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', tier: 'fast', note: 'Fast, cheap' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', tier: 'main', note: 'Balanced' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)', tier: 'main', note: 'Most capable' },
    ],
    defaults: { fast: 'gemini-3.5-flash-lite', main: 'gemini-3.6-flash' },
    create: (apiKey, model) => createGoogle({ apiKey })(model),
  },
  {
    // One key, many companies' models. Your requests pass through OpenRouter.
    id: 'openrouter',
    label: 'OpenRouter',
    envVar: 'OPENROUTER_API_KEY',
    models: [
      { id: 'anthropic/claude-haiku-5.5', label: 'Claude Haiku 5.5', tier: 'fast' },
      { id: 'google/gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', tier: 'fast' },
      { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna', tier: 'fast' },
      { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', tier: 'main' },
      { id: 'openai/gpt-6.1-sol', label: 'GPT-6.1 Sol', tier: 'main' },
      { id: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash', tier: 'main' },
    ],
    defaults: { fast: 'anthropic/claude-haiku-5.5', main: 'anthropic/claude-sonnet-5.5' },
    create: (apiKey, model) => createOpenRouter({ apiKey })(model),
  },
]

export function findProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export function apiKeyFor(p: ProviderDef, env: Record<string, string | undefined> = process.env): string | undefined {
  const key = env[p.envVar]?.trim()
  return key ? key : undefined
}

export function providerStatuses(env: Record<string, string | undefined> = process.env): ProviderStatus[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    envVar: p.envVar,
    configured: apiKeyFor(p, env) !== undefined,
    models: p.models,
    defaults: p.defaults,
  }))
}
