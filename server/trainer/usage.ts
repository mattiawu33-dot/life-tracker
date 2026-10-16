import { Redis } from '@upstash/redis'

/**
 * Daily request counter, shared by all features.
 *
 * With an Upstash Redis database connected (env vars UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN, or Vercel's KV_REST_API_URL / KV_REST_API_TOKEN),
 * the count is reliable. Without one it's kept in memory: still useful, but it
 * resets whenever the serverless function restarts.
 */
export interface UsageStore {
  persistent: boolean
  get(day: string): Promise<number>
  /** Adds one and returns the new count. */
  increment(day: string): Promise<number>
}

const key = (day: string) => `trainer:usage:${day}`

export function memoryUsageStore(): UsageStore {
  const counts = new Map<string, number>()
  return {
    persistent: false,
    async get(day) {
      return counts.get(day) ?? 0
    },
    async increment(day) {
      const n = (counts.get(day) ?? 0) + 1
      counts.set(day, n)
      return n
    },
  }
}

function redisUsageStore(url: string, token: string): UsageStore {
  const redis = new Redis({ url, token })
  return {
    persistent: true,
    async get(day) {
      return Number((await redis.get<number>(key(day))) ?? 0)
    },
    async increment(day) {
      const n = await redis.incr(key(day))
      if (n === 1) await redis.expire(key(day), 60 * 60 * 48)
      return n
    },
  }
}

let shared: UsageStore | null = null

export function getUsageStore(env: Record<string, string | undefined> = process.env): UsageStore {
  if (shared) return shared
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN
  shared = url && token ? redisUsageStore(url, token) : memoryUsageStore()
  return shared
}

export function serverDailyLimit(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.TRAINER_DAILY_LIMIT)
  return Number.isInteger(n) && n > 0 ? n : 50
}

/** The server counts days in UTC (it doesn't know the user's time zone). */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}
