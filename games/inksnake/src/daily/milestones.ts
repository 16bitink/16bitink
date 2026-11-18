/**
 * Day milestones: total days played across every game's dailies (never a
 * streak). Each of 3, 7, 14, 30, 50 and 100 unlocks an album page (a
 * decorative frame, one tier per milestone) and a stamp on the calendar
 * for the day it was reached. Kept forever; nothing here can be lost.
 */
export const MILESTONE_DAYS = [3, 7, 14, 30, 50, 100] as const;

/** Milestone (days played) → the date (YYYY-MM-DD) it was reached. */
export type Stamps = Readonly<Record<string, string>>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isMilestone = (n: number): boolean => (MILESTONE_DAYS as readonly number[]).includes(n);

/** The album page tier earned by this many days (0: none yet, up to 6). */
export const albumTier = (totalDays: number): number => MILESTONE_DAYS.filter((d) => d <= totalDays).length;

/** The milestone reached by exactly this total (the end card's "new album page!"). */
export const reachedAt = (totalDays: number): number | null => (isMilestone(totalDays) ? totalDays : null);

/** The next milestone to look forward to, or null when every one is reached. */
export const nextMilestone = (totalDays: number): number | null => MILESTONE_DAYS.find((d) => d > totalDays) ?? null;

/** Untrusted saved data to stamps: only real milestones with real dates. */
export function parseStamps(raw: unknown): Stamps {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const d of MILESTONE_DAYS) {
    const v = (raw as Record<string, unknown>)[String(d)];
    if (typeof v === 'string' && DATE.test(v)) out[String(d)] = v;
  }
  return out;
}

/** Stamps from either copy, the earlier date winning. */
export function mergeStamps(a: Stamps, b: Stamps): Stamps {
  const out: Record<string, string> = { ...a };
  for (const [k, v] of Object.entries(b)) if (out[k] === undefined || v < out[k]!) out[k] = v;
  return out;
}

export const coversStamps = (a: Stamps, b: Stamps): boolean => Object.entries(b).every(([k, v]) => a[k] !== undefined && a[k]! <= v);

/** The stamps with today's added when `total` just reached a milestone (from `before`); unchanged otherwise. */
export function stampReached(stamps: Stamps, before: number, total: number, date: string): Stamps {
  const n = reachedAt(total);
  return n !== null && total > before ? mergeStamps(stamps, { [String(n)]: date }) : stamps;
}
