import { describe, expect, it } from 'vitest'
import { describeDay, reactionPrompt, weeklyReviewPrompt } from './prompts.js'

const snapshot = {
  date: '2026-10-16',
  weekday: 'Friday',
  localTime: '7:30 AM',
  tasks: [{ title: 'Chem lab report', when: 'overdue' as const, date: '2026-10-15', priority: 'medium' as const, effort: 'medium' as const, list: 'School' }],
  tasksDoneToday: 2,
  habits: [{ name: 'Gym', schedule: '3× a week', dueToday: true, doneToday: false, streak: 2, streakUnit: 'week' as const }],
  events: [{ title: 'Robotics', start: '16:00', end: '18:00' }],
}

describe('prompts', () => {
  it('describes the day in plain words', () => {
    const text = describeDay(snapshot)
    expect(text).toContain('Friday, 2026-10-16')
    expect(text).toContain('Chem lab report, overdue since 2026-10-15, medium priority, medium effort, list: School')
    expect(text).toContain('Robotics 16:00-18:00')
    expect(text).toContain('Gym (3× a week): not done yet today, streak 2 weeks')
  })
  it('asks for a short, specific reaction', () => {
    const p = reactionPrompt({ type: 'streakLost', habit: 'Read', length: 12, unit: 'day' }, snapshot)
    expect(p).toContain('"Read" just ended after 12 days')
    expect(p).toContain('1 to 3 short sentences')
  })
  it('includes the week data', () => {
    const p = weeklyReviewPrompt({ start: '2026-10-10', end: '2026-10-16', tasksCompleted: 9, completedTitles: ['Bio essay'], tasksOverdue: 1, habits: [] })
    expect(p).toContain('Tasks completed: 9')
    expect(p).toContain('- Bio essay')
  })
})
