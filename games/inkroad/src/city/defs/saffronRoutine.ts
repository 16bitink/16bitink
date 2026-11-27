import type { RoutineProfile } from '../../sim/types';

/** Hours are clock hours 0..24. work: start and end are the spreads of the day; early, late and split give the START range of that shift (split: the hours spent at home between the two halves). Sources: docs/inkroad-routines.md (D data, J judgment, marked per line). */
/** Saffron Bay (Gulf): the school run is the big peak, summer middays are dead, dinner is late. */
export const SAFFRON_ROUTINE: RoutineProfile = {
  line: 'Big school run before work, a dead summer midday and dinners at nine.',
  // D gov 07:30 start, private 08 to 09; J split shifts about 15 percent, 10 percent flexible.
  work: { start: [7, 9], end: [16, 18], early: 0.1, earlyHours: [6, 7], late: 0.12, lateHours: [14, 16], split: 0.15, splitHours: [14, 16], remote: 0.1, second: 0.55, away: 0.06 },
  // D school start 07:30 to 07:45, finish 14:00 to 15:00; J 60 percent car.
  school: { start: 7.5, end: 14.5, drive: 0.7, afterCare: 0.25, walkCells: 4 },
  nursery: { start: 7.5, end: 14, drive: 0.85 },
  lunch: { drive: 0.25, hours: [12.5, 14] },
  errand: { share: 0.25, hours: [10.5, 13] },
  // J malls busiest after 18.
  shop: { onWay: 0.25, evening: 0.35, hours: [18, 22] },
  // J dinner 20:00 to 22:30.
  dinner: { share: 0.45, hours: [20, 22.5] },
  visit: { share: 0.25, hours: [19, 22] },
  weekend: {
    out: 0.8, again: 0.45, when: [0.25, 0.3, 0.45], hours: [[9.5, 12], [12, 16], [17, 22.5]],
    places: { beach: 0.3, mall: 0.28, park: 0.1, fun: 0.1, stadium: 0.04, landmark: 0.04, home: 0.1, away: 0.04 },
    meal: 0.4, visitors: 0.1,
  },
  // J: summer midday near empty, winter weekends peak (spring, summer, autumn, winter).
  seasons: [
    { outdoors: 1.1 },
    { trips: 0.85, midday: 0.35, evening: 1.25, outdoors: 0.45, shift: 0.5, away: 0.5 },
    { outdoors: 1.15 },
    { midday: 1.1, evening: 1.1, outdoors: 1.4, away: 1.5 },
  ],
  // J weekly fills, cheap fuel, electric under 10 percent.
  petrol: { range: 220, electric: 0.08 },
  lorries: { hours: [9, 16], night: 0.4 },
  secondCar: 0.5,
  walk: { cells: 3, cost: 1.5 },
};
