import { CELL, ROADS } from '../../sim/constants';
import { setRoad } from '../../sim/network';
import type { Network } from '../../sim/trafficTypes';
import type { Road, SpecialView } from '../../sim/types';
import { no, nightRate, priced, roadWorks, worksLeft, type Handler } from '../commands/shared';
import { midOf, polyLength } from '../geometry';
import { commitNetwork } from '../network';
import { mixSeed } from '../rng';
import { sore } from '../score';
import type { City } from '../state';
import { emit, has, roadById } from '../state';
import { BRIDGE_PER_CELL, MATCH, WORKS } from '../tune';
import { patchRoad } from './ground';
import { ruleDay, setRuleDay } from './state';

/**
 * Cross Rivers: everything was built in the same ten years and everything
 * wears out in the same ten. Worn roads are slow (ground.ts), break cars, and
 * a very worn bridge carries no lorries. Repair early and cheap, or replace
 * late and dear; the Council pays 60 of 100 for bridges once the grants open.
 */
export const AGE = {
  season: 0.006, perFlow: 0.0003, bridge: 1.4, poor: 0.45, bad: 0.3, weak: 0.22, holeChance: 0.011, holesMax: 4, holeSeconds: 7, holeCrash: 0.25,
  repairShare: 0.32, repairGain: 0.35, repairTop: 0.85, repairFrom: 0.8, replaceShare: 0.75, bridgeShare: 0.7, streets: 9,
} as const;

const ageing = (c: City): boolean => c.def.rules.ageing !== undefined;
const condition = (r: Road): number => r.condition ?? 1;
const cells = (r: Road): number => polyLength(r.line) / CELL;
const wet = (c: City, r: Road): number => r.cells.filter((x) => c.net.terrain[x.gy]?.[x.gx] === '~').length;

/** A road's price as if built today. */
const newPrice = (c: City, r: Road): number => cells(r) * ROADS[r.type].cost + wet(c, r) * BRIDGE_PER_CELL * AGE.bridgeShare * (ROADS[r.type].lanes + 1) / 2;
export const bridgeMatch = (c: City): number => (c.def.rules.ageing && c.year >= c.def.rules.ageing.match ? MATCH : 0);

/** Night: the day's wheels and weather. New works and repairs don't wear while they are dug up. */
export function wear(c: City): void {
  if (!ageing(c)) return;
  let net: Network = { ...c.net, version: c.net.version + 1, roads: c.net.roads.map((r) => (r.works > 0 ? r : { ...r, condition: worn(c, r) })) };
  for (const r of net.roads) {
    if (r.bridge && condition(r) < AGE.weak && !r.truckBan) {
      net = setRoad(net, r.id, { truckBan: true });
      emit(c, { t: 'incident', kind: 'pothole', at: midOf(r), text: 'This bridge is too weak for lorries now. It told us by creaking.' });
    }
  }
  commitNetwork(c, net);
}

function worn(c: City, r: Road): number {
  const flow = c.traffic.roadStats(r.id).flow;
  return Math.max(0, condition(r) - (AGE.season + flow * AGE.perFlow) * (r.bridge ? AGE.bridge : 1));
}

/** Once a second: a hole finds a wheel. */
export function tickHoles(c: City): void {
  if (!ageing(c) || ruleDay(c).holes >= AGE.holesMax) return;
  const second = Math.floor(c.clock);
  for (const r of c.net.roads) {
    const cond = condition(r);
    if (cond >= AGE.poor || r.works > 0 || r.flyover) continue;
    const roll = (mixSeed(c.seed, c.year, c.season, second, r.id) % 10000) / 10000;
    if (roll >= (AGE.poor - cond) * AGE.holeChance * Math.min(2, c.traffic.roadStats(r.id).flow / 12)) continue;
    const s = polyLength(r.line) * (0.3 + 0.4 * ((second % 10) / 10));
    if (c.traffic.block({ road: r.id, s }, AGE.holeSeconds * (has(c, 'tow') ? 0.45 : 1), 3) < 0) continue;
    setRuleDay(c, { holes: ruleDay(c).holes + 1 });
    c.day.stats.crashes += AGE.holeCrash;
    sore(c, { bar: 'streets', kind: 'pothole', at: midOf(r), weight: 2.2, lot: null, n: Math.round(cond * 100) });
    emit(c, { t: 'incident', kind: 'pothole', at: midOf(r), text: 'A hole has eaten a wheel. The hole is doing well.' });
    return;
  }
}

/** Streets points lost to bad roads, by length. */
export function wornStreets(c: City): number {
  if (!ageing(c)) return 0;
  const total = c.net.roads.reduce((n, r) => n + cells(r), 0);
  const bad = c.net.roads.reduce((n, r) => n + (condition(r) < AGE.poor ? cells(r) * (AGE.poor - condition(r)) / AGE.poor : 0), 0);
  return total > 0 ? -(bad / total) * AGE.streets * 2 : 0;
}

function workable(c: City, id: number): Road | string {
  const r = roadById(c, id);
  if (!ageing(c)) return 'Nothing here is old enough';
  if (!r || r.flyover) return 'Pick a road on the ground';
  return r.works > 0 ? 'Men with shovels are here already' : r;
}

export const repair: Handler<'repair'> = {
  quote(c, cmd) {
    const r = workable(c, cmd.road);
    if (typeof r === 'string') return no(r);
    if (condition(r) >= AGE.repairFrom) return no('It is still good. The seagulls checked');
    const cost = newPrice(c, r) * AGE.repairShare * (0.6 + (1 - condition(r))) * nightRate(c);
    return priced(c, Math.max(4, cost), { ...roadWorks(c, WORKS.repair), line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const net = setRoad(c.net, r.id, { works: worksLeft(c, WORKS.repair), nightWorks: c.policies.nightWorks });
    commitNetwork(c, patchRoad(net, r.id, { condition: Math.min(AGE.repairTop, condition(r) + AGE.repairGain) }));
    return midOf(r);
  },
};

export const replaceRoad: Handler<'replace'> = {
  quote(c, cmd) {
    const r = workable(c, cmd.road);
    if (typeof r === 'string') return no(r);
    if (condition(r) >= AGE.repairTop) return no('It is nearly new. Let it have a birthday first');
    const full = newPrice(c, r) * AGE.replaceShare * nightRate(c);
    const match = r.bridge ? bridgeMatch(c) : 0;
    const warn = match > 0 ? { warn: `The Council pays ${Math.round(full * match)} of ${Math.round(full)}` } : {};
    return priced(c, full * (1 - match), { ...roadWorks(c, WORKS.replace), line: r.line, ...warn });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const net = setRoad(c.net, r.id, { works: worksLeft(c, WORKS.replace), nightWorks: c.policies.nightWorks, truckBan: false });
    commitNetwork(c, patchRoad(net, r.id, { condition: 1 }));
    return midOf(r);
  },
};

const WORST = 6;
export const meanCondition = (c: City): number => {
  const total = c.net.roads.reduce((n, r) => n + cells(r), 0);
  return total > 0 ? c.net.roads.reduce((n, r) => n + cells(r) * condition(r), 0) / total : 1;
};

export function ageView(c: City): SpecialView['ageing'] {
  if (!ageing(c)) return undefined;
  const list = c.net.roads.filter((r) => !r.flyover).map((r) => ({ road: r.id, condition: condition(r) }));
  return { mean: meanCondition(c), worst: list.sort((a, b) => a.condition - b.condition || a.road - b.road).slice(0, WORST), match: bridgeMatch(c) };
}
