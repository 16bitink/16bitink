/**
 * Dates of the daily levels. A daily is keyed by the player's LOCAL calendar date
 * (YYYY-MM-DD), so "November 22" opens at each player's own midnight. The server
 * therefore accepts any date that is "today" somewhere on Earth.
 */

const DAY_MS = 24 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;
/** The westmost real time zone (Baker Island): the last place a date is still "today". */
export const WEST_OFFSET_HOURS = -12;
/** The eastmost real time zone (Kiribati): the first place a date begins. */
export const EAST_OFFSET_HOURS = 14;
/** No daily exists before the first game with one launched. */
export const FIRST_DAILY_DATE = '2026-01-01';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `value` is a real calendar date written YYYY-MM-DD. */
export function isDailyDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

const dateAtOffset = (nowMs: number, hours: number): string => new Date(nowMs + hours * HOUR_MS).toISOString().slice(0, 10);

/** The first and last calendar dates that are "today" for some time zone right now. */
export function todayWindow(nowMs: number): { readonly min: string; readonly max: string } {
  return { min: dateAtOffset(nowMs, WEST_OFFSET_HOURS), max: dateAtOffset(nowMs, EAST_OFFSET_HOURS) };
}

export type DailyAccess = 'today' | 'past' | 'future' | 'invalid';

/** Where a requested date sits relative to the real time zones' "today". */
export function classifyDate(date: unknown, nowMs: number): DailyAccess {
  if (!isDailyDate(date) || date < FIRST_DAILY_DATE) return 'invalid';
  const { min, max } = todayWindow(nowMs);
  if (date > max) return 'future';
  return date < min ? 'past' : 'today';
}

/**
 * Whether a date's level may be served: today's for anyone, past dates only
 * to owners of the game, future dates never.
 */
export function mayServe(access: DailyAccess, owner: boolean): boolean {
  if (access === 'today') return true;
  return access === 'past' && owner;
}

/** `date` moved by `days` (negative goes back). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The browser's local calendar date. */
export function localDate(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
