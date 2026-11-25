import { CELL, ROADS } from '../../sim/constants';
import { addRoad, planRoad, removeRoad, setRoad } from '../../sim/network';
import type { Network } from '../../sim/trafficTypes';
import type { CellRect, Lot, Pt, Quote, Road, RoadType } from '../../sim/types';
import { midOf, polyLength } from '../geometry';
import { earn } from '../money';
import { blockedBy } from '../net';
import { commitNetwork } from '../network';
import type { City } from '../state';
import { has, roadById } from '../state';
import { BRIDGE_MATCH, BRIDGE_PER_CELL, BUS_LANE_PER_CELL, KERB_COST, ONE_WAY_COST, REFUND, REMOVE_COST, SQUARE_PER_CELL, TOLL_GATE, TRUCK_BAN_COST, WIDEN } from '../tune';
import { middle, homesBeside, isGround, landFor, needTool, nightRate, no, noAt, priced, type Handler } from './shared';

const NOISY_CELLS = 1.6;
export const cellsOf = (r: Road): number => polyLength(r.line) / CELL;
const RANK: Readonly<Record<RoadType, number>> = { street: 0, avenue: 1, boulevard: 2, highway: 3 };

const noiseWarn = (c: City, type: RoadType, line: Road['line']): string | undefined => {
  if (type === 'street') return undefined;
  const n = homesBeside(c, line, NOISY_CELLS);
  return n > 0 ? `Runs past ${n} block${n > 1 ? 's' : ''} of homes: noise` : undefined;
};
const optional = (warn: string | undefined) => (warn ? { warn } : {});

/** The network after a try, or null if the traffic layer refuses it. */
function tryNet(f: () => Network): Network | null {
  try { return f(); } catch (e) { console.warn('InkRoad: network change refused', e); return null; }
}

export const road: Handler<'road'> = {
  quote(c, cmd) {
    const closed = needTool(c, cmd.type);
    if (closed) return no(closed);
    const plan = planRoad(c.net, cmd.cells, cmd.type, { oneWay: cmd.oneWay ?? false, blocked: blockedBy(c) });
    if (!plan.ok) return { ...no(plan.why ?? 'No road fits here'), line: plan.line, ...(plan.at ? { at: plan.at } : {}) };
    const bridge = plan.cellsOnWater * BRIDGE_PER_CELL * (1 + RANK[cmd.type] * 0.5);
    const paid = Math.round(bridge * (BRIDGE_MATCH[c.def.id] ?? 0));
    const council = paid > 0 ? `The Council pays ${paid} of the bridge` : undefined;
    return priced(c, plan.length * ROADS[cmd.type].cost + bridge - paid, { land: landFor(c, plan.cells.slice(1)), line: plan.line, level: plan.level, ...optional(noiseWarn(c, cmd.type, plan.line) ?? council) });
  },
  run(c, cmd) {
    const plan = planRoad(c.net, cmd.cells, cmd.type, { oneWay: cmd.oneWay ?? false, blocked: blockedBy(c) });
    const net = tryNet(() => addRoad(c.net, plan));
    if (net) commitNetwork(c, net);
    return middle(plan.line);
  },
};

export const upgrade: Handler<'upgrade'> = {
  quote(c, cmd) {
    const r = roadById(c, cmd.road);
    if (!r || !isGround(r)) return no('Pick a road on the ground');
    const closed = needTool(c, cmd.type);
    if (closed) return no(closed);
    if (r.fixed) return no('The highway ministry owns this one');
    if (r.type === cmd.type) return no('It is one already');
    if (r.works > 0) return no('Men with shovels are here already');
    const widening = RANK[cmd.type] > RANK[r.type];
    if (widening && (!c.def.rules.widen || r.cells.some((x) => c.net.terrain[x.gy]?.[x.gx] === 'h'))) return no('These old walls will not move');
    const near = widening && RANK[cmd.type] >= RANK.boulevard ? tooNear(c, r) : undefined;
    if (near) return noAt({ why: `No room: ${near.name} stands too close`, at: rectOf(near) });
    const door = cmd.type === 'highway' ? c.lots.find((l) => l.access?.road === r.id) : undefined;
    if (door) return noAt({ why: `The driveway of ${door.name} opens here: not onto a highway`, at: rectOf(door) });
    const per = Math.max(2, ROADS[cmd.type].cost - ROADS[r.type].cost * WIDEN.keep);
    const land = widening ? landFor(c, r.cells) * WIDEN.land * (RANK[cmd.type] - RANK[r.type]) : 0;
    const water = r.bridge ? wetCells(c, r) * BRIDGE_PER_CELL * 0.5 * (RANK[cmd.type] - RANK[r.type]) : 0;
    return priced(c, (cellsOf(r) * per + Math.max(0, water)) * nightRate(c), { land, works: 1, line: r.line, ...optional(noiseWarn(c, cmd.type, r.line)) });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    commitNetwork(c, setRoad(c.net, r.id, { type: cmd.type, works: has(c, 'precast') ? 0 : 1, nightWorks: c.policies.nightWorks }));
    return midOf(r);
  },
};

const wetCells = (c: City, r: Road): number => r.cells.filter((x) => c.net.terrain[x.gy]?.[x.gx] === '~').length;

const rectOf = (l: Lot): CellRect => ({ gx: l.gx, gy: l.gy, w: l.w, h: l.h });

/** A boulevard is 54 px wide: the block that stands too close for it. */
function tooNear(c: City, r: Road): Lot | undefined {
  return c.lots.find((l) => l.level > 0 && r.line.some((p) => Math.abs(p.x - (l.gx + l.w / 2) * CELL) < (l.w / 2) * CELL + 24 && Math.abs(p.y - (l.gy + l.h / 2) * CELL) < (l.h / 2) * CELL + 24));
}

export const oneWay: Handler<'oneWay'> = {
  quote(c, cmd) {
    const closed = needTool(c, 'oneway');
    if (closed) return no(closed);
    const r = roadById(c, cmd.road);
    if (!r || !isGround(r) || r.fixed) return no('This one stays two-way');
    if ((cmd.dir === 0) === !r.oneWay && (cmd.dir === 0 || (r.dir ?? 1) === cmd.dir)) return no('It is that way already');
    return priced(c, ONE_WAY_COST, { line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    commitNetwork(c, setRoad(c.net, r.id, cmd.dir === 0 ? { oneWay: false, dir: 1 } : { oneWay: true, dir: cmd.dir }));
    return midOf(r);
  },
};

export const remove: Handler<'remove'> = {
  quote(c, cmd) {
    const r = roadById(c, cmd.road);
    if (!r) return no('Nothing to remove');
    if (r.fixed) return no('The highway ministry owns this one');
    const cut = r.flyover ? undefined : strands(c, r);
    if (cut) return noAt({ why: `${cut.name} would be cut off`, at: rectOf(cut) });
    return priced(c, cellsOf(r) * REMOVE_COST, { line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const back = Math.round(cellsOf(r) * ROADS[r.type].cost * REFUND);
    earn(c, 'grant', back);
    commitNetwork(c, removeRoad(c.net, r.id));
    return midOf(r);
  },
};

/** The block that would lose its way out, or its way to the rest of the city. */
function strands(c: City, r: Road): Lot | undefined {
  const net = removeRoad(c.net, r.id);
  const was = reach(c.net);
  const mainland = reach(net);
  return c.lots.find((l) => l.access && was.has(l.access.road) && !(l.access.road !== r.id ? mainland.has(l.access.road) : stillThere(net, l)));
}

const stillThere = (net: Network, l: { gx: number; gy: number; w: number; h: number }): boolean =>
  net.roads.some((r) => isGround(r) && r.type !== 'highway' && r.line.some((p) => Math.abs(p.x / CELL - (l.gx + l.w / 2)) <= l.w / 2 + 2 && Math.abs(p.y / CELL - (l.gy + l.h / 2)) <= l.h / 2 + 2));

/** Roads joined to the first fixed road. */
function reach(net: Network): ReadonlySet<number> {
  const start = net.roads.find((r) => r.fixed) ?? net.roads[0];
  const seen = new Set<number>();
  const stack = start ? [start] : [];
  while (stack.length > 0) {
    const r = stack.pop()!;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    for (const q of net.roads) if (!seen.has(q.id) && [q.a, q.b].some((n) => n === r.a || n === r.b)) stack.push(q);
  }
  return seen;
}

type SwitchKey = 'kerb' | 'toll' | 'busLane' | 'truckBan';
interface SwitchCommand<K> { readonly t: K; readonly road: number; readonly on: boolean }
interface SwitchHandler<K> { readonly quote: (c: City, cmd: SwitchCommand<K>) => Quote; readonly run: (c: City, cmd: SwitchCommand<K>) => Pt }

/** A switch on a road: kerb bays, toll, bus lane, lorry ban. */
function roadSwitch<K extends SwitchKey>(key: K, check: (c: City, r: Road) => string | null, cost: (r: Road) => number): SwitchHandler<K> {
  return {
    quote(c, cmd) {
      const r = roadById(c, cmd.road);
      if (!r || !isGround(r)) return no('Pick a road on the ground');
      const why = check(c, r);
      if (why) return no(why);
      if (r[key] === cmd.on) return no(cmd.on ? 'It is here already' : 'There is none here');
      return priced(c, cmd.on ? cost(r) : REMOVE_COST, { line: r.line });
    },
    run(c, cmd) {
      const r = roadById(c, cmd.road)!;
      commitNetwork(c, setRoad(c.net, r.id, { [key]: cmd.on }));
      return midOf(r);
    },
  };
}

export const kerb = roadSwitch('kerb',
  (c, r) => needTool(c, 'kerb') ?? (r.type === 'highway' ? 'Nobody parks on a highway. Nobody alive' : r.bridge ? 'No bays on a bridge' : null), () => KERB_COST);
export const toll = roadSwitch('toll', (c, r) => needTool(c, 'toll') ?? (r.fixed ? 'The highway ministry owns this one' : null), () => TOLL_GATE);
export const busLane = roadSwitch('busLane',
  (c, r) => needTool(c, 'buslane') ?? (r.type === 'street' ? 'A street has one lane each way: widen it first' : null), (r) => cellsOf(r) * BUS_LANE_PER_CELL);
export const truckBan = roadSwitch('truckBan', (_, r) => (r.fixed ? 'Lorries must get in somewhere' : null), () => TRUCK_BAN_COST);

export const square: Handler<'square'> = {
  quote(c, cmd) {
    const closed = needTool(c, 'square');
    if (closed) return no(closed);
    const r = roadById(c, cmd.road);
    if (!r || !isGround(r) || r.fixed || r.type !== 'street') return no('Only a small street can become a square');
    const cut = strands(c, r);
    if (cut) return noAt({ why: `${cut.name} would be cut off`, at: rectOf(cut) });
    return priced(c, cellsOf(r) * SQUARE_PER_CELL, { line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const xs = r.cells.map((x) => x.gx);
    const ys = r.cells.map((x) => x.gy);
    const at = { gx: Math.min(...xs), gy: Math.min(...ys) };
    commitNetwork(c, removeRoad(c.net, r.id));
    c.lots = [...c.lots, {
      id: c.lots.length, name: 'The New Square', kind: 'square', ...at, w: Math.max(1, Math.max(...xs) - at.gx), h: Math.max(1, Math.max(...ys) - at.gy),
      level: 1, opensYear: c.year, maxLevel: 1, access: null, district: 'Squares', variant: 0,
    }];
    return midOf(r);
  },
};
