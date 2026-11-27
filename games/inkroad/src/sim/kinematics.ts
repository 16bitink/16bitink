import { sizeOf } from './vehicleSize';

/**
 * Car motion rules (the owner, November 27: "this still makes movements that are not possible for real cars").
 * Real numbers from the kinematic bicycle model, scaled to plan px by the drawn car: a 4.5 m car.
 * docs/inkroad-build.md "Car motion rules" explains them; test/motion.test.ts holds every drawn car to them.
 */
export const PX_PER_M = sizeOf('car').len / 4.5;
/** Smallest turning radius of the car's middle (a city car turns a 5 m to 6 m circle). */
export const R_MIN = 5.2 * PX_PER_M;
/** Reversing is done at walking pace. */
export const REVERSE_MAX = 1.5 * PX_PER_M;
/** Sideways pull a driver accepts on a curve (px/s²): v ≤ √(A_LAT · R). */
export const A_LAT = 3 * PX_PER_M;
/** Seconds of clear road a driver wants before turning across a lane. */
export const GAP_S = 3;
/**
 * How fast the game plays its cars against life, measured on the road: a street's free speed is 62 px/s
 * (src/sim/constants.ts ROADS) where a real town street is driven at 50 km/h = 13.9 m/s = 49.4 px/s, so 1.25
 * (an avenue gives 1.35 against 60 km/h, a highway 1.15 against 120 km/h). Manoeuvres play at the same pace.
 */
export const GAME_PACE = 1.25;
/** Paces as played: reversing, and the sideways pull allowed on a curve (px/s, px/s²). */
export const REVERSE_PLAYED = REVERSE_MAX * GAME_PACE;
export const A_LAT_PLAYED = A_LAT * GAME_PACE * GAME_PACE;
