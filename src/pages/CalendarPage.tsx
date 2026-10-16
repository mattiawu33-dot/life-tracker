import type { DatesSetArg, DateSelectArg, DayCellContentArg, DayHeaderContentArg, EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg, type EventResizeDoneArg } from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Check, ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { DayChecklist } from '../features/calendar/components/DayChecklist'
import { TimeBlockDialog, type BlockDraft } from '../features/calendar/components/TimeBlockDialog'
import { calendarItems, openCounts, timeOf, type CalendarItem } from '../features/calendar/items'
import { TaskDetail } from '../features/tasks/components/TaskDetail'
import { useTasks } from '../features/tasks/store'
import { addDays, toISODate, type ISODate } from '../lib/dates'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useSetting } from '../lib/useSetting'
import { useToday } from '../lib/useToday'

type ViewKey = 'day' | 'week' | 'month'

/** On phones, "Week" shows 3 days at a time so the columns stay readable. */
function fcView(key: ViewKey, wide: boolean) {
  return key === 'day' ? 'timeGridDay' : key === 'month' ? 'dayGridMonth' : wide ? 'timeGridWeek' : 'timeGridThreeDay'
}

/**
 * Google Calendar-style calendar. Timed items are blocks on the grid (drag to
 * create, drag or resize to change). Items without a time live in each day's
 * checklist, shown beside the calendar for the selected day.
 */
export function CalendarPage() {
  const { state, dispatch } = useTasks()
  const today = useToday()
  const wide = useMediaQuery('(min-width: 640px)')
  const calRef = useRef<FullCalendar>(null)
  const [viewKey, setViewKey] = useSetting<ViewKey>('calendar:view', 'week')
  const [selected, setSelected] = useState<ISODate>(today)
  const [range, setRange] = useState<{ from: ISODate; to: ISODate; title: string } | null>(null)
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)

  // Switch the calendar when the view button (or screen width) changes.
  useEffect(() => {
    calRef.current?.getApi().changeView(fcView(viewKey, wide))
  }, [viewKey, wide])

  const items = useMemo(
    () => (range ? calendarItems(state.tasks, state.lists, range.from, range.to, today) : []),
    [state.tasks, state.lists, range, today],
  )
  const counts = useMemo(() => (range ? openCounts(state.tasks, range.from, range.to, today) : new Map<ISODate, number>()), [state.tasks, range, today])

  const events = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        start: item.start,
        end: item.end,
        editable: !item.repeating,
        classNames: ['lt-event', ...(item.done ? ['lt-event-done'] : [])],
        extendedProps: { item },
      })),
    [items],
  )

  function saveMove(arg: EventDropArg | EventResizeDoneArg) {
    const item = arg.event.extendedProps.item as CalendarItem
    const start = arg.event.start!
    const end = arg.event.end ?? new Date(start.getTime() + (item.end.getTime() - item.start.getTime()))
    dispatch({
      type: 'task/update',
      id: item.taskId,
      patch: { dueDate: toISODate(start), dueTime: timeOf(start), durationMin: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60_000)) },
    })
  }

  const isGrid = viewKey !== 'month'
  const api = () => calRef.current?.getApi()

  return (
    <>
      <PageHeader title="Calendar" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section className="min-w-0 flex-1 rounded-card bg-surface p-2 shadow-card sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
            <div className="flex items-center">
              <button type="button" aria-label="Previous" onClick={() => api()?.prev()} className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" aria-label="Next" onClick={() => api()?.next()} className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-2 hover:text-ink">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                api()?.today()
                setSelected(today)
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-soft"
            >
              Today
            </button>
            <h2 className="mr-auto min-w-0 truncate text-base font-semibold" aria-live="polite">
              {range?.title}
            </h2>
            <div className="w-full sm:w-64">
              <Segmented<ViewKey>
                label="Calendar view"
                value={viewKey}
                onChange={setViewKey}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: wide ? 'Week' : '3 days' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>
          </div>

          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={fcView(viewKey, wide)}
            views={{ timeGridThreeDay: { type: 'timeGrid', duration: { days: 3 } } }}
            headerToolbar={false}
            firstDay={1}
            height={isGrid ? (wide ? 720 : 620) : 'auto'}
            scrollTime="07:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            allDaySlot={false}
            nowIndicator
            selectable
            selectMirror
            selectLongPressDelay={300}
            eventLongPressDelay={300}
            editable
            eventDurationEditable
            dayMaxEvents={3}
            navLinks
            navLinkDayClick={(date) => setSelected(toISODate(date))}
            events={events}
            datesSet={(arg: DatesSetArg) => setRange({ from: toISODate(arg.start), to: addDays(toISODate(arg.end), -1), title: arg.view.title })}
            select={(arg: DateSelectArg) => {
              const day = toISODate(arg.start)
              setSelected(day)
              arg.view.calendar.unselect()
              if (arg.allDay) return // month view: just pick the day
              setDraft({ day, start: timeOf(arg.start), durationMin: Math.max(15, Math.round((arg.end.getTime() - arg.start.getTime()) / 60_000)) })
            }}
            dateClick={(arg: DateClickArg) => arg.allDay && setSelected(toISODate(arg.date))}
            eventClick={(arg: EventClickArg) => setOpenTaskId((arg.event.extendedProps.item as CalendarItem).taskId)}
            eventDrop={saveMove}
            eventResize={saveMove}
            eventContent={(arg: EventContentArg) => <EventBody arg={arg} />}
            dayCellClassNames={(arg) => (toISODate(arg.date) === selected ? ['lt-selected-day'] : [])}
            dayHeaderClassNames={(arg) => (isGrid && toISODate(arg.date) === selected ? ['lt-selected-day'] : [])}
            dayCellContent={(arg: DayCellContentArg) => <DayNumber arg={arg} count={counts.get(toISODate(arg.date)) ?? 0} />}
            dayHeaderContent={(arg: DayHeaderContentArg) => <DayHeader arg={arg} isGrid={isGrid} count={counts.get(toISODate(arg.date)) ?? 0} />}
          />
        </section>

        <div className="lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
          <DayChecklist day={selected} today={today} onOpenTask={setOpenTaskId} />
        </div>
      </div>

      <TimeBlockDialog draft={draft} onClose={() => setDraft(null)} />
      <TaskDetail taskId={openTaskId} today={today} onClose={() => setOpenTaskId(null)} />
    </>
  )
}

function EventBody({ arg }: { arg: EventContentArg }) {
  const item = arg.event.extendedProps.item as CalendarItem | undefined
  const isMonth = arg.view.type === 'dayGridMonth'
  if (!item) {
    // The preview block shown while you drag to create something new.
    return (
      <div className="lt-event-body" style={{ '--lt-color': 'var(--accent)' } as CSSProperties}>
        <span className="lt-event-time">{arg.timeText}</span>
      </div>
    )
  }
  return (
    <div className="lt-event-body" style={{ '--lt-color': item.color } as CSSProperties}>
      <span className="lt-event-title">
        {item.done && <Check className="mr-0.5 inline size-3" strokeWidth={3} />}
        {isMonth && <span className="lt-event-time">{arg.timeText} </span>}
        {item.title}
        {item.repeating && <Repeat className="ml-1 inline size-3 opacity-60" aria-label="repeats" />}
      </span>
      {!isMonth && <span className="lt-event-time">{arg.timeText}</span>}
    </div>
  )
}

function DayNumber({ arg, count }: { arg: DayCellContentArg; count: number }) {
  return (
    <span className="flex items-center gap-1">
      {count > 0 && (
        <span className="lt-open-count" title={`${count} open checklist item${count === 1 ? '' : 's'}`}>
          {count}
        </span>
      )}
      <span className={arg.isToday ? 'lt-today-number' : ''}>{arg.dayNumberText}</span>
    </span>
  )
}

function DayHeader({ arg, isGrid, count }: { arg: DayHeaderContentArg; isGrid: boolean; count: number }) {
  if (!isGrid) return <span>{arg.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
  return (
    <span className="flex flex-col items-center gap-0.5 py-0.5">
      <span className="text-[11px] tracking-wide uppercase">{arg.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      <span className={`text-base font-semibold tabular-nums ${arg.isToday ? 'lt-today-number' : 'text-ink'}`}>{arg.date.getDate()}</span>
      {count > 0 ? <span className="lt-open-count">{count} open</span> : <span className="h-4" />}
    </span>
  )
}
