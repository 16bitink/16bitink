import { ROADS } from '../../sim/constants';
import { roadLinks } from '../../sim/netCore';
import { expandCells } from '../../sim/netPlan';
import type { Network } from '../../sim/trafficTypes';
import type { CityDef, Id, Link, Road } from '../../sim/types';
import { mixSeed } from '../rng';
import type { City } from '../state';

/**
 * What the ground does to roads: steep streets are slow (Seven Hills), worn
 * roads are slow (every city), some water crossings are tunnels (Twin
 * Isles). Runs on every network before the cars see it.
 */
export const STEEP_SLOW = 0.4;
/** Speed from under 70 (when drivers start to complain) down to half on a ruin: an untended busy road costs Trips too. */
export const WORN = { from: 0.7, floor: 0.5 } as const;
const START = { highway: 0.42, bridge: 0.48, low: 0.55, spread: 0.3 } as const;

/** 1 on a sound road, down to the floor on a ruin. */
export const wornFactor = (condition: number | undefined): number =>
  (condition === undefined || condition >= WORN.from ? 1 : WORN.floor + (1 - WORN.floor) * (Math.max(0, condition) / WORN.from));

export const steepShare = (net: Pick<Network, 'terrain'>, r: Pick<Road, 'cells'>): number =>
  (r.cells.length === 0 ? 0 : r.cells.filter((x) => net.terrain[x.gy]?.[x.gx] === 'h').length / r.cells.length);

const cellKey = (x: { readonly gx: number; readonly gy: number }): string => `${x.gx},${x.gy}`;
interface Marks { readonly tunnel: ReadonlySet<string>; readonly condition: ReadonlyMap<string, number> }
const marksOf = new WeakMap<CityDef, Marks>();
function marks(def: CityDef): Marks {
  const have = marksOf.get(def);
  if (have) return have;
  const tunnel = new Set<string>();
  const condition = new Map<string, number>();
  for (const r of def.roads) {
    const cells = expandCells(r.cells.map(([gx, gy]) => ({ gx, gy })));
    if (r.tunnel) for (const x of cells) tunnel.add(cellKey(x));
    if (r.condition !== undefined) for (const x of cells.slice(1, -1)) condition.set(cellKey(x), r.condition);
  }
  const made = { tunnel, condition };
  marksOf.set(def, made);
  return made;
}

/** A road that was here before the player came is worn; a new one is not. */
function startCondition(c: City, r: Road, first: boolean): number {
  const said = r.cells.map((x) => marks(c.def).condition.get(cellKey(x))).find((v) => v !== undefined);
  if (said !== undefined) return said;
  if (!first) return 1;
  if (r.bridge) return START.bridge;
  if (r.type === 'highway') return START.highway;
  return START.low + (mixSeed(c.seed, r.id) % 100) / 100 * START.spread;
}

function marked(c: City, r: Road, first: boolean): Road {
  const m = marks(c.def);
  const rules = c.def.rules;
  const patch: { tunnel?: boolean; condition?: number; freeway?: boolean } = {};
  if (r.bridge && !r.tunnel && m.tunnel.size > 0 && r.cells.every((x) => m.tunnel.has(cellKey(x)))) patch.tunnel = true;
  if (rules.ageing && r.condition === undefined) patch.condition = startCondition(c, r, first);
  if (rules.freeway && !!r.freeway !== (r.type === 'highway' && !r.fixed)) patch.freeway = r.type === 'highway' && !r.fixed;
  return Object.keys(patch).length > 0 ? { ...r, ...patch } : r;
}

const baseOf = new WeakMap<Road, number>();
function baseSpeed(r: Road): number {
  const have = baseOf.get(r);
  if (have !== undefined) return have;
  const speed = roadLinks(r)[0]?.freeSpeed ?? ROADS[r.type].speed;
  baseOf.set(r, speed);
  return speed;
}

const speedFactor = (c: City, net: Network, r: Road): number =>
  (c.def.rules.steep ? 1 - STEEP_SLOW * steepShare(net, r) : 1) * wornFactor(r.condition);

/** The network with this city's ground in it. Same object when nothing differs. */
export function shapeNet(c: City, net: Network): Network {
  const rules = c.def.rules;
  // Roads wear in every city: once one has a condition its speed follows it (and comes back when mended).
  const aged = net.roads.some((r) => r.condition !== undefined);
  if (!rules.steep && !rules.ageing && !rules.freeway && !aged && marks(c.def).tunnel.size === 0) return net;
  const first = net.roads.every((r) => r.condition === undefined);
  const roads = net.roads.map((r) => marked(c, r, first));
  const changed = roads.some((r, i) => r !== net.roads[i]);
  const links = rules.steep || rules.ageing || aged ? slowLinks(c, net, roads) : net.links;
  return changed || links !== net.links ? { ...net, roads: changed ? roads : net.roads, links } : net;
}

function slowLinks(c: City, net: Network, roads: readonly Road[]): readonly Link[] {
  const speeds = new Map<Id, number>(roads.map((r) => [r.id, baseSpeed(r) * speedFactor(c, net, r)]));
  let changed = false;
  const links = net.links.map((l) => {
    const want = speeds.get(l.road) ?? l.freeSpeed;
    if (Math.abs(want - l.freeSpeed) < 1e-6) return l;
    changed = true;
    return { ...l, freeSpeed: want };
  });
  return changed ? links : net.links;
}

/** Change what the traffic layer doesn't know about a road (and its toll). */
export function patchRoad(net: Network, id: Id, patch: Partial<Pick<Road, 'toll' | 'speedToll' | 'condition' | 'freeway'>>): Network {
  return { ...net, version: net.version + 1, roads: net.roads.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}
