/** How fast each car wants to go next: the Intelligent Driver Model, stop lines and destinations. */
import { LANE } from './constants';
import { askWay, toLine } from './grant';
import { LEAD, look, speedAhead } from './path';
import { LANE_T, nearest, type Track } from './track';
import { capAhead } from './trackCaps';
import { shiftLength } from './vehicle/shift';
import { CHANGE, DRIVEWAY, IDM } from './tune';
import type { Sim } from './sim';

const FREE_EXP = 4;
/** Px/s over which a car coming up to its place to park only eases off (slower, it may still pull up to it). */
const PARK_ROLL = 8;
/** Px/s over its wanted speed at which a driver brakes in earnest. */
const OVER = 0.5;
/** Px of lane kept after a lane change ends. */
const CHANGE_ROOM = 4;
/** Share of the planned braking a car approaches a curve's cap with (the rest absorbs the foot's jerk). */
export const CURVE_PLAN = 0.6;
const TWO_ROOT_AB = 2 * Math.sqrt(IDM.accel * IDM.brake);

function interaction(v: number, dv: number, gap: number, stand: number, headway: number): number {
  const want = stand + Math.max(0, v * headway + (v * dv) / TWO_ROOT_AB);
  const r = want / Math.max(0.6, gap);
  return r * r;
}

/** Distance to where the car stops or turns off on this lane; Infinity if not here. */
export function toDest(sim: Sim, i: number): number {
  const c = sim.cars;
  return c.destLink[i]! >= 0 && c.track[i]!.link === c.destLink[i] ? c.destAt[i]! - c.s[i]! : Infinity;
}

function desired(sim: Sim, i: number): number {
  const c = sim.cars;
  const t = c.track[i]!;
  let v0 = t.vmax * c.vf[i]! * sim.speed;
  if (t.kind === LANE_T && c.state[i] === 1) v0 *= 0.8; // looking for a space
  v0 = Math.min(speedAhead(sim, i, v0), capAhead(t, c.s[i]!, IDM.brake * CURVE_PLAN));
  const d = toDest(sim, i);
  // Slow for the kerb swing by the time it starts (src/sim/drawn.ts lays it on the lane); a gate is driven out of at speed.
  if (d < Infinity && c.service[i]! < 0 && c.destNode[i]! < 0) v0 = Math.min(v0, Math.sqrt(DRIVEWAY.speed ** 2 + 2 * IDM.brake * CURVE_PLAN * Math.max(0, d - DRIVEWAY.length)));
  return Math.max(4, v0);
}

/**
 * Set acc (the acceleration the IDM commands) and room (px the front may still go before what it must never drive
 * into, plus the distance that thing itself needs to stop) for car i. The car's own limits apply in src/sim/drawn.ts.
 */
export function think(sim: Sim, i: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const v = c.v[i]!;
  if (c.until[i]! > sim.time || c.arrived[i]) { c.room[i] = 0; c.acc[i] = -IDM.hardBrake; return; }
  let open = true;
  const front = c.ahead[i]! < 0;
  let line = Infinity;
  if (t.kind === LANE_T && front) {
    const ends = c.destLink[i] === t.link;
    const gate = ends && c.destNode[i]! >= 0;
    if (gate) open = false;
    else if (ends || !askWay(sim, i)) { open = false; line = toLine(sim, i); }
  }
  const v0 = desired(sim, i);
  look(sim, i, open);
  const hw = IDM.headway * c.hw[i]! * (t.kind === LANE_T ? sim.world.links[t.link]!.headway : 0.9);
  let brake = 0;
  if (LEAD.gap < Infinity) brake = interaction(v, v - LEAD.v, LEAD.gap, IDM.standGap, hw);
  // A moving leader can't stop dead either: the room is the gap plus its own stop at the hardest braking.
  let room = LEAD.hard - 0.6 + (LEAD.hardV * LEAD.hardV) / (2 * IDM.hardBrake);
  if (line < Infinity) {
    brake = Math.max(brake, interaction(v, v, line, IDM.lineGap, 0.25));
    room = Math.min(room, line);
  }
  const d = toDest(sim, i);
  if (c.service[i]! >= 0 && d < Infinity) brake = Math.max(brake, interaction(v, v, d + 1, 0.8, 0.25));
  // Coming up to its place to park at speed it no longer speeds up: the move off the lane takes over a car easing off.
  const parking = d < DRIVEWAY.length && v > PARK_ROLL && c.service[i]! < 0 && c.destNode[i]! < 0;
  const r = v / v0;
  let acc = IDM.accel * (1 - (r > 1 ? Math.min(r ** FREE_EXP, 1 + (IDM.brake / IDM.accel)) : r ** FREE_EXP) - brake);
  // Over the speed it may have here (a curve ahead): brakes as planned, not by the gentle free-road term.
  if (v > v0 + OVER) acc = Math.min(acc, -IDM.brake);
  // Easing off as it reaches its speed (its foot moves at the jerk limit, so it would overshoot otherwise).
  if (acc > 0) acc = Math.min(acc, Math.sqrt(2 * IDM.jerk * Math.max(0, v0 - v)));
  c.acc[i] = Math.max(-IDM.hardBrake, parking ? Math.min(0, acc) : acc);
  c.room[i] = Math.max(0, room);
}

// ---------------------------------------------------------------- lanes

/** Would a car fit between its neighbours in lane `to` at s? */
function fits(sim: Sim, i: number, toLane: number, s: number): boolean {
  const c = sim.cars;
  const l = sim.world.links[c.track[i]!.link]!;
  const t = l.lanes[toLane]!;
  const v = c.v[i]!;
  let b = t.head, a = -1;
  while (b >= 0 && c.s[b]! >= s) { a = b; b = c.behind[b]!; }
  // A gap for the bodies, and room for whoever is faster to brake for the other comfortably (no car stops dead).
  if (a >= 0 && c.s[a]! - s - c.body[a]! - c.body[i]! < IDM.standGap + closeIn(v - c.v[a]!) + v * MERGE_HEADWAY) return false;
  if (b >= 0 && s - c.s[b]! - c.body[b]! - c.body[i]! < IDM.standGap * 0.7 + closeIn(c.v[b]! - v) + c.v[b]! * MERGE_HEADWAY) return false;
  // Near the lane's start the car coming up behind may still be on the turn into it.
  if (b < 0) for (const f of feeders(sim, t)) for (let q = f.head; q >= 0; q = c.behind[q]!) {
    const gap = s + f.len - c.s[q]! - c.body[q]! - c.body[i]!;
    if (gap < 80 && gap < IDM.standGap * 0.7 + closeIn(c.v[q]! - v) + c.v[q]! * MERGE_HEADWAY) return false;
  }
  return true;
}

/** The tracks leading into lane t (its junction's turns), found once per world. */
const FEED = new WeakMap<Track, Track[]>();
const FED = new WeakSet<object>();
function feeders(sim: Sim, t: Track): readonly Track[] {
  if (!FED.has(sim.world)) {
    FED.add(sim.world);
    for (const x of sim.world.tracks) if (x.to && x.kind !== LANE_T) { const l = FEED.get(x.to) ?? []; l.push(x); FEED.set(x.to, l); }
  }
  return FEED.get(t) ?? [];
}

/** Seconds of headway a lane change leaves the car it moves in front of or behind (a third of a following headway). */
const MERGE_HEADWAY = 0.35;

/** Px a car closing at dv px/s on another needs to match its speed at the planned braking, its foot ramping for 0.4 s first. */
const closeIn = (dv: number): number => (dv > 0 ? (dv * dv) / (2 * IDM.brake) + dv * 0.4 : 0);

function leaderGap(sim: Sim, i: number, lane: number, s: number): number {
  const c = sim.cars;
  const t = sim.world.links[c.track[i]!.link]!.lanes[lane]!;
  let b = t.head, a = -1;
  while (b >= 0 && c.s[b]! >= s) { if (b !== i) a = b; b = c.behind[b]!; }
  if (a < 0) return t.len - s + 40;
  return c.s[a]! - s - c.half[a]! - c.half[i]! + c.v[a]! * 1.5;
}

/** The lanes this car may use now: [lo, hi]. */
function lanesFor(sim: Sim, i: number, link: number): readonly [number, number] {
  const c = sim.cars;
  const l = sim.world.links[link]!;
  const all = c.bus[i] ? l.lanes.length - 1 : l.carLanes - 1;
  const left = l.lanes[0]!.len - c.s[i]!;
  if (c.destLink[i] === link) return c.destNode[i]! >= 0 ? [0, all] : left < 0 ? [0, all] : [all, all];
  const o = c.opt[i];
  if (!o) return [0, all];
  if (c.bus[i] && l.lanes.length > l.carLanes) return left > 140 || Math.abs(o.turn) < 0.5 || o.turn > 0.5 ? [all, all] : [o.lo, o.hi];
  return [o.lo, o.hi];
}

/** A car beside i in its own lane still sliding in from another (its body is partly in the lane i would move to). */
function crossing(sim: Sim, i: number, t: Track): boolean {
  const c = sim.cars;
  for (let q = t.head; q >= 0; q = c.behind[q]!) {
    if (q !== i && c.sliding(q) > 0 && Math.abs(c.s[q]! - c.s[i]!) < c.body[q]! + c.body[i]! + IDM.standGap + c.v[q]! * 0.5) return true;
  }
  return false;
}

/** Share of a lane change's length over which its body is still partly in the lane it leaves. */
const STILL_IN = 0.7;

/** The car ahead in its own lane leaves it room to get across before its body would reach it. */
function clearsAhead(sim: Sim, i: number): boolean {
  const c = sim.cars;
  const a = c.ahead[i]!;
  if (a < 0) return true;
  return c.s[a]! - c.s[i]! - c.body[a]! - c.body[i]! > IDM.standGap + STILL_IN * shiftLength(LANE, c.v[i]!) - c.v[a]! * 1.5;
}

function moveTo(sim: Sim, i: number, lane: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const l = sim.world.links[t.link]!;
  const x = c.rx[i]!, y = c.ry[i]!;
  // Where the car is, along the lane it moves to (the car's progress is read off where it is, src/sim/drawn.ts).
  const s = nearest(l.lanes[lane]!, x, y).s;
  if (!fits(sim, i, lane, s) || crossing(sim, i, t) || !clearsAhead(sim, i)) return;
  c.unlink(i);
  c.insert(i, l.lanes[lane]!, s);
  c.forget(i);
  c.slideFrom(i, x, y, CHANGE.short);
  c.ticket[i] = 0;
}

/** Change lane if the next turn needs it, or the next lane is much better. */
export function considerLane(sim: Sim, i: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  if (t.kind !== LANE_T || c.granted[i] || c.arrived[i] || c.until[i]! > sim.time || c.sliding(i) > 0) return;
  const l = sim.world.links[t.link]!;
  if (l.lanes.length < 2 || c.v[i]! < CHANGE.minSpeed) return;
  const left = t.len - c.s[i]!;
  // Room for the whole move across at the drawn car's rates, before the lane ends (no slide into the junction).
  if (left < Math.max(CHANGE.length * 0.5, shiftLength(LANE, c.v[i]!) + CHANGE_ROOM) || c.s[i]! < 6) return;
  const [lo, hi] = lanesFor(sim, i, t.link);
  const lane = t.lane;
  if (lane < lo) { moveTo(sim, i, lane + 1); return; }
  if (lane > hi) { moveTo(sim, i, lane - 1); return; }
  const here = leaderGap(sim, i, lane, c.s[i]!);
  if (here > c.v[i]! * 2.2 + 30) return;
  let best = -1, bestGap = here + CHANGE.gain;
  for (const k of [lane - 1, lane + 1]) {
    if (k < lo || k > hi) continue;
    const g = leaderGap(sim, i, k, c.s[i]!);
    if (g > bestGap) { best = k; bestGap = g; }
  }
  if (best >= 0) moveTo(sim, i, best);
}
