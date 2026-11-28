/**
 * The drawn car of a moving vehicle (docs/inkroad-vehicle-model.md "Step 2"): a kinematic bicycle at the rear axle
 * that follows the sim. The sim owns progress and speed along the car's reference (its lane, turn and ring tracks);
 * this keeps the drawn car's own state (rear axle, heading, wheel angle, speed, acceleration) and steers it onto the
 * reference with the tracker's rear-wheel feedback law, while a jerk-limited speed loop holds it on the sim's point.
 * Every limit sits inside the bicycle's step, so whatever the sim does the drawn car never slides, pivots, out-steers its
 * wheels or brakes harder than a real car. Pure: a state in, a new state out.
 */
import { stepInto, type CarState, type MutableCar } from './bicycle';
import type { VehicleParams } from './params';

/** One point of the reference for the rear axle: pose, steering curvature (1/px) and the sim's speed there. */
export interface RefPoint { readonly x: number; readonly y: number; readonly th: number; readonly k: number }

/** What the sim wants of the drawn car at the end of a sub-step. */
export interface Target {
  /** Reference point at the drawn rear axle's progress, and the curvature previewed ahead of it. */
  readonly at: RefPoint;
  readonly kAhead: number;
  /** The sim's speed and acceleration (px/s, px/s²) and how far its point is ahead of the drawn rear axle (px). */
  readonly v: number;
  readonly a: number;
  readonly lead: number;
}

/** Heading gain as a share of the wheelbase (critically damped along the path, as the tracker). */
const K_TH = 0.9;
/** Speed loop: position and speed gains (1/s², 1/s) around the sim's own acceleration. */
const KP = 1, KV = 2;
/** Share of the sideways pull a catching-up drawn car allows itself on a curve (the sim plans at 0.85). */
const CURVE_SHARE = 0.9;
/** Px short of the sim's point a closing drawn car plans to stop. */
const STOP_SHORT = 0.5;

/**
 * Would a car closing at w px/s (accelerating at a) on a point `gap` px ahead run past it, if it began braking now?
 * Its braking ramps at the jerk limit to planBrake, then holds.
 */
export function closing(w: number, a: number, gap: number, p: VehicleParams): boolean {
  if (w <= 0) return false;
  const b = p.planBrake, j = p.jerk;
  const t1 = Math.max(0, (a + b) / j);
  const w1 = w + a * t1 - (j * t1 * t1) / 2;
  const d1 = w * t1 + (a * t1 * t1) / 2 - (j * t1 * t1 * t1) / 6;
  return d1 + (Math.max(0, w1) ** 2) / (2 * b) >= gap - STOP_SHORT;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The drawn car standing on its reference with its wheels set for it (a car that appears, or ends a manoeuvre). */
export function startOn(at: RefPoint, v: number, p: VehicleParams): CarState {
  const delta = Math.max(-p.steerMax, Math.min(p.steerMax, Math.atan(at.k * p.wheelbase)));
  return { x: at.x, y: at.y, th: at.th, u: Math.max(0, v), dir: 1, delta, a: 0 };
}

/** Sideways error of the rear axle off the reference point (+ to the left of travel, as the tracker) and the heading error. */
export function errors(c: CarState, at: RefPoint): { readonly e: number; readonly psi: number; readonly along: number } {
  const dx = c.x - at.x, dy = c.y - at.y, cs = Math.cos(at.th), sn = Math.sin(at.th);
  return { e: -dx * sn + dy * cs, psi: wrap(c.th - at.th), along: dx * cs + dy * sn };
}

/** One sub-step of dt played seconds. Forward only: a moving car never backs up on the road. */
export function followStep(c: CarState, t: Target, p: VehicleParams, dt: number): CarState {
  const m: MutableCar = { ...c };
  followInto(m, t.at.x, t.at.y, t.at.th, t.kAhead, t.v, t.a, t.lead, p, dt);
  return m;
}

/**
 * followStep in place, the target as numbers (the drawn traffic's hot loop): reference point (x, y, th) at the drawn
 * rear axle, previewed curvature kAhead, the sim's speed v and acceleration a, and its lead (px). The steering is
 * rear-wheel feedback (Samson): the reference curvature fed forward, heading and sideways errors fed back; the speed
 * loop is the sim's acceleration plus corrections toward its speed and its point.
 */
export function followInto(c: MutableCar, x: number, y: number, th: number, kAhead: number, v: number, a: number, lead: number, p: VehicleParams, dt: number, vCap = Infinity): void {
  const dx = c.x - x, dy = c.y - y, cs = Math.cos(th), sn = Math.sin(th);
  const e = -dx * sn + dy * cs, psi = wrap(c.th - th);
  const kTh = K_TH / p.wheelbase, kE = (kTh * kTh) / 4;
  const sinc = Math.abs(psi) < 1e-6 ? 1 : Math.sin(psi) / psi;
  const k = (kAhead * Math.cos(psi)) / Math.max(0.2, 1 - kAhead * e) - kTh * psi - kE * e * sinc;
  // A drawn car that lagged closes on the sim's point no faster than it can still stop on it, its foot moving at the
  // jerk limit: it never overshoots.
  const raw = closing(c.u - v, c.a, lead, p) ? -p.brake : a + KV * (v - c.u) + KP * lead;
  // Braking eases off as the car comes to a stop, so it stands without a jolt (|a| ≤ √(2·jerk·u)).
  // Catching up is never faster than the curve it is on allows.
  const curve = Math.abs(kAhead) > 1e-6 ? KV * (Math.sqrt((CURVE_SHARE * p.aLat) / Math.abs(kAhead)) - c.u) : Infinity;
  // Nor faster than the curves ahead of where it is drawn allow (a lagging car never enters a turn at the speed it caught up with).
  const ahead = c.u > vCap ? KV * (vCap - c.u) : Infinity;
  const want = Math.max(Math.min(raw, Math.max(curve, -p.planBrake), Math.max(ahead, -p.planBrake)), -Math.sqrt(2 * p.jerk * c.u));
  stepInto(c, want, Math.atan(k * p.wheelbase), p, dt);
}
