/**
 * Local calendar dates as YYYY-MM-DD (the daily's key), the weekly rhythm's
 * names for the tomorrow teaser, the countdown to local midnight and the
 * calendar's month grid. Pure: "now" is always passed in.
 */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isDate = (s: string): boolean => DATE_RE.test(s) && !Number.isNaN(parseDate(s).getTime());

/** The local midnight starting date `s`. */
export function parseDate(s: string): Date {
  const m = DATE_RE.exec(s);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const pad = (n: number): string => String(n).padStart(2, '0');
export const formatDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const localToday = (now: Date = new Date()): string => formatDate(now);

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  return formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export const weekdayOf = (s: string): (typeof WEEKDAYS)[number] => WEEKDAYS[parseDate(s).getDay()]!;
export const monthName = (month0: number): string => MONTHS[month0] ?? '';

/** "Tuesday, November 17". */
export function longDate(s: string): string {
  const d = parseDate(s);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 17". */
export const shortDate = (s: string): string => {
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getDate()}`;
};

/** The weekly rhythm (docs/inkbrick-design.md, "The daily level"), as the teaser says it. */
const RHYTHM: Readonly<Record<(typeof WEEKDAYS)[number], string>> = {
  Monday: 'the warm-up, a big hole',
  Tuesday: 'a mixed one',
  Wednesday: 'a mixed one, a little harder',
  Thursday: 'a tricky one',
  Friday: 'a tough one before the weekend',
  Saturday: 'the hard one',
  Sunday: 'the spectacle: hundreds of stones',
};

/** "Tomorrow, Saturday: the hard one". */
export function tomorrowTeaser(today: string): string {
  const day = weekdayOf(addDays(today, 1));
  return `Tomorrow, ${day}: ${RHYTHM[day]}`;
}

/** Milliseconds from `now` to the next local midnight. */
export function msToMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

/** "5:04:09" (hours, minutes, seconds). */
export function countdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** The weeks of a month (Monday first), each day a date or null for the padding. */
export function monthGrid(year: number, month0: number): readonly (readonly (string | null)[])[] {
  const first = new Date(year, month0, 1);
  const days = new Date(year, month0 + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(formatDate(new Date(year, month0, d)));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
