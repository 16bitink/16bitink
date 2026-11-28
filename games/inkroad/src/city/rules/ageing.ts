import { CELL, ROADS } from '../../sim/constants';
import { setRoad } from '../../sim/network';
import type { Network } from '../../sim/trafficTypes';
import type { Road, SpecialView } from '../../sim/types';
import { no, nightRate, priced, roadDig, roadWorks, type Handler } from '../commands/shared';
import { clamp, midOf, polyLength } from '../geometry';
import { commitNetwork } from '../network';
import { mixSeed } from '../rng';
import { sore } from '../score';
import type { City } from '../state';
import { emit, has, roadById } from '../state';
import { BRIDGE_PER_CELL, MATCH, WORKS } from '../tune';
import { patchRoad } from './ground';
import { ruleDay, setRuleDay } from './state';

/**
 * Roads wear in every city: a little with age, mostly under wheels, so a busy street needs mending and a
 * quiet one far away can wait for years. Worn roads are slow (ground.ts), and the people who drive them
 * complain in proportion to how many they are. Repairs are by hand (a month of works); nothing is paid a month.
 * Cross Rivers (def.rules.ageing) was built in ten years and wears out in ten: faster, bridges worst, a very
 * worn bridge carries no lorries; repair early and cheap, or replace late and dear (the Council matches bridges).
 */
export const AGE = {
  poor: 0.45, weak: 0.22, holeChance: 0.011, holesMax: 4, holeSeconds: 7, holeCrash: 0.25,
  /** Under this the people who drive a road start to complain (and it is slower, ground.ts); at 0 they shout. */
  worn: 0.7,
  /** Streets points lost if all the driving were on a ruin (by the share of the season's cars on each road). */
  streets: 35,
  replaceShare: 0.75, bridgeShare: 0.7,
} as const;

export interface WearProfile {
  /** Lost each season whatever happens. */
  readonly season: number;
  /** Lost for each car a lane carried in the season. */
  readonly perCar: number;
  readonly bridge: number;
  /** Repair: from under `from`, adds `gain`, up to `top`; costs `share` of a new road (more the worse it is). */
  readonly repair: { readonly from: number; readonly gain: number; readonly top: number; readonly share: number };
}

/** Tuned on Saffron Bay's bots: the busiest streets need a first repair in year 3, a quiet one lasts the ten years. */
export const WEAR: Readonly<Record<'normal' | 'old', WearProfile>> = {
  normal: { season: 0.006, perCar: 0.00045, bridge: 1, repair: { from: 0.85, gain: 1, top: 1, share: 0.4 } },
  old: { season: 0.012, perCar: 0.0005, bridge: 1.4, repair: { from: 0.8, gain: 0.35, top: 0.85, share: 0.32 } },
};

export const isOld = (c: City): boolean => c.def.rules.ageing !== undefined;
export const wearOf = (c: City): WearProfile => (isOld(c) ? WEAR.old : WEAR.normal);
const condition = (r: Road): number => r.condition ?? 1;
const cells = (r: Road): number => polyLength(r.line) / CELL;
const wet = (c: City, r: Road): number => r.cells.filter((x) => c.net.terrain[x.gy]?.[x.gx] === '~').length;
const onGround = (r: Road): boolean => !r.flyover;

/** How much a road's state grates, 0 (fine) to 1 (a ruin): it starts under AGE.worn. */
export const hurtOf = (cond: number): number => clamp((AGE.worn - cond) / AGE.worn, 0, 1);
/** Cars that drove onto a road this season so far (live), or last season (the night's measures). */
const carsNow = (c: City, id: number): number => c.traffic.roadStats(id).cars ?? 0;
const carsLast = (c: City, id: number): number => c.measures.roads.get(id)?.cars ?? carsNow(c, id);

/** A road's price as if built today. */
const newPrice = (c: City, r: Road): number => cells(r) * ROADS[r.type].cost + wet(c, r) * BRIDGE_PER_CELL * AGE.bridgeShare * (ROADS[r.type].lanes + 1) / 2;
export const bridgeMatch = (c: City): number => (c.def.rules.ageing && c.year >= c.def.rules.ageing.match ? MATCH : 0);

/** Night: the season's wheels and weather. New works and repairs don't wear while they are dug up. */
export function wear(c: City): void {
  const p = wearOf(c);
  let net: Network = { ...c.net, version: c.net.version + 1, roads: c.net.roads.map((r) => (r.works > 0 || !onGround(r) ? r : { ...r, condition: worn(c, p, r) })) };
  for (const r of net.roads) {
    if (isOld(c) && r.bridge && condition(r) < AGE.weak && !r.truckBan) {
      net = setRoad(net, r.id, { truckBan: true });
      emit(c, { t: 'incident', kind: 'pothole', at: midOf(r), text: 'This bridge is too weak for lorries now. It told us by creaking.' });
    }
  }
  commitNetwork(c, net);
}

/** A lane's share of the season's cars wears it: a wide road spreads them. */
function worn(c: City, p: WearProfile, r: Road): number {
  const perLane = carsLast(c, r.id) / ROADS[r.type].lanes;
  return Math.max(0, condition(r) - (p.season + perLane * p.perCar) * (r.bridge ? p.bridge : 1));
}

/** Once a second: a hole finds a wheel. */
export function tickHoles(c: City): void {
  if (ruleDay(c).holes >= AGE.holesMax) return;
  const second = Math.floor(c.clock);
  for (const r of c.net.roads) {
    const cond = condition(r);
    if (cond >= AGE.poor || r.works > 0 || r.flyover) continue;
    const roll = (mixSeed(c.seed, c.year, c.season, second, r.id) % 10000) / 10000;
    if (roll >= (AGE.poor - cond) * AGE.holeChance * Math.min(2, c.traffic.roadStats(r.id).flow / 12)) continue;
    const s = polyLength(r.line) * (0.3 + 0.4 * ((second % 10) / 10));
    if (c.traffic.block({ road: r.id, s }, AGE.holeSeconds * (has(c, 'tow') ? 0.45 : 1), 4) < 0) continue;
    setRuleDay(c, { holes: ruleDay(c).holes + 1 });
    c.day.stats.crashes += AGE.holeCrash;
    sore(c, { bar: 'streets', kind: 'pothole', at: midOf(r), weight: 2.2, lot: null, n: Math.round(cond * 100) });
    emit(c, { t: 'incident', kind: 'pothole', at: midOf(r), text: 'A hole has eaten a wheel. The hole is doing well.' });
    return;
  }
}

/** Each worn road's part of the Streets loss: its share of the cars, times how bad it is. Nobody drives it, nobody minds. */
function hurts(c: City, cars: (id: number) => number): readonly { readonly road: Road; readonly cars: number; readonly hurt: number }[] {
  const ground = c.net.roads.filter(onGround);
  const all = ground.reduce((n, r) => n + cars(r.id), 0);
  return ground.map((road) => {
    const n = cars(road.id);
    return { road, cars: n, hurt: all > 0 ? (AGE.streets * n * hurtOf(condition(road))) / all : 0 };
  });
}

/** Streets points lost to worn roads, by how much they are driven. */
export function wornStreets(c: City): number {
  return -hurts(c, (id) => carsNow(c, id)).reduce((n, h) => n + h.hurt, 0);
}

/** The worn roads people are driving on, worst first (last season's cars): what the voices and Dewy talk about. */
export const busyWorn = (c: City): readonly { readonly road: Road; readonly cars: number; readonly hurt: number }[] =>
  hurts(c, (id) => carsLast(c, id)).filter((h) => h.hurt > 0).sort((a, b) => b.hurt - a.hurt || a.road.id - b.road.id);

function workable(c: City, id: number): Road | string {
  const r = roadById(c, id);
  if (!r || r.flyover) return 'Pick a road on the ground';
  return r.works > 0 ? 'Men with shovels are here already' : r;
}

/** What a repair of a road would cost now: the worse it is, the more. */
export const repairPrice = (c: City, r: Road): number => {
  const p = wearOf(c).repair;
  return Math.max(4, newPrice(c, r) * p.share * (0.6 + (1 - condition(r))) * nightRate(c));
};

export const repair: Handler<'repair'> = {
  quote(c, cmd) {
    const r = workable(c, cmd.road);
    if (typeof r === 'string') return no(r);
    if (condition(r) >= wearOf(c).repair.from) return no('It is still good. The seagulls checked');
    return priced(c, repairPrice(c, r), { ...roadWorks(c, WORKS.repair), line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const p = wearOf(c).repair;
    const net = setRoad(c.net, r.id, roadDig(c, WORKS.repair));
    commitNetwork(c, patchRoad(net, r.id, { condition: Math.min(p.top, condition(r) + p.gain) }));
    return midOf(r);
  },
};

export const replaceRoad: Handler<'replace'> = {
  quote(c, cmd) {
    if (!isOld(c)) return no('Repair it: it is as good as new after');
    const r = workable(c, cmd.road);
    if (typeof r === 'string') return no(r);
    if (condition(r) >= WEAR.old.repair.top) return no('It is nearly new. Let it have a birthday first');
    const full = newPrice(c, r) * AGE.replaceShare * nightRate(c);
    const match = r.bridge ? bridgeMatch(c) : 0;
    const warn = match > 0 ? { warn: `The Council pays ${Math.round(full * match)} of ${Math.round(full)}` } : {};
    return priced(c, full * (1 - match), { ...roadWorks(c, WORKS.replace), line: r.line, ...warn });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const net = setRoad(c.net, r.id, { ...roadDig(c, WORKS.replace), truckBan: false });
    commitNetwork(c, patchRoad(net, r.id, { condition: 1 }));
    return midOf(r);
  },
};

const WORST = 6;
export const meanCondition = (c: City): number => {
  const total = c.net.roads.reduce((n, r) => n + cells(r), 0);
  return total > 0 ? c.net.roads.reduce((n, r) => n + cells(r) * condition(r), 0) / total : 1;
};

const viewOf = new WeakMap<Network, { readonly measures: City['measures']; readonly view: NonNullable<SpecialView['ageing']> }>();

/** Every city: the roads that hurt most first, then the most worn of the rest. Kept until the roads or the night's numbers change. */
export function ageView(c: City): NonNullable<SpecialView['ageing']> {
  const have = viewOf.get(c.net);
  if (have && have.measures === c.measures) return have.view;
  const busy = busyWorn(c);
  const seen = new Set(busy.map((h) => h.road.id));
  const rest = c.net.roads.filter((r) => onGround(r) && !seen.has(r.id) && condition(r) < 1)
    .sort((a, b) => condition(a) - condition(b) || a.id - b.id).map((road) => ({ road, cars: carsLast(c, road.id), hurt: 0 }));
  const worst = [...busy, ...rest].slice(0, WORST).map((h) => ({ road: h.road.id, condition: condition(h.road), cars: h.cars, hurt: h.hurt }));
  const view = { mean: meanCondition(c), worst, match: bridgeMatch(c) };
  viewOf.set(c.net, { measures: c.measures, view });
  return view;
}
