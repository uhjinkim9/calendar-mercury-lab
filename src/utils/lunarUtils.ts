// Korean Lunisolar Calendar (음력) converter
// New moon dates: Jean Meeus astronomical algorithm (Chapter 47)
// Leap month data: KASI (한국천문연구원)

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

// Leap month table: lunar year (= solar year of 설날) → month after which leap follows
const LEAP_MONTHS: Record<number, number> = {
  2001: 4,
  2004: 2,
  2006: 7,
  2009: 5,
  2012: 3,
  2014: 9,
  2017: 5,
  2020: 4,
  2023: 2,
  2025: 6,
  2028: 5,
  2031: 3,
  2033: 11,
  2036: 6,
  2039: 5,
};

// Solar date of 설날 (음력 1월 1일) per solar year, sourced from KASI
const LUNAR_NEW_YEAR: Record<number, [number, number]> = {
  1985: [2, 20],
  1986: [2, 9],
  1987: [1, 29],
  1988: [2, 17],
  1989: [2, 6],
  1990: [1, 27],
  1991: [2, 15],
  1992: [2, 4],
  1993: [1, 23],
  1994: [2, 10],
  1995: [1, 31],
  1996: [2, 19],
  1997: [2, 7],
  1998: [1, 28],
  1999: [2, 16],
  2000: [2, 5],
  2001: [1, 24],
  2002: [2, 12],
  2003: [2, 1],
  2004: [1, 22],
  2005: [2, 9],
  2006: [1, 29],
  2007: [2, 18],
  2008: [2, 7],
  2009: [1, 26],
  2010: [2, 14],
  2011: [2, 3],
  2012: [1, 23],
  2013: [2, 10],
  2014: [1, 31],
  2015: [2, 19],
  2016: [2, 8],
  2017: [1, 28],
  2018: [2, 16],
  2019: [2, 5],
  2020: [1, 25],
  2021: [2, 12],
  2022: [2, 1],
  2023: [1, 22],
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
  2036: [1, 28],
  2037: [2, 15],
  2038: [2, 4],
  2039: [1, 24],
  2040: [2, 12],
};

/** Julian Day Number (noon UT) for a given solar date */
function solarToJDE(year: number, month: number, day: number): number {
  let y = year,
    m = month;
  if (m <= 2) {
    y--;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
}

/** JDE of the k-th new moon (k=0 → Jan 6.4, 2000 UTC) using Meeus Ch.47 */
function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const r = Math.PI / 180;

  let JDE = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2;

  const M = ((2.5534 + 29.1053567 * k) % 360) * r;
  const ML = ((201.5643 + 385.81693528 * k) % 360) * r;
  const F = ((160.7108 + 390.67050284 * k) % 360) * r;

  JDE +=
    -0.4072 * Math.sin(ML) +
    0.17241 * Math.sin(M) +
    0.01608 * Math.sin(2 * ML) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * Math.sin(ML - M) -
    0.00514 * Math.sin(ML + M) +
    0.00208 * Math.sin(2 * M);

  return JDE;
}

/** Convert JDE to KST calendar date [year, month(1-12), day(1-31)] */
function jdeToKST(jde: number): [number, number, number] {
  const ms = (jde - 2440587.5) * 86400000 + 9 * 3600 * 1000;
  const d = new Date(ms);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

/** Convert solar date to its equivalent JDE (for integer-day arithmetic) */
function toJDENoon(year: number, month: number, day: number): number {
  return solarToJDE(year, month, day);
}

/**
 * Convert a solar date to a Korean lunar date.
 * Returns null if the year is outside the supported range (1985–2040).
 */
export function toLunarDate(
  year: number,
  month: number,
  day: number,
): LunarDate | null {
  const targetJDE = toJDENoon(year, month, day);

  // Determine which lunar year this solar date belongs to
  let lYear = year;
  let entry = LUNAR_NEW_YEAR[lYear];
  if (!entry) return null;

  let newYearJDE = toJDENoon(lYear, entry[0], entry[1]);

  if (targetJDE < newYearJDE) {
    lYear--;
    entry = LUNAR_NEW_YEAR[lYear];
    if (!entry) return null;
    newYearJDE = toJDENoon(lYear, entry[0], entry[1]);
  }

  // k0 = lunation index of 음력 1/1 for this lunar year
  const k0 = Math.round((newYearJDE - 2451550.09766) / 29.530588861);

  const leapAfter = LEAP_MONTHS[lYear] ?? 0;

  let lMonth = 1;
  let isLeap = false;

  for (let i = 0; i < 14; i++) {
    const moonKST = jdeToKST(newMoonJDE(k0 + i));
    const nextKST = jdeToKST(newMoonJDE(k0 + i + 1));
    const moonJDE = toJDENoon(...moonKST);
    const nextJDE = toJDENoon(...nextKST);

    if (targetJDE >= moonJDE && targetJDE < nextJDE) {
      const day = Math.round(targetJDE - moonJDE) + 1;
      return { year: lYear, month: lMonth, day, isLeap };
    }

    // Advance to next month
    if (isLeap) {
      isLeap = false;
      lMonth++;
    } else if (leapAfter > 0 && lMonth === leapAfter) {
      isLeap = true;
    } else {
      lMonth++;
    }
  }

  return null;
}

/**
 * Format a lunar date for calendar cell display.
 * 초하루 (day 1): "N월" or "윤N월"
 * Other days: just the day number
 */
export function formatLunarCell(lunar: LunarDate): string {
  if (lunar.day === 1) {
    return `${lunar.isLeap ? "윤" : ""}${lunar.month}월`;
  }
  return String(lunar.day);
}
