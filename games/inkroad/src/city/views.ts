import type { DayStop, DriverView, Id, ResidentView } from '../sim/types';
import { hourAt } from './clock';
import type { Chain } from './day';
import { carById, fleetOf, type Household } from './households';
import { freeSeconds } from './modes';
import { nameOf } from './places';
import type { City } from './state';
import { driverOf } from './voices';

/** What the UI reads about the people who live here: their day, where they are, their car. */

const hourOf = (clock: number): number => Math.round(hourAt(clock, 'day') * 100) / 100;

export function dayOf(c: City, ch: Chain): readonly DayStop[] {
  const stops: DayStop[] = ch.stops.map((s, i) => ({
    at: hourOf(s.at), label: s.label, place: nameOf(c, s.place), ...('lot' in s.place ? { lot: s.place.lot } : {}),
    done: i < ch.now || (i === ch.now && ch.late[i] !== undefined), late: ch.late[i] ?? 0,
  }));
  const last = ch.stops[ch.stops.length - 1];
  const back = last ? (last.until ?? last.at + last.stay) + freeSeconds(c, last.place, ch.home) : 0;
  const home = 'lot' in ch.home ? ch.home.lot : undefined;
  return [...stops, { at: hourOf(back), label: 'Home', place: nameOf(c, ch.home), ...(home !== undefined ? { lot: home } : {}), done: ch.now > ch.stops.length, late: 0 }];
}

function nowOf(c: City, ch: Chain | undefined): string {
  if (!ch || ch.now < 0) return 'At home';
  if (ch.now > ch.stops.length) return 'Home';
  if (ch.now === ch.stops.length) return 'On the way home';
  const s = ch.stops[ch.now]!;
  return ch.late[ch.now] !== undefined ? `At ${nameOf(c, s.place)}` : `On the way to ${nameOf(c, s.place)}`;
}

const lateOf = (ch: Chain | undefined): number => (ch ? ch.late.reduce((n, m) => n + (m ?? 0), 0) : 0);

/** A household's day today: the one who drives the car, or the first who goes out. */
function mainChain(c: City, id: Id): Chain | undefined {
  const list = c.day.chains.get(id) ?? [];
  return list.find((ch) => ch.car !== null) ?? list[0];
}

const FAMILY: Readonly<Record<Household['child'], string>> = { none: '', school: ', one at school', nursery: ', one at nursery' };
const familyOf = (h: Household): string => `${h.adults === 2 ? 'Two grown-ups' : 'One grown-up'}${FAMILY[h.child]}`;

function residentOf(c: City, h: Household): ResidentView {
  const car = (fleetOf(c).carsOf.get(h.id) ?? [])[0];
  const ch = mainChain(c, h.id);
  return {
    id: h.id, who: h.who, animal: h.animal, family: familyOf(h), car: !car ? 'none' : car.electric ? 'electric' : 'petrol',
    tank: car && !car.electric ? Math.round(car.tank * 100) / 100 : 1, day: ch ? dayOf(c, ch) : [], now: nowOf(c, ch),
  };
}

export const residentsOf = (c: City, lot: Id): readonly ResidentView[] => (fleetOf(c).byLot.get(lot) ?? []).map((h) => residentOf(c, h));

export function householdView(c: City, id: Id): ResidentView | null {
  const h = fleetOf(c).households.get(id);
  return h ? residentOf(c, h) : null;
}

const lastSlot = new Map<Id, number>();
/** The car slot a household is driving now, or -1. */
export function carSlotOf(c: City, id: Id): number {
  const uid = (c.day.chains.get(id) ?? []).map((ch) => carById(c, ch.car)?.leg).find((l) => l && !l.done)?.uid;
  if (uid === undefined || uid < 0) return -1;
  const cars = c.traffic.cars;
  const was = lastSlot.get(id);
  if (was !== undefined && cars.uid[was] === uid && cars.alive[was]) return was;
  for (let i = 0; i < cars.count; i++) {
    if (cars.uid[i] === uid && cars.alive[i]) { lastSlot.set(id, i); return i; }
  }
  return -1;
}

/** The driver of car slot i, with their household and whole day. */
export function driverView(c: City, i: number): DriverView | null {
  const d = driverOf(c, i);
  if (!d) return null;
  const tag = c.traffic.routeOf(c.traffic.cars.uid[i]!)?.tag;
  const ch = tag === undefined || tag < 0 ? undefined : c.day.legs[tag]?.tour.chain;
  const h = ch ? fleetOf(c).households.get(ch.household) : undefined;
  if (!ch || !h) return { ...d, household: null, day: [], now: '', late: 0 };
  return { ...d, who: h.who, animal: h.animal, household: h.id, day: dayOf(c, ch), now: nowOf(c, ch), late: lateOf(ch) };
}

/** One line for a letter: "Saffron School, then Stamp Office, 8 minutes late". */
export function dayLine(c: City, id: Id): string | undefined {
  const ch = (c.day.workChains.get(id) ?? []).find((x) => x.car !== null) ?? c.day.workChains.get(id)?.[0] ?? mainChain(c, id);
  if (!ch) return undefined;
  const names = ch.stops.filter((s) => s.kind !== 'home' && s.kind !== 'fuel').map((s) => nameOf(c, s.place));
  const late = lateOf(ch);
  return `${names.join(', then ')}${late > 0 ? `, ${late} minutes late` : ''}`;
}
