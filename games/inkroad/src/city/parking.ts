import { CELL } from '../sim/constants';
import type { Id, Lot, Pt } from '../sim/types';
import { isPeak } from './clock';
import type { Place, Spot } from './day';
import { areaOf, centreOf, cellsToBlock, clamp, midOf, polyLength } from './geometry';
import { accessPoint } from './places';
import type { City } from './state';
import { has, lotById } from './state';
import { COST, HOME_SPACES, KERB_PER_CELL, PARK_RADIUS, PRIVATE_PER_CELL, SAND_YEARS, SEARCH_MINUTES, SWEET } from './tune';

export const occupancy = (s: Spot): number => (s.spaces > 0 ? s.used / s.spaces : 1);
export const meanOccupancy = (s: Spot): number => (s.samples > 0 ? s.sum / s.samples : 0);

function lotSpaces(c: City, l: Lot): number {
  const per = l.kind === 'home' ? (HOME_SPACES[l.level] ?? 0) * (has(c, 'doorstep') ? 1.4 : 1) : PRIVATE_PER_CELL[l.kind] ?? 0;
  return Math.round(areaOf(l) * per * (l.kind !== 'home' ? SAND_YEARS[c.year - 1] ?? 1 : 1));
}

export const kerbSpaces = (line: readonly Pt[]): number => Math.max(1, Math.round((polyLength(line) / CELL) * KERB_PER_CELL));

/** Every parking place there is now. Keeps who is parked where the place still exists. */
export function buildSpots(c: City): void {
  const old = c.day.spots;
  const next = new Map<string, Spot>();
  const put = (s: Omit<Spot, 'used' | 'sum' | 'samples'>): void => {
    // Cars parked or on their way hold the spot itself, so a place that stays keeps its object.
    const was = old.get(s.key);
    next.set(s.key, was ? Object.assign(was, s) : { ...s, used: 0, sum: 0, samples: 0 });
  };
  for (const l of c.lots) {
    if (l.level === 0 || !l.access) continue;
    put({ key: `lot:${l.id}`, kind: l.kind === 'home' ? 'home' : 'private', id: l.id, spaces: lotSpaces(c, l), access: l.access, at: centreOf(l) });
  }
  for (const r of c.net.roads) {
    if (!r.kerb || r.level !== 0) continue;
    put({ key: `kerb:${r.id}`, kind: 'kerb', id: r.id, spaces: kerbSpaces(r.line), access: { road: r.id, s: polyLength(r.line) / 2 }, at: midOf(r) });
  }
  for (const p of c.parks) {
    if (!p.access) continue;
    put({ key: `park:${p.id}`, kind: 'park', id: p.id, spaces: p.spaces, access: p.access, at: centreOf(p) });
  }
  c.day.spots = next;
}

/** Coins a driver pays to leave a car here now. Residents with a permit park free near home. */
export function priceAt(c: City, s: Spot, clock: number, home: boolean): number {
  if (s.kind === 'private' || s.kind === 'home') return 0;
  if (home && c.policies.permits) return 0;
  return isPeak(clock) ? c.prices.parkPeak : c.prices.park;
}

/** Minutes a driver expects to circle at this place. */
export function searchMinutes(c: City, s: Spot): number {
  const over = clamp(occupancy(s) - SWEET, 0, 1) / (1 - SWEET);
  return over * over * (has(c, 'app') ? SEARCH_MINUTES.app : SEARCH_MINUTES.plain);
}

export const walkCells = (l: Lot, s: Spot): number => ((s.kind === 'private' || s.kind === 'home') && s.id === l.id ? 0 : cellsToBlock(l, s.at));

/** What leaving the car here costs a visitor to this block, in minutes. */
export function spotCost(c: City, l: Lot, s: Spot, clock: number, home: boolean): number {
  return priceAt(c, s, clock, home) * COST.minPerCoin + walkCells(l, s) * COST.walkPerCell + searchMinutes(c, s);
}

export function spotsNear(c: City, l: Lot): readonly Spot[] {
  const out: Spot[] = [];
  for (const s of c.day.spots.values()) {
    if (s.kind === 'private' || s.kind === 'home') { if (s.id === l.id) out.push(s); continue; }
    if (cellsToBlock(l, s.at) <= PARK_RADIUS) out.push(s);
  }
  return out;
}

/**
 * The place a driver heads for. Nobody sees a full car park from far away, so
 * a full place only looks slow to search; `tried` ones are known to be full.
 */
export function chooseSpot(c: City, place: Place, clock: number, home: boolean, tried: readonly string[]): Spot | null {
  const l = 'lot' in place ? lotById(c, place.lot) : undefined;
  if (!l) return null;
  let best: Spot | null = null;
  let bestCost = Infinity;
  for (const s of spotsNear(c, l)) {
    if (tried.includes(s.key)) continue;
    const cost = spotCost(c, l, s, clock, home);
    if (cost < bestCost) { bestCost = cost; best = s; }
  }
  return best;
}

export function sampleSpots(c: City): void {
  for (const s of c.day.spots.values()) { s.sum += occupancy(s); s.samples += 1; }
}

/** Show live occupancy on the car parks (a new array only when something changed). */
export function publishParks(c: City): void {
  let changed = false;
  const next = c.parks.map((p) => {
    const s = c.day.spots.get(`park:${p.id}`);
    if (!s || s.used === p.used) return p;
    changed = true;
    return { ...p, used: s.used };
  });
  if (changed) c.parks = next;
}

export function kerbFullness(c: City, road: Id): number {
  const s = c.day.spots.get(`kerb:${road}`);
  return s ? occupancy(s) : 0;
}

/** How hard it is to park at a block now, 0 easy to 1 full. */
export function lotFullness(c: City, l: Lot): number {
  const near = spotsNear(c, l);
  const total = near.reduce((n, s) => n + s.spaces, 0);
  return total === 0 ? 0 : clamp(near.reduce((n, s) => n + s.used, 0) / total, 0, 1);
}

export const spotPoint = (c: City, s: Spot): Pt => accessPoint(c, s.access);
