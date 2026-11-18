/**
 * InkBrick's frozen daily levels (content/daily/YYYY-MM.json, written by `npm run gen`),
 * read by the website's /api/daily/inkbrick. SERVER-SIDE: the client never bundles these.
 * A frozen day never changes when the generator does (only `npm run gen -- --redo <date>`).
 */
import type { LevelDef } from '../src/sim/types';
import { DAILY_MONTHS } from './daily/index';

interface FrozenMonth {
  readonly days: Readonly<Record<string, { readonly level: LevelDef }>>;
}

function isMonth(v: unknown): v is FrozenMonth {
  return typeof v === 'object' && v !== null && typeof (v as FrozenMonth).days === 'object';
}

const BY_DATE: ReadonlyMap<string, LevelDef> = new Map(
  DAILY_MONTHS.filter(isMonth).flatMap((m) => Object.entries(m.days).map(([date, e]) => [date, e.level] as const)),
);
const DATES: readonly string[] = [...BY_DATE.keys()].sort();

/** The daily level for a local date (YYYY-MM-DD), or null when none is frozen for it. */
export function inkbrickDaily(date: string): LevelDef | null {
  return BY_DATE.get(date) ?? null;
}

/** The dates that have a frozen level, oldest first. */
export function inkbrickDailyDates(): readonly string[] {
  return DATES;
}
