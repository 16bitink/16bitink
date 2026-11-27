/** Moving cars: the step itself, going from track to track, arriving, and where each is drawn. */
import { GIVE_UP, STEP } from './constants';
import { toDest } from './drive';
import { hasRoom } from './grant';
import { nextTrack } from './path';
import { receipt, type Sim } from './sim';
import { refAt } from './drawn';
import { LANE_T, TURN_T, type Track } from './track';
import { ANGER_FULL, HONK_AT, REROUTE_AFTER } from './tune';
import { laneS, type LinkRt } from './world';
import { runsWith } from './routes';

const TINY = 1e-3;
const CRAWL = 4;

// ---------------------------------------------------------------- choosing the way

/** Where the trip ends on this link, if it does; otherwise the next turn. */
export function plan(sim: Sim, i: number, l: LinkRt): void {
  const c = sim.cars;
  c.destLink[i] = -1;
  c.opt[i] = null;
  c.link[i] = l.i;
  c.blinker[i] = 0;
  if (c.destNode[i]! >= 0 && l.link.to === c.destNode[i] && l.node.kind === 'gate') {
    c.destLink[i] = l.i;
    c.destAt[i] = l.lanes[0]!.len - 1;
    return;
  }
  if (c.destRoad[i] === l.road.id && runsWith(l, c.destDir[i])) {
    const at = laneS(l, c.destS[i]!);
    const t = c.track[i]!;
    if (t.link !== l.i || c.s[i]! <= at + 2) {
      c.destLink[i] = l.i;
      // A long vehicle's front stops at the lane's end: its stop is never further on than its body lets it reach.
      c.destAt[i] = Math.min(l.lanes[0]!.len - c.half[i]! - 1, Math.max(at, t.link === l.i ? c.s[i]! : 0));
      return;
    }
  }
  c.field[i] = sim.routes.keyFor(c.destRoad[i]!, c.destNode[i]!, c.value[i]!, c.kind[i]!, c.destDir[i]);
  c.opt[i] = sim.routes.choose(c.field[i]!, c.value[i]!, l, c.uid[i]!);
}

/** A car stuck too long leaves the road (its receipt keeps where it was drawn, so the city can turn it in at a building). */
export function giveUp(sim: Sim, i: number): void {
  if (sim.cars.service[i]! >= 0) { sim.services.lost(i); return; }
  if (sim.cars.state[i]! < 2) {
    sim.measure.gaveUp(i);
    sim.gaveUp.push(receipt(sim, i));
  }
  sim.cars.drop(i);
}

// ---------------------------------------------------------------- track to track

function enterLane(sim: Sim, i: number, t: Track): void {
  const c = sim.cars;
  const l = sim.world.links[t.link]!;
  c.revoke(i);
  c.ticket[i] = 0;
  sim.measure.entered(i, l, c.opt[i] ?? null);
  if (l.road.toll) c.tolls[i]! += sim.tollNow;
  c.rerouted[i] = 0;
  plan(sim, i, l);
}

/** Kept at the very end of its track: the px it didn't drive come off its travel (the drawn car follows travel). */
function holdAtEnd(c: Sim['cars'], i: number, t: Track, v: number): void {
  c.travel[i] = Math.max(0, c.travel[i]! - (c.s[i]! - (t.len - TINY)));
  c.s[i] = t.len - TINY;
  c.v[i] = v;
  c.acc[i] = Math.min(c.acc[i]!, 0);
}

/** Cross into the next track. False = no room there: wait at the very end of this one. */
function cross(sim: Sim, i: number, t: Track, next: Track): boolean {
  const c = sim.cars;
  const over = c.s[i]! - t.len;
  const q = next.tail;
  if (q >= 0 && c.s[q]! - c.half[q]! - c.half[i]! < over) {
    holdAtEnd(c, i, t, Math.min(c.v[i]!, c.v[q]!));
    return false;
  }
  c.unlink(i);
  c.hop(i, t);
  t.lastOut = i;
  t.lastOutUid = c.uid[i]!;
  c.push(i, next, Math.max(0, over));
  if (next.kind !== LANE_T && !next.occ.includes(i)) next.occ.push(i);
  if (next.kind === LANE_T) enterLane(sim, i, next);
  return true;
}

function advance(sim: Sim, i: number): void {
  const c = sim.cars;
  for (let hop = 0; hop < 6; hop++) {
    const t = c.track[i]!;
    if (c.s[i]! < t.len) return;
    const next = nextTrack(sim, i, t);
    const barred = t.kind === LANE_T && !c.granted[i] && next !== null && (sim.world.nodes[next.node]!.kind !== 'free' || next.turnRound !== null);
    if (!next || barred) { holdAtEnd(c, i, t, 0); return; }
    if (!cross(sim, i, t, next)) return;
  }
}

function arrive(sim: Sim, i: number): void {
  const c = sim.cars;
  if (c.service[i]! >= 0) { sim.services.atStop(i); return; }
  c.arrived[i] = 1;
  sim.arrivals.push(receipt(sim, i));
}

/** Move car i by one step. */
export function move(sim: Sim, i: number): void {
  const c = sim.cars;
  const v = c.v[i]!, nv = c.nv[i]!;
  let ds = ((v + nv) / 2) * STEP;
  if (nv === 0 && v > 0) ds = Math.min(ds, (v * STEP) / 2);
  let after = nv;
  if (ds > c.room[i]!) { ds = c.room[i]!; after = Math.min(nv, ds / STEP); c.acc[i] = Math.min(c.acc[i]!, (after - v) / STEP); }
  // A three-point turn stops at each change of gear (the drawn car never glides through one in a step).
  const cusp = c.track[i]!.cusps.find((k) => c.s[i]! < k - TINY && c.s[i]! + ds > k);
  if (cusp !== undefined) { ds = cusp - c.s[i]!; after = 0; }
  c.s[i]! += ds;
  c.v[i] = after;
  c.travel[i] = ds;
  if (c.arrived[i]) return;
  const d = toDest(sim, i);
  if (d <= (c.service[i]! >= 0 ? 2.5 : 0) && c.until[i]! <= sim.time) { arrive(sim, i); return; }
  advance(sim, i);
}

// ---------------------------------------------------------------- waiting

function honk(sim: Sim, i: number, before: number): void {
  const c = sim.cars;
  const w = c.stuck[i]!;
  if (c.state[i]! >= 2 || w < HONK_AT || Math.floor(before / HONK_AT) === Math.floor(w / HONK_AT)) return;
  if (sim.honks.length < 8 && sim.rng.chance(0.3)) sim.honks.push({ x: c.x[i]!, y: c.y[i]! });
}

/** A driver held up at the line by a full road tries another way. */
function tryAnotherWay(sim: Sim, i: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const o = c.opt[i];
  if (t.kind !== LANE_T || c.ahead[i]! >= 0 || c.granted[i] || c.rerouted[i]! + REROUTE_AFTER > sim.time || !o) return;
  const conn = o.conn[t.lane];
  c.rerouted[i] = sim.time;
  if (conn?.to && conn.kind === TURN_T && hasRoom(sim, i, conn.to)) return;
  const l = sim.world.links[t.link]!;
  const lanes = (q: typeof o): boolean => q !== o && t.lane >= q.lo && t.lane <= q.hi && !!q.conn[t.lane] && hasRoom(sim, i, q.to.lanes[0]!);
  const other = sim.routes.choose(c.field[i]!, c.value[i]!, l, c.uid[i]!, lanes);
  if (other) { c.opt[i] = other; c.ticket[i] = 0; }
}

/** In the wrong lane at the line: take the best way this lane has. */
function settleLane(sim: Sim, i: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const o = c.opt[i];
  if (!o || c.granted[i] || t.kind !== LANE_T || t.len - c.s[i]! > 34) return;
  const l = sim.world.links[t.link]!;
  if (t.lane >= l.carLanes || (t.lane >= o.lo && t.lane <= o.hi && o.conn[t.lane])) return;
  const inLane = sim.routes.choose(c.field[i]!, c.value[i]!, l, c.uid[i]!, (q) => t.lane >= q.lo && t.lane <= q.hi && !!q.conn[t.lane]);
  if (inLane) c.opt[i] = inLane;
  else if (!o.conn[t.lane]) c.opt[i] = l.opts.find((q) => q.conn[t.lane]) ?? o;
}

/** Waiting, anger, giving up. Returns false if the car left. */
export function feel(sim: Sim, i: number): boolean {
  const c = sim.cars;
  const t = c.track[i]!;
  if (c.until[i]! > sim.time) return true;
  const v0 = t.kind === LANE_T ? t.vmax : 40;
  const slow = Math.max(0, 1 - c.v[i]! / (0.5 * v0));
  c.waited[i]! += slow * STEP;
  c.linkWait[i]! += slow * STEP;
  const before = c.stuck[i]!;
  c.stuck[i] = c.v[i]! < CRAWL ? before + STEP : Math.max(0, before - STEP * 3);
  c.anger[i] = Math.min(1, (c.waited[i]! * 0.5 + c.stuck[i]! * 0.9) / ANGER_FULL);
  if (c.stuck[i]! > HONK_AT) honk(sim, i, before);
  if (c.stuck[i]! > REROUTE_AFTER) tryAnotherWay(sim, i);
  settleLane(sim, i);
  const lost = t.kind === LANE_T && !c.opt[i] && c.destLink[i] !== t.link && c.stuck[i]! > 3;
  if (c.stuck[i]! >= GIVE_UP || lost) { giveUp(sim, i); return false; }
  return true;
}

// ---------------------------------------------------------------- drawing

/** The reference pose of the body's middle (its track, the lane-change slide, the kerb swing): rx, ry, rh, z. */
export function pose(sim: Sim, i: number): void {
  const c = sim.cars;
  const r = refAt(sim, i, c.s[i]!);
  c.rx[i] = r.x;
  c.ry[i] = r.y;
  c.rh[i] = r.th;
  c.z[i] = r.z;
  // Not drawn yet (it just appeared): it is drawn on its reference until its first step.
  if (c.fOn[i] === 0) { c.x[i] = r.x; c.y[i] = r.y; c.heading[i] = r.th; c.speed[i] = c.v[i]!; }
  blink(sim, i, c.track[i]!);
}

function blink(sim: Sim, i: number, t: Track): void {
  const c = sim.cars;
  const o = c.opt[i];
  if (t.kind === LANE_T) {
    const near = t.len - c.s[i]! < 110;
    c.blinker[i] = toDest(sim, i) < 60 && c.destNode[i]! < 0 ? 1 : near && o && Math.abs(o.turn) > 0.5 && o.conn[t.lane]?.kind === TURN_T ? (o.turn > 0 ? 1 : -1) : 0;
  }
}
