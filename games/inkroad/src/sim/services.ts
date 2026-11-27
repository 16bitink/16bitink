/** Buses, trams and school buses: vehicles that loop through stops, pausing at each. */
import { MINIBUS_TINT } from './constants';
import { plan } from './motion';
import { firstLink, openAt, place, setDest, spaceAt } from './place';
import { LANE_T } from './track';
import { kindIndex } from './tune';
import type { Sim } from './sim';
import type { Access } from './trafficTypes';
import type { LinkRt } from './world';
import type { VehicleKind } from './types';

/** `turning`: on its way to a gate to turn round beyond the map edge (a terminus loop), then on to its stop. */
interface Vehicle { uid: number; stop: number; lapAt: number; laps: number; readyAt: number; turning?: boolean }
interface Service {
  readonly id: number;
  stops: readonly Access[];
  readonly kind: VehicleKind;
  readonly dwell: number;
  readonly tag: number;
  readonly vehicles: Vehicle[];
  lap: number;
}

const RETRY = 1;
const LAP_KEEP = 0.6;
const BUS_VALUE = 1;
/** Seconds a bus spends turning round beyond the map edge (its terminus loop), hidden, before it comes back in. */
const GATE_TURN = 6;
const NO_WAY = 1e6;

export class Services {
  private list: Service[] = [];
  private nextId = 1;
  private readonly sim: () => Sim;

  constructor(sim: () => Sim) { this.sim = sim; }

  add(r: { readonly stops: readonly Access[]; readonly kind: VehicleKind; readonly dwell: number; readonly vehicles: number; readonly tag: number }): number {
    const id = this.nextId++;
    const n = Math.max(0, Math.floor(r.vehicles)), k = r.stops.length;
    const vehicles = Array.from({ length: n }, (_, i): Vehicle => ({ uid: 0, stop: k > 0 ? Math.floor((i * k) / n) % k : 0, lapAt: -1, laps: 0, readyAt: this.sim().time + (i / Math.max(1, n)) * 4 }));
    this.list = [...this.list, { id, stops: r.stops, kind: r.kind, dwell: r.dwell, tag: r.tag, vehicles, lap: 0 }];
    return id;
  }

  remove(id: number): void {
    const s = this.list.find((q) => q.id === id);
    if (!s) return;
    const c = this.sim().cars;
    for (const v of s.vehicles) {
      const i = c.slotOf.get(v.uid);
      if (i !== undefined) c.drop(i);
    }
    this.list = this.list.filter((q) => q !== s);
  }

  /** Mean lap seconds: measured, else by the travel-time fields. */
  lap(id: number): number {
    const s = this.list.find((q) => q.id === id);
    if (!s) return 0;
    if (s.lap > 0) return s.lap;
    let sum = 0;
    s.stops.forEach((from, i) => {
      const t = this.sim().routes.estimate(from, s.stops[(i + 1) % s.stops.length]!, BUS_VALUE);
      sum += (t.reachable ? t.seconds : 60) + s.dwell;
    });
    return sum;
  }

  /** Put waiting vehicles on the road. */
  tick(): void {
    const sim = this.sim();
    for (const s of this.list) {
      if (s.stops.length < 2) continue;
      for (const v of s.vehicles) if (v.uid === 0 && v.readyAt <= sim.time) this.start(s, v);
    }
  }

  private start(s: Service, v: Vehicle): void {
    const sim = this.sim(), c = sim.cars;
    v.readyAt = sim.time + RETRY;
    const from = s.stops[v.stop]!, to = s.stops[(v.stop + 1) % s.stops.length]!;
    // A stop on a road under works is skipped until the road opens again.
    if (!openAt(sim, from) || !openAt(sim, to)) { v.stop = (v.stop + 1) % s.stops.length; return; }
    const kind = kindIndex(s.kind);
    const l = firstLink(sim, from, to, BUS_VALUE, kind);
    const i = l ? c.take(kind) : -1;
    if (!l || i < 0) return;
    setDest(sim, i, to);
    c.value[i] = BUS_VALUE;
    c.tag[i] = s.tag;
    c.born[i] = sim.time;
    c.service[i] = s.id;
    if (s.kind === 'van') c.tint[i] = MINIBUS_TINT;
    if (!place(sim, i, l, from)) { c.drop(i); return; }
    v.uid = c.uid[i]!;
    v.lapAt = sim.time;
    v.laps = 0;
    v.stop = (v.stop + 1) % s.stops.length;
  }

  private find(i: number): { s: Service; v: Vehicle } | null {
    const c = this.sim().cars;
    const s = this.list.find((q) => q.id === c.service[i]);
    const v = s?.vehicles.find((q) => q.uid === c.uid[i]);
    return s && v ? { s, v } : null;
  }

  /** Car i reached its stop (or the gate it turns round at): pause, then on to the next. */
  atStop(i: number): void {
    const sim = this.sim(), c = sim.cars;
    const hit = this.find(i);
    if (!hit) { c.drop(i); return; }
    const { s, v } = hit;
    if (v.turning) { this.turnAtGate(i, s, v); return; }
    c.until[i] = sim.time + s.dwell;
    c.stuck[i] = 0;
    c.waited[i] = 0;
    v.laps++;
    if (v.laps >= s.stops.length) {
      const lap = sim.time - v.lapAt;
      s.lap = s.lap > 0 ? s.lap * LAP_KEEP + lap * (1 - LAP_KEEP) : lap;
      v.laps = 0;
      v.lapAt = sim.time;
    }
    for (let hop = 0; hop < s.stops.length; hop++) {
      v.stop = (v.stop + 1) % s.stops.length;
      if (openAt(sim, s.stops[v.stop]!)) break;
    }
    setDest(sim, i, s.stops[v.stop]!);
    const l = sim.world.links[c.link[i]!]!;
    plan(sim, i, l);
    // No way on to the next stop without turning: it never reverses along the road, it goes round at a gate.
    if (!c.opt[i] && c.destLink[i]! < 0) this.toGate(i, v, l);
  }

  /** The nearest gate it can drive on to from link `l` (the line's terminus loop), or nothing (it waits as before). */
  private toGate(i: number, v: Vehicle, l: LinkRt): void {
    const sim = this.sim(), c = sim.cars;
    let best = -1, bestCost = NO_WAY;
    for (const n of sim.world.nodes) {
      if (n.kind !== 'gate' || n.outs.length === 0) continue;
      const key = sim.routes.keyFor(-1, n.j.id, BUS_VALUE, c.kind[i]!);
      const cost = l.node.j.id === n.j.id ? 0 : Math.min(NO_WAY, ...l.opts.map((o) => sim.routes.costFrom(key, BUS_VALUE, o.to)));
      if (cost < bestCost) { best = n.j.id; bestCost = cost; }
    }
    if (best < 0) return;
    v.turning = true;
    setDest(sim, i, { gate: best });
    plan(sim, i, l);
  }

  /** At the gate: round beyond the map edge, hidden for GATE_TURN s, then back in on the gate's way in. */
  private turnAtGate(i: number, s: Service, v: Vehicle): void {
    const sim = this.sim(), c = sim.cars;
    const node = sim.world.nodeById.get(c.destNode[i]!);
    const out = node?.outs[0];
    const lane = out?.lanes[c.bus[i] ? out.lanes.length - 1 : out.carLanes - 1];
    const at = c.half[i]! + 2;
    if (!out || !lane || lane.kind !== LANE_T || !spaceAt(sim, lane, at, c.half[i]!, 0)) { c.until[i] = sim.time + RETRY; return; }
    c.unlink(i);
    c.insert(i, lane, at);
    c.link[i] = out.i;
    c.v[i] = 0;
    c.state[i] = 4;
    c.until[i] = sim.time + GATE_TURN;
    c.stuck[i] = 0;
    c.waited[i] = 0;
    v.turning = false;
    setDest(sim, i, s.stops[v.stop]!);
  }

  /** A service vehicle stuck for good starts again from its next stop. */
  lost(i: number): void {
    const sim = this.sim();
    const hit = this.find(i);
    sim.cars.drop(i);
    if (hit) { hit.v.uid = 0; hit.v.readyAt = sim.time + RETRY; }
  }

  /** All cars are gone: start over next day. */
  park(): void {
    const t = this.sim().time;
    for (const s of this.list) s.vehicles.forEach((v, i) => { v.uid = 0; v.readyAt = t + (i / s.vehicles.length) * 4; });
  }

  /** New network: stops that moved. */
  remap(f: (a: Access) => Access | null): void {
    this.list = this.list.map((s) => ({ ...s, stops: s.stops.map((a) => f(a) ?? a) }));
  }
}
