/** Driving and junction tuning. Pixels and seconds. */
import { CAR_LENGTH, VEHICLES } from './constants';
import type { VehicleKind } from './types';

export const IDM = {
  accel: 54, brake: 60, hardBrake: 220, headway: 1.1, standGap: 4, lineGap: 1.5,
  lookTime: 2.4, lookMin: 34,
} as const;

export const LENGTHS: Readonly<Record<VehicleKind, number>> = {
  car: CAR_LENGTH, taxi: CAR_LENGTH, van: 16, truck: 24, bus: 26, tram: 34, tow: 18, school: 22, police: CAR_LENGTH,
};
const SLOW: Partial<Record<VehicleKind, number>> = { truck: 0.82, bus: 0.88, tram: 0.88, school: 0.88, van: 0.96 };
export const kindIndex = (k: VehicleKind): number => Math.max(0, VEHICLES.indexOf(k));
export const LENGTH_OF: readonly number[] = VEHICLES.map((k) => LENGTHS[k]);
export const SPEED_OF: readonly number[] = VEHICLES.map((k) => SLOW[k] ?? 1);
export const TRUCK = kindIndex('truck');
const BUSLIKE = new Set([kindIndex('bus'), kindIndex('tram'), kindIndex('school')]);
export const isBus = (kind: number): boolean => BUSLIKE.has(kind);

export const SAMPLE = 4;
export const MIN_LANE = 24;
export const CONFLICT_DIST = 7;
export const TURN = { lateral: 100, min: 20, straight: 0.35 } as const;
export const DRIVEWAY = { speed: 18, slide: 13, length: 26 } as const;
export const CHANGE = { length: 40, short: 22, time: 0.8, every: 5, minSpeed: 8, gain: 26, urgent: 90 } as const;
export const YIELD = { gap: 1.7, courtesy: 11, near: 34, stop: 9, oneByOne: 1.5 } as const;
export const RING = { speed: 48, askTime: 0.4, behind: 0.6, ahead: 0.8, assume: 32, gap: 1.25, starving: 8, fresh: 4, back: 70, ask: 6, perCar: 34 } as const;
/** Drivers take the full gap until `from` seconds, then less and less, down to `least` of it at `to`. */
export const PATIENCE = { from: 6, to: 18, least: 0.4 } as const;
export const SIGNAL = { amber: 1.5, red: 1.1, smartAmber: 1.1, smartRed: 0.2, perPhase: 10, minGreen: 2.2, sneak: 7, leftGap: 0.9, courtesy: 3, smartCourtesy: 1.2, smartMin: 2.6, smartMax: 15, smartSense: 100, smartGap: 1.5, smartStarve: 28 } as const;
export const ROUTE = { noise: 0.16, slack: 1.15, refresh: 2.5, drop: 25, alpha: 0.1, maxTime: 120, banCost: 240 } as const;
export const REROUTE_AFTER = 7;
export const HONK_AT = 9;
export const ANGER_FULL = 40;
export const GRADES: readonly (readonly [number, 'A' | 'B' | 'C' | 'D' | 'E'])[] = [[3.5, 'A'], [7, 'B'], [12, 'C'], [19, 'D'], [28, 'E']];
export const gradeOf = (wait: number): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => GRADES.find(([max]) => wait < max)?.[1] ?? 'F';
