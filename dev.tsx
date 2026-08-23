import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { KoreanCalendar } from "./src/index";
import type {
  CalendarEvent,
  CalendarSource,
  DropdownActionPayload,
} from "./src/types/calendar";
import "./src/styles/calendar.css";

const CALENDARS: CalendarSource[] = [
  { id: "personal", name: "개인", color: "#3182ce" },
  { id: "work", name: "업무", color: "#38a169" },
  { id: "fixed", name: "고정 지출", color: "#d69e2e" },
];

const EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    calendarId: "personal",
    title: "생일 파티",
    start: "2026-08-10",
    end: "2026-08-10",
    allDay: true,
  },
  {
    id: "e2",
    calendarId: "work",
    title: "스프린트 회고",
    start: "2026-08-20",
    end: "2026-08-20",
    allDay: true,
  },
  {
    id: "e3",
    calendarId: "fixed",
    title: "월세",
    start: "2026-08-01",
    end: "2026-08-01",
    allDay: true,
    recurrence: { freq: "MONTHLY", byMonthDay: 1 },
  },
  {
    id: "e4",
    calendarId: "work",
    title: "주간 미팅",
    start: "2026-08-04",
    end: "2026-08-04",
    allDay: true,
    recurrence: { freq: "WEEKLY", byDay: [1] }, // 매주 월요일
  },
];

function App() {
  function handleDropdown(p: DropdownActionPayload) {
    console.log("[dropdown]", p.action, p.date, p.event?.title);
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <h1
        style={{
          fontFamily: "system-ui",
          marginBottom: 16,
          fontSize: "1.1rem",
          color: "#2d3748",
        }}
      >
        calendar-mercury-lab — dev preview
      </h1>
      <KoreanCalendar
        view="month"
        events={EVENTS}
        calendars={CALENDARS}
        onDropdownAction={handleDropdown}
        onEventClick={(ev) => console.log("[event click]", ev.title)}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
