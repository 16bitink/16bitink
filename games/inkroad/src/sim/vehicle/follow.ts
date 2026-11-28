/**
 * The controllers of a moving car (docs/inkroad-vehicle-model.md "Round 6: one car state"): the car IS a kinematic
 * bicycle at the rear axle (src/sim/vehicle/bicycle.ts). The lateral controller steers it along its reference (its
 * lane, turn and ring tracks) with the tracker's rear-wheel feedback law; the longitudinal one is the sim's IDM
 * (src/sim/drive.ts), whose commanded acceleration this bounds by what the car can still stop in. Pure.
 */
import type { CarState } from './bicycle';
import type { VehicleParams } from './params';

/** One point of the reference for the rear axle: pose and steering curvature (1/px). */
export interface RefPoint { readonly x: number; readonly y: number; readonly th: number; readonly k: number }

/** Heading gain as a share of the wheelbase (critically damped along the path, as the tracker). */
const K_TH = 0.9;
/** Px short of the room's end a car plans to stand. */
const STOP_SHORT = 0.5;

/**
 * Would a car at u px/s (accelerating at a) run past a wall `gap` px ahead if it began braking now? Its braking ramps
 * at the jerk limit to planBrake, then holds (so braking at the full `brake` when this says yes still stops short).
 */
export function closing(u: number, a: number, gap: number, p: VehicleParams, b = p.planBrake): boolean {
  if (u <= 0) return gap <= STOP_SHORT;
  const j = p.jerk;
  const t1 = Math.max(0, (a + b) / j);
  const u1 = u + a * t1 - (j * t1 * t1) / 2;
  const d1 = u * t1 + (a * t1 * t1) / 2 - (j * t1 * t1 * t1) / 6;
  return d1 + Math.max(0, u1) ** 2 / (2 * b) >= gap - STOP_SHORT;
}

/** Share of the planned braking below which a car begins to brake for its room in earnest (the IDM reacts late to a standing car). */
const EARLY = 0.6;

/**
 * The acceleration the car is asked for: the IDM's; braking as planned once a gentle stop would no longer fit in
 * `room` px, at the car's most once a planned one would not; easing off as it comes to a stop (|a| ≤ √(2·jerk·u))
 * so it stands without a jolt.
 */
export function wantAccel(u: number, a: number, idm: number, room: number, p: VehicleParams): number {
  let want = idm;
  if (closing(u, a, room, p)) want = -p.brake;
  else if (closing(u, a, room, p, p.planBrake * EARLY)) want = Math.min(idm, -p.planBrake);
  return Math.max(want, -Math.sqrt(2 * p.jerk * u));
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The car standing on its reference with its wheels set for it (a car that appears). */
export function startOn(at: RefPoint, v: number, p: VehicleParams): CarState {
  const delta = Math.max(-p.steerMax, Math.min(p.steerMax, Math.atan(at.k * p.wheelbase)));
  return { x: at.x, y: at.y, th: at.th, u: Math.max(0, v), dir: 1, delta, a: 0 };
}

/** Sideways error of the rear axle off the reference point (+ to the left of travel, as the tracker) and the heading error. */
export function errors(c: CarState, at: RefPoint): { readonly e: number; readonly psi: number; readonly along: number } {
  const dx = c.x - at.x, dy = c.y - at.y, cs = Math.cos(at.th), sn = Math.sin(at.th);
  return { e: -dx * sn + dy * cs, psi: wrap(c.th - at.th), along: dx * cs + dy * sn };
}

/**
 * The wheel angle wanted to follow the reference point (x, y, th) at the rear axle's own progress, with the curvature
 * kAhead previewed: rear-wheel feedback (Samson), the reference curvature fed forward, heading and sideways errors fed back.
 */
export function steerFor(c: CarState, x: number, y: number, th: number, kAhead: number, p: VehicleParams): number {
  const dx = c.x - x, dy = c.y - y, cs = Math.cos(th), sn = Math.sin(th);
  const e = -dx * sn + dy * cs, psi = wrap(c.th - th);
  const kTh = K_TH / p.wheelbase, kE = (kTh * kTh) / 4;
  const sinc = Math.abs(psi) < 1e-6 ? 1 : Math.sin(psi) / psi;
  const k = (kAhead * Math.cos(psi)) / Math.max(0.2, 1 - kAhead * e) - kTh * psi - kE * e * sinc;
  return Math.atan(k * p.wheelbase);
}
