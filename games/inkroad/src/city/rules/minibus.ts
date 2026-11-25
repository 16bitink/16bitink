import { CELL } from '../../sim/constants';
import type { Cell, Id, Lot, SpecialView, TransitLine } from '../../sim/types';
import { no, priced, type Handler } from '../commands/shared';
import { areaOf, cellPt, centreOf, clamp, distPt, distToLine, pointAlong, polyLength } from '../geometry';
import { earn } from '../money';
import { mixSeed } from '../rng';
import { sore } from '../score';
import type { City, DayReport } from '../state';
import { emit } from '../state';
import { JOBS, LEVEL_PULL, SHOPPING } from '../tune';
import { headway, isRunning, linePath, stopAccess, syncServices } from '../transit';
import { ruleState, setRule } from './state';

/**
 * Seven Hills: private minibuses fill any busy corridor the city's own lines
 * leave empty. They take riders and stop anywhere, which blocks the lane.
 * License them, buy them out, or run something better until they give up.
 * An express bus on bus lanes is the strong answer, and they protest it.
 */
export const MINI = {
  max: 4, perYears: 2, minCells: 8, maxCells: 42, reach: 4.5, strength: 3, vehicles: 3, stopGap: 7, stopChance: 0.05, stopSeconds: 3.5, licensedChance: 0.012,
  fee: 8, perRider: 0.02, buyBase: 70, buyPerCell: 3, seats: 0.6, royalty: 0.25, crowded: 0.95, slowest: 40,
  protest: 3, protestStreets: 4, protestEach: 2, stops: 0.8, blockades: 2, blockSeconds: 9, gravity: 26,
} as const;
export const BRT = { laneShare: 0.55, seats: 1.6, pace: 1.15 } as const;
const NAMES = ['Loud Minibus', 'Plum Minibus', 'Brave Minibus', 'Cousin Minibus', 'Hop Minibus', 'Elbow Minibus', 'Kettle Minibus', 'Maybe Minibus'];

export const minibusesOpen = (c: City): boolean => c.def.rules.minibuses !== undefined && c.year >= c.def.rules.minibuses.from;
const minis = (c: City): readonly TransitLine[] => c.lines.filter((l) => l.mini);
const ownLines = (c: City): readonly TransitLine[] => c.lines.filter((l) => !l.mini && isRunning(l));

const near = (l: TransitLine, p: { x: number; y: number }): boolean => l.stops.some((s) => distPt(cellPt(s), p) <= MINI.reach * CELL);
/** One of the city's own lines goes both places, often enough and with a free seat. */
const serves = (c: City, l: TransitLine, a: { x: number; y: number }, b: { x: number; y: number }): boolean =>
  near(l, a) && near(l, b) && l.crowding < MINI.crowded && headway(c, l) < MINI.slowest;

interface Corridor { readonly from: Lot; readonly to: Lot; readonly weight: number }
const pull = (l: Lot): number => ((JOBS[l.kind] ?? 0) + (SHOPPING[l.kind] ?? 0)) * areaOf(l) * (LEVEL_PULL[l.level] ?? 0);

/** The busiest trips nobody's bus makes, best first. */
function corridors(c: City): readonly Corridor[] {
  const open = c.lots.filter((l) => l.level > 0 && l.access);
  const homes = open.filter((l) => l.kind === 'home');
  const goals = open.filter((l) => pull(l) > 0);
  const own = ownLines(c);
  const out: Corridor[] = [];
  for (const from of homes) {
    for (const to of goals) {
      const a = centreOf(from), b = centreOf(to);
      const cells = distPt(a, b) / CELL;
      if (cells < MINI.minCells || cells > MINI.maxCells || own.some((l) => serves(c, l, a, b)) || minis(c).some((l) => near(l, a) && near(l, b))) continue;
      out.push({ from, to, weight: areaOf(from) * (LEVEL_PULL[from.level] ?? 1) * pull(to) * Math.exp(-cells / MINI.gravity) });
    }
  }
  return out.sort((x, y) => y.weight - x.weight || x.from.id - y.from.id || x.to.id - y.to.id);
}

/** The vertex of a block's road nearest its driveway. */
function stopAt(c: City, l: Lot): Cell | null {
  const r = c.net.roads.find((x) => x.id === l.access?.road);
  if (!r) return null;
  const p = pointAlong(r.line, l.access!.s);
  const inner = r.cells.length > 2 ? r.cells.slice(1, -1) : r.cells;
  return inner.reduce((best, x) => (distPt(cellPt(x), p) < distPt(cellPt(best), p) ? x : best), inner[0]!);
}

function routeOf(c: City, k: Corridor): readonly Cell[] | null {
  const a = stopAt(c, k.from), b = stopAt(c, k.to);
  if (!a || !b) return null;
  const path = linePath(c, 'bus', [a, b]);
  if (!path) return null;
  const length = polyLength(path);
  const stops: Cell[] = [a];
  for (let s = MINI.stopGap * CELL; s < length - (MINI.stopGap * CELL) / 2; s += MINI.stopGap * CELL) {
    const p = pointAlong(path, s);
    const x = { gx: Math.round(p.x / CELL), gy: Math.round(p.y / CELL) };
    if (stopAccess(c, x)) stops.push(x);
  }
  return [...stops, b];
}

/** Dawn of a season: one more driver finds one more empty corridor. */
export function dawnMinis(c: City): void {
  if (!minibusesOpen(c)) return;
  const s = ruleState(c).minis;
  const most = Math.min(MINI.max, 1 + Math.floor((c.year - c.def.rules.minibuses!.from) / MINI.perYears));
  if (minis(c).length >= most) return;
  for (const k of corridors(c).slice(0, MINI.max)) {
    const stops = routeOf(c, k);
    const path = stops ? linePath(c, 'bus', stops) : null;
    if (!stops || !path || stops.length < 2) continue;
    const made: TransitLine = { id: c.nextId, mode: 'bus', name: NAMES[s.names % NAMES.length]!, colour: 7, stops, path, vehicles: MINI.vehicles, riders: 0, crowding: 0, works: 0, mini: 'private' };
    c.nextId += 1;
    c.lines = [...c.lines, made];
    setRule(c, { minis: { ...s, names: s.names + 1, strengths: { ...s.strengths, [made.id]: MINI.strength } } });
    emit(c, { t: 'toast', who: 'juma', text: `The ${made.name} now runs from ${k.from.name} to ${k.to.name}. Nobody asked. Everybody got on.` });
    return;
  }
}

// ---------------------------------------------------------------- the day

/** Minibuses stop where a paw is raised. Seeded by the clock, so a day replays the same. */
export function tickMinis(c: City): void {
  if (!minibusesOpen(c)) return;
  const second = Math.floor(c.clock);
  const protest = ruleState(c).minis.protest > 0;
  for (const l of minis(c)) {
    const roll = (mixSeed(c.seed, c.year, c.season, second, l.id) % 1000) / 1000;
    const chance = (l.mini === 'licensed' ? MINI.licensedChance : MINI.stopChance) * l.vehicles;
    if (roll < chance) stopAnywhere(c, l, mixSeed(second, l.id, c.seed), MINI.stopSeconds);
    if (protest && l.mini === 'private' && (second === 24 || second === 84)) for (let i = 0; i < MINI.blockades; i++) stopAnywhere(c, l, mixSeed(second, l.id, i), MINI.blockSeconds);
  }
}

function stopAnywhere(c: City, l: TransitLine, seed: number, seconds: number): void {
  const p = pointAlong(l.path, polyLength(l.path) * (0.1 + 0.8 * ((seed % 997) / 997)));
  const at = stopAccess(c, { gx: Math.round(p.x / CELL), gy: Math.round(p.y / CELL) });
  if (at) c.traffic.block(at, seconds, 2);
}

// ---------------------------------------------------------------- lines that differ

const ON_LANE = CELL * 0.3;
const shares = new WeakMap<TransitLine, { readonly version: number; readonly share: number }>();
/** Share of a line's path on bus lanes. Asked for every trip, so it is kept until the roads change. */
export function laneShare(c: City, l: TransitLine): number {
  const have = shares.get(l);
  if (have && have.version === c.net.version) return have.share;
  const total = polyLength(l.path);
  const lanes = c.net.roads.filter((r) => r.busLane);
  let on = 0;
  let n = 0;
  for (let s = CELL / 2; s < total; s += CELL) {
    const p = pointAlong(l.path, s);
    n += 1;
    if (lanes.some((r) => distToLine(r.line, p) < ON_LANE)) on += 1;
  }
  const share = n > 0 ? on / n : 0;
  shares.set(l, { version: c.net.version, share });
  return share;
}
export const isBrt = (c: City, l: TransitLine): boolean => c.def.rules.minibuses !== undefined && l.mode === 'express' && !l.mini && laneShare(c, l) >= BRT.laneShare;

/** Seats of a line against what its kind usually carries. 1 in cities without these rules. */
export function seatBoost(c: City, l: TransitLine): number {
  if (l.mode === 'boat') return c.def.rules.ferries ?? 1;
  if (l.mini) return MINI.seats;
  return isBrt(c, l) ? BRT.seats : 1;
}
const FERRY_PACE = 0.35;
export const paceBoost = (c: City, l: TransitLine): number =>
  (l.mode === 'boat' && c.def.rules.ferries ? 1 + (c.def.rules.ferries - 1) * FERRY_PACE : isBrt(c, l) ? BRT.pace : 1);
/** What part of a fare reaches the authority. */
export const fareShare = (c: City, line: Id): number => {
  const l = c.lines.find((x) => x.id === line);
  return !l?.mini ? 1 : l.mini === 'licensed' ? MINI.royalty : 0;
};

// ---------------------------------------------------------------- the night

export const feeOf = (l: TransitLine): number => Math.round(MINI.fee + l.riders * MINI.perRider);
const buyOutOf = (l: TransitLine): number => Math.round(MINI.buyBase + (polyLength(l.path) / CELL) * MINI.buyPerCell);

/** Own lines on the same corridor wear a minibus down; crowds and gaps let it back. */
function compete(c: City, l: TransitLine, strength: number): number {
  const a = cellPt(l.stops[0]!), b = cellPt(l.stops[l.stops.length - 1]!);
  const rival = ownLines(c).filter((x) => serves(c, x, a, b));
  if (rival.length === 0) return Math.min(MINI.strength, strength + 1);
  return strength - (rival.some((x) => isBrt(c, x)) ? 2 : 1);
}

export function nightMinis(c: City): void {
  if (!minibusesOpen(c)) return;
  const s = ruleState(c).minis;
  const strengths: Record<string, number> = {};
  const gone: TransitLine[] = [];
  for (const l of minis(c)) {
    if (l.mini === 'licensed') { earn(c, 'grant', feeOf(l)); continue; }
    const left = compete(c, l, s.strengths[l.id] ?? MINI.strength);
    if (left <= 0) gone.push(l); else strengths[l.id] = left;
  }
  for (const l of gone) emit(c, { t: 'toast', who: 'juma', text: `The ${l.name} has given up. Its driver now drives for us, and complains from the inside.` });
  c.lines = c.lines.flatMap((l) => (gone.includes(l) ? [] : [l.mini === 'private' ? { ...l, vehicles: clamp(strengths[l.id] ?? l.vehicles, 1, MINI.vehicles) } : l]));
  protestNight(c, strengths);
}

function protestNight(c: City, strengths: Readonly<Record<string, number>>): void {
  const s = ruleState(c).minis;
  const angry = minis(c).some((l) => l.mini === 'private');
  const lane = c.lines.some((l) => isBrt(c, l));
  const starts = lane && !s.seenLane && angry;
  if (starts) emit(c, { t: 'toast', who: 'sulo', text: 'The minibuses protest your bus lane. They have parked in it, in order of age.' });
  const protest = !angry ? 0 : starts ? MINI.protest : Math.max(0, s.protest - 1);
  setRule(c, { minis: { ...s, strengths, protest, seenLane: s.seenLane || lane } });
}

/** Streets points lost to stopping and protest; a note in the post. */
export function miniStreets(c: City, r: DayReport): number {
  if (!minibusesOpen(c) || r.count === 0) return 0;
  const loose = minis(c).filter((l) => l.mini === 'private');
  if (loose.length === 0) return 0;
  const protest = ruleState(c).minis.protest > 0;
  const l = loose[c.season % loose.length]!;
  sore(c, { bar: 'streets', kind: protest ? 'protest' : 'mini', at: pointAlong(l.path, polyLength(l.path) / 2), weight: protest ? 6 : 1.4 + loose.length * 0.5, lot: null, n: loose.length });
  return -(loose.length * MINI.stops + (protest ? MINI.protestStreets + MINI.protestEach * loose.length : 0));
}

export const minibus: Handler<'minibus'> = {
  quote(c, cmd) {
    const l = c.lines.find((x) => x.id === cmd.line);
    if (!l?.mini || !minibusesOpen(c)) return no('That is not a minibus');
    if (cmd.deal === 'license') return l.mini === 'licensed' ? no('It has a licence, framed, over the mirror') : priced(c, 0, { line: l.path });
    return priced(c, buyOutOf(l), { line: l.path });
  },
  run(c, cmd) {
    const l = c.lines.find((x) => x.id === cmd.line)!;
    c.lines = cmd.deal === 'license' ? c.lines.map((x) => (x === l ? { ...x, mini: 'licensed' as const, vehicles: Math.max(1, MINI.vehicles - 1) } : x)) : c.lines.filter((x) => x !== l);
    const { [l.id]: _, ...strengths } = ruleState(c).minis.strengths;
    setRule(c, { minis: { ...ruleState(c).minis, strengths } });
    syncServices(c);
    return pointAlong(l.path, polyLength(l.path) / 2);
  },
};

export function miniView(c: City): SpecialView['minibuses'] {
  if (!minibusesOpen(c)) return undefined;
  const s = ruleState(c).minis;
  return {
    protest: s.protest,
    lines: minis(c).map((l) => ({ line: l.id, state: l.mini!, riders: l.riders, fee: feeOf(l), buyOut: buyOutOf(l), strength: s.strengths[l.id] ?? 0 })),
  };
}
