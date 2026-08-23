import type { CalendarEvent, RecurrenceRule } from "../types/calendar";

// ─── Formatting ──────────────────────────────────────────────────────────────

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  if (dateStr.includes("T")) {
    // Full ISO datetime — read back in local time so KST date is preserved
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // Plain YYYY-MM-DD — local-time constructor avoids UTC midnight → prev-day shift
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Range Helpers ───────────────────────────────────────────────────────────

export function startOfWeek(date: Date, weekStartsOn = 0): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date, weekStartsOn = 0): Date {
  const start = startOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

/** Returns every Date in the calendar grid for a given month view (fills partial first/last weeks). */
export function getMonthGrid(
  year: number,
  month: number,
  weekStartsOn = 0,
): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = startOfWeek(first, weekStartsOn);
  const gridEnd = endOfWeek(last, weekStartsOn);

  const days: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Returns all 7 days of the week containing `date`. */
export function getWeekDays(date: Date, weekStartsOn = 0): Date[] {
  const start = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// ─── Recurrence Engine ───────────────────────────────────────────────────────

/**
 * Expands a recurring event into concrete instances within [rangeStart, rangeEnd].
 * Uses a lightweight, zero-dependency algorithm (no Moment / rrule.js).
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEvent[] {
  const { recurrence, exceptionDates = [] } = event;
  if (!recurrence) return [];

  const exceptions = new Set(exceptionDates);
  const instances: CalendarEvent[] = [];
  const { freq, interval = 1, until, count, byDay, byMonthDay } = recurrence;

  const eventStart = parseDate(event.start);
  const untilDate = until ? parseDate(until) : null;

  let cursor = new Date(eventStart);
  let generated = 0;
  const maxIterations = 3650; // safety cap

  for (let i = 0; i < maxIterations; i++) {
    if (untilDate && cursor > untilDate) break;
    if (count !== undefined && generated >= count) break;
    if (cursor > rangeEnd) break;

    const dateStr = toDateString(cursor);
    const matchesByDay = !byDay || byDay.includes(cursor.getDay());
    const matchesByMonthDay = !byMonthDay || cursor.getDate() === byMonthDay;

    if (
      cursor >= rangeStart &&
      !exceptions.has(dateStr) &&
      matchesByDay &&
      matchesByMonthDay
    ) {
      instances.push({
        ...event,
        id: `${event.id}_${dateStr}`,
        start: dateStr,
        end: dateStr,
        recurrence: undefined, // virtual instance — no further expansion
      });
      generated++;
    }

    cursor = advanceCursor(cursor, freq, interval);
  }

  return instances;
}

function advanceCursor(
  date: Date,
  freq: RecurrenceRule["freq"],
  interval: number,
): Date {
  const next = new Date(date);
  switch (freq) {
    case "DAILY":
      next.setDate(next.getDate() + interval);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + interval);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + interval);
      break;
  }
  return next;
}

/**
 * Returns all events (including expanded recurring instances) that fall on `dateStr`.
 */
export function getEventsForDate(
  events: CalendarEvent[],
  dateStr: string,
  visibleCalendarIds?: Set<string>,
): CalendarEvent[] {
  const target = parseDate(dateStr);
  const rangeEnd = new Date(target);
  rangeEnd.setHours(23, 59, 59, 999);

  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (visibleCalendarIds && !visibleCalendarIds.has(event.calendarId))
      continue;

    if (event.recurrence) {
      const instances = expandRecurringEvent(event, target, rangeEnd);
      result.push(...instances);
    } else if (event.start.slice(0, 10) === dateStr) {
      result.push(event);
    }
  }

  return result;
}
