/** What the player reads: movements, junction and road numbers. */
import { STEP } from './constants';
import { gradeOf, ROUTE } from './tune';
import { LANE_T, TURN_T, type Track } from './track';
import { lineLength, sliceLine } from './geom';
import type { LinkRt, NodeRt, OutOpt } from './world';
import type { Sim } from './sim';
import type { Id, JunctionStats, Movement, Pt, RoadStats } from './types';

interface Window { readonly cars: Float64Array; readonly wait: Float64Array; at: number }
interface Count { cars: number; wait: number; held: number; lastCars: number; lastWait: number; lastHeld: number }
interface RoadCount { flow: number; ratio: number; queue: number; lastFlow: number; lastRatio: number; lastQueue: number; sumRatio: number; sumQueue: number; n: number; entered: number }

const RECENT = 30; // seconds, for road flow
const EVERY = 5; // steps
const ARROW = 44;
const LIVE_CARS = 6;
/** The live grade looks back this far, in half-second buckets. */
const WINDOW = 20;
/** A quiet junction is judged as if at least this many cars came. */
const QUIET = 3;
const DAWN = 8; // seconds
const PAUSE_WAIT = 1.5;

const newCount = (): Count => ({ cars: 0, wait: 0, held: 0, lastCars: 0, lastWait: 0, lastHeld: 0 });
const newRoad = (): RoadCount => ({ flow: 0, ratio: 1, queue: 0, lastFlow: 0, lastRatio: 1, lastQueue: 0, sumRatio: 0, sumQueue: 0, n: 0, entered: 0 });

export class Measure {
  private readonly moves = new Map<string, Count>();
  private readonly roads = new Map<Id, RoadCount>();
  private readonly windows = new Map<Id, Window>();
  private live = true;
  private elapsed = 0;
  private waiting = new Map<Id, { n: number; wait: number }>();
  private readonly sim: () => Sim;

  constructor(sim: () => Sim) { this.sim = sim; }

  private count(node: Id, from: Id, to: Id): Count {
    const k = `${node}:${from}:${to}`;
    let c = this.moves.get(k);
    if (!c) { c = newCount(); this.moves.set(k, c); }
    return c;
  }

  private road(id: Id): RoadCount {
    let r = this.roads.get(id);
    if (!r) { r = newRoad(); this.roads.set(id, r); }
    return r;
  }

  private window(node: Id): Window {
    let w = this.windows.get(node);
    if (!w) { w = { cars: new Float64Array(WINDOW), wait: new Float64Array(WINDOW), at: 0 }; this.windows.set(node, w); }
    return w;
  }

  /** Car i has come through `o` onto link l. Ramps pass its waiting on to the junction they serve. */
  entered(i: number, l: LinkRt, o: OutOpt | null): void {
    const c = this.sim().cars;
    this.road(l.road.id).entered++;
    if (!o) { c.linkWait[i] = 0; return; }
    const fly = o.from.road.flyover;
    if (fly) this.add(fly.node, fly.fromRoad, fly.toRoad, c.linkWait[i]!);
    else if (o.from.node.j.ramp) return;
    else this.add(o.from.link.to, o.from.road.id, l.road.id, c.linkWait[i]!);
    c.linkWait[i] = 0;
  }

  /** Which movement a waiting car wants, looking past ramp nodes. null = it is finishing its trip here. */
  private wants(i: number): { node: Id; from: Id; to: Id } | null {
    const { cars: c, world: w, routes } = this.sim();
    const t = c.track[i];
    let o: OutOpt | null = t?.kind === LANE_T && c.destLink[i] !== t.link ? c.opt[i] ?? null : null;
    for (let hop = 0; o && hop < 4; hop++) {
      const fly = o.to.road.flyover;
      if (!o.from.node.j.ramp) return { node: o.from.link.to, from: o.from.road.id, to: o.to.road.id };
      if (fly) return { node: fly.node, from: fly.fromRoad, to: fly.toRoad };
      const on: LinkRt | undefined = w.links[o.to.i];
      o = on ? routes.choose(c.field[i]!, c.value[i]!, on, c.uid[i]!) : null;
    }
    return null;
  }

  private hold(i: number): { node: Id; from: Id; to: Id } | null {
    const m = this.wants(i);
    if (!m) return null;
    const k = this.count(m.node, m.from, m.to);
    k.held++;
    k.wait += this.sim().cars.linkWait[i]!;
    return m;
  }

  /** A driver left the queue for good: the wait still counts. */
  gaveUp(i: number): void {
    const m = this.hold(i);
    if (!m) return;
    const w = this.window(m.node);
    w.cars[w.at]!++;
    w.wait[w.at]! += this.sim().cars.linkWait[i]!;
  }

  /** Every car held up now, with the movement it wants. */
  private held(): Map<string, { n: number; wait: number }> {
    const c = this.sim().cars;
    const out = new Map<string, { n: number; wait: number }>();
    for (let i = 0; i < c.count; i++) {
      if (!c.alive[i] || c.state[i]! >= 2 || c.arrived[i] || c.linkWait[i]! <= PAUSE_WAIT) continue;
      const m = this.wants(i);
      if (!m) continue;
      const key = `${m.node}:${m.from}:${m.to}`;
      const e = out.get(key) ?? { n: 0, wait: 0 };
      out.set(key, { n: e.n + 1, wait: e.wait + c.linkWait[i]! });
    }
    return out;
  }

  private add(node: Id, from: Id, to: Id, wait: number): void {
    const k = this.count(node, from, to);
    k.cars++;
    k.wait += wait;
    const w = this.window(node);
    w.cars[w.at]!++;
    w.wait[w.at]! += wait;
  }

  tick(tick: number): void {
    if (tick % EVERY !== 0) return;
    const dt = EVERY * STEP;
    this.elapsed += dt;
    for (const w of this.windows.values()) {
      w.at = (w.at + 1) % WINDOW;
      w.cars[w.at] = w.wait[w.at] = 0;
    }
    this.scan(dt);
  }

  /** Once every half second: speeds and queues per road, smoothed link times, who is waiting where. */
  private scan(dt: number): void {
    const { cars: c, world: w } = this.sim();
    const sum = new Float64Array(w.links.length), n = new Float64Array(w.links.length), queue = new Float64Array(w.links.length);
    this.waiting = new Map();
    for (let i = 0; i < c.count; i++) {
      const t = c.track[i];
      if (!c.alive[i] || !t || c.arrived[i]) continue;
      const l = t.kind === LANE_T ? t.link : c.link[i]!;
      if (l < 0) continue;
      if (t.kind === LANE_T) {
        sum[l]! += c.v[i]!;
        n[l]!++;
        if (c.v[i]! < 6) queue[l]!++;
      }
      if (c.linkWait[i]! > PAUSE_WAIT && t.kind === LANE_T && c.destLink[i] !== l) {
        const node = w.links[l]!.statNode;
        const e = this.waiting.get(node) ?? { n: 0, wait: 0 };
        e.n++;
        e.wait += c.linkWait[i]!;
        this.waiting.set(node, e);
      }
    }
    for (const l of w.links) this.linkTime(l, sum[l.i]!, n[l.i]!, dt);
    this.roadNumbers(sum, n, queue, dt);
  }

  private linkTime(l: LinkRt, sum: number, n: number, dt: number): void {
    const len = l.lanes[0]!.len;
    const target = n === 0 ? l.freeTime : Math.min(ROUTE.maxTime, Math.max(l.freeTime, len / Math.max(2.5, sum / n) + (l.freeTime - len / l.link.freeSpeed)));
    l.time += (target - l.time) * (1 - Math.exp(-ROUTE.alpha * dt));
  }

  private roadNumbers(sum: Float64Array, n: Float64Array, queue: Float64Array, dt: number): void {
    const w = this.sim().world;
    const k = 1 - Math.exp(-dt / 3), kf = 1 - Math.exp(-dt / RECENT);
    for (const r of w.net.roads) {
      const m = this.road(r.id);
      let s = 0, cnt = 0, q = 0, free = 1;
      for (const id of r.links) {
        const l = w.linkById.get(id)!;
        s += sum[l.i]!;
        cnt += n[l.i]!;
        q += queue[l.i]!;
        free = l.link.freeSpeed * this.sim().speed;
      }
      m.ratio += ((cnt > 0 ? Math.min(1, s / cnt / free) : 1) - m.ratio) * k;
      m.queue += (q - m.queue) * k;
      m.flow += ((m.entered / dt) * 60 - m.flow) * kf;
      m.entered = 0;
      m.sumRatio += m.ratio;
      m.sumQueue += m.queue;
      m.n++;
    }
  }

  startDay(): void {
    this.live = true;
    this.elapsed = 0;
    for (const k of this.moves.values()) k.cars = k.wait = k.held = 0;
    this.windows.clear();
    for (const r of this.roads.values()) Object.assign(r, { flow: 0, ratio: 1, queue: 0, sumRatio: 0, sumQueue: 0, n: 0, entered: 0 });
    for (const l of this.sim().world.links) l.time = l.freeTime;
    this.waiting = new Map();
  }

  endDay(): void {
    const c = this.sim().cars;
    for (let i = 0; i < c.count; i++) if (c.alive[i] && c.state[i]! < 2 && !c.arrived[i] && c.linkWait[i]! > PAUSE_WAIT) this.hold(i);
    this.live = false;
    for (const k of this.moves.values()) { k.lastCars = k.cars; k.lastWait = k.wait; k.lastHeld = k.held; }
    for (const r of this.roads.values()) {
      if (r.n === 0) continue;
      r.lastRatio = r.sumRatio / r.n;
      r.lastQueue = r.sumQueue / r.n;
      r.lastFlow = r.flow;
    }
    this.waiting = new Map();
  }

  /** Today's numbers, or yesterday's. `n` counts everybody who waited, through or not. */
  private seen(k: Count, live: boolean): { cars: number; wait: number; n: number } {
    return live ? { cars: k.cars, wait: k.wait, n: k.cars + k.held } : { cars: k.lastCars, wait: k.lastWait, n: k.lastCars + k.lastHeld };
  }

  movements(node: Id): readonly Movement[] {
    const sim = this.sim();
    const n = sim.world.nodeById.get(node);
    if (!n || n.j.ramp) return [];
    const held = this.live ? this.held() : null;
    const queued = held ? [...held].some(([key]) => key.startsWith(`${node}:`)) : false;
    const today = this.live && (queued || this.nodeCars(node) >= LIVE_CARS);
    const rows = n.ins.filter((l) => !l.road.flyover).flatMap((l) => l.opts.filter((o) => !o.uTurn).map((o) => {
      const k = this.count(node, l.road.id, o.to.road.id);
      const seen = this.seen(k, today || (this.live && k.lastCars + k.lastHeld === 0));
      const here = held?.get(`${node}:${l.road.id}:${o.to.road.id}`) ?? { n: 0, wait: 0 };
      return { o, cars: seen.cars, sum: seen.wait + here.wait, n: seen.n + here.n };
    }));
    const total = rows.reduce((p, r) => p + r.sum, 0);
    return rows.map((r) => {
      const fly = sim.world.net.roads.find((q) => q.flyover?.node === node && q.flyover.fromRoad === r.o.from.road.id && q.flyover.toRoad === r.o.to.road.id);
      return {
        node, fromRoad: r.o.from.road.id, toRoad: r.o.to.road.id, cars: r.cars, wait: r.n > 0 ? r.sum / r.n : 0,
        share: total > 0 ? r.sum / total : 0, arrow: fly ? fly.line : arrowOf(n, r.o), flyover: fly !== undefined,
      };
    });
  }

  private nodeCars(node: Id): number {
    let sum = 0;
    for (const [key, k] of this.moves) if (key.startsWith(`${node}:`)) sum += k.cars;
    return sum;
  }

  /** By day: the last ten seconds and everybody waiting now. At night (and at first light): the whole last day. */
  junction(node: Id): JunctionStats {
    let cars = 0, last = 0, lastWait = 0, lastHeld = 0;
    for (const [key, k] of this.moves) {
      if (!key.startsWith(`${node}:`)) continue;
      cars += k.cars;
      last += k.lastCars;
      lastWait += k.lastWait;
      lastHeld += k.lastHeld;
    }
    const day = this.live && !(cars === 0 && last + lastHeld > 0 && this.elapsed < DAWN);
    if (!day) {
      const mean = last + lastHeld > 0 ? lastWait / (last + lastHeld) : 0;
      return { wait: mean, cars: last, grade: gradeOf(mean) };
    }
    const here = this.waiting.get(node), w = this.windows.get(node);
    let n = here?.n ?? 0, sum = here?.wait ?? 0;
    if (w) for (let i = 0; i < WINDOW; i++) { n += w.cars[i]!; sum += w.wait[i]!; }
    const mean = sum / Math.max(QUIET, n);
    return { wait: mean, cars, grade: gradeOf(mean) };
  }

  roadStats(id: Id): RoadStats {
    const r = this.roads.get(id);
    if (!r) return { flow: 0, speedRatio: 1, queue: 0 };
    return this.live ? { flow: r.flow, speedRatio: r.ratio, queue: r.queue } : { flow: r.lastFlow, speedRatio: r.lastRatio, queue: r.lastQueue };
  }
}

/** The arrow from a little before the junction to a little after, along the cars' own path. */
function arrowOf(n: NodeRt, o: OutOpt): Pt[] {
  const inT = o.from.lanes[Math.min(o.hi, Math.max(o.lo, Math.floor((o.lo + o.hi) / 2)))]!;
  const conn = o.conn[inT.lane] ?? o.conn.find((t) => t) ?? null;
  const before = inT.points(), beforeLen = lineLength(before);
  const mid: Pt[] = conn ? conn.points() : [];
  let out: Track = conn?.kind === TURN_T && conn.to ? conn.to : o.to.lanes[0]!;
  if (conn && n.ring && conn.kind !== TURN_T) {
    let at = conn.arm;
    const arms = n.ring.arms;
    for (let hop = 0; hop < arms.length; hop++) {
      mid.push(...arms[at]!.arc.points());
      at = (at + 1) % arms.length;
      if (at === o.exitArm) break;
      mid.push(...arms[at]!.span.points());
    }
    const x = arms[o.exitArm]!.exits[0]!;
    mid.push(...x.points());
    out = x.to!;
  }
  const after = out.points();
  return [...sliceLine(before, Math.max(0, beforeLen - ARROW), beforeLen), ...mid, ...sliceLine(after, 0, Math.min(ARROW, lineLength(after)))];
}
