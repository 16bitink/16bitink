/**
 * The tracking controller (docs/inkroad-vehicle-model.md "Controller"): pure pursuit steers the bicycle along a
 * reference leg (lookahead grows with speed; in reverse the rear axle pursues a point behind), the speed follows the
 * leg's profile and stops on its end; at a cusp the car stands, changes gear and turns its wheels for the next leg
 * (dry steering) before it sets off. A plan is a list of paths and waits. Pure: a state in, a new state out.
 */
import { stepCar, steerStill, type CarState } from './bicycle';
import { poseAt, projectNear, STEP, type Leg, type RefPath } from './path';
import { profileAt, speedProfile, CREEP, lagAt } from './speedProfile';
import type { VehicleParams } from './params';

/** A path item; `open`: its last leg leaves the map at speed (a gate), so it ends without a stop. */
export type PlanItem = { readonly kind: 'path'; readonly path: RefPath; readonly label?: string; readonly open?: boolean } | { readonly kind: 'wait'; readonly seconds: number; readonly label?: string };

export interface DriveState {
  readonly car: CarState;
  readonly item: number;
  readonly leg: number;
  /** Length along the current leg (the car's projection). */
  readonly s: number;
  readonly phase: 'drive' | 'gear' | 'wait' | 'done';
  /** Seconds left in a wait or a gear change. */
  readonly timer: number;
  readonly prof: Float64Array | null;
  /** The current leg runs off the map at speed (no stop at its end). */
  readonly open: boolean;
}

/** Lookahead: a floor of about a wheelbase, growing with speed (px, played s). */
const LOOK_MIN = 1.1, LOOK_PER_V = 0.3;
/** Speed error gain, 1/s. */
const KV = 3;
/** Px from a leg's end, and px/s, under which the car counts as stopped on it. */
const END_TOL = 0.6, STILL = 0.4;

/** Starts a plan; a car spawned faster than its first leg allows (it couldn't brake in time) enters at the speed it could have. */
export function startDrive(car: CarState, plan: readonly PlanItem[], p: VehicleParams): DriveState {
  const d = enter({ car, item: 0, leg: 0, s: 0, phase: 'drive', timer: 0, prof: null, open: false }, plan, p);
  const u = d.prof ? Math.min(d.car.u, d.prof[0]!) : d.car.u;
  return u < d.car.u ? { ...d, car: { ...d.car, u } } : d;
}

/** Starts plan item `item` (or ends the plan). */
function enter(d: DriveState, plan: readonly PlanItem[], p: VehicleParams): DriveState {
  const it = plan[d.item];
  if (!it) return { ...d, phase: 'done', prof: null };
  if (it.kind === 'wait') return { ...d, phase: 'wait', timer: it.seconds, leg: 0, s: 0, prof: null };
  return startLeg({ ...d, leg: 0 }, it.path.legs[0]!, p, it.open === true && it.path.legs.length === 1);
}

function startLeg(d: DriveState, l: Leg, p: VehicleParams, open: boolean): DriveState {
  const car = d.car.dir === l.dir ? d.car : { ...d.car, dir: l.dir, u: 0, a: 0 };
  return { ...d, car, phase: 'drive', s: projectNear(l, car.x, car.y, 0, 6), prof: speedProfile(l, p, car.u, open), open };
}

export function driveStep(d: DriveState, plan: readonly PlanItem[], p: VehicleParams, dt: number): DriveState {
  if (d.phase === 'done') return d;
  const it = plan[d.item]!;
  if (d.phase === 'wait') return d.timer - dt > 0 ? { ...d, timer: d.timer - dt } : enter({ ...d, item: d.item + 1 }, plan, p);
  if (it.kind !== 'path') return enter({ ...d, item: d.item + 1 }, plan, p);
  const legs = it.path.legs;
  if (d.phase === 'gear') return gear(d, legs[d.leg + 1]!, p, dt, it.open === true && d.leg + 2 === legs.length);
  return drive(d, legs, plan, p, dt);
}

/** Standing at a cusp: wait out the gear change and turn the wheels for the next leg, then go. */
function gear(d: DriveState, next: Leg, p: VehicleParams, dt: number, open: boolean): DriveState {
  const want = Math.atan(next.ks[Math.min(next.ks.length - 1, 2)]! * p.wheelbase);
  const car = steerStill(d.car, want, p, dt);
  const timer = d.timer - dt;
  if (timer > 0 || Math.abs(car.delta - Math.max(-p.steerMax, Math.min(p.steerMax, want))) > 0.01) return { ...d, car, timer };
  return startLeg({ ...d, car, leg: d.leg + 1 }, next, p, open);
}

function drive(d: DriveState, legs: readonly Leg[], plan: readonly PlanItem[], p: VehicleParams, dt: number): DriveState {
  const l = legs[d.leg]!;
  const prof = d.prof ?? speedProfile(l, p, d.car.u, d.open);
  const s = projectNear(l, d.car.x, d.car.y, d.s, d.car.u * dt + 3);
  const car = stepCar(d.car, { aWant: accelFor(d.car, l, prof, s, p, d.open), deltaWant: steerFor(d.car, l, s, p) }, p, dt);
  const rest = l.len - s;
  if (d.open && rest <= END_TOL) return enter({ ...d, car, item: d.item + 1, s: 0 }, plan, p);
  if (rest > END_TOL || car.u > STILL) return { ...d, car, s, prof };
  const stopped = { ...car, u: 0, a: 0 };
  if (d.leg + 1 < legs.length) return { ...d, car: stopped, s, prof, phase: 'gear', timer: p.gearChange };
  return enter({ ...d, car: stopped, item: d.item + 1, s: 0 }, plan, p);
}

/** Pure pursuit at the rear axle: the arc through a point Ld ahead along the leg (behind the car in reverse). */
export function pursuit(c: CarState, l: Leg, s: number, p: VehicleParams): number {
  const ld = p.wheelbase * LOOK_MIN + LOOK_PER_V * c.u;
  const t = poseAt(l, s + ld);
  const heading = c.dir === 1 ? c.th : c.th + Math.PI;
  const alpha = Math.atan2(t.y - c.y, t.x - c.x) - heading;
  const dist = Math.max(1e-6, Math.hypot(t.x - c.x, t.y - c.y));
  const kappa = (c.dir * 2 * Math.sin(alpha)) / dist;
  return Math.atan(kappa * p.wheelbase);
}

/** Heading gain (1/px, as a share of the wheelbase) and preview of the reference curvature (played s). */
const K_TH = 0.9, PREVIEW = 0.15;

/**
 * Rear-wheel feedback (Samson; the Frenet form of the kinematic car): the reference curvature fed forward, previewed
 * by the time the wheels take to turn, plus feedback on the heading error ψ and the sideways error e of the rear
 * axle, critically damped along the path. Works in the direction of travel, so reverse is the same law.
 */
export function steerFor(c: CarState, l: Leg, s: number, p: VehicleParams): number {
  const r = poseAt(l, Math.max(0, Math.min(l.len, s)));
  // Half the lag the speed plan allows at a change of curvature, so the wheels swing centred on it.
  const ahead = poseAt(l, Math.min(l.len, s + lagAt(l, Math.round(s / STEP), p) / 2 + c.u * PREVIEW));
  const flip = c.dir === 1 ? 0 : Math.PI;
  const phiRef = r.th + flip;
  const psi = Math.atan2(Math.sin(c.th + flip - phiRef), Math.cos(c.th + flip - phiRef));
  const e = -(c.x - r.x) * Math.sin(phiRef) + (c.y - r.y) * Math.cos(phiRef);
  const kTh = K_TH / p.wheelbase, kE = (kTh * kTh) / 4;
  const kRef = c.dir * ahead.k;
  const sinc = Math.abs(psi) < 1e-6 ? 1 : Math.sin(psi) / psi;
  const kMove = (kRef * Math.cos(psi)) / Math.max(0.2, 1 - kRef * e) - kTh * psi - kE * e * sinc;
  return Math.atan(c.dir * kMove * p.wheelbase);
}

/** Preview times (played s) at which the speed to come is looked at, so braking starts early despite the jerk limit. */
const LOOK_SPEED = [0.25, 0.5, 0.9, 1.4] as const;

/**
 * Follow the profile; never plan past the leg's end (a stop curve on what is left). Braking takes the hardest need
 * among points previewed ahead: (v_there² − u²) / 2d.
 */
function accelFor(c: CarState, l: Leg, prof: Float64Array, s: number, p: VehicleParams, open: boolean): number {
  const rest = l.len - s;
  if (rest <= END_TOL && !open) return -p.brake;
  const stopAt = (x: number): number => (open ? Infinity : Math.sqrt(2 * p.planBrake * Math.max(0, l.len - x - END_TOL / 2)));
  // The profile, but never under a creep while there is room left to stop in.
  const want = (x: number): number => Math.max(Math.min(CREEP, stopAt(x)), Math.min(profileAt(l, prof, x), stopAt(x)));
  let a = KV * (want(s) - c.u);
  for (const t of LOOK_SPEED) {
    const d = c.u * t + 0.2;
    if (s + d >= l.len) break;
    // (an open leg's profile has no stop at its end)
    a = Math.min(a, (want(s + d) ** 2 - c.u * c.u) / (2 * d));
  }
  return a;
}

/** Plays a whole plan from a state at a fixed frame step: every frame's state (for the lab and tests). */
export function playPlan(car: CarState, plan: readonly PlanItem[], p: VehicleParams, dt: number, maxSeconds: number): DriveState[] {
  const out: DriveState[] = [];
  let d = startDrive(car, plan, p);
  for (let k = 0; k < maxSeconds / dt && d.phase !== 'done'; k++) {
    d = driveStep(d, plan, p, dt);
    out.push(d);
  }
  return out;
}
