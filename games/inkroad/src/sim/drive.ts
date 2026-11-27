/** How fast each car wants to go next: the Intelligent Driver Model, stop lines and destinations. */
import { LANE, STEP } from './constants';
import { askWay, toLine } from './grant';
import { LEAD, look, speedAhead } from './path';
import { LANE_T } from './track';
import { capAhead } from './trackCaps';
import { shiftLength } from './vehicle/shift';
import { CHANGE, DRIVEWAY, IDM } from './tune';
import type { Sim } from './sim';

const FREE_EXP = 4;
/** Px/s over its wanted speed at which a driver brakes in earnest. */
const OVER = 0.5;
/** How much faster than the jerk limit a driver brakes when the plan's braking isn't enough. */
const URGENT = 3;
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
 * A driver's foot moves at the jerk limit (as the drawn car's, src/sim/vehicle/bicycle.ts): pulling away and easing
 * off ramp; braking harder than the comfortable plan ramps URGENT times as fast (a driver stamping on the brake).
 */
function smooth(prev: number, want: number, v: number): number {
  const base = v <= 0 ? Math.max(0, prev) : prev;
  const j = IDM.jerk * STEP;
  if (want > base) return Math.min(want, base + j);
  return Math.max(want, base - (want < -IDM.brake ? j * URGENT : j));
}

/** Set nv (speed next) and room (hard limit) for car i. */
export function think(sim: Sim, i: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const v = c.v[i]!;
  if (c.until[i]! > sim.time || c.arrived[i]) { c.nv[i] = 0; c.room[i] = 0; c.acc[i] = 0; return; }
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
  let room = LEAD.hard - 0.6;
  if (line < Infinity) {
    brake = Math.max(brake, interaction(v, v, line, IDM.lineGap, 0.25));
    room = Math.min(room, line);
  }
  if (c.service[i]! >= 0) {
    const d = toDest(sim, i);
    if (d < Infinity) brake = Math.max(brake, interaction(v, v, d + 1, 0.8, 0.25));
  }
  const r = v / v0;
  let acc = IDM.accel * (1 - (r > 1 ? Math.min(r ** FREE_EXP, 1 + (IDM.brake / IDM.accel)) : r ** FREE_EXP) - brake);
  // Over the speed it may have here (a curve ahead): brakes as planned, not by the gentle free-road term.
  if (v > v0 + OVER) acc = Math.min(acc, -IDM.brake);
  // Easing off as it reaches its speed (its foot moves at the jerk limit, so it would overshoot otherwise).
  if (acc > 0) acc = Math.min(acc, Math.sqrt(2 * IDM.jerk * Math.max(0, v0 - v)));
  acc = smooth(c.acc[i]!, Math.max(-IDM.hardBrake, acc), v);
  c.acc[i] = acc;
  c.nv[i] = Math.max(0, v + acc * STEP);
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
  if (a >= 0 && c.s[a]! - s - c.half[a]! - c.half[i]! < IDM.standGap + Math.max(0, v - c.v[a]!) * 0.6) return false;
  if (b >= 0 && s - c.s[b]! - c.half[b]! - c.half[i]! < IDM.standGap * 0.7 + Math.max(0, c.v[b]! - v) * 0.8 + c.v[b]! * 0.12) return false;
  return true;
}

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

function moveTo(sim: Sim, i: number, lane: number): void {
  const c = sim.cars;
  const t = c.track[i]!;
  const l = sim.world.links[t.link]!;
  const x = c.rx[i]!, y = c.ry[i]!;
  const s = Math.min(l.lanes[lane]!.len, (c.s[i]! / t.len) * l.lanes[lane]!.len);
  if (!fits(sim, i, lane, s)) return;
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
