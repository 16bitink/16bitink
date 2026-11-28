/** Moving cars: the step itself, going from track to track, arriving, and where each is drawn. */
import { GIVE_UP, STEP } from './constants';
import { toDest } from './drive';
import { hasRoom } from './grant';
import { ringExit } from './ringBuild';
import { nextTrack } from './path';
import { receipt, type Sim } from './sim';
import { driveCar, placeDrawn, refAt } from './drawn';
import { ENTRY_T, LANE_T, TURN_T, type Track } from './track';
import { ANGER_FULL, HONK_AT, REROUTE_AFTER } from './tune';
import { laneS, type LinkRt } from './world';
import { runsWith } from './routes';
import { reserveTurn, reverseOut, startTurn, turning } from './turning';

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

/** Keep the last driven pose when no legal manoeuvre is available. */
export function stopHere(sim: Sim, i: number): void {
  const c = sim.cars;
  c.revoke(i);
  c.arrived[i] = 0;
  c.state[i] = 3;
  c.until[i] = Infinity;
  c.v[i] = 0;
  c.play[i] = c.reserve[i] = null;
  c.mergeEnd.delete(i);
  placeDrawn(sim, i, c.x[i]!, c.y[i]!, c.heading[i]!);
}

/** A driver gives up the trip. The city either pulls the car over or leaves it at the stopped pose. */
export function giveUp(sim: Sim, i: number): void {
  const c = sim.cars;
  if (c.service[i]! >= 0) { sim.services.lost(i); return; }
  if (c.state[i]! < 2) {
    sim.measure.gaveUp(i);
    sim.gaveUp.push(receipt(sim, i));
  }
  if (sim.preserveCars && c.tag[i]! >= 0) stopHere(sim, i);
  else c.drop(i);
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

/**
 * Cross into the next track. False = no room there yet: the car stays on this one, past its end where its braking
 * took it (it is never pulled back; the room it was given makes it stop there).
 */
function cross(sim: Sim, i: number, t: Track, next: Track): boolean {
  const c = sim.cars;
  const over = c.s[i]! - t.len;
  const q = next.tail;
  if (q >= 0 && c.s[q]! - c.half[q]! - c.half[i]! < over) return false;
  c.unlink(i);
  c.hop(i, t);
  t.lastOut = i;
  t.lastOutUid = c.uid[i]!;
  c.push(i, next, Math.max(0, over));
  if (next.kind !== LANE_T && !next.occ.includes(i)) next.occ.push(i);
  if (next.kind === LANE_T) enterLane(sim, i, next);
  if (next.turnRound === 'three') turnOnto(sim, i, next);
  return true;
}

function advance(sim: Sim, i: number): void {
  const c = sim.cars;
  for (let hop = 0; hop < 6; hop++) {
    const t = c.track[i]!;
    if (c.s[i]! < t.len) return;
    const next = nextTrack(sim, i, t);
    const barred = t.kind === LANE_T && !c.granted[i] && next !== null && (sim.world.nodes[next.node]!.kind !== 'free' || next.turnRound !== null);
    // Not let on (no way granted, no lane after it): it stays on this track, braking for its end (src/sim/drive.ts).
    if (!next || barred) return;
    if (!cross(sim, i, t, next)) return;
  }
}

function arrive(sim: Sim, i: number): void {
  const c = sim.cars;
  if (c.service[i]! >= 0) { sim.services.atStop(i); return; }
  c.arrived[i] = 1;
  sim.arrivals.push(receipt(sim, i));
}

/**
 * Move car i by one step: the car drives itself (src/sim/drawn.ts) and its progress is read off where it is; then it
 * arrives or goes on to the next track. A car held in its lane (a manoeuvre draws it, a stand-in) doesn't move.
 */
export function move(sim: Sim, i: number): void {
  const c = sim.cars;
  const rolled = c.travel[i]! > 0;
  c.travel[i] = 0;
  if (c.play[i] && holdTurning(sim, i)) { if (!c.play[i]) driveCar(sim, i, true); return; }
  if (c.playGoal[i] === WAIT_TURN && waitToTurn(sim, i, rolled)) { if (!c.play[i]) driveCar(sim, i, true); return; }
  if (c.state[i]! >= 2) { c.v[i] = 0; return; }
  driveCar(sim, i);
  if (c.arrived[i]) return;
  const d = toDest(sim, i);
  if (d <= (c.service[i]! >= 0 ? 2.5 : 0) && c.until[i]! <= sim.time) { arrive(sim, i); return; }
  advance(sim, i);
}

/**
 * A car in a played turn round stands (its drawn car plays the turn) until the turn is done; then it is on the lane
 * back where the turn ended (a dead end's turn track is left at its goal). True: it is still turning.
 */
function holdTurning(sim: Sim, i: number): boolean {
  const c = sim.cars;
  if (turning(sim, i)) { c.v[i] = 0; c.acc[i] = 0; return true; }
  c.play[i] = null;
  const t = c.track[i]!;
  const back = c.playTo[i] ?? (t.turnRound !== null && c.playGoal[i]! >= 0 ? nextTrack(sim, i, t) : null);
  c.playTo[i] = null;
  if (back) {
    // Off the turn and onto the lane back just where the turn ended (the drawn car stands there).
    c.unlink(i);
    c.hop(i, t);
    c.insert(i, back, Math.min(back.len - 1, c.playGoal[i]!));
    c.v[i] = 0;
    if (back.kind === LANE_T) enterLane(sim, i, back);
  }
  return true;
}

/** Entering a dead end's three-point turn: plan it on the road and play it (src/sim/turning.ts); no clear way: it waits. */
function turnOnto(sim: Sim, i: number, t: Track): void {
  const c = sim.cars;
  const back = nextTrack(sim, i, t);
  if (!back) return;
  // A turn round starts from a stand (the car rolls onto the turn's track and brakes there first).
  const r = c.fu[i]! > STOOD ? null : startTurn(sim, i, back, 0, 0);
  if (r) { c.playGoal[i] = r.s; c.reserve[i] = null; return; }
  // Waiting: it reserves its turn, and remembers since when it waits (playAt is free while nothing plays).
  if (c.playGoal[i] !== WAIT_TURN) c.playAt[i] = sim.time;
  c.playGoal[i] = WAIT_TURN;
  reserveTurn(sim, i, back);
}

/** playGoal of a car standing at a dead end's turn, waiting for room to turn round (a car in the way). */
const WAIT_TURN = -2;
/** Px/s under which a car counts as standing. */
const STOOD = 0.05;
/** Seconds between its looks, and seconds of waiting after which it backs out of the dead end instead. */
const TURN_LOOK = 1, BACK_OUT_AFTER = 12;

/** Standing at the start of its turn until a turn that clears every body fits. True: still waiting. */
function waitToTurn(sim: Sim, i: number, rolled: boolean): boolean {
  const c = sim.cars;
  const t = c.track[i]!;
  // It brakes to a stand where it is (src/sim/drawn.ts driveCar with stop), never stopped dead; it looks once it stands.
  if (t.turnRound !== 'three') { c.playGoal[i] = -1; c.reserve[i] = null; return false; }
  if (c.fu[i]! > STOOD) return true;
  if (!rolled && Math.round(sim.time / STEP) % Math.round(TURN_LOOK / STEP) !== 0) return true;
  const waited = sim.time - c.playAt[i]!;
  if (waited > BACK_OUT_AFTER && t.from && reverseOut(sim, i, t.from)) return true;
  turnOnto(sim, i, t);
  return true;
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
  if (conn?.kind === ENTRY_T && hasRoom(sim, i, ringExit(sim.world.nodes[conn.node]!.ring!.arms[o.exitArm]!, conn.lane).to!)) return;
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
  if (l.node.kind === 'ring' && o.conn[t.lane]) return;
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
