import { CELL } from '../sim/constants';
import type { Access } from '../sim/trafficTypes';
import type { Cell, Id, Period, Pt, TransitLine } from '../sim/types';
import { periodSeconds } from './clock';
import { cellPt, distPt, nearestS, pointAlong, polyLength } from './geometry';
import { router } from './router';
import { paceBoost, seatBoost } from './rules/minibus';
import type { City } from './state';
import { has } from './state';
import { COST, LAP_FELT, TRANSIT } from './tune';

const ON_ROAD = new Set(['bus', 'express', 'tram']);
export const runsOnRoad = (l: Pick<TransitLine, 'mode'>): boolean => ON_ROAD.has(l.mode);
export const isRunning = (l: TransitLine): boolean => l.works === 0 && l.vehicles > 0;

/** The road and place along it nearest to a stop, or null. */
export function stopAccess(c: City, cell: Cell): { readonly road: Id; readonly s: number } | null {
  const p = cellPt(cell);
  let best: { road: Id; s: number; d: number } | null = null;
  for (const r of c.net.roads) {
    if (r.level !== 0 || r.flyover || r.type === 'highway') continue;
    const { s, d } = nearestS(r.line, p);
    if (!best || d < best.d) best = { road: r.id, s, d };
  }
  if (!best || best.d > CELL * 0.75) return null;
  const road = c.net.roads.find((r) => r.id === best!.road)!;
  const len = polyLength(road.line);
  const inset = Math.min(len / 3, CELL * 0.5);
  return { road: best.road, s: Math.min(len - inset, Math.max(inset, best.s)) };
}

/** The drawn path of a line: along roads for buses, straight for the rest. */
export function linePath(c: City, mode: TransitLine['mode'], stops: readonly Cell[]): readonly Pt[] | null {
  if (!ON_ROAD.has(mode)) return stops.map(cellPt);
  const acc = stops.map((s) => stopAccess(c, s));
  if (acc.some((a) => a === null)) return null;
  const route = router(c.net);
  const out: Pt[] = [];
  for (let i = 1; i < acc.length; i++) {
    const leg = route(acc[i - 1]!, acc[i]!);
    if (!leg) return null;
    out.push(...(i === 1 ? leg : leg.slice(1)));
  }
  return out;
}

const laneCache = new WeakMap<object, Map<Id, number>>();
/** How much of a line's way has a red lane: there it doesn't wait behind cars. */
export function laneShare(c: City, l: TransitLine): number {
  const red = c.net.roads.filter((r) => r.busLane);
  if (red.length === 0) return 0;
  const map = laneCache.get(c.net) ?? new Map<Id, number>();
  laneCache.set(c.net, map);
  const have = map.get(l.id);
  if (have !== undefined) return have;
  const total = polyLength(l.path);
  let on = 0;
  for (let i = 1; i < l.path.length; i++) {
    const a = l.path[i - 1]!;
    const b = l.path[i]!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (red.some((r) => nearestS(r.line, mid).d < CELL / 4)) on += distPt(a, b);
  }
  const share = total > 0 ? on / total : 0;
  map.set(l.id, share);
  return share;
}

/** Seconds for one lap (there and back). */
export function lapSeconds(c: City, l: TransitLine): number {
  const t = TRANSIT[l.mode];
  const ideal = (2 * polyLength(l.path)) / (t.speed * paceBoost(c, l)) + 2 * l.stops.length * t.dwell * (has(c, 'tap') ? 0.6 : 1);
  if (!runsOnRoad(l)) return ideal;
  const handle = c.services.get(l.id);
  const measured = handle === undefined ? 0 : c.traffic.serviceLap(handle);
  return measured > ideal && Number.isFinite(measured) ? ideal + (measured - ideal) * LAP_FELT * (1 - laneShare(c, l)) : ideal;
}

export const headway = (c: City, l: TransitLine): number => lapSeconds(c, l) / Math.max(1, l.vehicles * TRANSIT[l.mode].stands);

/** Drawn-car loads a line can carry in a period (each seat is used about twice a lap). */
export function capacity(c: City, l: TransitLine, p: Period): number {
  const cap = TRANSIT[l.mode].cap * (has(c, 'bigbus') && runsOnRoad(l) ? 1.5 : 1) * seatBoost(c, l);
  return Math.max(0.01, (2 * cap * periodSeconds(p)) / headway(c, l));
}

export const loadOf = (c: City, l: TransitLine, p: Period): number => (c.day.stats.lineLoad.get(`${l.id}:${p}`) ?? 0) / capacity(c, l, p);

export interface Ride { readonly lines: readonly Id[]; readonly seconds: number; readonly walk: number; readonly wait: number; readonly changes: number; readonly crowd: number; readonly refused: boolean }

interface StopAt { readonly i: number; readonly cells: number }
function nearestStop(l: TransitLine, p: Pt): StopAt {
  let best: StopAt = { i: 0, cells: Infinity };
  l.stops.forEach((s, i) => {
    const cells = distPt(cellPt(s), p) / CELL;
    if (cells < best.cells) best = { i, cells };
  });
  return best;
}

function rideSeconds(c: City, l: TransitLine, i: number, j: number): number {
  const part = Math.abs(i - j) / Math.max(1, l.stops.length - 1);
  return (lapSeconds(c, l) / 2) * part;
}

function single(c: City, l: TransitLine, a: Pt, b: Pt, p: Period): Ride | null {
  const s = nearestStop(l, a);
  const e = nearestStop(l, b);
  if (s.i === e.i || s.cells > COST.transitWalkMax || e.cells > COST.transitWalkMax) return null;
  const load = loadOf(c, l, p);
  return {
    lines: [l.id], seconds: rideSeconds(c, l, s.i, e.i), walk: s.cells + e.cells, wait: Math.min(COST.waitCap, headway(c, l) * COST.waitShare),
    changes: 0, crowd: Math.max(0, load - COST.crowdFrom) * COST.crowd, refused: load > COST.lineRefuse,
  };
}

const CHANGE_CELLS = 2.5;
function withChange(c: City, x: TransitLine, y: TransitLine, a: Pt, b: Pt, p: Period): Ride | null {
  for (const sx of x.stops) {
    const at = cellPt(sx);
    if (!y.stops.some((sy) => distPt(cellPt(sy), at) <= CHANGE_CELLS * CELL)) continue;
    const first = single(c, x, a, at, p);
    const second = single(c, y, at, b, p);
    if (!first || !second) continue;
    return {
      lines: [x.id, y.id], seconds: first.seconds + second.seconds, walk: first.walk + second.walk, wait: first.wait + second.wait,
      changes: 1, crowd: first.crowd + second.crowd, refused: first.refused || second.refused,
    };
  }
  return null;
}

const rideCost = (r: Ride): number => r.seconds + r.wait + r.walk * COST.walkPerCell + r.crowd + r.changes * COST.change;

/** The best way by bus, tram, metro or boat between two points, or null. */
export function bestRide(c: City, a: Pt, b: Pt, p: Period): Ride | null {
  const lines = c.lines.filter(isRunning);
  let best: Ride | null = null;
  const take = (r: Ride | null): void => { if (r && !r.refused && (!best || rideCost(r) < rideCost(best))) best = r; };
  for (const l of lines) take(single(c, l, a, b, p));
  for (const x of lines) for (const y of lines) if (x !== y) take(withChange(c, x, y, a, b, p));
  return best;
}

export const rideMinutes = (r: Ride): number =>
  r.seconds * COST.rideWeight + r.wait + r.walk * COST.stopWalk + r.crowd + r.changes * COST.change + COST.boarding;

/** Put the buses and trams on the road (after any network change or a new line). */
export function syncServices(c: City): void {
  for (const id of c.services.values()) c.traffic.removeService(id);
  c.services = new Map();
  for (const l of c.lines) {
    if (!runsOnRoad(l) || !isRunning(l)) continue;
    const stops = l.stops.map((s) => stopAccess(c, s));
    if (stops.some((s) => s === null)) continue;
    // There and back: the last stop turns the bus round.
    const loop: Access[] = [...stops, ...stops.slice(1, -1).reverse()].map((s) => s!);
    const dwell = TRANSIT[l.mode].dwell * (has(c, 'tap') ? 0.6 : 1);
    c.services.set(l.id, c.traffic.addService({ stops: loop, kind: l.mode === 'tram' ? 'tram' : l.mini ? 'van' : 'bus', dwell, vehicles: l.vehicles, tag: -l.id }));
  }
}

/** A line whose road is gone is drawn again, or closed if it can't be. */
export function repairLines(c: City): void {
  c.lines = c.lines.flatMap((l) => {
    if (!runsOnRoad(l)) return [l];
    const path = linePath(c, l.mode, l.stops);
    return path ? [{ ...l, path }] : [];
  });
}

export const lineStopPoint = (l: TransitLine, i: number): Pt => {
  const s = l.stops[i];
  return s ? cellPt(s) : pointAlong(l.path, 0);
};
