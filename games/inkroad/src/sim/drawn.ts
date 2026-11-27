/**
 * Where each moving car is drawn (docs/inkroad-vehicle-model.md "Step 2"): after every sim step the drawn car is driven
 * through the step in sub-steps of 1/60 played second by the vehicle model (src/sim/vehicle/follow.ts), following
 * the car's reference: the line of its tracks (lane, turn, ring) for the rear axle, with the sim's lane-change slide
 * laid on it (a car stopping at a place stops in its lane: the move off it is planned, src/city/movePlan.ts). The sim stays the authority on progress and speed; the drawn car only follows.
 * Each sub-step's pose goes into CarStore.frames, which the renderer and the motion tests read (`frameAt`).
 */
import { STEP } from './constants';
import { nextTrack } from './path';
import type { Sim } from './sim';
import { FRAME_STRIDE, SUB, type CarStore } from './store';
import type { Track } from './track';
import { followInto, startOn } from './vehicle/follow';
import { playedAt, type MutablePose } from './vehicle/played';
import { sweepBehind } from './turning';
import { paramsOf, type VehicleParams } from './vehicle/params';
import type { CarState, MutableCar } from './vehicle/bicycle';
import { VEHICLES } from './constants';
import type { VehicleKind } from './types';

const DT = STEP / SUB;
/** Px of reference curvature previewed: half the road lag (speedProfile LAG_ROAD) plus 0.15 s of travel. */
const PREVIEW_PX = 2, PREVIEW_S = 0.15;
/**
 * Further than this from its reference (px) the drawn car is put back on it: a teleport the sim made (a rebuilt road,
 * a car put back where it stands). Nearer, it drives to its point (it lagged or overshot a hard stop of the sim's).
 */
const LOST = 80, LOST_STANDING = 60;
/** fOn of a car held in its lane: drawn where it stood, put back on its reference when it is released. */
const HELD = 2;
/** A held car drawn within this of its reference (px, and cos of the heading error) goes on from where it is drawn. */
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
  const u = s * t.inv;
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
 * into the next one): the line, plus the lane-change slide and the kerb swing (both quintic in progress).
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

/** Scratch drawn car of the hot loop (loaded from the store, stepped, written back). */
const CAR: MutableCar = { x: 0, y: 0, th: 0, u: 0, dir: 1, delta: 0, a: 0 };

function load(c: CarStore, i: number): MutableCar {
  CAR.x = c.fx[i]!; CAR.y = c.fy[i]!; CAR.th = c.fth[i]!; CAR.u = c.fu[i]!; CAR.dir = 1; CAR.delta = c.fdelta[i]!; CAR.a = c.fa[i]!;
  return CAR;
}

function store(c: CarStore, i: number, q: CarState): void {
  c.fx[i] = q.x; c.fy[i] = q.y; c.fth[i] = q.th; c.fu[i] = q.u; c.fdelta[i] = q.delta; c.fa[i] = q.a;
}

/** Writes frame k of car i from its drawn state (the body's middle, toMiddle ahead of the rear axle). */
function frame(c: CarStore, i: number, k: number, p: VehicleParams, z: number, q: CarState): void {
  const o = (i * (SUB + 1) + k) * FRAME_STRIDE;
  c.frames[o] = q.x + p.toMiddle * Math.cos(q.th);
  c.frames[o + 1] = q.y + p.toMiddle * Math.sin(q.th);
  c.frames[o + 2] = q.th;
  c.frames[o + 3] = z;
}

/** The sim's speed, acceleration and travel left at the end of sub-step k (its step is a ramp of speed from v0 to v). */
let simV = 0, simA = 0, simLeft = 0;
function simAt(c: CarStore, i: number, k: number): void {
  const v0 = c.v0[i]!, v1 = c.v[i]!, d = c.travel[i]!;
  const plain = ((v0 + v1) / 2) * STEP;
  const scale = plain > 1e-6 ? d / plain : 0;
  const f = k / SUB;
  simLeft = d - (v0 * f + ((v1 - v0) * f * f) / 2) * STEP * scale;
  simV = plain > 1e-6 ? (v0 + (v1 - v0) * f) * scale : d / STEP;
  simA = ((v1 - v0) / STEP) * scale;
}

/** Drives the drawn car of car i through the step just made, writing its frames. */
export function drawStep(sim: Sim, i: number): void {
  const c = sim.cars;
  const p = paramsOfKind(c.kind[i]!);
  const s = c.s[i]!;
  copyLast(c, i);
  if (c.play[i]) { playStep(sim, i, p); return; }
  const held = c.state[i] === 4;
  const off = Math.hypot(c.fx[i]! + p.toMiddle * Math.cos(c.fth[i]!) - c.rx[i]!, c.fy[i]! + p.toMiddle * Math.sin(c.fth[i]!) - c.ry[i]!);
  const lost = c.fOn[i] !== 0 && (off > LOST || (off > LOST_STANDING && c.travel[i] === 0 && c.v[i] === 0));
  // A dead end's three-point turn with no played turn (none fitted): drawn as the sim has it.
  if (held || c.track[i]!.turnRound === 'three') { c.lag[i] = 0; still(sim, i, p, s, held); return; }
  // A car that just appeared (or was put elsewhere by the sim) starts on its reference where it was at the step's start.
  // Released from a hold where it was drawn (a pull-out's played move ends on its lane): it goes on from there; held
  // anywhere else (a bus turned round beyond the map's edge) it starts on its reference.
  const offLine = c.fOn[i] === HELD && (off > HELD_NEAR || Math.cos(c.fth[i]! - c.rh[i]!) < HELD_TURN);
  if (c.fOn[i] === 0 || lost || offLine) begin(sim, i, p, s - c.travel[i]!);
  // Released from a hold: it goes on from where it stood drawn (a pull-out's played move ends there), steering back onto its lane.
  c.fOn[i] = 1;
  const car = load(c, i);
  let z = 0, lastLead = 0;
  for (let k = 1; k <= SUB; k++) {
    simAt(c, i, k);
    const at = s - simLeft - p.toMiddle;
    z = zAt(sim, i, s - simLeft);
    let r = refAt(sim, i, at);
    const lead = -((car.x - r.x) * Math.cos(r.th) + (car.y - r.y) * Math.sin(r.th));
    // The reference where the drawn car is (it may be a little behind or ahead of the sim's point).
    if (Math.abs(lead) > 0.5) r = refAt(sim, i, at - lead);
    const x = r.x, y = r.y, th = r.th;
    const kAhead = refAt(sim, i, at - lead + PREVIEW_PX + car.u * PREVIEW_S).k;
    followInto(car, x, y, th, kAhead, simV, simA, lead, p, DT);
    lastLead = lead;
    frame(c, i, k, p, z, car);
  }
  store(c, i, car);
  c.lag[i] = lastLead;
  c.x[i] = car.x + p.toMiddle * Math.cos(car.th);
  c.y[i] = car.y + p.toMiddle * Math.sin(car.th);
  c.heading[i] = car.th;
  c.z[i] = z;
  c.speed[i] = car.u;
}

/** A car turning round on the road (src/sim/turning.ts): its drawn car plays the turn's frames at the sim's clock. */
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
  // The drawn car goes on from the turn's last frame shown, standing (the turn ends standing).
  store(c, i, { x: PLAY_AT.x - p.toMiddle * Math.cos(PLAY_AT.a), y: PLAY_AT.y - p.toMiddle * Math.sin(PLAY_AT.a), th: PLAY_AT.a, u: 0, dir: 1, delta: t0 + STEP >= m.seconds ? m.end.delta : 0, a: 0 });
  c.fOn[i] = 1;
  // Followers keep back from the rest of the turn's sweep, not just from where it stands now.
  c.lag[i] = sweepBehind(m, Math.max(0, t0 + STEP), c.track[i]!, c.s[i]!, p.len, p.wid, c.body[i]!);
  c.x[i] = PLAY_AT.x; c.y[i] = PLAY_AT.y; c.heading[i] = PLAY_AT.a; c.speed[i] = 0; c.z[i] = 0;
}

/** A car that appears where a played move left it (src/city/movePlan.ts): drawn standing at that pose of its middle, wheels straight. */
export function placeDrawn(sim: Sim, i: number, x: number, y: number, a: number): void {
  const c = sim.cars;
  const p = paramsOfKind(c.kind[i]!);
  store(c, i, { x: x - p.toMiddle * Math.cos(a), y: y - p.toMiddle * Math.sin(a), th: a, u: 0, dir: 1, delta: 0, a: 0 });
  const o = i * (SUB + 1) * FRAME_STRIDE;
  for (let k = 0; k <= SUB; k++) { c.frames[o + k * FRAME_STRIDE] = x; c.frames[o + k * FRAME_STRIDE + 1] = y; c.frames[o + k * FRAME_STRIDE + 2] = a; c.frames[o + k * FRAME_STRIDE + 3] = 0; }
  c.fOn[i] = HELD;
  c.x[i] = x; c.y[i] = y; c.heading[i] = a; c.speed[i] = 0;
}

/** The drawn car set on its reference at progress m (the body's middle), at the step's start speed, as frame 0. */
function begin(sim: Sim, i: number, p: VehicleParams, m: number): void {
  const c = sim.cars;
  const r = refAt(sim, i, m - p.toMiddle);
  store(c, i, startOn({ x: r.x, y: r.y, th: r.th, k: r.k }, c.v0[i]!, p));
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
 * Drawn where the sim puts it, without the model: a car held in its lane while the manoeuvre layer draws it, one in a
 * three-point turn, or one the sim turned round on the road (manoeuvres until phase B plans them on the ground).
 * The drawn car goes on from the last frame.
 */
function still(sim: Sim, i: number, p: VehicleParams, s: number, held: boolean): void {
  const c = sim.cars;
  if (c.fOn[i] === 0) begin(sim, i, p, s - c.travel[i]!);
  const o = i * (SUB + 1) * FRAME_STRIDE;
  // Held in its lane: it stays where it was last drawn (the manoeuvre starts there), and starts afresh when released.
  if (held) {
    for (let k = 1; k <= SUB; k++) for (let j = 0; j < FRAME_STRIDE; j++) c.frames[o + k * FRAME_STRIDE + j] = c.frames[o + j]!;
    c.fOn[i] = HELD;
    c.speed[i] = 0;
    return;
  }
  for (let k = 1; k <= SUB; k++) {
    simAt(c, i, k);
    const r = refAt(sim, i, s - simLeft);
    c.frames[o + k * FRAME_STRIDE] = r.x;
    c.frames[o + k * FRAME_STRIDE + 1] = r.y;
    c.frames[o + k * FRAME_STRIDE + 2] = r.th;
    c.frames[o + k * FRAME_STRIDE + 3] = r.z;
  }
  // The drawn car goes on from its last frame: rear axle toMiddle behind it, wheels set for the reference there.
  const last = o + SUB * FRAME_STRIDE, th = c.frames[last + 2]!;
  const k = refAt(sim, i, s - p.toMiddle).k;
  store(c, i, startOn({ x: c.frames[last]! - p.toMiddle * Math.cos(th), y: c.frames[last + 1]! - p.toMiddle * Math.sin(th), th, k }, c.v[i]!, p));
  c.fOn[i] = 1;
  c.x[i] = c.rx[i]!; c.y[i] = c.ry[i]!; c.heading[i] = c.rh[i]!;
  c.speed[i] = c.v[i]!;
}
