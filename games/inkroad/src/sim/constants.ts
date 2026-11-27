import type { Control, RoadType, VehicleKind } from './types';

/** World units are plan pixels (see types.ts). Tuning values live here; tests and the lab import them. */
export const CELL = 40;
export const LANE = 9;
export const STEP = 0.1; // seconds per sim step
/** A season is a drawn workday, then a short weekend day. */
export const DAY = 120;
export const PERIODS = { dawn: 0, am: 10, mid: 42, pm: 70, night: 108 } as const;
/**
 * The weekend has no morning peak: it wakes late. Its first 16 s are the night before it (00:00 to 06:00): a busy junction passes
 * about one car a second, so a planned city's evening queue (Saffron Bay, years 1 to 8: up to about 20 cars) drains at the day's
 * pace before dawn, by road, instead of greeting the weekend.
 */
export const WEEKEND = 62;
export const WEEKEND_PERIODS = { dawn: 0, am: 16, mid: 16, pm: 40, night: 53 } as const;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
/** The Council's year starts in spring: three months a season, each ending on a payday. */
export const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'] as const;
export const MONTHS_PER_SEASON = 3;
export const YEARS_PER_CITY = 10;

export const MAX_CARS = 700;
/** One drawn car stands for this many trips. */
export const TRIPS_PER_CAR = 12;
export const CAR_LENGTH = 14;
export const DECK_Z = 32;
/** Each deck over another deck is this much higher. */
export const TIER_Z = 26;
/** A car that waits this long gives up and its trip counts as lost. */
export const GIVE_UP = 60;

export const ROADS: Readonly<Record<RoadType, { lanes: number; speed: number; cost: number; upkeep: number; noise: number }>> = {
  street: { lanes: 1, speed: 62, cost: 4, upkeep: 0.1, noise: 1 },
  avenue: { lanes: 2, speed: 80, cost: 9, upkeep: 0.2, noise: 2 },
  boulevard: { lanes: 3, speed: 90, cost: 16, upkeep: 0.35, noise: 3 },
  highway: { lanes: 4, speed: 135, cost: 30, upkeep: 0.6, noise: 5 },
};
export const CONTROL_COST: Readonly<Record<Control, number>> = { yield: 0, roundabout: 30, signal: 60, smart: 110 };

export const VEHICLES: readonly VehicleKind[] = ['car', 'taxi', 'van', 'truck', 'bus', 'tram', 'tow', 'school', 'police'];

export const APPROVAL_LETTER = 40;
export const LETTERS_TO_LOSE = 3;
export const APPROVAL_GOOD = 60;

/** The tint index of a service van: a private minibus, drawn with a stripe. */
export const MINIBUS_TINT = 200;
