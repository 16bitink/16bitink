/**
 * Car-motion switches (docs/inkroad-build.md "Car motion rules", round 2): engine changes that are built but off
 * until the bots are rebalanced. One config object so the motion lab (test/motion/, `npm run motion -- --switch ...`)
 * and dev/motion.html can run with them on without editing code. Read when a city or network is made and on every
 * use: set them before creating a city.
 */
export interface MotionSwitches {
  /** Lane holds timed from the drawn path, gap acceptance across the road (src/city/manoeuvre.ts, src/sim/crossing.ts). */
  PLANNED_TIMES: boolean;
  /** Junctions grown so a right turn is an R_MIN arc, kerb fillets 15 (src/sim/netCore.ts, src/render/ground/roadShape.ts). */
  ROOMY_CORNERS: boolean;
  /**
   * Gap acceptance across the oncoming lane (fix round 1), off until the bots are rebalanced (on, every bot loses
   * about a year: docs/inkroad-build.md "Fix round 1"): a left turn at a junction waits for a 3 s
   * real gap in every oncoming car, not just the first one (src/sim/grant.ts), and a turn into or out of a place
   * across the far lanes waits for one (seeing past the junction behind) and holds them (src/city/manoeuvre.ts, src/sim/crossing.ts), and a kerb slot
   * on a two-way road is reached and left in the lanes on its side (src/sim/routes.ts `runsWith`).
   */
  GAP_ACCEPT: boolean;
  /** Cars stopped on the road and at bare kerbs (fix round 1b, docs/inkroad-build.md): a taxi or a driver who gave up stands on the shoulder and rejoins forward, a double-parked car eases onto its lane line with a forward S, a bare kerb is pulled over to and left with forward S moves, one-way kerbs face the way the street runs. Off until the next rebalance: it raises the season test's squeezed-move counts with the fixed holds. */
  ROAD_STOPS: boolean;
}

export const SWITCH_DEFAULTS: Readonly<MotionSwitches> = { PLANNED_TIMES: false, ROOMY_CORNERS: false, GAP_ACCEPT: false, ROAD_STOPS: false };

/** The live switches. Change only through `setSwitches` (the lab and tests). */
export const MOTION_SWITCHES: Readonly<MotionSwitches> = { ...SWITCH_DEFAULTS };

/** Sets some switches (the rest keep their value); returns the ones there were, to put back. */
export function setSwitches(next: Partial<MotionSwitches>): MotionSwitches {
  const was = { ...MOTION_SWITCHES };
  Object.assign(MOTION_SWITCHES as MotionSwitches, next);
  return was;
}
