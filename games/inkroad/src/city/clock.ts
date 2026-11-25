import { DAY, PERIODS } from '../sim/constants';
import type { Period, Phase } from '../sim/types';

const ORDER: readonly Period[] = ['dawn', 'am', 'mid', 'pm', 'night'];
/** The hour shown at each period's start, then at the day's end. */
const HOURS = [5, 7, 10, 16, 20.5, 23.5] as const;
const REVIEW_HOUR = 23.5;

export function periodAt(clock: number): Period {
  let now: Period = 'dawn';
  for (const p of ORDER) if (clock >= PERIODS[p]) now = p;
  return now;
}

export function periodSeconds(p: Period): number {
  const i = ORDER.indexOf(p);
  const next = ORDER[i + 1];
  return (next ? PERIODS[next] : DAY) - PERIODS[p];
}

export const isPeak = (clock: number): boolean => { const p = periodAt(clock); return p === 'am' || p === 'pm'; };

export function hourAt(clock: number, phase: Phase): number {
  if (phase === 'review' || phase === 'yearEnd' || phase === 'replaced' || phase === 'cityDone') return REVIEW_HOUR;
  const i = ORDER.indexOf(periodAt(clock));
  const from = PERIODS[ORDER[i]!];
  const to = from + periodSeconds(ORDER[i]!);
  const h0 = HOURS[i]!;
  const h1 = HOURS[i + 1]!;
  return h0 + ((h1 - h0) * (clock - from)) / (to - from);
}
