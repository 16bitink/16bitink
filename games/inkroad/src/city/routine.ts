import type { DayKind, Hours, RoutineProfile, SeasonBend } from '../sim/types';
import { clockAt } from './clock';
import type { Dice } from './rng';
import type { City } from './state';
import { OUT_OF_TOWN } from './tune';

/**
 * A city without its own routine lives a plain nine to five, close to the old
 * commute windows (AM and PM in tune.ts): out by eight, home by six.
 */
export const NINE_TO_FIVE: RoutineProfile = {
  line: '',
  work: {
    start: [7, 9], end: [16, 18], early: 0.08, earlyHours: [5.5, 6.5], late: 0.06, lateHours: [12, 14],
    split: 0, splitHours: [13, 15], remote: 0.08, second: 0.55, away: OUT_OF_TOWN,
  },
  school: { start: 8, end: 15, drive: 0.6, afterCare: 0.3, walkCells: 4 },
  nursery: { start: 8, end: 16, drive: 0.8 },
  lunch: { drive: 0.12, hours: [12, 13.5] },
  errand: { share: 0.3, hours: [10, 14] },
  shop: { onWay: 0.3, evening: 0.25, hours: [17.5, 20] },
  dinner: { share: 0.2, hours: [18.5, 20.5] },
  visit: { share: 0.15, hours: [18, 21] },
  weekend: {
    out: 0.7, again: 0.3, when: [0.3, 0.45, 0.25], hours: [[9, 12], [12, 16.5], [17, 21]],
    places: { park: 0.25, mall: 0.25, shops: 0.15, beach: 0.1, fun: 0.1, home: 0.1, landmark: 0.05 },
    meal: 0.3, visitors: 0.08,
  },
  seasons: [{}, { outdoors: 1.3 }, {}, { outdoors: 0.6 }],
  petrol: { range: 260, electric: 0.05 },
  lorries: { hours: [7, 17], night: 0.3 },
  secondCar: 0.35,
  walk: { cells: 4, cost: 1 },
};

export const routineOf = (c: City): RoutineProfile => c.def.routine ?? NINE_TO_FIVE;
export const bendOf = (c: City): SeasonBend => routineOf(c).seasons[c.season] ?? {};

/** An hour in a window, a little bunched to its middle. */
export const hourIn = (d: Dice, w: Hours): number => w[0] + (w[1] - w[0]) * (0.5 * d.next() + 0.5 * d.next());
/** The season clock of an hour in a window, for this kind of day. */
export const clockIn = (d: Dice, w: Hours, kind: DayKind, shift = 0): number => clockAt(hourIn(d, w) + shift, kind);
