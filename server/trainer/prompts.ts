import type { ChatMessage, DaySnapshot, TaskSummary, TrainerEvent, WeekSummary } from '../../shared/trainer.js'

/**
 * The coach's prompts. Written in plain language with no provider-specific
 * tricks, so they work the same with Claude, GPT, Gemini or anything else.
 */

export const COACH_PERSONA = `You are Coach, the personal coach inside a student's life-tracker app.
The user is a busy high school student juggling classes, clubs, sports, test prep and side projects.

How you talk:
- Encouraging but honest, like a good sports coach. Celebrate real wins; name problems plainly and kindly.
- Specific and practical. Refer to their actual tasks, habits and events by name.
- Talk to them directly ("you"). Warm, casual, never cheesy. At most one emoji.
- Plain text only: no headings, tables or bold. Use short "- " bullet lines only when asked for a list.

Rules:
- Only use facts from the data you're given. Never invent tasks, events, times or numbers.
- Don't lecture, guilt-trip or moralize about missed things. Focus on the next step.
- If the student seems seriously stressed, overwhelmed or unsafe, be kind, keep it simple, and suggest talking to a trusted adult or school counselor.`

function taskLine(t: TaskSummary): string {
  const bits = [t.title]
  if (t.when === 'overdue') bits.push(`overdue since ${t.date}`)
  else if (t.when === 'today') bits.push(t.time ? `due today at ${t.time}` : 'due today')
  else if (t.when === 'upcoming') bits.push(`due ${t.date}${t.time ? ` at ${t.time}` : ''}`)
  if (t.priority !== 'none') bits.push(`${t.priority} priority`)
  bits.push(`${t.effort} effort`)
  if (t.list) bits.push(`list: ${t.list}`)
  return `- ${bits.join(', ')}`
}

/** Today's situation as readable text (models handle prose better than raw JSON). */
export function describeDay(s: DaySnapshot): string {
  const lines = [`Today is ${s.weekday}, ${s.date}. It's ${s.localTime} for the student.`]

  lines.push('', 'Calendar events today:')
  lines.push(...(s.events.length ? s.events.map((e) => `- ${e.title}${e.allDay ? ' (all day)' : e.start ? ` ${e.start}${e.end ? `-${e.end}` : ''}` : ''}`) : ['- (none, or calendar not connected)']))

  lines.push('', `Open tasks (${s.tasksDoneToday} already completed today):`)
  lines.push(...(s.tasks.length ? s.tasks.map(taskLine) : ['- (none)']))

  lines.push('', 'Habits:')
  lines.push(
    ...(s.habits.length
      ? s.habits.map(
          (h) =>
            `- ${h.name} (${h.schedule}): ${h.dueToday ? (h.doneToday ? 'done today' : 'not done yet today') : 'not scheduled today'}, streak ${h.streak} ${h.streakUnit}${h.streak === 1 ? '' : 's'}`,
        )
      : ['- (none)']),
  )
  return lines.join('\n')
}

function describeEvent(e: TrainerEvent): string {
  switch (e.type) {
    case 'bigTaskDone':
      return `The student just finished a big task: "${e.title}".`
    case 'xpGoalReached':
      return `The student just hit their daily XP goal (${e.xp} of ${e.goal} XP).`
    case 'streakLost':
      return `The student's streak for the habit "${e.habit}" just ended after ${e.length} ${e.unit}${e.length === 1 ? '' : 's'}.`
  }
}

export function reactionPrompt(event: TrainerEvent, snapshot: DaySnapshot): string {
  return `${describeEvent(event)}

React to this in 1 to 3 short sentences. Be genuine, not generic: mention what they did by name.
If it was a win, celebrate it and, if it fits, point at what's next today.
If a streak ended, be kind and honest, and give one small way to restart today or tomorrow.
Answer with the reaction only.

For context, here is their day:
${describeDay(snapshot)}`
}

export function morningPlanPrompt(snapshot: DaySnapshot): string {
  return `Write the student's plan for today.

Format:
- One opening sentence about the shape of the day.
- Then 3 to 6 "- " bullet lines in a sensible order: what to do and roughly when, working around their calendar events. Put overdue and high-priority items early, and pair big tasks with free time.
- End with one short encouraging line.
Keep it under 120 words. If there's almost nothing planned, say so and suggest one useful thing.

${describeDay(snapshot)}`
}

export function weeklyReviewPrompt(w: WeekSummary): string {
  const habits = w.habits.length
    ? w.habits.map((h) => `- ${h.name}: ${h.done} of ${h.planned} planned, current streak ${h.streak} ${h.streakUnit}${h.streak === 1 ? '' : 's'}`).join('\n')
    : '- (no habits)'
  const titles = w.completedTitles.length ? w.completedTitles.map((t) => `- ${t}`).join('\n') : '- (none)'
  return `Write the student's weekly review for ${w.start} to ${w.end}.

Format, under 170 words:
- One sentence summing up the week honestly.
- "Went well:" followed by 1 to 3 "- " bullet lines.
- "Slipped:" followed by 1 to 2 "- " bullet lines (skip if nothing slipped).
- "Try next week:" followed by exactly one concrete, small experiment.

Data:
Tasks completed: ${w.tasksCompleted}${w.xpEarned !== undefined ? `\nXP earned: ${w.xpEarned}` : ''}
Tasks currently overdue: ${w.tasksOverdue}
Completed tasks:
${titles}
Habits:
${habits}`
}

/** Chat: the persona plus today's context, then the conversation itself. */
export function chatInstructions(snapshot: DaySnapshot): string {
  return `${COACH_PERSONA}

You're chatting with the student. Keep answers short (under 150 words) unless they ask for detail.
Give concrete advice tied to their real schedule when it helps. Ask one clarifying question if you need to.

Their current situation:
${describeDay(snapshot)}`
}

export function chatMessages(messages: ChatMessage[]): ChatMessage[] {
  // Only the most recent turns: keeps cost down and stays within any model's limits.
  return messages.slice(-12)
}

export const PING_PROMPT = 'Reply with just the word: OK'
