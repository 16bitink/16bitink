import type { RoutineProfile } from '../../src/sim/types';

/** Hours are clock hours 0..24. work: start and end are the spreads of the day; early, late and split give the START range of that shift (split: the hours spent at home between the two halves). Sources: docs/inkroad-routines.md (D data, J judgment, marked per line). */
/** Seven Hills (strait and hill city): the evening jam beats the morning one, streets full of walkers. */
export const HILLS_ROUTINE: RoutineProfile = {
  line: 'Walkers and shuttles fill the streets, and the evening jam is worse than the morning one.',
  // J 09:00 to 18:00, many start 08:00, shuttle buses for big employers.
  work: { start: [7.5, 9], end: [17, 19], early: 0.1, earlyHours: [6.5, 7.5], late: 0.1, lateHours: [12, 14], split: 0.08, splitHours: [13, 15], remote: 0.08, second: 0.5, away: 0.04 },
  // J start 08:30, finish 15:30 to 16:00, shuttles common.
  school: { start: 8.5, end: 15.75, drive: 0.3, afterCare: 0.2, walkCells: 7 },
  nursery: { start: 8.5, end: 16.5, drive: 0.3 },
  lunch: { drive: 0.12, hours: [12.5, 14] },
  errand: { share: 0.25, hours: [11, 16] },
  // J shops open 10 to 22, busy after 18.
  shop: { onWay: 0.35, evening: 0.45, hours: [17, 22] },
  // J late dinner 20 to 23.
  dinner: { share: 0.5, hours: [20, 23] },
  visit: { share: 0.35, hours: [19, 23] },
  weekend: {
    out: 0.85, again: 0.55, when: [0.25, 0.3, 0.45], hours: [[10, 12.5], [12.5, 16], [17, 23]],
    places: { park: 0.2, landmark: 0.12, mall: 0.15, beach: 0.1, fun: 0.15, home: 0.25, away: 0.08 },
    meal: 0.45, visitors: 0.12,
  },
  // J: mild year, full summer evenings, winter rain slows the hills.
  seasons: [
    { outdoors: 1.05 },
    { trips: 0.95, midday: 0.9, evening: 1.35, outdoors: 1.3 },
    { outdoors: 0.95 },
    { evening: 0.85, outdoors: 0.7, shift: -0.5 },
  ],
  // J fuel is dear, electric share small, stations busy in the evening.
  petrol: { range: 200, electric: 0.05 },
  lorries: { hours: [9.5, 16], night: 0.45 },
  secondCar: 0.1,
  walk: { cells: 9, cost: 0.9 },
};
