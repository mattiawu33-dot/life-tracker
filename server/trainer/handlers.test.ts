import { APICallError } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { describe, expect, it } from 'vitest'
import type { DaySnapshot, TrainerStatusResponse } from '../../shared/trainer.js'
import { handleStatus, handleTrainer, type Deps } from './handlers.js'
import { memoryUsageStore } from './usage.js'

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } }
const finishReason = { unified: 'stop' as const, raw: 'stop' }

function fakeModel(reply: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({ content: [{ type: 'text', text: reply }], finishReason, usage, warnings: [] }),
    doStream: async () => ({
      stream: new ReadableStream({
        start(c) {
          c.enqueue({ type: 'text-start', id: '1' })
          for (const w of reply.split(' ')) c.enqueue({ type: 'text-delta', id: '1', delta: w + ' ' })
          c.enqueue({ type: 'text-end', id: '1' })
          c.enqueue({ type: 'finish', usage, finishReason })
          c.close()
        },
      }),
    }),
  })
}

function deps(overrides: Partial<Deps> = {}, model = fakeModel('Nice work on that essay!')): Deps & { calls: string[] } {
  const calls: string[] = []
  return {
    env: { ANTHROPIC_API_KEY: 'sk-test', TRAINER_DAILY_LIMIT: '3' },
    usage: memoryUsageStore(),
    getModel: (p, _k, m, _env) => {
      calls.push(`${p}:${m}`)
      return model
    },
    calls,
    ...overrides,
  }
}

const snapshot: DaySnapshot = {
  date: '2026-10-16',
  weekday: 'Friday',
  localTime: '7:30 AM',
  tasks: [{ title: 'Bio essay', when: 'today', priority: 'high', effort: 'big' }],
  tasksDoneToday: 0,
  habits: [{ name: 'Read', schedule: 'Every day', dueToday: true, doneToday: false, streak: 4, streakUnit: 'day' }],
  events: [],
}

const post = (body: unknown) => new Request('http://x/api/trainer', { method: 'POST', body: JSON.stringify(body) })
const reaction = { provider: 'anthropic', model: 'claude-haiku-5-5', feature: 'reaction', data: { event: { type: 'bigTaskDone', title: 'Bio essay' }, snapshot } }

describe('status', () => {
  it('reports which providers have keys, without ever sending a key', async () => {
    const res = await handleStatus(new Request('http://x'), deps())
    const body = (await res.json()) as TrainerStatusResponse
    expect(body.providers.find((p) => p.id === 'anthropic')?.configured).toBe(true)
    expect(body.providers.find((p) => p.id === 'openai')?.configured).toBe(false)
    expect(JSON.stringify(body)).not.toContain('sk-test')
    expect(body.usage).toEqual({ used: 0, limit: 3, persistent: false })
  })
})

describe('trainer requests', () => {
  it('answers a reaction with the chosen model', async () => {
    const d = deps()
    const res = await handleTrainer(post(reaction), d)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'Nice work on that essay!' })
    expect(d.calls).toEqual(['anthropic:claude-haiku-5-5'])
  })

  it('rejects providers without a key, and models not on the list', async () => {
    expect((await handleTrainer(post({ ...reaction, provider: 'openai', model: 'gpt-6-luna' }), deps())).status).toBe(403)
    expect((await handleTrainer(post({ ...reaction, model: 'claude-mega-9000' }), deps())).status).toBe(400)
    expect((await handleTrainer(post({ ...reaction, provider: 'nope' }), deps())).status).toBe(400)
  })

  it('rejects malformed or oversized input', async () => {
    const res = await handleTrainer(post({ ...reaction, data: { event: { type: 'bigTaskDone', title: 'x'.repeat(500) }, snapshot } }), deps())
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('invalid_request')
  })

  it('enforces the daily limit', async () => {
    const d = deps()
    for (let i = 0; i < 3; i++) expect((await handleTrainer(post(reaction), d)).status).toBe(200)
    const res = await handleTrainer(post(reaction), d)
    expect(res.status).toBe(429)
  })

  it('turns a bad key into a friendly error without leaking details', async () => {
    const broken = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: 'invalid x-api-key sk-test', url: 'https://api', requestBodyValues: {}, statusCode: 401 })
      },
    })
    const res = await handleTrainer(post(reaction), deps({}, broken))
    expect(res.status).toBe(502)
    const text = await res.text()
    expect(text).toContain('rejected the API key')
    expect(text).not.toContain('sk-test')
  })

  it('streams chat replies as plain text', async () => {
    const res = await handleTrainer(
      post({ provider: 'anthropic', model: 'claude-opus-5-5', feature: 'chat', data: { messages: [{ role: 'user', content: 'How should I study tonight?' }], snapshot } }),
      deps({}, fakeModel('Start with the bio essay.')),
    )
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect((await res.text()).trim()).toBe('Start with the bio essay.')
  })
})
