import type { Lot } from '../sim/types';
import type { City } from './state';

/**
 * Habits that make one turn the busiest of a junction: from a year on, so many of the workers of
 * some districts have their job at some places. This is what a flyover is for.
 */
interface Habit { readonly from: number; readonly homes: readonly string[]; readonly jobs: readonly string[]; readonly share: number }

const HABITS: Readonly<Record<string, readonly Habit[]>> = {
  saffron: [
    // The port hires the south: a left turn at the creek street in the morning, another one at the old crossroads at night.
    { from: 6, homes: ['Palm Town', 'South Gardens', 'West Sands'], jobs: ['Anchor Port'], share: 0.45 },
    // The far shore works in the office district, all of it over one bridge.
    { from: 7, homes: ['Far Shore'], jobs: ['Blueprint Offices', 'Paperclip Offices', 'Stapler Offices', 'Far Shore Offices'], share: 0.5 },
  ],
};

/** The jobs a worker of this block is used to, with the chance of it, or null. */
export function habitOf(c: City, home: Lot): { readonly jobs: ReadonlySet<string>; readonly share: number } | null {
  const h = HABITS[c.def.id]?.find((x) => x.from <= c.year && x.homes.includes(home.district));
  return h ? { jobs: new Set(h.jobs), share: h.share } : null;
}
