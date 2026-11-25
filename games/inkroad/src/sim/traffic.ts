/** The Traffic contract: cars on a network, one step at a time. */
import { STEP } from './constants';
import { considerLane, think } from './drive';
import { feel, move, plan, pose } from './motion';
import { Measure } from './measure';
import { exists, firstLink, place, setDest, standAt, turnBack } from './place';
import { relocate } from './relocate';
import { createRng } from './rng';
import { Routes } from './routes';
import { Services } from './services';
import { stepSignals } from './signals';
import type { Sim } from './sim';
import { CarStore } from './store';
import { LANE_T } from './track';
import { CHANGE, TRUCK, kindIndex } from './tune';
import { buildWorld } from './world';
import type { Access, Arrival, Network, SpawnRequest, Traffic } from './trafficTypes';

const HONK_KEEP = 8;

function createSim(net: Network, seed: number): Sim {
  // The parts look the Sim up lazily, because they and the Sim hold each other.
  const box: { sim?: Sim } = {};
  const get = (): Sim => box.sim!;
  const sim: Sim = {
    world: buildWorld(net), cars: new CarStore(), rng: createRng(seed), time: 0, tick: 0, tollNow: 0, speed: 1, trucksAllowed: true,
    arrivals: [], gaveUp: [], honks: [], routes: new Routes(get), measure: new Measure(get), services: new Services(get),
  };
  box.sim = sim;
  sim.routes.reset();
  return sim;
}

/** Cars the city neither sent on nor took off since the last step have parked. */
function clearArrived(sim: Sim): void {
  const c = sim.cars;
  for (let i = 0; i < c.count; i++) if (c.alive[i] && c.arrived[i]) c.drop(i);
}

function stepCars(sim: Sim): void {
  const c = sim.cars;
  for (let i = 0; i < c.count; i++) {
    if (!c.alive[i]) continue;
    if (c.state[i]! >= 2 && c.until[i]! <= sim.time) { c.drop(i); continue; }
    if (!feel(sim, i)) continue;
    if ((i + sim.tick) % CHANGE.every === 0) considerLane(sim, i);
  }
  for (let i = 0; i < c.count; i++) if (c.alive[i]) think(sim, i);
  // Leaders first within a track, so a queue moves off together.
  for (const t of sim.world.tracks) {
    for (let i = t.head; i >= 0;) {
      const behind = c.behind[i]!;
      if (c.moved[i] !== sim.tick % 2) { c.moved[i] = sim.tick % 2; move(sim, i); }
      i = behind;
    }
  }
  for (let i = 0; i < c.count; i++) if (c.alive[i]) pose(sim, i);
}

function step(sim: Sim): void {
  clearArrived(sim);
  sim.time += STEP;
  sim.tick++;
  stepSignals(sim);
  sim.services.tick();
  stepCars(sim);
  sim.measure.tick(sim.tick);
  sim.routes.tick();
}

function spawn(sim: Sim, r: SpawnRequest): number {
  const kind = kindIndex(r.kind);
  if ((kind === TRUCK && !sim.trucksAllowed) || !exists(sim, r.from) || !exists(sim, r.to)) return -1;
  const l = firstLink(sim, r.from, r.to, r.value, kind);
  if (!l) return -1;
  const c = sim.cars;
  const i = c.take(kind);
  if (i < 0) return -1;
  c.tint[i] = r.tint ?? 0;
  c.tag[i] = r.tag;
  c.value[i] = r.value;
  c.born[i] = sim.time;
  c.moved[i] = sim.tick % 2;
  setDest(sim, i, r.to);
  if (!place(sim, i, l, r.from)) { c.drop(i); return -1; }
  if (l.road.toll) c.tolls[i]! += sim.tollNow;
  return c.uid[i]!;
}

function redirect(sim: Sim, uid: number, to: Access): boolean {
  const c = sim.cars;
  const i = c.slotOf.get(uid);
  if (i === undefined || !exists(sim, to)) return false;
  const t = c.track[i]!;
  const x = c.x[i]!, y = c.y[i]!, h = c.heading[i]!;
  setDest(sim, i, to);
  c.state[i] = 1;
  if (!c.arrived[i]) { if (t.kind === LANE_T && !c.granted[i]) plan(sim, i, sim.world.links[t.link]!); return true; }
  const l = sim.world.links[t.link]!;
  if (l.node.kind === 'gate' && c.s[i]! > t.len - 3) return false;
  c.arrived[i] = 0;
  c.stuck[i] = 0;
  plan(sim, i, l);
  c.slideFrom(i, x, y, h, CHANGE.length);
  if (c.opt[i] || c.destLink[i]! >= 0 || turnBack(sim, i)) return true;
  c.arrived[i] = 1;
  return false;
}

function block(sim: Sim, at: Access, seconds: number, state: 2 | 3): number {
  if (!exists(sim, at)) return -1;
  const c = sim.cars;
  const i = c.take(kindIndex('car'));
  if (i < 0) return -1;
  c.state[i] = state;
  c.until[i] = sim.time + seconds;
  c.born[i] = sim.time;
  c.tint[i] = sim.rng.int(6);
  if (!standAt(sim, i, at)) { c.drop(i); return -1; }
  return c.uid[i]!;
}

function clearAll(sim: Sim): void {
  const c = sim.cars;
  for (let i = 0; i < c.count; i++) c.drop(i);
  sim.arrivals = [];
  sim.gaveUp = [];
  sim.honks = [];
  sim.services.park();
}

function carsOn(sim: Sim, road: number): number[] {
  const c = sim.cars;
  const out: number[] = [];
  for (const id of sim.world.roadById.get(road)?.links ?? []) {
    for (const t of sim.world.linkById.get(id)?.lanes ?? []) for (let i = t.head; i >= 0; i = c.behind[i]!) out.push(c.uid[i]!);
  }
  return out;
}

export function createTraffic(net: Network, seed: number): Traffic {
  const sim = createSim(net, seed);
  const drain = (key: 'arrivals' | 'gaveUp'): Arrival[] => { const list = sim[key]; sim[key] = []; return list; };
  return {
    get cars() { return sim.cars; },
    get active() { return sim.cars.active; },
    setNetwork: (next) => { if (next !== sim.world.net) relocate(sim, buildWorld(next)); },
    setConditions: (k) => { sim.tollNow = k.tollNow; sim.speed = Math.max(0.2, k.speed); sim.trucksAllowed = k.trucksAllowed; },
    spawn: (r) => spawn(sim, r),
    redirect: (uid, to) => redirect(sim, uid, to),
    remove: (uid) => { const i = sim.cars.slotOf.get(uid); if (i !== undefined) sim.cars.drop(i); },
    block: (at, seconds, state) => block(sim, at, seconds, state),
    addService: (r) => sim.services.add(r),
    removeService: (id) => sim.services.remove(id),
    serviceLap: (id) => sim.services.lap(id),
    estimate: (from, to, value) => sim.routes.estimate(from, to, value),
    step: () => step(sim),
    drainArrivals: () => drain('arrivals'),
    drainGaveUp: () => drain('gaveUp'),
    drainHonks: () => { const h = sim.honks.slice(0, HONK_KEEP); sim.honks = []; return h; },
    movements: (node) => sim.measure.movements(node),
    roadStats: (road) => sim.measure.roadStats(road),
    junctionStats: (node) => sim.measure.junction(node),
    carsOn: (road) => carsOn(sim, road),
    routeOf: (uid) => {
      const c = sim.cars, i = c.slotOf.get(uid);
      return i === undefined ? null : { tag: c.tag[i]!, seconds: sim.time - c.born[i]!, waited: c.waited[i]! };
    },
    startDay: () => { clearAll(sim); sim.measure.startDay(); },
    endDay: () => { sim.measure.endDay(); clearAll(sim); },
  };
}

