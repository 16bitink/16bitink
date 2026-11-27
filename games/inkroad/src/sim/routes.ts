/** Travel-time fields: seconds from the start of every link to one destination, refreshed a few at a time. */
import { hash01 } from './rng';
import { ROUTE, TRUCK } from './tune';
import { laneS, type LinkRt, type OutOpt, type World } from './world';
import { isForward } from './roadGeom';
import type { Sim } from './sim';
import type { Access, Trip } from './trafficTypes';

interface Field { cost: Float64Array; at: number; used: number; readonly dest: number; readonly dir: number; readonly gate: boolean; readonly value: number; readonly truck: boolean }

/** Does this link run the way `dir` asks (1: with the road's line, -1: against it, none: either)? */
export const runsWith = (l: LinkRt, dir: number | undefined): boolean => !dir || (isForward(l.link) ? 1 : -1) === dir;

const UNREACHABLE = 1e6;
const MAX_HOPS = 80;
const PER_STEP = 3;

export class Routes {
  private fields = new Map<string, Field>();
  private readonly heap = new Heap();
  private tolls = false;
  private bans = false;
  private readonly sim: () => Sim;

  constructor(sim: () => Sim) { this.sim = sim; }

  /** New network: every field is stale. */
  reset(): void {
    this.fields.clear();
    const net = this.sim().world.net;
    this.tolls = net.roads.some((r) => r.toll);
    this.bans = net.roads.some((r) => r.truckBan);
  }

  keyFor(destRoad: number, destNode: number, value: number, kind: number, dir = 0): string {
    const tolled = this.tolls && this.sim().tollNow > 0;
    const cls = tolled ? Math.max(-6, Math.min(6, Math.round(Math.log2(Math.max(1e-4, value)) * 1.5))) : 0;
    return `${destRoad >= 0 ? `r${destRoad}` : `g${destNode}`}|${cls}|${this.bans && kind === TRUCK ? 1 : 0}|${dir > 0 ? 1 : dir < 0 ? -1 : 0}`;
  }

  private field(key: string, value: number): Field {
    const sim = this.sim();
    let f = this.fields.get(key);
    if (!f) {
      const gate = key[0] === 'g';
      const parts = key.split('|');
      f = { cost: new Float64Array(sim.world.links.length), at: -1e9, used: sim.time, dest: parseInt(key.slice(1), 10), dir: Number(parts[3] ?? 0), gate, value: Math.max(1e-4, value), truck: parts[2] === '1' };
      this.fields.set(key, f);
      this.compute(f);
    }
    f.used = sim.time;
    return f;
  }

  /** Seconds from the start of link l to the destination. */
  costFrom(key: string, value: number, l: LinkRt): number { return this.field(key, value).cost[l.i]!; }

  linkCost(l: LinkRt, f: { readonly value: number; readonly truck: boolean }): number {
    const sim = this.sim();
    let c = l.time / Math.max(0.3, sim.speed);
    if (l.road.toll) c += sim.tollNow / f.value;
    if (f.truck && l.road.truckBan) c += ROUTE.banCost;
    return c;
  }

  private compute(f: Field): void {
    const sim = this.sim();
    const links = sim.world.links;
    const cost = f.cost.fill(UNREACHABLE);
    f.at = sim.time;
    const heap = this.heap;
    heap.clear();
    for (const l of links) {
      const here = f.gate ? l.link.to === f.dest : l.road.id === f.dest && runsWith(l, f.dir);
      if (!here) continue;
      cost[l.i] = this.linkCost(l, f) * (f.gate ? 1 : 0.5);
      heap.push(cost[l.i]!, l.i);
    }
    const done = new Uint8Array(links.length);
    while (heap.size > 0) {
      const i = heap.pop();
      if (done[i]) continue;
      done[i] = 1;
      const base = cost[i]!;
      for (const o of links[i]!.preds) {
        const c = base + o.delay + this.linkCost(o.from, f);
        if (c < cost[o.from.i]! - 1e-9) { cost[o.from.i] = c; heap.push(c, o.from.i); }
      }
    }
  }

  /** Refresh the oldest few; forget fields nobody uses. Link times first. */
  tick(): void {
    const sim = this.sim();
    let left = PER_STEP;
    for (const [key, f] of this.fields) {
      if (sim.time - f.used > ROUTE.drop) { this.fields.delete(key); continue; }
      if (left > 0 && sim.time - f.at > ROUTE.refresh) { this.compute(f); left--; }
    }
  }

  /** The way on from the end of a link, with each driver's own opinion. null = no way. */
  choose(key: string, value: number, l: LinkRt, uid: number, only?: (o: OutOpt) => boolean): OutOpt | null {
    if (l.opts.length === 0) return null;
    const f = this.field(key, value);
    let best: OutOpt | null = null, bestCost = UNREACHABLE, min = UNREACHABLE;
    for (const o of l.opts) {
      if (only && !only(o)) continue;
      min = Math.min(min, f.cost[o.to.i]! + o.delay);
    }
    if (min >= UNREACHABLE) return null;
    for (const o of l.opts) {
      if (only && !only(o)) continue;
      const c = f.cost[o.to.i]! + o.delay;
      if (c > min * ROUTE.slack + 0.5) continue;
      const noisy = c * (1 + ROUTE.noise * (hash01(uid, o.to.link.id) - 0.5));
      if (noisy < bestCost) { best = o; bestCost = noisy; }
    }
    return best;
  }

  estimate(from: Access, to: Access, value: number): Trip {
    const w = this.sim().world;
    const none: Trip = { seconds: 0, toll: 0, reachable: false };
    const starts = startLinks(w, from);
    const destRoad = 'road' in to ? to.road : -1, destNode = 'gate' in to ? to.gate : -1;
    if (starts.length === 0 || (destRoad >= 0 ? !w.roadById.has(destRoad) : !w.nodeById.has(destNode))) return none;
    const key = this.keyFor(destRoad, destNode, value, 0, 'road' in to ? to.dir : 0);
    const f = this.field(key, value);
    let best: LinkRt | null = null, bestCost = UNREACHABLE, direct = false;
    for (const { l, part } of starts) {
      const cost = this.linkCost(l, f) * (1 - part);
      if ('road' in to && 'road' in from && l.road.id === to.road && runsWith(l, to.dir) && laneS(l, to.s) >= laneS(l, from.s)) {
        const d = this.linkCost(l, f) * ((laneS(l, to.s) - laneS(l, from.s)) / l.lanes[0]!.len);
        if (d < bestCost) { best = l; bestCost = d; direct = true; }
        continue;
      }
      for (const o of l.opts) {
        const c = cost + o.delay + f.cost[o.to.i]!;
        if (c < bestCost) { best = l; bestCost = c; direct = false; }
      }
    }
    if (!best || bestCost >= UNREACHABLE) return none;
    return this.walk(best, f, direct, bestCost);
  }

  private walk(start: LinkRt, f: Field, direct: boolean, cost: number): Trip {
    const toll = this.sim().tollNow;
    const via = [start.road.id];
    let paid = 0;
    for (let l = start, hop = 0; !direct && hop < MAX_HOPS; hop++) {
      let next: OutOpt | null = null, best = UNREACHABLE;
      for (const o of l.opts) {
        const c = o.delay + f.cost[o.to.i]!;
        if (c < best) { best = c; next = o; }
      }
      if (!next) break;
      l = next.to;
      via.push(l.road.id);
      if (l.road.toll) paid += toll;
      if (f.gate ? l.link.to === f.dest : l.road.id === f.dest) break;
    }
    const penalty = paid > 0 ? paid / f.value : 0;
    return { seconds: Math.max(0, cost - penalty), toll: paid, reachable: true, viaRoads: via };
  }
}

/** Links a trip may begin on, and how far along (0..1). */
export function startLinks(w: World, a: Access): { l: LinkRt; part: number }[] {
  if ('gate' in a) return (w.nodeById.get(a.gate)?.outs ?? []).map((l) => ({ l, part: 0 }));
  const r = w.roadById.get(a.road);
  if (!r) return [];
  const all = r.links.map((id) => w.linkById.get(id)!);
  // A car standing on one kerb sets off the way it faces (when told), never across the road.
  const own = a.dir ? all.filter((l) => runsWith(l, a.dir)) : all;
  return (own.length > 0 ? own : all).map((l) => ({ l, part: laneS(l, a.s) / l.lanes[0]!.len }));
}

/** Binary heap of (key, value) pairs. */
class Heap {
  private readonly k: number[] = [];
  private readonly v: number[] = [];
  get size(): number { return this.v.length; }
  clear(): void { this.k.length = this.v.length = 0; }

  push(key: number, value: number): void {
    let i = this.v.length;
    this.k.push(key);
    this.v.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p]! <= key) break;
      this.k[i] = this.k[p]!;
      this.v[i] = this.v[p]!;
      i = p;
    }
    this.k[i] = key;
    this.v[i] = value;
  }

  pop(): number {
    const top = this.v[0]!;
    const key = this.k.pop()!, value = this.v.pop()!;
    const n = this.v.length;
    if (n === 0) return top;
    let i = 0;
    for (;;) {
      let c = i * 2 + 1;
      if (c >= n) break;
      if (c + 1 < n && this.k[c + 1]! < this.k[c]!) c++;
      if (this.k[c]! >= key) break;
      this.k[i] = this.k[c]!;
      this.v[i] = this.v[c]!;
      i = c;
    }
    this.k[i] = key;
    this.v[i] = value;
    return top;
  }
}
