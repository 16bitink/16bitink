/** Dates as the daily's cards show them (local calendar dates, YYYY-MM-DD). */

/** The first day with a hunt (the first frozen day, content/daily): earlier days have none, so the calendar leaves them dark. */
export const FIRST_HUNT = '2026-11-19';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parse = (date: string): Date => new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));

/** "Thursday, December 24". */
export function longDate(date: string): string {
  const d = parse(date);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Dec 24". */
export function shortDate(date: string): string {
  const d = parse(date);
  return `${MONTHS[d.getMonth()]!.slice(0, 3)} ${d.getDate()}`;
}

/** "December 2026". */
export function monthTitle(year: number, month0: number): string {
  return `${MONTHS[month0]} ${year}`;
}

/** Milliseconds from `now` to the next local midnight. */
export function msToMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

/** Milliseconds from `now` to the start (local midnight) of `date`, YYYY-MM-DD. */
export function msUntil(date: string, now: Date): number {
  return Math.max(0, parse(date).getTime() - now.getTime());
}

/** "5:04:09". */
export function countdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** The month's days as calendar weeks (Monday first), blanks as null. */
export function monthGrid(year: number, month0: number): (string | null)[][] {
  const first = new Date(year, month0, 1);
  const days = new Date(year, month0 + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${year}-${String(month0 + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}
