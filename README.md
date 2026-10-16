# Life Tracker

A calm, all-in-one personal tracker: tasks, calendar, habits and an XP/streak
system to stay motivated. Built with React + TypeScript + Vite + Tailwind CSS.
Data lives in your browser (localStorage), so there's nothing to set up.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

To try it on your phone, run `npm run dev -- --host` and open the
"Network" URL it prints. Your phone has to be on the same Wi-Fi.

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Dev server with instant reload                 |
| `npm run build`   | Type-check + production build into `dist/`     |
| `npm run preview` | Serve the production build locally             |
| `npm run lint`    | Lint with oxlint                               |
| `npm test`        | Run the unit tests (Vitest)                    |

## How the code is organized

```
src/
  main.tsx              Entry point: loads the font + CSS, wraps the app in ThemeProvider
  App.tsx               Routes: which URL shows which page
  index.css             Design tokens (colors, shadows, radius, font) + light/dark values
  theme/                Light / dark / system theme: state, provider, toggle button
  components/
    layout/             AppShell (the frame), Sidebar (desktop), BottomTabBar (phone)
    ui/                 Reusable pieces: Card, Dialog, Checkbox, Segmented, Field...
  features/
    tasks/              Everything about tasks:
      types.ts            The shape of a Task, TaskList and Recurrence
      store.ts            The reducer: every change to tasks/lists goes through here
      TasksProvider.tsx   Loads from / saves to localStorage
      recurrence.ts       Repeat rules (which days a task occurs on) + tests
      quickAdd.ts         "bio essay friday #school !high" -> a task + tests
      selectors.ts        Grouping into Overdue / Today / Tomorrow / ...
      components/         QuickAddBar, TaskRow, TaskDetail, RepeatEditor, ListChips, ListDialog
    habits/             Everything about habits:
      types.ts            Habit, schedule (daily / some weekdays / N per week), day log
      streaks.ts          Forgiving streak rules, completion rate + tests
      store.ts            The habits reducer (add, edit, delete, mark a day)
      components/         HabitRow, HabitForm, HabitDetail, Heatmap
  pages/                One file per tab: Today, Tasks, Calendar, Habits, Stats
  lib/                  Plain helpers with no UI: storage, dates, ids, useToday
```

### Key ideas

- **Design tokens.** Components never use raw colors. They use semantic names
  like `bg-surface`, `text-ink-muted` and `bg-accent`, defined once in
  `src/index.css`. Dark mode is just a second set of values for the same names.
- **Mobile-first.** Classes without a prefix apply to phones. `md:` classes
  take over at 768px and wider. That's how the bottom tab bar turns into a
  sidebar.
- **No theme flash.** A tiny script in `index.html` applies the saved theme
  before React loads, so dark-mode users never see a white flash.
- **Storage.** `lib/storage.ts` prefixes every key with `lt:` and stores JSON.
  Tasks and lists are saved under `lt:tasks` after every change.
- **Days are strings.** A due date is stored as `"2026-10-30"`, not a full
  timestamp, so a task due Friday stays on Friday in any time zone.
- **Reducer pattern.** Components never edit tasks directly. They `dispatch`
  an action like `{ type: 'task/toggle', id }`, and `store.ts` makes the change.
- **Recurring tasks** show one occurrence at a time: the most recent one
  that's due (today or overdue), or else the next upcoming one. Older missed
  occurrences are skipped instead of piling up. "Stop repeating" ends the
  task but keeps every past completion.
- **Forgiving habit streaks.** Days a habit isn't scheduled, and days you
  mark as a rest day, never break a streak. Today can't break it before
  midnight. "N times a week" habits count streaks in weeks. Forgot to check
  in? Tap that day on the heatmap to fix it.

## Roadmap

1. ✅ Project setup + layout shell (navigation, theme, dark mode)
2. ✅ Tasks with quick-add and lists
3. ✅ Habits with streaks
4. XP, levels, daily goal, streak freezes
5. Today dashboard tying it together
6. Google Calendar sync
7. Polish: animations, weekly recap, stats
8. AI trainer (optional, powered by the Claude API)

## Step 8 plan: AI trainer

An optional coach that works with any AI provider (Anthropic Claude, OpenAI,
Google Gemini to start, with more easy to add). When it's off, nothing is
sent anywhere.

**Features** (the same prompts work with every provider)
- **Morning plan:** a short plan for the day based on today's calendar and tasks.
- **Live reactions:** 1-3 sentence reactions to events: finishing a big task,
  hitting the daily XP goal, losing a streak. These only run when an event
  happens, never on a timer, and use a fast, low-cost model.
- **Weekly review:** what went well, what slipped, one thing to try next week.
- **Chat panel:** ask for advice about your schedule, studying or habits.

**Tone:** encouraging but honest, like a coach. Live reactions stay at 1-3
sentences.

**Backend:** a serverless function with one request/response format for the
app and one adapter per provider behind it. The app never talks to a
provider directly.

**Keys:** one environment variable per provider, set only on the backend.
Never in frontend code or git (`.env` files are in `.gitignore`).

**Settings -> AI Trainer:** on/off toggle, provider dropdown (only providers
whose key is configured), model dropdown, connection status, daily usage
limit. There is no field for the key itself.
