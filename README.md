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
8. ✅ AI trainer (optional, any AI provider), built early

## AI trainer

An optional coach (Settings -> AI Trainer) that works with any AI provider:
Anthropic Claude, OpenAI, Google Gemini, or OpenRouter (one key, many
models). It's off by default, and nothing is sent anywhere while it's off.

- **Morning plan** for today, from your tasks, habits and (from step 6) calendar.
- **Live reactions** (1-3 sentences) when you finish a big task, a habit
  streak ends, or (from step 4) you hit your daily XP goal. Only on real
  events, and always with the cheaper "fast" model.
- **Weekly review** of the last 7 days.
- **Chat** for advice; answers stream in as they're written.

### How it works

```
Browser (the app)                      Serverless function (Vercel)         AI provider
  sends facts, never prompts  ──POST /api/trainer──▶  validates, counts,     ──▶  Claude / GPT /
  e.g. "these tasks are due"                          builds the prompt,           Gemini / ...
                                                      adds the API key
```

- `shared/trainer.ts`: the one request/response format, used by both sides.
- `server/trainer/providers.ts`: the provider registry. The only file that
  knows about specific companies. Adding a provider = install its AI SDK
  package and add one entry.
- `server/trainer/prompts.ts`: the coach's prompts, identical for every provider.
- `server/trainer/schema.ts`: validates every request and caps its size.
- `server/trainer/handlers.ts`: the endpoints (`/api/trainer`, `/api/trainer-status`).
- `api/*.ts`: the Vercel functions, 3 lines each, calling the handlers.
- `scripts/devApi.ts`: runs those same functions inside `npm run dev`.

Built on the [Vercel AI SDK](https://ai-sdk.dev), which turns each provider's
own API into one `generateText` / `streamText` call.

### Setting up keys

API keys are like passwords that cost money. They live **only** on the server
as environment variables: never in the app's code, never in git, never typed
into the app. You only need one provider to start.

> **Age and payment.** Several AI providers require account holders to be 18
> or older, and all of them need a payment method for API use. If you're
> under 18, ask a parent or guardian to create the account and key with you.
> Either way, **set a monthly spending limit** in the provider's billing
> settings. A few dollars a month is plenty for one person.

**1. Get a key** (pick one or more)

| Provider | Where | Environment variable |
| --- | --- | --- |
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com) -> API Keys -> Create Key | `ANTHROPIC_API_KEY` |
| OpenAI | [platform.openai.com](https://platform.openai.com) -> API keys -> Create new secret key | `OPENAI_API_KEY` |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) -> Get API key -> Create API key | `GOOGLE_GENERATIVE_AI_API_KEY` |
| OpenRouter | [openrouter.ai](https://openrouter.ai) -> Keys -> Create Key | `OPENROUTER_API_KEY` |

Each site shows the key **once**. Copy it straight into step 2; don't save it
in a note, a chat or a file inside the project folder (other than `.env.local`).

**2. Local development**

```bash
cp .env.example .env.local     # .env.local is git-ignored
# open .env.local and paste your key after the matching name, e.g.
# ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Then open Settings -> AI Trainer, switch it on, and press **Test connection**.
Check that `git status` never lists `.env.local`.

**3. On Vercel** (the deployed app)

1. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and
   import the `life-tracker` repo. Vercel detects Vite; keep the defaults
   and deploy.
2. Project -> **Settings -> Environment Variables**: add each key with the
   same name as above (for Production, and Preview if you use it).
3. **Deployments -> ... -> Redeploy**, so the function picks up the keys.
4. Optional but recommended: Project -> **Storage** -> add **Upstash for
   Redis** (free tier) and connect it. That makes the daily cap reliable
   (Settings will stop saying "counted in memory").
5. Optional: set `TRAINER_DAILY_LIMIT` (default 50 requests/day, all
   features together). The limit you pick in Settings can be lower, never higher.

**If a key leaks** (pasted somewhere public, committed by accident), delete
it on the provider's site right away and create a new one.

### Models

Each provider has a **fast** model (live reactions) and a **main** model
(plan, review, chat), both changeable in Settings. Only models listed in
`server/trainer/providers.ts` can be used. Providers rename models often:
if Test connection says a model isn't recognised, update its ID there.
