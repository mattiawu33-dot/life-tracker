import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { DaySnapshot, TrainerStatusResponse } from '../../shared/trainer.js'
import { handleStatus, handleTrainer, type Deps } from './handlers.js'
import { findProvider } from './providers.js'
import { memoryUsageStore } from './usage.js'

/**
 * Runs the real Ollama adapter (not a fake model) against a tiny local server
 * that speaks the same OpenAI-compatible protocol as https://ollama.com/v1.
 */
interface Seen {
  path: string
  auth: string | undefined
  body: Record<string, unknown>
}

let server: Server
let baseURL = ''
const seen: Seen[] = []

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => resolve(JSON.parse(raw || '{}')))
  })
}

beforeAll(async () => {
  server = createServer(async (req, res) => {
    const body = await readJson(req)
    seen.push({ path: req.url ?? '', auth: req.headers.authorization, body })
    if (req.headers.authorization !== 'Bearer ollama-test-key') {
      res.writeHead(401, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ error: 'unauthorized' }))
    }
    const base = { id: 'chatcmpl-1', created: 1, model: body.model }
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      for (const word of ['Start ', 'with ', 'chem.']) {
        res.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant', content: word }, finish_reason: null }] })}\n\n`)
      }
      res.write(`data: ${JSON.stringify({ ...base, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ...base, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }], usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 } }))
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`
})

afterAll(() => new Promise<void>((r) => server.close(() => r())))

function deps(key = 'ollama-test-key'): Deps {
  return {
    env: { OLLAMA_API_KEY: key, OLLAMA_BASE_URL: baseURL },
    usage: memoryUsageStore(),
    getModel: (p, k, m, env) => findProvider(p)!.create(k, m, env),
  }
}

const post = (body: unknown) => new Request('http://x/api/trainer', { method: 'POST', body: JSON.stringify(body) })

const snapshot: DaySnapshot = { date: '2026-10-16', weekday: 'Friday', localTime: '4:00 PM', tasks: [], tasksDoneToday: 0, habits: [], events: [] }

describe('Ollama Cloud provider', () => {
  it('shows up in status once OLLAMA_API_KEY is set, with open-model defaults', async () => {
    const body = (await (await handleStatus(new Request('http://x'), deps())).json()) as TrainerStatusResponse
    const ollama = body.providers.find((p) => p.id === 'ollama')!
    expect(ollama).toMatchObject({ label: 'Ollama Cloud', envVar: 'OLLAMA_API_KEY', configured: true, defaults: { fast: 'gemma4:31b', main: 'gpt-oss:120b' } })
    expect(JSON.stringify(ollama)).not.toContain('reasoning') // server-only flag isn't sent to the app
  })

  it('Test connection (ping) calls /v1/chat/completions with the Bearer key and model', async () => {
    seen.length = 0
    const res = await handleTrainer(post({ provider: 'ollama', model: 'gemma4:31b', feature: 'ping' }), deps())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ text: 'OK' })
    expect(seen[0]).toMatchObject({ path: '/v1/chat/completions', auth: 'Bearer ollama-test-key' })
    expect(seen[0].body.model).toBe('gemma4:31b')
    expect(seen[0].body).not.toHaveProperty('reasoning_effort') // Gemma has no thinking mode
  })

  it('sends a reasoning level only to models that support it (gpt-oss)', async () => {
    seen.length = 0
    await handleTrainer(post({ provider: 'ollama', model: 'gpt-oss:120b', feature: 'ping' }), deps())
    expect(seen[0].body.reasoning_effort).toBe('low')
  })

  it('streams chat replies', async () => {
    const res = await handleTrainer(
      post({ provider: 'ollama', model: 'gpt-oss:120b', feature: 'chat', data: { messages: [{ role: 'user', content: 'What first?' }], snapshot } }),
      deps(),
    )
    expect(await res.text()).toBe('Start with chem.')
  })

  it('reports a wrong key clearly', async () => {
    const res = await handleTrainer(post({ provider: 'ollama', model: 'gemma4:31b', feature: 'ping' }), deps('wrong'))
    expect(res.status).toBe(502)
    expect(await res.text()).toContain('rejected the API key')
  })
})
