import { DAY, MONTHS_PER_SEASON, PERIODS, WEEKEND, WEEKEND_PERIODS } from '../sim/constants';
import type { DayKind, Period, Phase } from '../sim/types';

/**
 * A season's clock runs on: the workday is 0..DAY, then the weekend's drawn day is DAY..SEASON_END.
 * The weekend's first seconds (its 'dawn') are the night between them: the small hours pass, everyone gets home.
 */
export const WEEKEND_AT = DAY;
export const SEASON_END = DAY + WEEKEND;
/** The small hours are over: whoever is still out is home, and the weekend's plan begins. */
export const NIGHT_END = WEEKEND_AT + WEEKEND_PERIODS.am;
/**
 * Month ends on the season clock, at quiet moments: the lull after the morning peak (about 2 pm), the workday's
 * midnight, and the weekend's night (the season's end, where the review comes). About 60 s each.
 */
export const PAYDAYS = [60, WEEKEND_AT, SEASON_END] as const;

const ORDER: readonly Period[] = ['dawn', 'am', 'mid', 'pm', 'night'];
/** The hour shown at each period's start, then at the day's end. Hours run past 24 and wrap. */
const HOURS: Readonly<Record<DayKind, readonly number[]>> = {
  work: [5, 7, 10, 16, 20, 24],
  weekend: [24, 30, 30, 39, 43.5, 47.5],
};
const STARTS: Readonly<Record<DayKind, Readonly<Record<Period, number>>>> = { work: PERIODS, weekend: WEEKEND_PERIODS };
const LENGTH: Readonly<Record<DayKind, number>> = { work: DAY, weekend: WEEKEND };
const REVIEW_HOUR = 23.5;
const FULL_DAY = 24;
/** Hours this long before a workday's dawn belong to the night before it (after midnight). */
const SMALL_HOURS = 3;

export const dayKindAt = (clock: number): DayKind => (clock >= WEEKEND_AT ? 'weekend' : 'work');
/** Seconds into the drawn day that is on. */
export const localClock = (clock: number): number => (clock >= WEEKEND_AT ? clock - WEEKEND_AT : clock);
export const dayStart = (kind: DayKind): number => (kind === 'weekend' ? WEEKEND_AT : 0);
export const lengthOf = (kind: DayKind): number => LENGTH[kind];

export function periodAt(clock: number): Period {
  const kind = dayKindAt(clock);
  const t = localClock(clock);
  let now: Period = 'dawn';
  for (const p of ORDER) if (t >= STARTS[kind][p]) now = p;
  return now;
}

/** A workday period's length (transit timetables are drawn for the workday). */
export function periodSeconds(p: Period): number {
  const i = ORDER.indexOf(p);
  const next = ORDER[i + 1];
  return (next ? PERIODS[next] : DAY) - PERIODS[p];
}

/** Rush hours are a workday's. */
export const isPeak = (clock: number): boolean => {
  if (dayKindAt(clock) === 'weekend') return false;
  const p = periodAt(clock);
  return p === 'am' || p === 'pm';
};

/** The hour 0..24 of a drawn day's second, unwrapped (may run past 24, or below 5 before dawn). */
function rawHour(kind: DayKind, t: number): number {
  const starts = ORDER.map((p) => STARTS[kind][p]);
  const hours = HOURS[kind];
  let i = 0;
  for (let k = 0; k < ORDER.length; k++) if (t >= starts[k]! && starts[k + 1] !== starts[k]) i = k;
  if (t < 0) i = 0;
  const from = starts[i]!;
  const to = i + 1 < ORDER.length ? starts[i + 1]! : LENGTH[kind];
  return hours[i]! + ((hours[i + 1]! - hours[i]!) * (t - from)) / Math.max(1e-6, to - from);
}

export function hourAt(clock: number, phase: Phase): number {
  if (phase === 'review' || phase === 'yearEnd' || phase === 'replaced' || phase === 'cityDone') return REVIEW_HOUR;
  const h = rawHour(dayKindAt(clock), localClock(clock));
  return ((h % FULL_DAY) + FULL_DAY) % FULL_DAY;
}

/**
 * The season clock at which a day of this kind shows this hour (0..24; small hours count as the day's night).
 * Hours before the day's first are before its curtain (the morning is under way when it rises).
 */
export function clockAt(hour: number, kind: DayKind): number {
  const hours = HOURS[kind];
  const first = hours[0]!;
  const h = kind === 'weekend' || hour < first - SMALL_HOURS ? hour + FULL_DAY : hour;
  const starts = [...ORDER.map((p) => STARTS[kind][p]), LENGTH[kind]];
  if (h <= first) return dayStart(kind) + ((h - first) * (starts[1]! - starts[0]!)) / Math.max(1e-6, hours[1]! - first);
  for (let i = 0; i < ORDER.length; i++) {
    const h0 = hours[i]!;
    const h1 = hours[i + 1]!;
    if (h <= h1 && h1 > h0) return dayStart(kind) + starts[i]! + ((starts[i + 1]! - starts[i]!) * (h - h0)) / (h1 - h0);
  }
  return dayStart(kind) + LENGTH[kind];
}

/** Paydays already behind this year: at a review all three of its season's are. */
export function paydaysDone(phase: Phase, season: number, month: number): number {
  if (phase === 'yearStart') return 0;
  return season * MONTHS_PER_SEASON + (phase === 'day' ? month : MONTHS_PER_SEASON);
}
