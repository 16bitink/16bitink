import type { RoutineProfile } from '../../src/sim/types';

/** Hours are clock hours 0..24. work: start and end are the spreads of the day; early, late and split give the START range of that shift (split: the hours spent at home between the two halves). Sources: docs/inkroad-routines.md (D data, J judgment, marked per line). */
/** Twin Isles (Singapore and Hong Kong style): few cars, crowds on foot, late food streets. */
export const ISLES_ROUTINE: RoutineProfile = {
  line: 'Cars are a few, buses and trams carry the rush, and food streets stay up late.',
  // J 09:00 to 18:00, staggered 07:30 to 10:00, late nights about 15 percent.
  work: { start: [7.5, 10], end: [17, 19.5], early: 0.08, earlyHours: [6.5, 7.5], late: 0.15, lateHours: [13, 15], split: 0, splitHours: [12, 13], remote: 0.1, second: 0.7, away: 0.02 },
  // J primary start 07:30, finish 13:00 to 14:00 then after-school care; 85 percent walk, bus or train.
  school: { start: 7.5, end: 13.5, drive: 0.15, afterCare: 0.5, walkCells: 6 },
  nursery: { start: 8, end: 17, drive: 0.15 },
  lunch: { drive: 0.04, hours: [12, 14] },
  errand: { share: 0.2, hours: [11, 15] },
  // J malls 10 to 22.
  shop: { onWay: 0.3, evening: 0.4, hours: [17.5, 21.5] },
  // J dining out 19 to 23, supper to 01.
  dinner: { share: 0.6, hours: [19, 23] },
  visit: { share: 0.25, hours: [19, 22] },
  weekend: {
    out: 0.85, again: 0.5, when: [0.25, 0.35, 0.4], hours: [[9, 12], [12, 16], [16.5, 23]],
    places: { mall: 0.3, park: 0.15, fun: 0.2, beach: 0.08, home: 0.12, away: 0.1 },
    meal: 0.55, visitors: 0.15,
  },
  // J: monsoon afternoons drive people indoors, typhoon weeks keep them in.
  seasons: [
    { outdoors: 1 },
    { trips: 0.95, midday: 1.15, evening: 1.1, outdoors: 0.55 },
    { outdoors: 0.75, away: 0.7 },
    { outdoors: 0.85, evening: 1.05 },
  ],
  // J few private cars, taxis and vans dominate.
  petrol: { range: 380, electric: 0.15 },
  lorries: { hours: [10, 16], night: 0.5 },
  secondCar: 0.04,
  walk: { cells: 10, cost: 0.65 },
};
