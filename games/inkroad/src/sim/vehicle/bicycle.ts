/**
 * The kinematic bicycle model, at the rear axle: ẋ = v·cosθ, ẏ = v·sinθ, θ̇ = v·tanδ/L. The controls are the
 * longitudinal acceleration and the steering rate; both are clamped to the vehicle's limits here, so whatever a
 * controller asks for, the car can't slide sideways, turn on the spot, steer faster than its wheels, pull away
 * harder than accel, brake harder than brake, or change its acceleration faster than jerk. Pure.
 */
import type { VehicleParams } from './params';

export interface CarState {
  /** Rear axle, px, and heading of the body, rad. */
  readonly x: number;
  readonly y: number;
  readonly th: number;
  /** Speed magnitude (≥ 0) and gear: v = dir·u. */
  readonly u: number;
  readonly dir: 1 | -1;
  /** Road-wheel angle, rad, and the longitudinal acceleration of u, px/s². */
  readonly delta: number;
  readonly a: number;
}

export interface Controls {
  /** Wanted acceleration of u, px/s² (clamped to -brake..accel and by jerk). */
  readonly aWant: number;
  /** Wanted road-wheel angle, rad (clamped to ±steerMax and moved at most steerRate·dt). */
  readonly deltaWant: number;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** One step of dt played seconds. The gear is not changed here (only at a standstill, by the tracker). */
export function stepCar(s: CarState, c: Controls, p: VehicleParams, dt: number): CarState {
  const m: MutableCar = { ...s };
  stepInto(m, c.aWant, c.deltaWant, p, dt);
  return m;
}

/** A car state the drawn traffic steps in place (src/sim/drawn.ts: hundreds of cars, six times a step). */
export type MutableCar = { -readonly [K in keyof CarState]: CarState[K] };

/** stepCar on a state in place, the controls as numbers (no allocation): the same limits, the same arc. */
export function stepInto(s: MutableCar, aWant: number, deltaWant: number, p: VehicleParams, dt: number): void {
  const dMax = p.steerRate * dt;
  const delta = clamp(s.delta + clamp(clamp(deltaWant, -p.steerMax, p.steerMax) - s.delta, -dMax, dMax), -p.steerMax, p.steerMax);
  const aGoal = clamp(aWant, -p.brake, p.accel);
  const jMax = p.jerk * dt;
  let a = s.a + clamp(aGoal - s.a, -jMax, jMax);
  let u = s.u + a * dt;
  if (u <= 0) { u = 0; a = Math.max(0, a); }
  const d = s.dir * ((s.u + u) / 2) * dt;
  // The arc's chord along its middle heading (as reedsShepp.advance).
  const k = Math.tan(delta) / p.wheelbase, half = (k * d) / 2;
  const chord = Math.abs(half) < 1e-8 ? d : (d * Math.sin(half)) / half;
  s.x += chord * Math.cos(s.th + half);
  s.y += chord * Math.sin(s.th + half);
  s.th += k * d;
  s.u = u; s.a = a; s.delta = delta;
}

/** Steering on the spot (dry steering at a cusp): the wheels turn, the car doesn't move. */
export function steerStill(s: CarState, deltaWant: number, p: VehicleParams, dt: number): CarState {
  const dMax = p.steerRate * dt;
  const want = clamp(deltaWant, -p.steerMax, p.steerMax);
  return { ...s, u: 0, a: 0, delta: s.delta + clamp(want - s.delta, -dMax, dMax) };
}
