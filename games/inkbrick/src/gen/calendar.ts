/** Dates as local calendar strings (YYYY-MM-DD), weekdays, and when each piece joins the dailies. */
const DAY_MS = 86_400_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(date: string): number {
  const m = DATE.exec(date);
  if (!m) throw new Error(`bad date '${date}' (want YYYY-MM-DD)`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  return formatDate(parseDate(date) + n * DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday (the weekday of the calendar date itself, not of any time zone). */
export function weekday(date: string): number {
  return new Date(parseDate(date)).getUTCDay();
}

export function dateRange(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

export type Twist = 'none' | 'ice' | 'floe' | 'keyGate' | 'shutter' | 'spinner' | 'whirlpool' | 'dark';
export type Layout = 'vault' | 'wall' | 'hourglass' | 'guarded' | 'maze' | 'core' | 'fuse' | 'picture' | 'nested';

/** Chapter 1-3 pieces from day one; chapter 4-5 pieces from week 3, each featured for its first month. */
export const LATE_PIECES: readonly { readonly piece: Twist | Layout; readonly from: string; readonly featuredUntil: string }[] = [
  { piece: 'spinner', from: '2026-12-06', featuredUntil: '2027-01-05' },
  { piece: 'nested', from: '2026-12-06', featuredUntil: '2027-01-05' },
  { piece: 'whirlpool', from: '2027-01-01', featuredUntil: '2027-01-31' },
  { piece: 'dark', from: '2027-02-01', featuredUntil: '2027-02-28' },
];

export function available(piece: Twist | Layout, date: string): boolean {
  const late = LATE_PIECES.find((p) => p.piece === piece);
  return !late || date >= late.from;
}

export function featured(date: string): Twist | Layout | null {
  return LATE_PIECES.find((p) => date >= p.from && date <= p.featuredUntil)?.piece ?? null;
}
