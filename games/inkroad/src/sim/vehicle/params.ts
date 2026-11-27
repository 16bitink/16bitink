/**
 * One vehicle model for every drawn car (docs/inkroad-vehicle-model.md): the limits of the kinematic bicycle model,
 * from real vehicles, in plan px and PLAYED seconds (the game runs its cars GAME_PACE faster than life, so a speed
 * scales by the pace, an acceleration by its square, a jerk by its cube, a steering rate by the pace).
 * Pure data; the state is the rear axle (x, y, heading), the speed and the road-wheel angle.
 */
import { A_LAT, GAME_PACE, PX_PER_M, R_MIN, REVERSE_MAX } from '../kinematics';
import { sizeOf } from '../vehicleSize';
import type { VehicleKind } from '../types';

/** Real geometry of a vehicle, metres (its turning circle is kerb to kerb, the usual catalogue figure). */
export interface RealBody {
  /** Wheelbase as a share of the body length (a 4.5 m hatchback has 2.7 m: 0.6). */
  readonly wheelbase: number;
  /** Rear overhang as a share of the body length (0.9 m of 4.5 m: 0.2). */
  readonly rearOverhang: number;
  /** Kerb-to-kerb turning circle, m (catalogue). */
  readonly turningCircle: number;
  /** Track width, m (the outer front wheel draws the turning circle). */
  readonly track: number;
}

/**
 * Catalogue figures: a VW Golf / Toyota Corolla class car (4.3–4.6 m, wheelbase 2.64–2.70 m, turning circle
 * 10.4–10.9 m); a Ford Transit Custom class van (wheelbase 2.9–3.3 m, 11.6–12.0 m); a 7.5 t box lorry (wheelbase
 * ~4.2 m, ~14 m); a midibus (the game's bus is 7.8 m: wheelbase ~4 m, ~14.5 m).
 */
export const REAL: Readonly<Record<VehicleKind, RealBody>> = {
  car: { wheelbase: 0.6, rearOverhang: 0.2, turningCircle: 10.8, track: 1.55 },
  taxi: { wheelbase: 0.6, rearOverhang: 0.2, turningCircle: 10.8, track: 1.55 },
  police: { wheelbase: 0.6, rearOverhang: 0.2, turningCircle: 10.8, track: 1.55 },
  van: { wheelbase: 0.62, rearOverhang: 0.18, turningCircle: 11.9, track: 1.7 },
  tow: { wheelbase: 0.6, rearOverhang: 0.2, turningCircle: 12.5, track: 1.75 },
  truck: { wheelbase: 0.58, rearOverhang: 0.22, turningCircle: 14, track: 1.9 },
  bus: { wheelbase: 0.52, rearOverhang: 0.25, turningCircle: 14.5, track: 2 },
  school: { wheelbase: 0.55, rearOverhang: 0.22, turningCircle: 14, track: 2 },
  tram: { wheelbase: 0.55, rearOverhang: 0.22, turningCircle: 30, track: 2.2 },
};

/** Real limits shared by every road vehicle (sources in docs/inkroad-vehicle-model.md "Limits"). */
export const REAL_LIMITS = {
  /** Road-wheel steering rate, rad/s: 30°/s (a brisk hand-over-hand turn, ~1.3 wheel turns/s at a 15:1 ratio). */
  steerRate: (30 * Math.PI) / 180,
  /** Ordinary pulling away, m/s² (city driving uses 1.5–3). */
  accel: 2.5,
  /** Comfortable braking, m/s² (AASHTO plans stopping sight distance at 3.4). */
  brake: 3.5,
  /** Braking the speed plan aims at, m/s²: under `brake`, so a jerk-limited stop still lands on its mark. */
  planBrake: 2.2,
  /** Jerk, m/s³ (comfort studies put normal driving at 2–3, harsh above 5). */
  jerk: 3,
  /** Forward speed while manoeuvring, m/s (~9 km/h). */
  manoeuvre: 2.5,
  /** Seconds standing at a cusp to change gear. */
  gearChange: 0.5,
} as const;

/** Every limit of one vehicle kind, in plan px and played seconds. */
export interface VehicleParams {
  readonly kind: VehicleKind;
  /** Drawn body, px. */
  readonly len: number;
  readonly wid: number;
  /** Rear axle to front axle, px. */
  readonly wheelbase: number;
  /** Rear axle to the body's middle, px (the drawn pose is the middle). */
  readonly toMiddle: number;
  /** Full-lock road-wheel angle, rad, and the rear axle's smallest radius, px. */
  readonly steerMax: number;
  readonly rMin: number;
  /** Radius paths are planned with: a little over rMin so the rate-limited steering can follow. */
  readonly rPlan: number;
  /** Played limits: rad/s, px/s², px/s³, px/s. */
  readonly steerRate: number;
  readonly accel: number;
  readonly brake: number;
  readonly planBrake: number;
  readonly jerk: number;
  readonly reverse: number;
  readonly manoeuvre: number;
  /** Sideways pull allowed on a curve, played px/s²: v ≤ √(aLat / |κ|). */
  readonly aLat: number;
  readonly gearChange: number;
}

/** Planned radius over the smallest: the tracker keeps ~10% of the lock for corrections. */
export const PLAN_MARGIN = 1.1;

/**
 * The game's own car corner, kept: the middle of a car turns no tighter than R_MIN (5.2 m, src/sim/kinematics.ts),
 * which for a 2.7 m wheelbase is a rear-axle radius of 5.02 m. A real Golf manages 3.9 m at the rear axle (10.8 m
 * kerb to kerb): we drive gentler than full lock by this ratio, for every kind alike.
 */
function gentleness(): number {
  const car = sizeOf('car').len / PX_PER_M;
  const wb = car * REAL.car.wheelbase, toMid = car / 2 - car * REAL.car.rearOverhang;
  const game = Math.sqrt((R_MIN / PX_PER_M) ** 2 - toMid ** 2);
  return game / realRearRadius(REAL.car, wb);
}

/** Rear-axle radius at full lock from a kerb-to-kerb turning circle (outer front wheel), m. */
function realRearRadius(b: RealBody, wheelbase: number): number {
  const outerFront = b.turningCircle / 2;
  return Math.sqrt(Math.max(outerFront ** 2 - wheelbase ** 2, 0.01)) - b.track / 2;
}

const GENTLE = gentleness();
const P = GAME_PACE;

/** The limits of a vehicle kind (memoised: pure in the kind). */
export function paramsOf(kind: VehicleKind): VehicleParams {
  const hit = CACHE.get(kind);
  if (hit) return hit;
  const made = build(kind);
  CACHE.set(kind, made);
  return made;
}
const CACHE = new Map<VehicleKind, VehicleParams>();

function build(kind: VehicleKind): VehicleParams {
  const { len, wid } = sizeOf(kind);
  const real = REAL[kind];
  const lenM = len / PX_PER_M;
  const wbM = lenM * real.wheelbase;
  const rMinM = realRearRadius(real, wbM) * GENTLE;
  const rMin = rMinM * PX_PER_M;
  const L = REAL_LIMITS;
  return {
    kind, len, wid,
    wheelbase: wbM * PX_PER_M,
    toMiddle: len / 2 - len * real.rearOverhang,
    steerMax: Math.atan(wbM / rMinM),
    rMin,
    rPlan: rMin * PLAN_MARGIN,
    steerRate: L.steerRate * P,
    accel: L.accel * PX_PER_M * P * P,
    brake: L.brake * PX_PER_M * P * P,
    planBrake: L.planBrake * PX_PER_M * P * P,
    jerk: L.jerk * PX_PER_M * P * P * P,
    reverse: REVERSE_MAX * P,
    manoeuvre: L.manoeuvre * PX_PER_M * P,
    aLat: A_LAT * P * P,
    gearChange: L.gearChange / P,
  };
}

/** The body's middle from the rear axle pose (what is drawn). */
export const middleOf = (p: VehicleParams, x: number, y: number, th: number): { x: number; y: number } =>
  ({ x: x + p.toMiddle * Math.cos(th), y: y + p.toMiddle * Math.sin(th) });

/** The rear axle from the body's middle (a slot pose, a drawn frame). */
export const rearOf = (p: VehicleParams, x: number, y: number, th: number): { x: number; y: number } =>
  ({ x: x - p.toMiddle * Math.cos(th), y: y - p.toMiddle * Math.sin(th) });

/** The largest steering curvature (1/px) the kind can hold. */
export const kappaMax = (p: VehicleParams): number => Math.tan(p.steerMax) / p.wheelbase;
