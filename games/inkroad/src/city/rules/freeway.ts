import { CELL, ROADS } from '../../sim/constants';
import { planRoad, setRoad } from '../../sim/network';
import type { Cell, Command, Lot, Quote, Road, SpecialView } from '../../sim/types';
import { no, nightRate, priced, type Handler } from '../commands/shared';
import { builtArea, blocksMeet, centreOf, clamp, distToLine, midOf, polyLength, vertexInBlock, type Block } from '../geometry';
import { blockAccess, blockedBy } from '../net';
import { commitNetwork } from '../network';
import { sore } from '../score';
import type { City } from '../state';
import { emit, roadById } from '../state';
import { patchRoad } from './ground';
import { ruleState, setRule } from './state';

/**
 * Cross Rivers: the freeway cuts the city. It is loud, nobody can cross it,
 * and it is old. Piece by piece it may become a boulevard: some of its traffic
 * moves next door, some simply stops coming, a park appears, approval dips
 * while it is dug and rises after.
 */
export const FREEWAY = {
  works: 2, share: 0.5, dip: 2.5, digging: 4, joy: 2.2, joyMax: 14, noise: 12, near: 4.5, through: 0.05, throughMin: 0.65, cars: 0.006, carsMin: 0.5, parkGap: 2, parkDeep: 2,
} as const;
const PARKS = ['Old Lane Park', 'Quiet Park', 'Seven Ducks Park', 'Asphalt Garden', 'Exit Nine Park', 'Bench Park', 'Puddle Park', 'Off Ramp Garden'];

export const freewayOpen = (c: City): boolean => c.def.rules.freeway !== undefined && c.year >= c.def.rules.freeway.from;
const pieces = (c: City): readonly Road[] => c.net.roads.filter((r) => r.freeway);

/** Nobody crosses a freeway: a new road may not join or cut it. Other orders for it go through the boulevard plan. */
export function freewayVeto(c: City, cmd: Command): string | null {
  if (!c.def.rules.freeway) return null;
  if (cmd.t === 'road') {
    const plan = planRoad(c.net, cmd.cells, cmd.type, { oneWay: cmd.oneWay ?? false, blocked: blockedBy(c) });
    return plan.ok && plan.splits.some((id) => roadById(c, id)?.freeway) ? 'The freeway is in the way. It usually is' : null;
  }
  if (cmd.t !== 'upgrade' && cmd.t !== 'remove' && cmd.t !== 'square' && cmd.t !== 'oneWay') return null;
  return roadById(c, cmd.road)?.freeway ? 'It is a freeway: make it a boulevard instead' : null;
}

export const boulevard: Handler<'boulevard'> = {
  quote(c, cmd): Quote {
    const r = roadById(c, cmd.road);
    if (!freewayOpen(c)) return no('The Council still likes its freeway');
    if (!r?.freeway) return no('Pick a piece of the freeway');
    if (r.works > 0) return no('Men with shovels are here already');
    const cost = (polyLength(r.line) / CELL) * ROADS.boulevard.cost * FREEWAY.share * nightRate(c);
    return priced(c, cost, { works: FREEWAY.works, line: r.line, warn: 'People will grumble first and stroll later' });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    const net = setRoad(c.net, r.id, { type: 'boulevard', works: FREEWAY.works, nightWorks: c.policies.nightWorks });
    commitNetwork(c, patchRoad(net, r.id, { condition: 1 }));
    const s = ruleState(c).freeway;
    setRule(c, { freeway: { ...s, digs: [...s.digs, { road: r.id, left: FREEWAY.works }] } });
    c.approval = clamp(c.approval - FREEWAY.dip, 0, 100);
    return midOf(r);
  },
};

// ---------------------------------------------------------------- the night

export function nightFreeway(c: City): void {
  const s = ruleState(c).freeway;
  if (!c.def.rules.freeway || s.digs.length === 0) return;
  const digs = s.digs.map((d) => ({ ...d, left: d.left - 1 }));
  const ready = digs.filter((d) => d.left <= 0);
  setRule(c, { freeway: { digs: digs.filter((d) => d.left > 0), done: s.done + ready.length } });
  for (const d of ready) {
    const r = roadById(c, d.road);
    c.ownership = Math.max(FREEWAY.carsMin, c.ownership - FREEWAY.cars);
    if (r) openPark(c, r);
  }
}

/** Grass beside the new boulevard, on the first side with room for it. */
function openPark(c: City, r: Road): void {
  const at = parkSite(c, r);
  if (!at) return;
  const n = c.lots.filter((l) => PARKS.includes(l.name)).length;
  const park: Lot = {
    id: c.lots.length, name: PARKS[n % PARKS.length]!, kind: 'park', ...at, level: 1, opensYear: c.year, maxLevel: 1,
    access: blockAccess(c.net, at), district: 'New Green', variant: n,
  };
  c.lots = [...c.lots, park];
  emit(c, { t: 'toast', who: 'zaza', text: `${park.name} is open where the freeway was. I can hear a duck. One duck!` });
}

/** Free ground beside the old freeway, the nearest to its middle. */
function parkSite(c: City, r: Road): Block | null {
  const middle = Math.floor(r.cells.length / 2);
  const along = r.cells.slice(1, -1).map((x, i) => ({ x, off: Math.abs(i + 1 - middle) })).sort((p, q) => p.off - q.off).map((p) => p.x);
  const flat = Math.abs(r.cells[r.cells.length - 1]!.gx - r.cells[0]!.gx) >= Math.abs(r.cells[r.cells.length - 1]!.gy - r.cells[0]!.gy);
  for (const long of [4, 2]) {
    for (const at of along) {
      const free = sitesBeside(at, flat, long).find((b) => isFree(c, b));
      if (free) return free;
    }
  }
  return null;
}

function sitesBeside(at: Cell, flat: boolean, long: number): readonly Block[] {
  const deep = FREEWAY.parkDeep, gap = FREEWAY.parkGap, half = long / 2;
  return flat
    ? [{ gx: at.gx - half, gy: at.gy - gap - deep, w: long, h: deep }, { gx: at.gx - half, gy: at.gy + gap, w: long, h: deep }]
    : [{ gx: at.gx - gap - deep, gy: at.gy - half, w: deep, h: long }, { gx: at.gx + gap, gy: at.gy - half, w: deep, h: long }];
}

function isFree(c: City, b: Block): boolean {
  for (let x = b.gx; x <= b.gx + b.w; x++) for (let y = b.gy; y <= b.gy + b.h; y++) if (c.net.terrain[y]?.[x] !== '.') return false;
  return ![...c.lots, ...c.parks].some((l) => blocksMeet(l, b)) && !c.net.roads.some((r) => r.cells.some((x) => vertexInBlock(b, x)));
}

/** Streets points: the cut that is left, the digging, and the joy of what is done. */
export function freewayStreets(c: City): number {
  if (!c.def.rules.freeway) return 0;
  const s = ruleState(c).freeway;
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0);
  const left = pieces(c);
  const cut = homes.filter((l) => left.some((r) => distToLine(r.line, centreOf(l)) < FREEWAY.near * CELL));
  const all = homes.reduce((n, l) => n + builtArea(l), 0);
  const share = all > 0 ? cut.reduce((n, l) => n + builtArea(l), 0) / all : 0;
  const loud = cut[(c.year + c.season) % Math.max(1, cut.length)];
  if (loud) sore(c, { bar: 'streets', kind: 'severed', at: centreOf(loud), weight: 2 + share * 5, lot: loud.id, n: cut.length });
  return Math.min(FREEWAY.joyMax, s.done * FREEWAY.joy) - share * FREEWAY.noise - s.digs.length * FREEWAY.digging;
}

/** Some through traffic never comes back once its road is gone. */
export const throughShare = (c: City): number =>
  (c.def.rules.freeway ? Math.max(FREEWAY.throughMin, 1 - FREEWAY.through * ruleState(c).freeway.done) : 1);

export function freewayView(c: City): SpecialView['freeway'] {
  if (!c.def.rules.freeway) return undefined;
  const s = ruleState(c).freeway;
  return { open: freewayOpen(c), left: pieces(c).length, done: s.done, digging: s.digs.length };
}
