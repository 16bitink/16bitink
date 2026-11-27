/**
 * Car-motion switches: engine changes that are built but off until the bots are rebalanced (phase C). One config
 * object so the motion lab (test/motion/, `npm run motion -- --switch ...`) and dev/motion.html can run with them on
 * without editing code. Read when a city or network is made and on every use: set them before creating a city.
 * Phase B (docs/inkroad-vehicle-model.md) removed PLANNED_TIMES, HONEST_SWINGS and ROAD_STOPS: every parking move is
 * planned and timed by the vehicle model, and a turn across the road always waits for its gap.
 */
export interface MotionSwitches {
  /** Junctions grown so a right turn is an R_MIN arc, kerb fillets 15 (src/sim/netCore.ts, src/render/ground/roadShape.ts). */
  ROOMY_CORNERS: boolean;
  /**
   * Gap acceptance at junctions (fix round 1), off until the bots are rebalanced: a left turn waits for a 3 s real
   * gap in every oncoming car, not just the first one, and straight-ahead traffic goes first (src/sim/grant.ts).
   */
  GAP_ACCEPT: boolean;
}

export const SWITCH_DEFAULTS: Readonly<MotionSwitches> = { ROOMY_CORNERS: false, GAP_ACCEPT: false };

/** The live switches. Change only through `setSwitches` (the lab and tests). */
export const MOTION_SWITCHES: Readonly<MotionSwitches> = { ...SWITCH_DEFAULTS };

/** Sets some switches (the rest keep their value); returns the ones there were, to put back. */
export function setSwitches(next: Partial<MotionSwitches>): MotionSwitches {
  const was = { ...MOTION_SWITCHES };
  Object.assign(MOTION_SWITCHES as MotionSwitches, next);
  return was;
}
