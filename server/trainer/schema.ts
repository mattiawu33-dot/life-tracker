import { z } from 'zod'
import type { TrainerRequest } from '../../shared/trainer.js'

/**
 * Validates every request before it reaches a model. Lengths are capped so a
 * bad or malicious request can't run up a big bill.
 */
const text = (max: number) => z.string().max(max)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const task = z.object({
  title: text(200),
  when: z.enum(['overdue', 'today', 'upcoming', 'none']),
  date: date.optional(),
  time: text(20).optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']),
  effort: z.enum(['small', 'medium', 'big']),
  list: text(60).optional(),
})

const habit = z.object({
  name: text(80),
  schedule: text(60),
  dueToday: z.boolean(),
  doneToday: z.boolean(),
  streak: z.number().int().min(0).max(100_000),
  streakUnit: z.enum(['day', 'week']),
})

const snapshot = z.object({
  date,
  weekday: text(20),
  localTime: text(20),
  tasks: z.array(task).max(40),
  tasksDoneToday: z.number().int().min(0).max(10_000),
  habits: z.array(habit).max(30),
  events: z
    .array(z.object({ title: text(200), start: text(20).optional(), end: text(20).optional(), allDay: z.boolean().optional() }))
    .max(30),
})

const event = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bigTaskDone'), title: text(200) }),
  z.object({ type: z.literal('xpGoalReached'), xp: z.number().int().min(0).max(1_000_000), goal: z.number().int().min(1).max(1_000_000) }),
  z.object({ type: z.literal('streakLost'), habit: text(80), length: z.number().int().min(1).max(100_000), unit: z.enum(['day', 'week']) }),
])

const week = z.object({
  start: date,
  end: date,
  tasksCompleted: z.number().int().min(0).max(100_000),
  completedTitles: z.array(text(200)).max(40),
  tasksOverdue: z.number().int().min(0).max(100_000),
  habits: z
    .array(z.object({ name: text(80), done: z.number().int().min(0).max(1000), planned: z.number().int().min(0).max(1000), streak: z.number().int().min(0).max(100_000), streakUnit: z.enum(['day', 'week']) }))
    .max(30),
  xpEarned: z.number().int().min(0).max(10_000_000).optional(),
})

const message = z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) })

const base = { provider: text(40), model: text(100) }

export const trainerRequestSchema = z.discriminatedUnion('feature', [
  z.object({ ...base, feature: z.literal('reaction'), data: z.object({ event, snapshot }) }),
  z.object({ ...base, feature: z.literal('morningPlan'), data: z.object({ snapshot }) }),
  z.object({ ...base, feature: z.literal('weeklyReview'), data: z.object({ week }) }),
  z.object({
    ...base,
    feature: z.literal('chat'),
    data: z.object({
      messages: z.array(message).min(1).max(40).refine((m) => m[m.length - 1].role === 'user', 'The last message must be from the user'),
      snapshot,
    }),
  }),
  z.object({ ...base, feature: z.literal('ping') }),
])

export function parseTrainerRequest(body: unknown): { ok: true; value: TrainerRequest } | { ok: false; message: string } {
  const r = trainerRequestSchema.safeParse(body)
  if (r.success) return { ok: true, value: r.data as TrainerRequest }
  const issue = r.error.issues[0]
  return { ok: false, message: `${issue.path.join('.') || 'request'}: ${issue.message}` }
}
