/**
 * How long the road's own curves must be for the vehicle model (docs/inkroad-vehicle-model.md): a sideways shift (a
 * lane change, a slide back onto a lane) and the radius junction turns are built with. Pure.
 */
import { paramsOf } from './params';

const CAR = paramsOf('car');
/**
 * Radius road turns are planned at (rear axle): a car's planned radius, 5.5 m. Lorries and buses turn no tighter than
 * 6 m and 6.4 m at full lock, so they swing a little wide of it (the drawn car keeps its own lock).
 */
export const ROAD_R = CAR.rPlan;
/**
 * Share of a road turn's heading change made in its clothoids: long enough that the wheels swing at a car's steering
 * rate at the turn's own curve speed (a 90° turn at ROAD_R: 14 px of clothoid each end, about 16 px/s).
 */
export const ROAD_SHARE = 0.45;
/** Share of the sideways pull and of the steering rate a shift plans with (the tracker corrects with the rest). */
const PULL_SHARE = 0.85, WHEEL_SHARE = 0.8;
/** A quintic shift's sharpest bend is 5.77·d/L², and its fastest change of bend 60·d/L³. */
const BEND = 10 / Math.sqrt(3), BEND_RATE = 60;
/** Px/s added to the speed a shift is planned for (the car may speed up while it shifts). */
const SPEED_MARGIN = 6;

/** Px a quintic sideways shift of `d` px needs at `v` px/s: no tighter than ROAD_R, within the sideways pull and the wheels' rate. */
export function shiftLength(d: number, v: number): number {
  const a = Math.abs(d);
  if (a < 1e-3) return 0;
  const u = Math.max(0, v) + SPEED_MARGIN;
  const radius = Math.sqrt(BEND * a * ROAD_R);
  const pull = u * Math.sqrt((BEND * a) / (PULL_SHARE * CAR.aLat));
  const wheel = Math.cbrt((u * CAR.wheelbase * BEND_RATE * a) / (WHEEL_SHARE * CAR.steerRate));
  return Math.max(radius, pull, wheel);
}

/** The fastest a car may take a curve of curvature k (1/px), played px/s. */
export const curveCap = (k: number): number => (Math.abs(k) < 1e-9 ? Infinity : Math.sqrt((PULL_SHARE * CAR.aLat) / Math.abs(k)));
