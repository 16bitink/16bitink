import type { RoutineProfile } from '../../src/sim/types';

/** Hours are clock hours 0..24. work: start and end are the spreads of the day; early, late and split give the START range of that shift (split: the hours spent at home between the two halves). Sources: docs/inkroad-routines.md (D data, J judgment, marked per line). */
/** Cross Rivers (US Midwest river city): everyone drives, school queues, Friday game nights. */
export const RIVERS_ROUTINE: RoutineProfile = {
  line: 'Almost everyone drives, with school queues at quarter to eight and game nights on Fridays.',
  // J 08:00 to 17:00 core, shifts (plants, hospitals) 15 to 20 percent.
  work: { start: [7, 8.5], end: [16, 17.5], early: 0.1, earlyHours: [5.5, 6.5], late: 0.08, lateHours: [14.5, 16], split: 0, splitHours: [12, 13], remote: 0.1, second: 0.7, away: 0.04 },
  // J start 07:45 to 08:30, finish 15:00 to 15:30, car 50 percent, bus 40, drop-off queues.
  school: { start: 7.75, end: 15.25, drive: 0.55, afterCare: 0.3, walkCells: 3 },
  nursery: { start: 7.75, end: 17, drive: 0.95 },
  lunch: { drive: 0.45, hours: [11.5, 13] },
  errand: { share: 0.3, hours: [10, 15] },
  // J big-box and mall 10 to 21, groceries 17 to 19 on the way home.
  shop: { onWay: 0.45, evening: 0.3, hours: [17, 20] },
  // J dinner 18 to 19:30.
  dinner: { share: 0.3, hours: [18, 19.5] },
  visit: { share: 0.2, hours: [18.5, 21] },
  weekend: {
    out: 0.8, again: 0.5, when: [0.3, 0.4, 0.3], hours: [[9, 12], [12, 17], [17, 21]],
    places: { mall: 0.25, park: 0.15, fun: 0.2, beach: 0.1, stadium: 0.1, home: 0.15, away: 0.06 },
    meal: 0.4, visitors: 0.08,
  },
  // J: snow slows the winter commute, game nights in autumn.
  seasons: [
    { outdoors: 1 },
    { trips: 0.97, evening: 1.1, outdoors: 1.3 },
    { evening: 1.1, outdoors: 0.9 },
    { trips: 0.92, midday: 0.9, outdoors: 0.5, shift: -0.5 },
  ],
  // J car dependent, weekly fill-ups, electric under 10 percent.
  petrol: { range: 200, electric: 0.07 },
  lorries: { hours: [5, 16], night: 0.08 },
  secondCar: 0.6,
  walk: { cells: 3, cost: 1.3 },
};
