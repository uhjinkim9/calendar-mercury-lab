# calendar-mercury-lab

Next.js & React 기반의 반응형 · 다중 캘린더 라이브러리입니다.  
번들 크기 **18KB 이하**를 목표로 가볍게 만들었습니다.

## 특징

- **4가지 뷰** — 일(Day) / 주(Week) / 월(Month) / 연(Year)
- **시간 블록 렌더링** — Day/Week 뷰에서 시간이 있는 이벤트를 타임슬롯에 절대 위치 블록으로 표시, 겹침 자동 분할
- **현재 시간 표시선** — 오늘 컬럼에 실시간 빨간 시간선 표시
- **반복 일정** — 매일 · 매주 · 매월 · 매년, `count` / `until` / `byDay` / `byMonthDay` 옵션 지원
- **음력 날짜** — `showLunar` prop으로 월간 뷰 셀에 음력 날짜 표시 (1일은 "N월" 강조)
- **+N개 더보기** — 월간 뷰 셀 초과 이벤트를 팝업 리스트로 확인
- **공휴일 연동** — 공공데이터포털 API 키 or 커스텀 `fetchHolidays` 함수 연결
- **다중 캘린더** — 캘린더 소스별 색상 지정 · 토글 필터링
- **셀 인터랙션** — 날짜 클릭 시 등록 / 수정 / 삭제 드롭다운, `renderDropdown`으로 100% 커스터마이징
- **CSS 변수 테마** — `--kc-primary` 등 CSS 변수 오버라이드만으로 스타일 변경
- **Next.js App Router 호환** — 컴포넌트 최상단에 `'use client'` 선언 포함
- **Zero heavy dependency** — Moment.js 없이 Native Date API만 사용

---

## 설치

```bash
npm install calendar-mercury-lab
```

### GitHub에서 직접 설치

```bash
npm install github:uhjinkim9/calendar-mercury-lab
```

### 로컬 개발 환경에서 연결

```bash
npm install ../calendar-mercury-lab
```

---

## 빠른 시작

```tsx
import { KoreanCalendar } from "calendar-mercury-lab";
import "calendar-mercury-lab/styles";

export default function Page() {
  return <KoreanCalendar view="month" />;
}
```

---

## Props

| Prop               | 타입                                   | 설명                                     |
| ------------------ | -------------------------------------- | ---------------------------------------- |
| `view`             | `'day' \| 'week' \| 'month' \| 'year'` | 초기 뷰 모드                             |
| `currentDate`      | `string` (ISO)                         | 표시할 날짜 (controlled)                 |
| `events`           | `CalendarEvent[]`                      | 일정 목록                                |
| `calendars`        | `CalendarSource[]`                     | 캘린더 소스 (색상·이름)                  |
| `holidayConfig`    | `{ apiKey: string; country?: string }` | 공공데이터 API 키                        |
| `fetchHolidays`    | `(year, month) => Promise<Holiday[]>`  | 커스텀 공휴일 로더                       |
| `theme`            | `CalendarTheme`                        | CSS 변수 오버라이드 객체                 |
| `showLunar`        | `boolean`                              | 월간 뷰 셀에 음력 날짜 표시 (기본 false) |
| `onCellClick`      | `(payload) => void`                    | 날짜 셀 클릭 콜백                        |
| `onDropdownAction` | `(payload) => void`                    | 드롭다운 액션 콜백                       |
| `onEventClick`     | `(event) => void`                      | 이벤트 칩 클릭 콜백                      |
| `renderDropdown`   | `(payload, close) => ReactNode`        | 드롭다운 커스텀 렌더                     |

---

## 사용 예시

### 기본 월간 캘린더

```tsx
<KoreanCalendar view="month" />
```

### 다중 캘린더 + 이벤트

```tsx
const CALENDARS = [
  { id: "personal", name: "개인", color: "#3182ce" },
  { id: "work", name: "업무", color: "#38a169" },
];

const EVENTS = [
  {
    id: "e1",
    calendarId: "personal",
    title: "생일 파티",
    start: "2026-08-10",
    end: "2026-08-10",
    allDay: true,
  },
];

<KoreanCalendar calendars={CALENDARS} events={EVENTS} />;
```

### 시간 블록 이벤트 (Day/Week 뷰)

`start` / `end`에 ISO 8601 시간 포함 시 타임슬롯에 블록으로 자동 렌더링됩니다.

```tsx
const EVENTS = [
  {
    id: "e1",
    calendarId: "work",
    title: "팀 스탠드업",
    start: "2026-08-24T09:00:00",
    end: "2026-08-24T09:30:00",
  },
  {
    id: "e2",
    calendarId: "personal",
    title: "점심 약속",
    start: "2026-08-24T12:00:00",
    end: "2026-08-24T13:30:00",
  },
];

<KoreanCalendar view="week" events={EVENTS} />;
```

> 같은 시간대에 이벤트가 겹치면 너비를 자동으로 나눠 나란히 표시합니다.

### 음력 날짜 표시

```tsx
<KoreanCalendar view="month" showLunar />
```

- 음력 1일: **"N월"** (파란색 굵게)
- 나머지 날: 음력 날짜 숫자 (회색)

### 반복 일정

```tsx
// 매월 1일
{ recurrence: { freq: 'MONTHLY', byMonthDay: 1 } }

// 매주 월요일
{ recurrence: { freq: 'WEEKLY', byDay: [1] } }

// 10회 반복 후 종료
{ recurrence: { freq: 'DAILY', count: 10 } }

// 특정 날짜까지 반복
{ recurrence: { freq: 'YEARLY', until: '2030-12-31' } }
```

### 공휴일 연동

```tsx
// 공공데이터포털 API 키 사용
<KoreanCalendar holidayConfig={{ apiKey: 'YOUR_API_KEY' }} />

// 커스텀 함수로 직접 제공
<KoreanCalendar
  fetchHolidays={async (year, month) => [
    { date: `${year}-01-01`, name: '신정' },
  ]}
/>
```

### CSS 변수 테마 커스터마이징

```tsx
<KoreanCalendar
  theme={{
    "--kc-primary": "#e53e3e",
    "--kc-today-bg": "#fff5f5",
    "--kc-holiday": "#c53030",
  }}
/>
```

또는 CSS 파일에서 직접 오버라이드:

```css
.my-calendar {
  --kc-primary: #805ad5;
  --kc-bg: #1a202c;
  --kc-text: #f7fafc;
  --kc-border: #2d3748;
  --kc-surface: #2d3748;
}
```

### 드롭다운 커스터마이징

```tsx
<KoreanCalendar
  renderDropdown={(payload, close) => (
    <div>
      <button
        onClick={() => {
          openModal(payload.date);
          close();
        }}
      >
        + 새 일정
      </button>
    </div>
  )}
/>
```

---

## 지원 CSS 변수

| 변수                 | 기본값    | 설명                |
| -------------------- | --------- | ------------------- |
| `--kc-bg`            | `#ffffff` | 배경색              |
| `--kc-surface`       | `#f8f9fa` | 툴바·헤더 배경      |
| `--kc-border`        | `#e2e8f0` | 테두리 색           |
| `--kc-text`          | `#1a202c` | 기본 텍스트         |
| `--kc-text-muted`    | `#718096` | 보조 텍스트         |
| `--kc-primary`       | `#3182ce` | 주 색상 (오늘·버튼) |
| `--kc-primary-light` | `#ebf4ff` | 주 색상 연하게      |
| `--kc-holiday`       | `#e53e3e` | 공휴일·일요일 색    |
| `--kc-today-bg`      | `#ebf8ff` | 오늘 셀 배경        |
| `--kc-weekend`       | `#fc8181` | 토요일 색           |

---

## 타입 정의

```ts
interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string; // 'YYYY-MM-DD' 또는 ISO 8601 datetime
  end: string;
  allDay?: boolean;
  color?: string;
  recurrence?: RecurrenceRule;
  exceptionDates?: string[]; // 반복 제외 날짜
}

interface RecurrenceRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  until?: string; // 'YYYY-MM-DD'
  count?: number;
  byDay?: number[]; // 0=일, 1=월, ..., 6=토
  byMonthDay?: number; // 1~31
}

interface CalendarSource {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
}
```

---

## 프로젝트 구조

```
calendar-mercury-lab/
├── src/
│   ├── index.ts                   # 공개 API 진입점
│   ├── types/
│   │   └── calendar.ts            # 전체 타입 정의
│   ├── components/
│   │   └── KoreanCalendar.tsx     # 메인 컴포넌트 (Day/Week/Month/Year 뷰 포함)
│   ├── utils/
│   │   ├── dateUtils.ts           # 반복 일정 엔진 + 날짜 그리드 유틸
│   │   └── lunarUtils.ts          # 음력 변환 (Meeus 천문 알고리즘)
│   └── styles/
│       └── calendar.css           # CSS 변수 + 반응형 그리드
├── dist/                          # 빌드 결과물 (배포용)
├── dev.tsx                        # 로컬 개발 미리보기 진입점
├── index.html                     # Vite dev 서버용 HTML
├── vite.config.ts                 # 개발 서버 설정
├── tsup.config.ts                 # 라이브러리 빌드 설정
└── package.json
```

---

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# Vite 개발 서버 실행 → http://localhost:5173
npm run dev

# 라이브러리 빌드 (dist/ 생성)
npm run build
```

---

## 로드맵

- [x] Day/Week 뷰 시간 블록 렌더링
- [x] 음력 날짜 표시 (`showLunar`)
- [x] +N개 더보기 팝업
- [ ] Drag & Drop 일정 이동
- [ ] 대체공휴일 자동 계산

---

## 라이선스

MIT © uhjinkim9

## 특징

- **4가지 뷰** — 일(Day) / 주(Week) / 월(Month) / 연(Year)
- **반복 일정** — 매일 · 매주 · 매월 · 매년, `count` / `until` / `byDay` / `byMonthDay` 옵션 지원
- **공휴일 연동** — 공공데이터포털 API 키 or 커스텀 `fetchHolidays` 함수 연결
- **다중 캘린더** — 캘린더 소스별 색상 지정 · 토글 필터링
- **셀 인터랙션** — 날짜 클릭 시 등록 / 수정 / 삭제 드롭다운, `renderDropdown`으로 100% 커스터마이징
- **CSS 변수 테마** — `--kc-primary` 등 CSS 변수 오버라이드만으로 스타일 변경
- **Next.js App Router 호환** — 컴포넌트 최상단에 `'use client'` 선언 포함
- **Zero heavy dependency** — Moment.js 없이 Native Date API만 사용

---

## 설치

```bash
npm install calendar-mercury-lab
```

### GitHub에서 직접 설치

```bash
npm install github:uhjinkim9/calendar-mercury-lab
```

### 로컬 개발 환경에서 연결

```bash
npm install ../calendar-mercury-lab
```

---

## 빠른 시작

```tsx
import { KoreanCalendar } from "calendar-mercury-lab";
import "calendar-mercury-lab/styles";

export default function Page() {
  return <KoreanCalendar view="month" />;
}
```

---

## Props

| Prop               | 타입                                   | 설명                     |
| ------------------ | -------------------------------------- | ------------------------ |
| `view`             | `'day' \| 'week' \| 'month' \| 'year'` | 초기 뷰 모드             |
| `currentDate`      | `string` (ISO)                         | 표시할 날짜 (controlled) |
| `events`           | `CalendarEvent[]`                      | 일정 목록                |
| `calendars`        | `CalendarSource[]`                     | 캘린더 소스 (색상·이름)  |
| `holidayConfig`    | `{ apiKey: string; country?: string }` | 공공데이터 API 키        |
| `fetchHolidays`    | `(year, month) => Promise<Holiday[]>`  | 커스텀 공휴일 로더       |
| `theme`            | `CalendarTheme`                        | CSS 변수 오버라이드 객체 |
| `onCellClick`      | `(payload) => void`                    | 날짜 셀 클릭 콜백        |
| `onDropdownAction` | `(payload) => void`                    | 드롭다운 액션 콜백       |
| `onEventClick`     | `(event) => void`                      | 이벤트 칩 클릭 콜백      |
| `renderDropdown`   | `(payload, close) => ReactNode`        | 드롭다운 커스텀 렌더     |

---

## 사용 예시

### 기본 월간 캘린더

```tsx
<KoreanCalendar view="month" />
```

### 다중 캘린더 + 이벤트

```tsx
const CALENDARS = [
  { id: "personal", name: "개인", color: "#3182ce" },
  { id: "work", name: "업무", color: "#38a169" },
];

const EVENTS = [
  {
    id: "e1",
    calendarId: "personal",
    title: "생일 파티",
    start: "2026-08-10",
    end: "2026-08-10",
    allDay: true,
  },
];

<KoreanCalendar calendars={CALENDARS} events={EVENTS} />;
```

### 반복 일정

```tsx
// 매월 1일
{ recurrence: { freq: 'MONTHLY', byMonthDay: 1 } }

// 매주 월요일
{ recurrence: { freq: 'WEEKLY', byDay: [1] } }

// 10회 반복 후 종료
{ recurrence: { freq: 'DAILY', count: 10 } }

// 특정 날짜까지 반복
{ recurrence: { freq: 'YEARLY', until: '2030-12-31' } }
```

### 공휴일 연동

```tsx
// 공공데이터포털 API 키 사용
<KoreanCalendar holidayConfig={{ apiKey: 'YOUR_API_KEY' }} />

// 커스텀 함수로 직접 제공
<KoreanCalendar
  fetchHolidays={async (year, month) => [
    { date: `${year}-01-01`, name: '신정' },
  ]}
/>
```

### CSS 변수 테마 커스터마이징

```tsx
<KoreanCalendar
  theme={{
    "--kc-primary": "#e53e3e",
    "--kc-today-bg": "#fff5f5",
    "--kc-holiday": "#c53030",
  }}
/>
```

또는 CSS 파일에서 직접 오버라이드:

```css
.my-calendar {
  --kc-primary: #805ad5;
  --kc-bg: #1a202c;
  --kc-text: #f7fafc;
  --kc-border: #2d3748;
  --kc-surface: #2d3748;
}
```

### 드롭다운 커스터마이징

```tsx
<KoreanCalendar
  renderDropdown={(payload, close) => (
    <div>
      <button
        onClick={() => {
          openModal(payload.date);
          close();
        }}
      >
        + 새 일정
      </button>
    </div>
  )}
/>
```

---

## 지원 CSS 변수

| 변수                 | 기본값    | 설명                |
| -------------------- | --------- | ------------------- |
| `--kc-bg`            | `#ffffff` | 배경색              |
| `--kc-surface`       | `#f8f9fa` | 툴바·헤더 배경      |
| `--kc-border`        | `#e2e8f0` | 테두리 색           |
| `--kc-text`          | `#1a202c` | 기본 텍스트         |
| `--kc-text-muted`    | `#718096` | 보조 텍스트         |
| `--kc-primary`       | `#3182ce` | 주 색상 (오늘·버튼) |
| `--kc-primary-light` | `#ebf4ff` | 주 색상 연하게      |
| `--kc-holiday`       | `#e53e3e` | 공휴일·일요일 색    |
| `--kc-today-bg`      | `#ebf8ff` | 오늘 셀 배경        |
| `--kc-weekend`       | `#fc8181` | 토요일 색           |

---

## 타입 정의

```ts
interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string; // 'YYYY-MM-DD' or ISO 8601
  end: string;
  allDay?: boolean;
  color?: string;
  recurrence?: RecurrenceRule;
  exceptionDates?: string[]; // 반복 제외 날짜
}

interface RecurrenceRule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  until?: string; // 'YYYY-MM-DD'
  count?: number;
  byDay?: number[]; // 0=일, 1=월, ..., 6=토
  byMonthDay?: number; // 1~31
}

interface CalendarSource {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
}
```

---

## 프로젝트 구조

```
calendar-mercury-lab/
├── src/
│   ├── index.ts                   # 공개 API 진입점
│   ├── types/
│   │   └── calendar.ts            # 전체 타입 정의
│   ├── components/
│   │   └── KoreanCalendar.tsx     # 메인 컴포넌트 (Day/Week/Month/Year 뷰 포함)
│   ├── utils/
│   │   └── dateUtils.ts           # 반복 일정 엔진 + 날짜 그리드 유틸
│   └── styles/
│       └── calendar.css           # CSS 변수 + 반응형 그리드
├── dist/                          # 빌드 결과물 (배포용)
├── dev.tsx                        # 로컬 개발 미리보기 진입점
├── index.html                     # Vite dev 서버용 HTML
├── vite.config.ts                 # 개발 서버 설정
├── tsup.config.ts                 # 라이브러리 빌드 설정
└── package.json
```

---

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# Vite 개발 서버 실행 → http://localhost:5173
npm run dev

# 라이브러리 빌드 (dist/ 생성)
npm run build
```

---

## 로드맵

- [ ] Drag & Drop 일정 이동
- [ ] 일정 시간(Time) 렌더링 (Week/Day 뷰 타임슬롯)
- [ ] 음력 날짜 표시
- [ ] 대체공휴일 자동 계산
- [ ] npm 공식 배포

---

## 라이선스

MIT © uhjinkim9
