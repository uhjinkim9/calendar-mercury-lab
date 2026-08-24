"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CalendarEvent,
  CalendarSource,
  CalendarView,
  CellClickPayload,
  DropdownActionPayload,
  Holiday,
  KoreanCalendarProps,
} from "../types/calendar";
import {
  getEventsForDate,
  getMonthGrid,
  getWeekDays,
  isSameDay,
  parseDate,
  toDateString,
} from "../utils/dateUtils";
import { formatLunarCell, toLunarDate } from "../utils/lunarUtils";
import "../styles/calendar.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_NAMES = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_H = 48; // must match .kc-week-grid__time-slot height in CSS

function isAllDay(ev: CalendarEvent): boolean {
  return !!(ev.allDay || !ev.start.includes("T"));
}

function getEventMinutes(
  ev: CalendarEvent,
  dateStr: string,
): { startMin: number; endMin: number } | null {
  if (isAllDay(ev)) return null;
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const startMin =
    toDateString(s) === dateStr ? s.getHours() * 60 + s.getMinutes() : 0;
  const endMin =
    toDateString(e) === dateStr ? e.getHours() * 60 + e.getMinutes() : 24 * 60;
  return { startMin, endMin: Math.max(endMin, startMin + 30) };
}

interface TimedEventLayout {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  col: number;
  cols: number;
}

function layoutTimedEvents(
  timedEvents: CalendarEvent[],
  dateStr: string,
): TimedEventLayout[] {
  const items: TimedEventLayout[] = timedEvents
    .map((ev) => {
      const mins = getEventMinutes(ev, dateStr);
      return mins ? { event: ev, ...mins, col: 0, cols: 1 } : null;
    })
    .filter((x): x is TimedEventLayout => x !== null);

  items.sort((a, b) => a.startMin - b.startMin);

  const colEnds: number[] = [];
  for (const item of items) {
    let placed = false;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= item.startMin) {
        item.col = c;
        colEnds[c] = item.endMin;
        placed = true;
        break;
      }
    }
    if (!placed) {
      item.col = colEnds.length;
      colEnds.push(item.endMin);
    }
  }

  for (const item of items) {
    let maxCol = item.col;
    for (const other of items) {
      if (
        other !== item &&
        other.startMin < item.endMin &&
        other.endMin > item.startMin
      ) {
        maxCol = Math.max(maxCol, other.col);
      }
    }
    item.cols = maxCol + 1;
  }

  return items;
}

// ─── Holiday fetcher (공공데이터포털 기반 stub) ────────────────────────────────

async function defaultFetchHolidays(
  year: number,
  _month: number,
  apiKey: string,
  country = "KR",
): Promise<Holiday[]> {
  // Replace with a real endpoint (e.g., data.go.kr) when an API key is provided.
  if (!apiKey || country !== "KR") return [];
  const url =
    `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo` +
    `?solYear=${year}&numOfRows=50&ServiceKey=${encodeURIComponent(apiKey)}&_type=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    // API returns a plain object (not array) when exactly one holiday exists
    const raw = json?.response?.body?.items?.item;
    const items: Array<{ locdate: number; dateName: string }> = Array.isArray(
      raw,
    )
      ? raw
      : raw != null
        ? [raw]
        : [];
    return items.map((item) => ({
      date: String(item.locdate).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      name: item.dateName,
    }));
  } catch {
    return [];
  }
}

// ─── Event List Popover ──────────────────────────────────────────────────────

interface EventListPopoverState {
  date: string;
  events: CalendarEvent[];
  clientX: number;
  clientY: number;
}

interface EventListPopoverProps extends EventListPopoverState {
  calendarColorMap: Map<string, string>;
  onEventClick: (event: CalendarEvent) => void;
  onClose: () => void;
}

function EventListPopover({
  date,
  events,
  clientX,
  clientY,
  calendarColorMap,
  onEventClick,
  onClose,
}: EventListPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    top: clientY + 8,
    left: Math.min(clientX + 8, window.innerWidth - 220),
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="kc-popover kc-event-list-popover"
      style={style}
      role="dialog"
    >
      <div className="kc-event-list-popover__header">{date}</div>
      {events.map((ev) => (
        <button
          key={ev.id}
          className="kc-popover__item"
          onClick={() => {
            onEventClick(ev);
            onClose();
          }}
        >
          <span
            className="kc-event-list-popover__dot"
            style={{
              background:
                ev.color ?? calendarColorMap.get(ev.calendarId) ?? "#3182ce",
            }}
          />
          {ev.title}
        </button>
      ))}
    </div>
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────

interface PopoverProps {
  payload: CellClickPayload;
  onAction: (p: DropdownActionPayload) => void;
  onClose: () => void;
  renderDropdown?: KoreanCalendarProps["renderDropdown"];
}

function Popover({ payload, onAction, onClose, renderDropdown }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { clientX, clientY, date, events } = payload;

  // position:fixed → viewport 기준이므로 scroll offset 불필요
  const style: React.CSSProperties = {
    top: clientY + 8,
    left: Math.min(clientX + 8, window.innerWidth - 180),
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  if (renderDropdown) {
    return (
      <div ref={ref} className="kc-popover" style={style} role="menu">
        {renderDropdown(payload, onClose)}
      </div>
    );
  }

  return (
    <div ref={ref} className="kc-popover" style={style} role="menu">
      <button
        className="kc-popover__item"
        onClick={() => {
          onAction({ action: "create", date });
          onClose();
        }}
        role="menuitem"
      >
        ＋ 새 일정 등록
      </button>
      {events.length > 0 && (
        <>
          <div className="kc-popover__divider" />
          {events.map((ev) => (
            <React.Fragment key={ev.id}>
              <button
                className="kc-popover__item"
                onClick={() => {
                  onAction({ action: "edit", date, event: ev });
                  onClose();
                }}
                role="menuitem"
              >
                ✎ {ev.title} 수정
              </button>
              <button
                className="kc-popover__item kc-popover__item--danger"
                onClick={() => {
                  onAction({ action: "delete", date, event: ev });
                  onClose();
                }}
                role="menuitem"
              >
                ✕ {ev.title} 삭제
              </button>
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  year: number;
  month: number;
  today: string;
  events: CalendarEvent[];
  holidays: Map<string, Holiday>;
  visibleCalendarIds: Set<string>;
  calendarColorMap: Map<string, string>;
  onCellClick: (
    date: string,
    rect: DOMRect,
    clientX: number,
    clientY: number,
  ) => void;
  onEventClick: (event: CalendarEvent) => void;
  onMoreClick: (
    date: string,
    events: CalendarEvent[],
    clientX: number,
    clientY: number,
  ) => void;
  showLunar?: boolean;
}

function MonthView({
  year,
  month,
  today,
  events,
  holidays,
  visibleCalendarIds,
  calendarColorMap,
  onCellClick,
  onEventClick,
  onMoreClick,
  showLunar,
}: MonthViewProps) {
  const grid = useMemo(() => getMonthGrid(year, month, 0), [year, month]);

  return (
    <>
      <div className="kc-weekdays">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`kc-weekdays__cell${i === 0 ? " kc-weekdays__cell--sun" : i === 6 ? " kc-weekdays__cell--sat" : ""}`}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="kc-month-grid">
        {grid.map((date) => {
          const dateStr = toDateString(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateStr === today;
          const dow = date.getDay();
          const holiday = holidays.get(dateStr);
          const dayEvents = getEventsForDate(
            events,
            dateStr,
            visibleCalendarIds,
          );
          const MAX_VISIBLE = 3;

          let cellClass = "kc-day-cell";
          if (!isCurrentMonth) cellClass += " kc-day-cell--outside";
          if (isToday) cellClass += " kc-day-cell--today";
          if (dow === 0) cellClass += " kc-day-cell--sunday";
          if (dow === 6) cellClass += " kc-day-cell--saturday";

          return (
            <div
              key={dateStr}
              className={cellClass}
              onClick={(e) =>
                onCellClick(
                  dateStr,
                  (e.currentTarget as HTMLElement).getBoundingClientRect(),
                  e.clientX,
                  e.clientY,
                )
              }
              role="button"
              tabIndex={0}
              aria-label={dateStr}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                onCellClick(
                  dateStr,
                  (e.currentTarget as HTMLElement).getBoundingClientRect(),
                  0,
                  0,
                )
              }
            >
              <div className="kc-day-cell__number">{date.getDate()}</div>
              {showLunar &&
                (() => {
                  const lunar = toLunarDate(
                    date.getFullYear(),
                    date.getMonth() + 1,
                    date.getDate(),
                  );
                  return lunar ? (
                    <div
                      className={`kc-day-cell__lunar${lunar.day === 1 ? " kc-day-cell__lunar--new" : ""}`}
                    >
                      {formatLunarCell(lunar)}
                    </div>
                  ) : null;
                })()}
              {holiday && (
                <div className="kc-day-cell__holiday" title={holiday.name}>
                  {holiday.name}
                </div>
              )}
              {dayEvents.slice(0, MAX_VISIBLE).map((ev) => (
                <span
                  key={ev.id}
                  className="kc-event-chip"
                  style={{
                    background:
                      ev.color ??
                      calendarColorMap.get(ev.calendarId) ??
                      "#3182ce",
                  }}
                  title={ev.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                >
                  {ev.title}
                </span>
              ))}
              {dayEvents.length > MAX_VISIBLE && (
                <span
                  className="kc-event-chip kc-event-chip--more"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoreClick(dateStr, dayEvents, e.clientX, e.clientY);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  +{dayEvents.length - MAX_VISIBLE}개 더보기
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  date: Date;
  today: string;
  events: CalendarEvent[];
  holidays: Map<string, Holiday>;
  visibleCalendarIds: Set<string>;
  calendarColorMap: Map<string, string>;
  onCellClick: (
    date: string,
    rect: DOMRect,
    clientX: number,
    clientY: number,
  ) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function WeekView({
  date,
  today,
  events,
  holidays,
  visibleCalendarIds,
  calendarColorMap,
  onCellClick,
  onEventClick,
}: WeekViewProps) {
  const days = useMemo(() => getWeekDays(date, 0), [date]);

  return (
    <div
      className="kc-week-grid"
      style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
    >
      {/* Corner */}
      <div className="kc-week-grid__time-col">
        <div
          className="kc-week-grid__day-header"
          style={{ borderBottom: "1px solid var(--kc-border)" }}
        />
        {HOURS.map((h) => (
          <div
            key={h}
            className="kc-week-grid__time-slot"
          >{`${String(h).padStart(2, "0")}:00`}</div>
        ))}
      </div>

      {days.map((day) => {
        const dateStr = toDateString(day);
        const dayEvents = getEventsForDate(events, dateStr, visibleCalendarIds);
        const holiday = holidays.get(dateStr);
        const isToday = dateStr === today;
        const allDayEvs = dayEvents.filter(isAllDay);
        const timedLayout = layoutTimedEvents(
          dayEvents.filter((ev) => !isAllDay(ev)),
          dateStr,
        );
        const nowMin = isToday
          ? new Date().getHours() * 60 + new Date().getMinutes()
          : -1;

        return (
          <div key={dateStr} className="kc-week-grid__day-col">
            <div
              className={`kc-week-grid__day-header${isToday ? " kc-day-cell--today" : ""}`}
              onClick={(e) =>
                onCellClick(
                  dateStr,
                  (e.currentTarget as HTMLElement).getBoundingClientRect(),
                  e.clientX,
                  e.clientY,
                )
              }
              style={{ cursor: "pointer" }}
            >
              <div style={{ fontWeight: isToday ? 700 : 400 }}>
                {DAY_LABELS[day.getDay()]} {day.getDate()}
              </div>
              {holiday && (
                <div className="kc-day-cell__holiday">{holiday.name}</div>
              )}
              {allDayEvs.map((ev) => (
                <span
                  key={ev.id}
                  className="kc-event-chip"
                  style={{
                    background:
                      ev.color ??
                      calendarColorMap.get(ev.calendarId) ??
                      "#3182ce",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                >
                  {ev.title}
                </span>
              ))}
            </div>
            <div className="kc-week-grid__slots">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="kc-week-grid__slot"
                  onClick={(e) =>
                    onCellClick(
                      dateStr,
                      (e.currentTarget as HTMLElement).getBoundingClientRect(),
                      e.clientX,
                      e.clientY,
                    )
                  }
                />
              ))}
              {nowMin >= 0 && (
                <div
                  className="kc-now-line"
                  style={{ top: (nowMin / 60) * SLOT_H }}
                />
              )}
              {timedLayout.map(({ event, startMin, endMin, col, cols }) => (
                <div
                  key={event.id}
                  className="kc-time-block"
                  style={{
                    top: (startMin / 60) * SLOT_H,
                    height: Math.max(((endMin - startMin) / 60) * SLOT_H, 20),
                    left: `calc(${(col / cols) * 100}% + 1px)`,
                    width: `calc(${(1 / cols) * 100}% - 2px)`,
                    background:
                      event.color ??
                      calendarColorMap.get(event.calendarId) ??
                      "#3182ce",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <span className="kc-time-block__title">{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

interface DayViewProps {
  date: Date;
  today: string;
  events: CalendarEvent[];
  holidays: Map<string, Holiday>;
  visibleCalendarIds: Set<string>;
  calendarColorMap: Map<string, string>;
  onCellClick: (
    date: string,
    rect: DOMRect,
    clientX: number,
    clientY: number,
  ) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function DayView({
  date,
  today,
  events,
  holidays,
  visibleCalendarIds,
  calendarColorMap,
  onCellClick,
  onEventClick,
}: DayViewProps) {
  const dateStr = toDateString(date);
  const dayEvents = getEventsForDate(events, dateStr, visibleCalendarIds);
  const holiday = holidays.get(dateStr);
  const isToday = dateStr === today;
  const allDayEvs = dayEvents.filter(isAllDay);
  const timedLayout = layoutTimedEvents(
    dayEvents.filter((ev) => !isAllDay(ev)),
    dateStr,
  );
  const nowMin = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  return (
    <div className="kc-day-view">
      <div className="kc-week-grid__time-col">
        <div className="kc-week-grid__day-header" />
        {HOURS.map((h) => (
          <div
            key={h}
            className="kc-week-grid__time-slot"
          >{`${String(h).padStart(2, "0")}:00`}</div>
        ))}
      </div>
      <div className="kc-week-grid__day-col" style={{ flex: 1 }}>
        <div
          className={`kc-week-grid__day-header${isToday ? " kc-day-cell--today" : ""}`}
        >
          {date.getFullYear()}년 {date.getMonth() + 1}월 {date.getDate()}일 (
          {DAY_LABELS[date.getDay()]})
          {holiday && (
            <span className="kc-day-cell__holiday"> — {holiday.name}</span>
          )}
          {allDayEvs.map((ev) => (
            <span
              key={ev.id}
              className="kc-event-chip"
              style={{
                background:
                  ev.color ?? calendarColorMap.get(ev.calendarId) ?? "#3182ce",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(ev);
              }}
            >
              {ev.title}
            </span>
          ))}
        </div>
        <div className="kc-week-grid__slots">
          {HOURS.map((h) => (
            <div
              key={h}
              className="kc-week-grid__slot"
              onClick={(e) =>
                onCellClick(
                  dateStr,
                  (e.currentTarget as HTMLElement).getBoundingClientRect(),
                  e.clientX,
                  e.clientY,
                )
              }
            />
          ))}
          {nowMin >= 0 && (
            <div
              className="kc-now-line"
              style={{ top: (nowMin / 60) * SLOT_H }}
            />
          )}
          {timedLayout.map(({ event, startMin, endMin, col, cols }) => (
            <div
              key={event.id}
              className="kc-time-block"
              style={{
                top: (startMin / 60) * SLOT_H,
                height: Math.max(((endMin - startMin) / 60) * SLOT_H, 20),
                left: `calc(${(col / cols) * 100}% + 1px)`,
                width: `calc(${(1 / cols) * 100}% - 2px)`,
                background:
                  event.color ??
                  calendarColorMap.get(event.calendarId) ??
                  "#3182ce",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick(event);
              }}
            >
              <span className="kc-time-block__title">{event.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Year View ────────────────────────────────────────────────────────────────

interface YearViewProps {
  year: number;
  today: string;
  events: CalendarEvent[];
  holidays: Map<string, Holiday>;
  visibleCalendarIds: Set<string>;
  onMonthClick: (month: number) => void;
}

function YearView({
  year,
  today,
  events,
  holidays,
  visibleCalendarIds,
  onMonthClick,
}: YearViewProps) {
  return (
    <div className="kc-year-grid">
      {Array.from({ length: 12 }, (_, m) => {
        const grid = getMonthGrid(year, m, 0);
        return (
          <div key={m} className="kc-mini-month">
            <div
              className="kc-mini-month__header"
              style={{ cursor: "pointer" }}
              onClick={() => onMonthClick(m)}
            >
              {MONTH_NAMES[m]}
            </div>
            <div className="kc-mini-month__grid">
              {DAY_LABELS.map((l) => (
                <div
                  key={l}
                  className="kc-mini-day"
                  style={{
                    fontWeight: 600,
                    color: "var(--kc-text-muted)",
                    cursor: "default",
                  }}
                >
                  {l}
                </div>
              ))}
              {grid.map((d) => {
                const ds = toDateString(d);
                const isCurrentMonth = d.getMonth() === m;
                const isToday = ds === today;
                const hasEvent =
                  getEventsForDate(events, ds, visibleCalendarIds).length > 0 ||
                  holidays.has(ds);
                let cls = "kc-mini-day";
                if (!isCurrentMonth) cls += " kc-mini-day--outside";
                if (isToday) cls += " kc-mini-day--today";
                if (hasEvent && isCurrentMonth && !isToday)
                  cls += " kc-mini-day--has-event";
                return (
                  <div key={ds} className={cls}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KoreanCalendar({
  view: viewProp = "month",
  currentDate: currentDateProp,
  events = [],
  calendars = [],
  holidayConfig,
  fetchHolidays,
  theme,
  onViewChange,
  onNavigate,
  onCellClick,
  onDropdownAction,
  onEventClick,
  renderDropdown,
  showLunar = false,
  className = "",
}: KoreanCalendarProps) {
  const today = toDateString(new Date());

  const [view, setView] = useState<CalendarView>(viewProp);
  const [currentDate, setCurrentDate] = useState<Date>(
    currentDateProp ? parseDate(currentDateProp) : new Date(),
  );
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [popover, setPopover] = useState<CellClickPayload | null>(null);
  const [eventListPopover, setEventListPopover] =
    useState<EventListPopoverState | null>(null);
  // Track which calendar sources are visible
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(
    new Set(),
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Sync controlled props
  useEffect(() => {
    setView(viewProp);
  }, [viewProp]);
  useEffect(() => {
    if (currentDateProp) setCurrentDate(parseDate(currentDateProp));
  }, [currentDateProp]);

  // Apply CSS variable theme overrides
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme).forEach(([k, v]) => {
      if (v) root.style.setProperty(k, v);
    });
  }, [theme]);

  // Fetch holidays whenever year changes
  useEffect(() => {
    async function load() {
      let fetched: Holiday[] = [];
      if (fetchHolidays) {
        fetched = await fetchHolidays(year, month + 1);
      } else if (holidayConfig?.apiKey) {
        fetched = await defaultFetchHolidays(
          year,
          month + 1,
          holidayConfig.apiKey,
          holidayConfig.country,
        );
      }
      const map = new Map<string, Holiday>();
      fetched.forEach((h) => map.set(h.date, h));
      setHolidays(map);
    }
    load();
  }, [year, month, fetchHolidays, holidayConfig]);

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((c) => map.set(c.id, c.color));
    return map;
  }, [calendars]);

  const visibleCalendarIds = useMemo(() => {
    const allIds = new Set(calendars.map((c) => c.id));
    // If no sources are registered, show everything
    if (allIds.size === 0) return undefined;
    return new Set([...allIds].filter((id) => !hiddenCalendars.has(id)));
  }, [calendars, hiddenCalendars]);

  function navigate(delta: number) {
    const next = new Date(currentDate);
    if (view === "day") next.setDate(next.getDate() + delta);
    else if (view === "week") next.setDate(next.getDate() + 7 * delta);
    else if (view === "month") next.setMonth(next.getMonth() + delta);
    else next.setFullYear(next.getFullYear() + delta);
    setCurrentDate(next);
    onNavigate?.(toDateString(next));
  }

  function changeView(v: CalendarView) {
    setView(v);
    onViewChange?.(v);
  }

  const handleCellClick = useCallback(
    (dateStr: string, rect: DOMRect, clientX: number, clientY: number) => {
      const dayEvents = getEventsForDate(events, dateStr, visibleCalendarIds);
      const payload: CellClickPayload = {
        date: dateStr,
        events: dayEvents,
        anchorRect: rect,
        clientX,
        clientY,
      };
      onCellClick?.(payload);
      setPopover(payload);
    },
    [events, visibleCalendarIds, onCellClick],
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      onEventClick?.(event);
    },
    [onEventClick],
  );

  function handleDropdownAction(p: DropdownActionPayload) {
    onDropdownAction?.(p);
  }

  function toggleCalendar(id: string) {
    setHiddenCalendars((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const titleLabel = useMemo(() => {
    if (view === "year") return `${year}년`;
    if (view === "month") return `${year}년 ${month + 1}월`;
    if (view === "week") {
      const days = getWeekDays(currentDate, 0);
      const first = days[0];
      const last = days[6];
      return `${first.getMonth() + 1}/${first.getDate()} – ${last.getMonth() + 1}/${last.getDate()}`;
    }
    return `${year}년 ${month + 1}월 ${currentDate.getDate()}일`;
  }, [view, year, month, currentDate]);

  return (
    <div className={`kc-root ${className}`} data-view={view}>
      {/* ── Toolbar ── */}
      <div className="kc-toolbar">
        <div className="kc-toolbar__nav">
          <button
            className="kc-toolbar__btn"
            onClick={() => navigate(-1)}
            aria-label="이전"
          >
            ‹
          </button>
          <span className="kc-toolbar__title">{titleLabel}</span>
          <button
            className="kc-toolbar__btn"
            onClick={() => navigate(1)}
            aria-label="다음"
          >
            ›
          </button>
        </div>
        <div className="kc-toolbar__actions">
          <button
            className="kc-toolbar__btn"
            onClick={() => {
              setCurrentDate(new Date());
              onNavigate?.(today);
            }}
          >
            오늘
          </button>
          <div className="kc-toolbar__views">
            {(["day", "week", "month", "year"] as CalendarView[]).map((v) => (
              <button
                key={v}
                className={`kc-toolbar__btn${view === v ? " kc-toolbar__btn--active" : ""}`}
                onClick={() => changeView(v)}
              >
                {v === "day"
                  ? "일"
                  : v === "week"
                    ? "주"
                    : v === "month"
                      ? "월"
                      : "연"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar source legend ── */}
      {calendars.length > 0 && (
        <div className="kc-legend">
          {calendars.map((cal) => (
            <div
              key={cal.id}
              className={`kc-legend__item${hiddenCalendars.has(cal.id) ? " kc-legend__item--hidden" : ""}`}
              onClick={() => toggleCalendar(cal.id)}
              role="checkbox"
              aria-checked={!hiddenCalendars.has(cal.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleCalendar(cal.id)}
            >
              <span
                className="kc-legend__dot"
                style={{ background: cal.color }}
              />
              {cal.name}
            </div>
          ))}
        </div>
      )}

      {/* ── Views ── */}
      {view === "month" && (
        <MonthView
          year={year}
          month={month}
          today={today}
          events={events}
          holidays={holidays}
          visibleCalendarIds={
            visibleCalendarIds ?? new Set(events.map((e) => e.calendarId))
          }
          calendarColorMap={calendarColorMap}
          onCellClick={handleCellClick}
          onEventClick={handleEventClick}
          onMoreClick={(date, evs, x, y) =>
            setEventListPopover({ date, events: evs, clientX: x, clientY: y })
          }
          showLunar={showLunar}
        />
      )}

      {view === "week" && (
        <WeekView
          date={currentDate}
          today={today}
          events={events}
          holidays={holidays}
          visibleCalendarIds={
            visibleCalendarIds ?? new Set(events.map((e) => e.calendarId))
          }
          calendarColorMap={calendarColorMap}
          onCellClick={handleCellClick}
          onEventClick={handleEventClick}
        />
      )}

      {view === "day" && (
        <DayView
          date={currentDate}
          today={today}
          events={events}
          holidays={holidays}
          visibleCalendarIds={
            visibleCalendarIds ?? new Set(events.map((e) => e.calendarId))
          }
          calendarColorMap={calendarColorMap}
          onCellClick={handleCellClick}
          onEventClick={handleEventClick}
        />
      )}

      {view === "year" && (
        <YearView
          year={year}
          today={today}
          events={events}
          holidays={holidays}
          visibleCalendarIds={
            visibleCalendarIds ?? new Set(events.map((e) => e.calendarId))
          }
          onMonthClick={(m) => {
            setCurrentDate(new Date(year, m, 1));
            changeView("month");
          }}
        />
      )}

      {/* ── Dropdown Popover ── */}
      {popover && (
        <Popover
          payload={popover}
          onAction={handleDropdownAction}
          onClose={() => setPopover(null)}
          renderDropdown={renderDropdown}
        />
      )}

      {/* ── Event List Popover ── */}
      {eventListPopover && (
        <EventListPopover
          {...eventListPopover}
          calendarColorMap={calendarColorMap}
          onEventClick={handleEventClick}
          onClose={() => setEventListPopover(null)}
        />
      )}
    </div>
  );
}
