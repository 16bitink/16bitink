import type { Network } from '../sim/trafficTypes';
import type { Id, Pt, Road } from '../sim/types';
import { pointAlong, polyLength } from './geometry';

export interface RoadPoint { readonly road: Id; readonly s: number }
interface Step { readonly node: Id; readonly d: number; readonly via: Road | null; readonly prev: Id | null }

/** The part of a polyline between two distances, in travel order. */
function slice(line: readonly Pt[], from: number, to: number): Pt[] {
  if (from > to) return slice(line, to, from).reverse();
  const out: Pt[] = [pointAlong(line, from)];
  let run = 0;
  for (let i = 1; i < line.length; i++) {
    run += Math.hypot(line[i]!.x - line[i - 1]!.x, line[i]!.y - line[i - 1]!.y);
    if (run > from && run < to) out.push(line[i]!);
  }
  return [...out, pointAlong(line, to)];
}

/** Dijkstra by length over the roads, honouring one-ways. */
function search(net: Network, seeds: readonly { node: Id; d: number }[], goal: ReadonlyMap<Id, number>): { readonly end: Id; readonly steps: Map<Id, Step> } | null {
  const steps = new Map<Id, Step>(seeds.map((s) => [s.node, { node: s.node, d: s.d, via: null, prev: null }]));
  const done = new Set<Id>();
  let best: { end: Id; d: number } | null = null;
  for (;;) {
    let cur: Step | null = null;
    for (const s of steps.values()) if (!done.has(s.node) && (!cur || s.d < cur.d)) cur = s;
    if (!cur || (best && cur.d >= best.d)) break;
    done.add(cur.node);
    const tail = goal.get(cur.node);
    if (tail !== undefined && (!best || cur.d + tail < best.d)) best = { end: cur.node, d: cur.d + tail };
    for (const r of net.roads) {
      const next = r.a === cur.node ? r.b : r.b === cur.node && !r.oneWay ? r.a : null;
      if (next === null || done.has(next)) continue;
      const d = cur.d + polyLength(r.line);
      const have = steps.get(next);
      if (!have || d < have.d) steps.set(next, { node: next, d, via: r, prev: cur.node });
    }
  }
  return best ? { end: best.end, steps } : null;
}

/** A path finder over one network: from a place on a road to another, as points to draw. */
export function router(net: Network): (from: RoadPoint, to: RoadPoint) => readonly Pt[] | null {
  const roads = new Map(net.roads.map((r) => [r.id, r]));
  return (from, to) => {
    const a = roads.get(from.road);
    const b = roads.get(to.road);
    if (!a || !b) return null;
    if (a === b) return slice(a.line, from.s, to.s);
    const la = polyLength(a.line);
    const lb = polyLength(b.line);
    const seeds = [{ node: a.b, d: la - from.s }, ...(a.oneWay ? [] : [{ node: a.a, d: from.s }])];
    const goal = new Map<Id, number>([[b.a, to.s], ...(b.oneWay ? [] : [[b.b, lb - to.s] as const])]);
    const found = search(net, seeds, goal);
    if (!found) return null;
    const mid: Pt[][] = [];
    let node: Id = found.end;
    for (;;) {
      const s = found.steps.get(node)!;
      if (!s.via || s.prev === null) break;
      mid.unshift(s.via.b === node ? [...s.via.line] : [...s.via.line].reverse());
      node = s.prev;
    }
    const head = node === a.b ? slice(a.line, from.s, la) : slice(a.line, from.s, 0);
    const tail = found.end === b.a ? slice(b.line, 0, to.s) : slice(b.line, lb, to.s);
    return [...head, ...mid.flat(), ...tail];
  };
}
