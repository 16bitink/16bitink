import type { Lot } from '../sim/types';
import { mean } from './day';
import { builtArea, cellsToBlock, clamp } from './geometry';
import { buildSpots, meanOccupancy } from './parking';
import type { City, Mood } from './state';
import { emit } from './state';
import { DEAD_PARK, GROW, OWNERSHIP, PARK_RADIUS, PEOPLE_PER_CELL } from './tune';

const FRESH: Mood = { trips: 60, parking: 70, cool: 0, bad: 0 };
const MOOD_EASE = 0.5;
export const moodOf = (c: City, lot: number): Mood => c.moods.get(lot) ?? FRESH;

/** Remember how each block's day went. */
export function updateMoods(c: City): void {
  const next = new Map(c.moods);
  for (const l of c.lots) {
    if (l.level === 0) continue;
    const was = moodOf(c, l.id);
    const t = c.day.stats.lots.get(l.id);
    const trips = was.trips + (mean(t?.trips, was.trips) - was.trips) * MOOD_EASE;
    const parking = was.parking + (mean(t?.parking, was.parking) - was.parking) * MOOD_EASE;
    next.set(l.id, { trips, parking, cool: Math.max(0, was.cool - 1), bad: trips < GROW.badAt ? was.bad + 1 : 0 });
  }
  c.moods = next;
}

const GROWS = new Set<Lot['kind']>(['home', 'shops', 'market', 'office', 'mall', 'port']);
const SELLS = new Set<Lot['kind']>(['shops', 'market', 'mall']);

/** Dear, empty car parks by a shop keep its customers away. */
function deadParking(c: City, l: Lot): boolean {
  if (!SELLS.has(l.kind)) return false;
  const near = [...c.day.spots.values()].filter((s) => (s.kind === 'kerb' || s.kind === 'park') && cellsToBlock(l, s.at) <= PARK_RADIUS);
  const spaces = near.reduce((n, s) => n + s.spaces, 0);
  if (spaces === 0 || c.prices.park + c.prices.parkPeak < 8) return false;
  return near.reduce((n, s) => n + meanOccupancy(s) * s.spaces, 0) / spaces < DEAD_PARK;
}

/** Density: blocks with short trips grow a step, blocks with bad trips stop or shrink. */
export function growLots(c: City): void {
  const moods = new Map(c.moods);
  c.lots = c.lots.map((l) => {
    if (l.level === 0 || !GROWS.has(l.kind) || l.opensYear === c.year) return l;
    const m = moodOf(c, l.id);
    const dead = deadParking(c, l);
    if (l.level < l.maxLevel && m.cool === 0 && !dead && m.trips >= GROW.at && m.parking >= GROW.parkingAt && c.dice.chance(GROW.chance * (m.trips / 75))) {
      moods.set(l.id, { ...m, cool: GROW.cooldown });
      return changed(c, l, l.level + 1, 'grew');
    }
    if (l.level > 1 && SELLS.has(l.kind) && (dead || m.bad >= GROW.badSeasons) && c.dice.chance(0.5)) {
      moods.set(l.id, { ...m, bad: 0 });
      return changed(c, l, l.level - 1, 'shrank');
    }
    return l;
  });
  c.moods = moods;
  buildSpots(c);
}

function changed(c: City, l: Lot, level: number, t: 'grew' | 'shrank'): Lot {
  emit(c, { t, lot: l.id, level });
  return { ...l, level: clamp(level, 1, 4) as Lot['level'] };
}

/** Each year a few more cars, unless people ride. */
export function driftOwnership(c: City): void {
  const share = c.yearHabits.length === 0 ? 0 : c.yearHabits.reduce((n, h) => n + h.transit, 0) / c.yearHabits.length;
  const step = OWNERSHIP.drift * (share >= OWNERSHIP.transitAt ? -1.2 : 1 - share / OWNERSHIP.transitAt / 2);
  c.ownership = clamp(c.ownership + step, OWNERSHIP.min, OWNERSHIP.max);
}

export const population = (c: City): number =>
  c.lots.reduce((n, l) => n + (l.kind === 'home' ? builtArea(l) * (PEOPLE_PER_CELL[l.level] ?? 0) * 10 : 0), 0);
