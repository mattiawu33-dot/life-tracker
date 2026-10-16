import type { TrainerErrorResponse, TrainerRequest, TrainerStatusResponse, TrainerTextResponse } from '../../../shared/trainer'

/** Thin client for the trainer backend. The app never talks to an AI provider directly. */

export class TrainerError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const UNREACHABLE =
  "Can't reach the trainer server. It runs with `npm run dev` on your computer, or on Vercel once deployed (not in the static preview)."

async function readError(res: Response): Promise<TrainerError> {
  try {
    const body = (await res.json()) as TrainerErrorResponse
    if (body?.error?.message) return new TrainerError(body.error.code, body.error.message)
  } catch {
    // not JSON
  }
  return new TrainerError('unreachable', res.status === 404 ? UNREACHABLE : `The trainer server returned an error (${res.status}).`)
}

function isJson(res: Response) {
  return (res.headers.get('content-type') ?? '').includes('application/json')
}

export async function fetchStatus(): Promise<TrainerStatusResponse> {
  let res: Response
  try {
    res = await fetch('/api/trainer-status', { cache: 'no-store' })
  } catch {
    throw new TrainerError('unreachable', UNREACHABLE)
  }
  // A static host answers unknown URLs with index.html, so check it's really JSON.
  if (!res.ok || !isJson(res)) throw res.ok ? new TrainerError('unreachable', UNREACHABLE) : await readError(res)
  return (await res.json()) as TrainerStatusResponse
}

async function post(req: TrainerRequest, signal?: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetch('/api/trainer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new TrainerError('unreachable', UNREACHABLE)
  }
  if (!res.ok) throw await readError(res)
  return res
}

/** Morning plan, weekly review, reactions and the connection test. */
export async function requestText(req: Exclude<TrainerRequest, { feature: 'chat' }>): Promise<string> {
  const res = await post(req)
  if (!isJson(res)) throw new TrainerError('unreachable', UNREACHABLE)
  return ((await res.json()) as TrainerTextResponse).text
}

/** Chat: calls onText with the growing answer as it streams in. */
export async function requestChat(
  req: Extract<TrainerRequest, { feature: 'chat' }>,
  onText: (textSoFar: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await post(req, signal)
  if (!res.body) throw new TrainerError('unreachable', UNREACHABLE)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  return text
}
