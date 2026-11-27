/** The Traffic contract: cars on a network, one step at a time. */
import { gapAcross, holdAcross } from './crossing';
import { STEP } from './constants';
import { considerLane, think } from './drive';
import { feel, move, plan, pose } from './motion';
import { drawStep } from './drawn';
import { Measure } from './measure';
import { entryPose, exists, firstLink, place, reachableFrom, reachableTo, setDest, standAt, turnBack } from './place';
import { relocate } from './relocate';
import { createRng } from './rng';
import { Routes } from './routes';
import { Services } from './services';
import { stepSignals } from './signals';
import type { Sim } from './sim';
import { CarStore } from './store';
import { LANE_T } from './track';
import { CHANGE, TRUCK, isBus, kindIndex } from './tune';
import { buildWorld } from './world';
import type { Access, Arrival, LanePose, Network, SpawnRequest, Traffic } from './trafficTypes';

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
    if (c.state[i]! >= 2 && c.until[i]! <= sim.time && !release(sim, i)) { c.drop(i); continue; }
    if (!feel(sim, i)) continue;
    if ((i + sim.tick) % CHANGE.every === 0) considerLane(sim, i);
  }
  for (let i = 0; i < c.count; i++) if (c.alive[i]) { think(sim, i); c.v0[i] = c.v[i]!; c.travel[i] = 0; }
  // Leaders first within a track, so a queue moves off together.
  for (const t of sim.world.tracks) {
    for (let i = t.head; i >= 0;) {
      const behind = c.behind[i]!;
      if (c.moved[i] !== sim.tick % 2) { c.moved[i] = sim.tick % 2; move(sim, i); }
      i = behind;
    }
  }
  for (let i = 0; i < c.count; i++) if (c.alive[i]) { pose(sim, i); drawStep(sim, i); }
}

/** A car that pulled out of a space has held its lane long enough: it drives off. False: it was only standing there. */
function release(sim: Sim, i: number): boolean {
  const c = sim.cars;
  if (c.state[i] !== 4 || (c.destRoad[i]! < 0 && c.destNode[i]! < 0)) return false;
  c.state[i] = 0;
  plan(sim, i, sim.world.links[c.track[i]!.link]!);
  return true;
}

/** An arrived car turns into its space: it stands where it stopped (as last drawn), holding the lane, then is gone. */
function parkIn(sim: Sim, uid: number, seconds: number): boolean {
  const c = sim.cars;
  const i = c.slotOf.get(uid);
  if (i === undefined || c.track[i]?.kind !== LANE_T) return false; // only from a lane: never inside a junction
  c.revoke(i); // a right of way it held ahead is given back before its route is forgotten
  c.arrived[i] = 0;
  c.state[i] = 4;
  c.until[i] = sim.time + seconds;
  c.v[i] = 0;
  // No trip left, so it is gone when the hold ends; destLink stays, so it is drawn just where it stopped.
  c.destRoad[i] = c.destNode[i] = -1;
  c.opt[i] = null;
  c.blinker[i] = 0;
  return true;
}

function poseOf(sim: Sim, uid: number): LanePose | null {
  const c = sim.cars;
  const i = c.slotOf.get(uid);
  return i === undefined ? null : { x: c.x[i]!, y: c.y[i]!, a: c.heading[i]! };
}

/** Where a pull-out spawn of `r` would stand, without making it. */
function poseFor(sim: Sim, req: SpawnRequest): LanePose | null {
  const kind = kindIndex(req.kind);
  if (!exists(sim, req.from) || !exists(sim, req.to) || 'gate' in req.from) return null;
  const r = { ...req, ...reachableTo(sim, req.from, req.to, req.value, kind) };
  const l = firstLink(sim, r.from, r.to, r.value, kind);
  return l ? entryPose(l, r.from, isBus(kind)) : null;
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

function spawn(sim: Sim, req: SpawnRequest): number {
  const kind = kindIndex(req.kind);
  if ((kind === TRUCK && !sim.trucksAllowed) || !exists(sim, req.from) || !exists(sim, req.to)) return -1;
  const r = { ...req, ...reachableTo(sim, req.from, req.to, req.value, kind) };
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
  const hold = r.hold ?? 0;
  if (!place(sim, i, l, r.from, hold > 0)) { c.drop(i); return -1; }
  if (hold > 0) { c.state[i] = 4; c.until[i] = sim.time + hold; }
  if (l.road.toll) c.tolls[i]! += sim.tollNow;
  return c.uid[i]!;
}

/**
 * Slide from the pose drawn before a redirect to the pose drawn after it. The new pose is measured whole (with the
 * kerb swing toward the new place), so a swing that stays is not added twice: the car never jumps.
 */
/** Px of slide per px of offset to undo (smoothstep's steepest slope is 1.5 per unit). */
const SLIDE_PER_PX = 2;

function slideFromDrawn(sim: Sim, i: number, x: number, y: number): void {
  const c = sim.cars;
  c.offLen[i] = 0;
  pose(sim, i);
  // A long way to undo is undone over a longer stretch (slope under 1); slideFrom adds the model's own length.
  const off = Math.hypot(x - c.rx[i]!, y - c.ry[i]!);
  c.slideFrom(i, x, y, Math.max(CHANGE.length, off * SLIDE_PER_PX));
  pose(sim, i);
}

function redirect(sim: Sim, uid: number, want: Access): boolean {
  const c = sim.cars;
  const i = c.slotOf.get(uid);
  if (i === undefined || !exists(sim, want)) return false;
  const to = reachableFrom(sim, sim.world.links[c.link[i]!], want, c.value[i]!, c.kind[i]!) || !('road' in want) ? want : { road: want.road, s: want.s };
  const t = c.track[i]!;
  const x = c.rx[i]!, y = c.ry[i]!;
  setDest(sim, i, to);
  c.state[i] = 1;
  if (!c.arrived[i]) {
    // Its kerb swing toward the old place is undone smoothly, never in one step.
    if (t.kind === LANE_T && !c.granted[i]) plan(sim, i, sim.world.links[t.link]!);
    if (t.kind === LANE_T) slideFromDrawn(sim, i, x, y);
    return true;
  }
  const l = sim.world.links[t.link]!;
  if (l.node.kind === 'gate' && c.s[i]! > t.len - 3) return false;
  c.arrived[i] = 0;
  c.stuck[i] = 0;
  plan(sim, i, l);
  slideFromDrawn(sim, i, x, y);
  if (c.opt[i] || c.destLink[i]! >= 0 || turnBack(sim, i)) return true;
  c.arrived[i] = 1;
  return false;
}

function block(sim: Sim, at: Access, seconds: number, state: 2 | 3 | 4): number {
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
    park: (uid, seconds) => parkIn(sim, uid, seconds),
    poseOf: (uid) => poseOf(sim, uid),
    entryPose: (r) => poseFor(sim, r),
    block: (at, seconds, state) => block(sim, at, seconds, state),
    holdLonger: (uid, seconds) => { const i = sim.cars.slotOf.get(uid); if (i !== undefined && sim.cars.state[i] === 4) sim.cars.until[i] = Math.max(sim.cars.until[i]!, sim.time + seconds); },
    gapAcross: (at, heading, gap) => gapAcross(sim, at, heading, gap),
    holdAcross: (at, heading, seconds) => holdAcross(sim, at, heading, seconds),
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

