import * as chrono from 'chrono-node'
import { toISODate, type ISODate } from '../../lib/dates'
import type { Priority, TaskList } from './types'

export interface ParsedQuickAdd {
  title: string
  dueDate: ISODate | null
  dueTime: string | null
  /** The words that were read as a date, e.g. "tomorrow 4pm" (shown as a chip). */
  dateText: string | null
  listId: string | null
  priority: Priority | null
}

interface ParseOptions {
  lists: TaskList[]
  now?: Date
  /** The user tapped × on the date chip: keep the words in the title instead. */
  ignoreDate?: boolean
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  high: 'high', h: 'high', '3': 'high',
  medium: 'medium', med: 'medium', m: 'medium', '2': 'medium',
  low: 'low', l: 'low', '1': 'low',
}

// "sat" and "SAT" look like dates to chrono, but for a student "SAT" is a test.
const BARE_DAY_ABBR = /^(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)$/i
const ALL_CAPS_WORD = /^[A-Z]{2,}$/

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '')

/**
 * Turns quick-add text into a task:
 *   "robotics meeting tomorrow 4pm #robotics !high"
 *   -> title "robotics meeting", tomorrow at 16:00, Robotics list, high priority
 */
export function parseQuickAdd(input: string, { lists, now = new Date(), ignoreDate = false }: ParseOptions): ParsedQuickAdd {
  let text = ` ${input} `
  let listId: string | null = null
  let priority: Priority | null = null

  // #list: matches a list whose name starts with the typed word ("#rob" -> Robotics).
  text = text.replace(/\s#([\p{L}\p{N}_-]+)(?=\s)/u, (match, word: string) => {
    const found = lists.find((l) => normalize(l.name).startsWith(word.toLowerCase()))
    if (!found) return match
    listId = found.id
    return ' '
  })

  // !high / !med / !low (or !3 / !2 / !1)
  text = text.replace(/\s!(\w+)(?=\s)/, (match, word: string) => {
    const p = PRIORITY_TOKENS[word.toLowerCase()]
    if (!p) return match
    priority = p
    return ' '
  })

  let dueDate: ISODate | null = null
  let dueTime: string | null = null
  let dateText: string | null = null

  if (!ignoreDate) {
    const results = chrono
      .parse(text, now, { forwardDate: true })
      .filter((r) => !BARE_DAY_ABBR.test(r.text) && !ALL_CAPS_WORD.test(r.text))
    // Dates usually come at the end ("essay friday"), so use the last match.
    const r = results.at(-1)
    if (r) {
      const d = r.start.date()
      dueDate = toISODate(d)
      if (r.start.isCertain('hour')) {
        dueTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      }
      dateText = r.text
      text = text.slice(0, r.index) + ' ' + text.slice(r.index + r.text.length)
      // "essay due friday" -> "essay", not "essay due"
      text = text.replace(/\s+(due|on|at|by|for)\s*$/i, ' ')
    }
  }

  return { title: text.replace(/\s+/g, ' ').trim(), dueDate, dueTime, dateText, listId, priority }
}
