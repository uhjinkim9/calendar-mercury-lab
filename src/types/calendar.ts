// ─── View ────────────────────────────────────────────────────────────────────

export type CalendarView = "day" | "week" | "month" | "year";

// ─── Recurrence ──────────────────────────────────────────────────────────────

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  /** ISO date string — stop generating instances after this date */
  until?: string;
  /** Max number of instances to generate */
  count?: number;
  interval?: number;
  /** 0=Sun, 1=Mon, …, 6=Sat — used with WEEKLY freq */
  byDay?: number[];
  /** Day of month — used with MONTHLY freq */
  byMonthDay?: number;
}

// ─── Holiday ─────────────────────────────────────────────────────────────────

export interface Holiday {
  date: string; // 'YYYY-MM-DD'
  name: string;
  isSubstitute?: boolean; // 대체공휴일
}

export interface HolidayConfig {
  apiKey: string;
  country?: string; // default: 'KR'
}

// ─── Calendar & Events ───────────────────────────────────────────────────────

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  /** When false the calendar events are hidden */
  visible?: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  /** 'YYYY-MM-DD' or ISO 8601 datetime */
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  recurrence?: RecurrenceRule;
  /** Dates (YYYY-MM-DD) where this recurring master is overridden or deleted */
  exceptionDates?: string[];
}

// ─── Cell Interaction ────────────────────────────────────────────────────────

export interface CellClickPayload {
  date: string; // 'YYYY-MM-DD'
  events: CalendarEvent[];
  anchorRect: DOMRect;
  clientX: number;
  clientY: number;
}

export type DropdownAction = "create" | "edit" | "delete";

export interface DropdownActionPayload {
  action: DropdownAction;
  date: string;
  event?: CalendarEvent;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface CalendarTheme {
  "--kc-bg"?: string;
  "--kc-surface"?: string;
  "--kc-border"?: string;
  "--kc-text"?: string;
  "--kc-text-muted"?: string;
  "--kc-primary"?: string;
  "--kc-primary-light"?: string;
  "--kc-holiday"?: string;
  "--kc-today-bg"?: string;
  "--kc-weekend"?: string;
  [variable: string]: string | undefined;
}

// ─── Main Props ──────────────────────────────────────────────────────────────

export interface KoreanCalendarProps {
  /** Initial view mode */
  view?: CalendarView;
  /** Controlled current date (ISO string) */
  currentDate?: string;
  events?: CalendarEvent[];
  calendars?: CalendarSource[];

  /** Provide an API key for automatic public holiday fetching */
  holidayConfig?: HolidayConfig;
  /** Override: supply holidays manually or via custom async function */
  fetchHolidays?: (year: number, month: number) => Promise<Holiday[]>;

  /** CSS variable overrides */
  theme?: CalendarTheme;

  // Callbacks
  onViewChange?: (view: CalendarView) => void;
  onNavigate?: (date: string) => void;
  onCellClick?: (payload: CellClickPayload) => void;
  onDropdownAction?: (payload: DropdownActionPayload) => void;
  onEventClick?: (event: CalendarEvent) => void;

  /** Render prop for custom dropdown content */
  renderDropdown?: (
    payload: CellClickPayload,
    close: () => void,
  ) => React.ReactNode;

  /** Show Korean lunar date in month-view cells */
  showLunar?: boolean;

  className?: string;
}
