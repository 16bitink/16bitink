/**
 * The one state of a moving car (docs/inkroad-vehicle-model.md "Round 6: one car state"): the car is the vehicle model,
 * a kinematic bicycle at the rear axle (rear axle, heading, speed, wheel angle, acceleration). Each sim step drives it
 * in sub-steps of 1/60 played second: the IDM's commanded acceleration (src/sim/drive.ts), bounded by the car's own
 * limits and by what it can still stop in, and the tracker's steering along its reference (the line of its tracks,
 * with the lane-change slide laid on it). Its progress s on the track is read off where the car is (the rear axle's
 * projection on the reference + toMiddle), never integrated apart; queues, stops, grants and gaps read that.
 * Each sub-step's pose goes into CarStore.frames, which the renderer and the motion tests read (`frameAt`).
 */
import { STEP } from './constants';
import { nextTrack } from './path';
import type { Sim } from './sim';
import { FRAME_STRIDE, SUB, type CarStore } from './store';
import type { Track } from './track';
import { startOn, steerFor, wantAccel } from './vehicle/follow';
import { playedAt, type MutablePose } from './vehicle/played';
import { sweepBehind } from './turning';
import { paramsOf, type VehicleParams } from './vehicle/params';
import { stepInto, type CarState, type MutableCar } from './vehicle/bicycle';
import { VEHICLES } from './constants';
import type { VehicleKind } from './types';

const DT = STEP / SUB;
/** Px of reference curvature previewed: half the road lag (speedProfile LAG_ROAD) plus 0.15 s of travel. */
const PREVIEW_PX = 2, PREVIEW_S = 0.15;
/**
 * Further than this from its reference (px) the car is put on it: a teleport the sim made (a rebuilt road, a bus
 * turned round beyond the map's edge). Nearer, it steers onto it from where it is.
 */
const LOST = 80, LOST_STANDING = 60, ALONG_LOST = 8;
/** fOn of a car held standing (a pull-out at its joining pose): it goes on from where it stands when released. */
const HELD = 2;
/** A held car further than this off its reference (px, or cos of the heading error) was held somewhere else: put on it. */
const HELD_NEAR = 4, HELD_TURN = 0.9;

const PARAMS: readonly VehicleParams[] = VEHICLES.map((k) => paramsOf(k as VehicleKind));
export const paramsOfKind = (kind: number): VehicleParams => PARAMS[kind] ?? PARAMS[0]!;

/** Quintic smoothstep and its first two derivatives (no curvature step at either end). */
export function q5(u: number): readonly [number, number, number] {
  return [u * u * u * (10 - 15 * u + 6 * u * u), 30 * u * u * (1 - u) * (1 - u), 60 * u * (1 - u) * (1 - 2 * u)];
}

interface RefOut { x: number; y: number; th: number; k: number; z: number }
const REF: RefOut = { x: 0, y: 0, th: 0, k: 0, z: 0 };

/** The track and px along it at progress p (px from the start of the car's current track, negative = behind it). */
let chainT: Track | null = null, chainS = 0;
function chainAt(sim: Sim, i: number, p: number): void {
  const c = sim.cars;
  let t = c.track[i]!, s = p;
  if (s < 0) {
    const h0 = c.hist0[i];
    if (h0) { s += h0.len; t = h0; if (s < 0 && c.hist1[i]) { t = c.hist1[i]!; s += t.len; } }
  } else if (s > t.len) {
    const n = nextTrack(sim, i, t);
    if (n) { s -= t.len; t = n; }
  }
  chainT = t; chainS = s;
}

/** The track's line at s (beyond its ends: straight on along the end heading) into REF. */
function lineAt(t: Track, s: number): void {
  const u = t.len > 1e-9 ? s * t.inv : 0;
  const i = Math.max(0, Math.min(t.n - 1, Math.floor(u)));
  const f = Math.max(0, Math.min(1, u - i));
  const h = t.hs[i]! + (t.hs[i + 1]! - t.hs[i]!) * f;
  REF.x = t.xs[i]! + (t.xs[i + 1]! - t.xs[i]!) * f;
  REF.y = t.ys[i]! + (t.ys[i + 1]! - t.ys[i]!) * f;
  REF.z = t.zs[i]! + (t.zs[i + 1]! - t.zs[i]!) * f;
  REF.th = h;
  REF.k = (t.hs[i + 1]! - t.hs[i]!) * t.inv;
  const over = s < 0 ? s : s > t.len ? s - t.len : 0;
  if (over !== 0) { REF.x += over * Math.cos(h); REF.y += over * Math.sin(h); REF.k = 0; }
}

/** Height of the road under the body's middle at progress p. */
function zAt(sim: Sim, i: number, p: number): number {
  chainAt(sim, i, p);
  lineAt(chainT!, chainS);
  return REF.z;
}

/**
 * The reference at progress p (px along the car's current track; behind it into the tracks it came by, ahead of it
 * into the next one): the line, plus the lane-change slide (quintic in progress).
 */
export function refAt(sim: Sim, i: number, p: number): RefOut {
  const c = sim.cars;
  chainAt(sim, i, p);
  lineAt(chainT!, chainS);
  let bend = 0, hx = 0, hy = 0, ox = 0, oy = 0;
  const len = c.offLen[i]!;
  const u = len > 0 ? (c.offEnd[i]! - p) / len : 0;
  if (u > 0) {
    const [e, e1, e2] = q5(Math.min(1, u));
    ox = c.offX[i]! * e; oy = c.offY[i]! * e;
    if (u < 1) {
      hx = (-c.offX[i]! * e1) / len; hy = (-c.offY[i]! * e1) / len;
      bend = ((-c.offX[i]! * Math.sin(REF.th) + c.offY[i]! * Math.cos(REF.th)) * e2) / (len * len);
    }
  }
  REF.x += ox;
  REF.y += oy;
  const tx = Math.cos(REF.th) + hx, ty = Math.sin(REF.th) + hy;
  if (hx !== 0 || hy !== 0) REF.th += Math.atan2(-Math.sin(REF.th) * tx + Math.cos(REF.th) * ty, Math.cos(REF.th) * tx + Math.sin(REF.th) * ty);
  REF.k += bend;
  return REF;
}

/** Scratch car of the hot loop (loaded from the store, stepped, written back). */
const CAR: MutableCar = { x: 0, y: 0, th: 0, u: 0, dir: 1, delta: 0, a: 0 };

function load(c: CarStore, i: number): MutableCar {
  CAR.x = c.fx[i]!; CAR.y = c.fy[i]!; CAR.th = c.fth[i]!; CAR.u = c.fu[i]!; CAR.dir = 1; CAR.delta = c.fdelta[i]!; CAR.a = c.fa[i]!;
  return CAR;
}

function store(c: CarStore, i: number, q: CarState): void {
  c.fx[i] = q.x; c.fy[i] = q.y; c.fth[i] = q.th; c.fu[i] = q.u; c.fdelta[i] = q.delta; c.fa[i] = q.a;
}

/** Writes frame k of car i from its state (the body's middle, toMiddle ahead of the rear axle). */
function frame(c: CarStore, i: number, k: number, p: VehicleParams, z: number, q: CarState): void {
  const o = (i * (SUB + 1) + k) * FRAME_STRIDE;
  c.frames[o] = q.x + p.toMiddle * Math.cos(q.th);
  c.frames[o + 1] = q.y + p.toMiddle * Math.sin(q.th);
  c.frames[o + 2] = q.th;
  c.frames[o + 3] = z;
}

/**
 * The rear axle's progress on its reference: from the guess pr, moved by how far along the reference the axle stands
 * (twice, so a curve's first-order error is gone). REF holds the reference there.
 */
function project(sim: Sim, i: number, q: CarState, pr: number): number {
  for (let k = 0; k < 2; k++) {
    const r = refAt(sim, i, pr);
    const along = (q.x - r.x) * Math.cos(r.th) + (q.y - r.y) * Math.sin(r.th);
    if (Math.abs(along) < 1e-4) return pr;
    pr += along;
  }
  refAt(sim, i, pr);
  return pr;
}

/** Is car i's state somewhere the sim no longer has it (a teleport), so it is put on its reference? */
function misplaced(sim: Sim, i: number, p: VehicleParams): boolean {
  const c = sim.cars;
  if (c.fOn[i] === 0) return true;
  const r = refAt(sim, i, c.s[i]! - p.toMiddle);
  const off = Math.hypot(c.fx[i]! - r.x, c.fy[i]! - r.y);
  if (off > LOST || (off > LOST_STANDING && c.v[i] === 0 && c.fu[i] === 0)) return true;
  // Put somewhere along its lane the car is not (a rebuilt road): its queue place is the sim's, so it goes there.
  if (Math.abs((c.fx[i]! - r.x) * Math.cos(r.th) + (c.fy[i]! - r.y) * Math.sin(r.th)) > ALONG_LOST) return true;
  // Released from a hold where it stood drawn (a pull-out's played move ends on its lane): it goes on from there.
  return c.fOn[i] === HELD && (off > HELD_NEAR || Math.cos(c.fth[i]! - r.th) < HELD_TURN);
}

/**
 * Drives car i through one sim step, writing its frames: the IDM's acceleration (c.acc) within `room` px of hard
 * room (c.room), or braking to a stand when `stop`. Its s, v and travel are read off the car afterwards.
 */
export function driveCar(sim: Sim, i: number, stop = false): void {
  const c = sim.cars;
  const p = paramsOfKind(c.kind[i]!);
  copyLast(c, i);
  if (misplaced(sim, i, p)) begin(sim, i, p, c.s[i]!);
  c.fOn[i] = 1;
  c.drove[i] = sim.tick;
  const car = load(c, i);
  const s0 = c.s[i]!, idm = stop ? -p.brake : c.acc[i]!, room = stop ? 0 : c.room[i]!;
  // Standing with nothing asking it to go (a queue, a red light, a stand-in): it stays as it is.
  if (car.u === 0 && car.a === 0 && (idm <= 0 || room <= 0.5)) { standStill(c, i); c.v[i] = 0; c.travel[i] = 0; return; }
  let pr = s0 - p.toMiddle;
  for (let k = 1; k <= SUB; k++) {
    pr = project(sim, i, car, pr);
    const x = REF.x, y = REF.y, th = REF.th;
    const kAhead = refAt(sim, i, pr + PREVIEW_PX + car.u * PREVIEW_S).k;
    const a = wantAccel(car.u, car.a, idm, room - (pr + p.toMiddle - s0), p);
    stepInto(car, a, steerFor(car, x, y, th, kAhead, p), p, DT);
    frame(c, i, k, p, zAt(sim, i, pr + p.toMiddle), car);
  }
  pr = project(sim, i, car, pr);
  // A car that has not moved keeps its place (re-projecting a standing car across a joint of tracks would creep it).
  const still = Math.abs(car.x - c.fx[i]!) + Math.abs(car.y - c.fy[i]!) < 1e-6;
  store(c, i, car);
  // Forward only: its progress never runs back (a joint of tracks can bias a projection by a hair).
  if (!still) c.s[i] = Math.max(s0, pr + p.toMiddle);
  c.v[i] = car.u;
  c.travel[i] = c.s[i]! - s0;
}

/** Frames 1..SUB of a car that stands: its frame 0. */
function standStill(c: CarStore, i: number): void {
  const o = i * (SUB + 1) * FRAME_STRIDE;
  for (let k = 1; k <= SUB; k++) for (let j = 0; j < FRAME_STRIDE; j++) c.frames[o + k * FRAME_STRIDE + j] = c.frames[o + j]!;
}

/** Drawing after the step: a driven car is drawn where it is; a played turn plays; a held car stands where it was drawn. */
export function drawStep(sim: Sim, i: number): void {
  const c = sim.cars;
  const p = paramsOfKind(c.kind[i]!);
  if (c.drove[i] === sim.tick) { finish(sim, i, p); return; }
  copyLast(c, i);
  if (c.play[i]) { playStep(sim, i, p); return; }
  c.lag[i] = 0;
  still(sim, i, p);
}

/** The drawn pose of a driven car is its state; followers keep back from the whole turn a car waiting at a dead end will make. */
function finish(sim: Sim, i: number, p: VehicleParams): void {
  const c = sim.cars;
  const r = c.reserve[i];
  c.lag[i] = r ? Math.max(0, sweepBehind(r, 0, c.track[i]!, c.s[i]!, p.len, p.wid, c.body[i]!)) : 0;
  const o = (i * (SUB + 1) + SUB) * FRAME_STRIDE;
  c.x[i] = c.frames[o]!;
  c.y[i] = c.frames[o + 1]!;
  c.heading[i] = c.frames[o + 2]!;
  c.z[i] = c.frames[o + 3]!;
  c.speed[i] = c.fu[i]!;
}

/** A car turning round on the road (src/sim/turning.ts): it plays the turn's frames at the sim's clock. */
const PLAY_AT: MutablePose = { x: 0, y: 0, a: 0 };
function playStep(sim: Sim, i: number, p: VehicleParams): void {
  const c = sim.cars;
  const m = c.play[i]!;
  const o = i * (SUB + 1) * FRAME_STRIDE;
  const t0 = sim.time - STEP - c.playAt[i]!;
  for (let k = 1; k <= SUB; k++) {
    playedAt(m, t0 + k * DT, PLAY_AT);
    c.frames[o + k * FRAME_STRIDE] = PLAY_AT.x;
    c.frames[o + k * FRAME_STRIDE + 1] = PLAY_AT.y;
    c.frames[o + k * FRAME_STRIDE + 2] = PLAY_AT.a;
    c.frames[o + k * FRAME_STRIDE + 3] = 0;
  }
  // The car goes on from the turn's last frame shown, standing (the turn ends standing).
  store(c, i, { x: PLAY_AT.x - p.toMiddle * Math.cos(PLAY_AT.a), y: PLAY_AT.y - p.toMiddle * Math.sin(PLAY_AT.a), th: PLAY_AT.a, u: 0, dir: 1, delta: t0 + STEP >= m.seconds ? m.end.delta : 0, a: 0 });
  c.fOn[i] = 1;
  // Followers keep back from the rest of the turn's sweep, not just from where it stands now.
  c.lag[i] = sweepBehind(m, Math.max(0, t0 + STEP), c.track[i]!, c.s[i]!, p.len, p.wid, c.body[i]!);
  c.x[i] = PLAY_AT.x; c.y[i] = PLAY_AT.y; c.heading[i] = PLAY_AT.a; c.speed[i] = 0; c.z[i] = 0;
}

/** A car that appears where a played move left it (src/city/movePlan.ts): standing at that pose of its middle, wheels straight. */
export function placeDrawn(sim: Sim, i: number, x: number, y: number, a: number): void {
  const c = sim.cars;
  const p = paramsOfKind(c.kind[i]!);
  store(c, i, { x: x - p.toMiddle * Math.cos(a), y: y - p.toMiddle * Math.sin(a), th: a, u: 0, dir: 1, delta: 0, a: 0 });
  const o = i * (SUB + 1) * FRAME_STRIDE;
  for (let k = 0; k <= SUB; k++) { c.frames[o + k * FRAME_STRIDE] = x; c.frames[o + k * FRAME_STRIDE + 1] = y; c.frames[o + k * FRAME_STRIDE + 2] = a; c.frames[o + k * FRAME_STRIDE + 3] = c.z[i]!; }
  c.fOn[i] = HELD;
  c.x[i] = x; c.y[i] = y; c.heading[i] = a; c.speed[i] = 0;
}

/** Continue from the final frame of a forward merge, including acceleration and steering. */
export function resumeMerge(c: CarStore, i: number, end: CarState): void {
  store(c, i, end);
  c.fOn[i] = 1;
  c.v[i] = c.speed[i] = end.u;
}

/** The car set on its reference at progress m (the body's middle), at its sim speed, as frame 0. */
function begin(sim: Sim, i: number, p: VehicleParams, m: number): void {
  const c = sim.cars;
  const r = refAt(sim, i, m - p.toMiddle);
  store(c, i, startOn({ x: r.x, y: r.y, th: r.th, k: r.k }, c.v[i]!, p));
  c.fOn[i] = 1;
  const o = i * (SUB + 1) * FRAME_STRIDE;
  c.frames[o] = r.x + p.toMiddle * Math.cos(r.th);
  c.frames[o + 1] = r.y + p.toMiddle * Math.sin(r.th);
  c.frames[o + 2] = r.th;
  c.frames[o + 3] = r.z;
}

/** Frame 0 of this step is the last frame of the one before. */
function copyLast(c: CarStore, i: number): void {
  const o = i * (SUB + 1) * FRAME_STRIDE, last = o + SUB * FRAME_STRIDE;
  for (let j = 0; j < FRAME_STRIDE; j++) c.frames[o + j] = c.frames[last + j]!;
}

/**
 * A car held in its lane (a manoeuvre is drawing it, a stand-in, a pull-out at its joining pose): it stays where it
 * was last drawn, and goes on from there when it is released.
 */
function still(sim: Sim, i: number, p: VehicleParams): void {
  const c = sim.cars;
  if (c.fOn[i] === 0) begin(sim, i, p, c.s[i]!);
  standStill(c, i);
  c.fOn[i] = HELD;
  c.speed[i] = 0;
}
