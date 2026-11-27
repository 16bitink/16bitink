import type { RoutineProfile } from '../../src/sim/types';

/** Hours are clock hours 0..24. work: start and end are the spreads of the day; early, late and split give the START range of that shift (split: the hours spent at home between the two halves). Sources: docs/inkroad-routines.md (D data, J judgment, marked per line). */
/** Old Harbour (Nordic port): a sharp early peak, early closing, cabins on summer Fridays. */
export const HARBOUR_ROUTINE: RoutineProfile = {
  line: 'A sharp seven to eight rush, shops shut early, and cabins call on summer Fridays.',
  // J 08:00 to 16:30, flexible start about 40 percent, shift work about 15 percent.
  work: { start: [7, 9], end: [15.5, 17], early: 0.1, earlyHours: [5.5, 6.5], late: 0.08, lateHours: [13.5, 15], split: 0, splitHours: [12, 13], remote: 0.15, second: 0.8, away: 0.05 },
  // J 55 percent walk or bike, 25 car, 20 bus; D peak hour 07 to 08.
  school: { start: 8, end: 14.5, drive: 0.4, afterCare: 0.35, walkCells: 8 },
  nursery: { start: 8, end: 16, drive: 0.35 },
  lunch: { drive: 0.05, hours: [11.5, 12.5] },
  errand: { share: 0.15, hours: [11, 14] },
  // J groceries 16 to 19, Sunday mostly closed.
  shop: { onWay: 0.5, evening: 0.15, hours: [16, 19] },
  // J home dinner 17:30 to 19, dining out mostly Friday and Saturday.
  dinner: { share: 0.15, hours: [17.5, 19.5] },
  visit: { share: 0.2, hours: [17.5, 20] },
  weekend: {
    out: 0.7, again: 0.35, when: [0.3, 0.4, 0.3], hours: [[9.5, 12], [12, 16], [16, 19]],
    places: { park: 0.14, beach: 0.1, fun: 0.14, landmark: 0.08, stadium: 0.05, home: 0.16, away: 0.2 },
    meal: 0.25, visitors: 0.06,
  },
  // J: long summer evenings and the Friday exodus, dark winters pull trips earlier.
  seasons: [
    { outdoors: 1, away: 1 },
    { trips: 0.95, midday: 1.1, evening: 1.25, outdoors: 1.4, away: 2.4 },
    { evening: 0.9, outdoors: 0.8, shift: -0.5, away: 0.8 },
    { trips: 0.92, evening: 0.75, outdoors: 0.45, shift: -1.5, away: 0.4 },
  ],
  // D EV share high (J 40 percent of cars on the road), charged at home, quiet stations.
  petrol: { range: 260, electric: 0.4 },
  lorries: { hours: [5, 18], night: 0.08 },
  secondCar: 0.2,
  /** Its blocks hold more homes than the usual: dense old town and harbour flats. */
  homes: 1.12,
  walk: { cells: 8, cost: 0.75 },
};
