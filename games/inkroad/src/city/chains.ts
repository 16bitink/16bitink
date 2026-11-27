import type { DayKind, Hours, Lot, LotKind, RoutineProfile, SeasonBend } from '../sim/types';
import { clockAt, dayStart, lengthOf, NIGHT_END } from './clock';
import type { Chain, Place, Purpose, Stop, StopKind } from './day';
import { jobsFor, pickTarget, targetsFor, type Target } from './demand';
import { centreOf } from './geometry';
import type { Household } from './households';
import { fleetOf } from './households';
import { freeSeconds } from './modes';
import { cellsBetween, gateNodes, pointOf } from './places';
import { createDice, mixSeed, type Dice } from './rng';
import { beachLot, publicBeaches } from './rules/beach';
import { bendOf, clockIn, NINE_TO_FIVE, routineOf } from './routine';
import type { City } from './state';
import { has } from './state';
import { AM, HOME_BY, WEEKEND_OUT, JOBS, LEAVE_PAD, MIDDAY_SHOP, PM, SHOPPING, STOPS, VALUE_PER_SECOND, WEEKEND_STAY } from './tune';

/** Households' days: a chain of stops for each grown-up who goes out. */
export interface Lists { readonly [k: string]: readonly Target[] }
interface Ctx { readonly c: City; readonly p: RoutineProfile; readonly bend: SeasonBend; readonly lists: Lists; readonly kind: DayKind }

const KIN = { places: 821, day: 822 } as const;
const GUIDED = 3;
const FICKLE = 5;
const VALUE_SPREAD = [0.6, 1.5] as const;
const EPS = 1e-6;
/** Hours around the school bell that children arrive in. */
const SCHOOL_GATE = [-0.6, 0.15] as const;
/** Seconds before the school bell a parent's work may start and still do the school run. */
const SCHOOL_RUN_SLACK = 12;
/** Hours: the last evening outing sets off by `last` and is over by `home`. */
const EVENING = { last: 22.5, home: 23 } as const;
/** Hours either side of a weekend outing's window. */
const WEEKEND_SLACK = 1;
/** Staggered hours (a technology) spread the commute as the old tours did. */
const STAGGER = { am: 10, pm: [5, 4] } as const;

export function listsFor(c: City): Lists {
  const of = (kinds: Partial<Record<LotKind, number>>): readonly Target[] => targetsFor(c, kinds);
  const shops = of(SHOPPING);
  // People eat at restaurants first, and at the mall, the market and the shops: dinners never all go to one cafe.
  const food = of({ food: 3, mall: 0.5, market: 0.4, shops: 0.3 });
  return {
    work: of({ ...JOBS, nursery: 0.3, fuel: 0.1, food: 0.4, fun: 0.3 }), school: of({ school: 1 }), nursery: of({ nursery: 1 }),
    shop: shops, food: food.length > 0 ? food : shops, errand: of({ hospital: 1, office: 0.5, market: 0.3 }),
    visit: of({ home: 1 }), park: of({ park: 1, square: 0.5 }), fun: of({ fun: 1 }), mall: of({ mall: 1 }), shops: of({ shops: 1, market: 1 }),
    landmark: of({ landmark: 1 }), stadium: of({ stadium: 1 }),
  };
}

/** Dice of one household: its places never change unless the city does; its day changes for one in five each season. */
function diceOf(c: City, h: Household, what: number, person: number, kind: DayKind): Dice {
  const base = c.year === 1 ? GUIDED : c.seed;
  const fickle = h.index % FICKLE === FICKLE - 1 ? c.year * 4 + c.season : -1;
  return what === KIN.places ? createDice(mixSeed(base, what, h.id, person)) : createDice(mixSeed(base, what, h.id, person, kind === 'work' ? 0 : 1, fickle));
}

function withDice<T>(c: City, d: Dice, f: () => T): T {
  const own = c.dice;
  c.dice = d;
  try { return f(); } finally { c.dice = own; }
}

const purposeOf: Readonly<Record<StopKind, Purpose>> = {
  work: 'work', school: 'school', nursery: 'school', shop: 'shop', food: 'shop', fun: 'event', visit: 'visit', errand: 'shop', fuel: 'shop', out: 'event', home: 'visit',
};
const LABELS: Readonly<Record<StopKind, string>> = {
  work: 'Work', school: 'School run', nursery: 'Nursery run', shop: 'Shopping', food: 'Dinner', fun: 'Fun', visit: 'Visit', errand: 'Errand', fuel: 'Petrol', out: 'Day out', home: 'Home',
};

const make = (kind: StopKind, place: Place, at: number, until: number | null, stay: number, label = LABELS[kind]): Stop => ({ kind, label, place, at, until, stay, purpose: purposeOf[kind] });

/** A stay that ends before the day does. */
function stayOf(x: Ctx, d: Dice, range: readonly [number, number], at: number): number {
  const scale = x.kind === 'weekend' ? WEEKEND_STAY : 1;
  const end = dayStart(x.kind) + lengthOf(x.kind) - HOME_BY;
  return Math.max(STOPS.drop, Math.min(d.range(range[0], range[1]) * scale, end - at));
}

/** The free trip between two places, padded: what people allow for it. */
const allow = (x: Ctx, a: Place, b: Place): number => freeSeconds(x.c, a, b) * LEAVE_PAD;

/** Add a stop meant for a fixed time: if there is time to kill first, they wait at home. */
function timed(x: Ctx, stops: Stop[], home: Place, s: Stop): void {
  const last = stops[stops.length - 1];
  if (last && last.kind !== 'home') {
    const free = last.until ?? last.at + last.stay;
    const toHome = allow(x, last.place, home);
    const fromHome = allow(x, home, s.place);
    if (s.at - allow(x, last.place, s.place) - free > (toHome + fromHome) * 2) stops.push(make('home', home, free + toHome, s.at - fromHome, 0));
  }
  stops.push(s);
}

interface Work { readonly place: Place; readonly start: number; readonly end: number; readonly split: readonly [number, number] | null; readonly lunch: number | null }

function workOf(x: Ctx, h: Household, home: Lot, person: number, d: Dice, pd: Dice): Work | null {
  const w = x.p.work;
  const works = person === 0 ? !d.chance(w.remote) : d.chance(w.second * (1 - w.remote));
  if (!works) return null;
  const away = pd.chance(w.away);
  const place = away ? gateOf(x.c, pd) : withDice(x.c, pd, () => pickTarget(x.c, centreOf(home), jobsFor(x.c, home, x.lists.work!)))?.place ?? null;
  if (!place) return null;
  const shift = x.bend.shift ?? 0;
  const roll = d.next();
  const regular = commute(x, d, w.start, 'start') + allow(x, { lot: home.id }, place);
  const hoursLong = (w.end[0] + w.end[1] - w.start[0] - w.start[1]) / 2;
  const startH = roll < w.early ? clockIn(d, w.earlyHours, x.kind) : roll < w.early + w.late ? clockIn(d, w.lateHours, x.kind) : regular;
  const isShift = roll < w.early + w.late;
  const endAt = isShift ? clockAt(Math.min(23, hourOf(x, startH) + hoursLong), x.kind) : commute(x, d, w.end, 'end') + clockAt(NINE_TO_FIVE.work.end[0] + shift, x.kind) - clockAt(NINE_TO_FIVE.work.end[0], x.kind);
  const split = !isShift && !away && d.chance(w.split) ? [clockIn(d, [w.splitHours[0], w.splitHours[0]], x.kind), clockIn(d, [w.splitHours[1], w.splitHours[1]], x.kind)] as const : null;
  const end = Math.max(endAt, startH + STOPS.drop);
  const noon = !split && !away && !isShift && d.chance(x.p.lunch.drive * (x.bend.midday ?? 1)) ? clockIn(d, x.p.lunch.hours, x.kind) : null;
  const lunch = noon !== null && noon > startH + STOPS.lunch[1] && noon < end - STOPS.lunch[1] * 2 ? noon : null;
  return { place, start: startH, end, split: split && split[0] > startH && split[1] < end ? split : null, lunch };
}

/**
 * When regular workers leave home (start) or work (end): the old commute windows (AM, PM in tune.ts, which the game is
 * balanced on), moved and stretched by how far this city's hours are from a plain nine to five.
 */
function commute(x: Ctx, d: Dice, w: Hours, which: 'start' | 'end'): number {
  const plain = NINE_TO_FIVE.work[which];
  const mid = (h: Hours): number => clockAt((h[0] + h[1]) / 2, x.kind);
  const width = (w[1] - w[0]) / Math.max(EPS, plain[1] - plain[0]);
  const staggered = has(x.c, 'stagger');
  const base = which === 'start'
    ? (staggered ? d.range(AM.from, AM.to + STAGGER.am) : AM.from + (AM.to - AM.from) * d.next() ** AM.early)
    : (staggered ? d.range(PM.from - STAGGER.pm[0], PM.to + STAGGER.pm[1]) : PM.from + (PM.to - PM.from) * (0.85 * d.next() + 0.15 * d.next()));
  const centre = which === 'start' ? (AM.from + AM.to) / 2 : (PM.from + PM.to) / 2;
  return Math.max(AM.from, centre + (base - centre) * width + mid(w) - mid(plain));
}

/** The hour a season clock shows (inverse of clockAt, by search: plans are made once a day). */
function hourOf(x: Ctx, clock: number): number {
  let lo = 0;
  let hi = 24;
  for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (clockAt(mid, x.kind) < clock) lo = mid; else hi = mid; }
  return lo;
}

function gateOf(c: City, d: Dice): Place | null {
  const nodes = gateNodes(c);
  const open = c.def.gates.filter((g) => (g.opensYear ?? 1) <= c.year && nodes.has(g.id));
  let left = d.next() * open.reduce((n, g) => n + g.weight, 0);
  for (const g of open) { left -= g.weight; if (left <= 0) return { gate: nodes.get(g.id)! }; }
  return null;
}

function workStops(x: Ctx, stops: Stop[], home: Place, job: Work, d: Dice): void {
  timed(x, stops, home, make('work', job.place, job.start, job.split?.[0] ?? job.lunch ?? job.end, 0));
  if (job.split) {
    stops.push(make('home', home, job.split[0], job.split[1], 0));
    stops.push(make('work', job.place, job.split[1], job.end, 0));
  } else if (job.lunch !== null) {
    const food = withDice(x.c, d, () => pickTarget(x.c, pointOf(x.c, job.place), x.lists.food!));
    if (food) {
      const stay = d.range(STOPS.lunch[0], STOPS.lunch[1]);
      stops.push(make('food', food.place, job.lunch, null, stay, 'Lunch'));
      stops.push(make('work', job.place, job.lunch + stay, job.end, 0));
    } else stops[stops.length - 1] = make('work', job.place, job.start, job.end, 0);
  }
}

interface Kid { readonly place: Place; readonly kind: 'school' | 'nursery'; readonly drop: number; readonly pick: number; readonly afterCare: boolean }

function kidOf(x: Ctx, h: Household, home: Lot, pd: Dice, d: Dice): Kid | null {
  if (h.child === 'none') return null;
  const nursery = h.child === 'nursery' && x.lists.nursery!.length > 0;
  const kind = nursery ? 'nursery' : 'school';
  const t = withDice(x.c, pd, () => pickTarget(x.c, centreOf(home), nursery ? x.lists.nursery! : x.lists.school!));
  if (!t || cellsBetween(centreOf(home), centreOf(t.lot)) <= x.p.school.walkCells) return null;
  const hours = nursery ? x.p.nursery : x.p.school;
  if (!d.chance(hours.drive * (has(x.c, 'schoolbus') ? 0.4 : 1))) return null;
  return { place: t.place, kind, drop: clockAt(hours.start + d.range(SCHOOL_GATE[0], SCHOOL_GATE[1]), x.kind), pick: clockAt(hours.end + d.range(0, SCHOOL_GATE[1] * 2), x.kind), afterCare: d.chance(x.p.school.afterCare) };
}

/** Evening: a meal out, the shops, or a visit, from home. */
function evening(x: Ctx, stops: Stop[], home: Place, homeLot: Lot, person: number, d: Dice): void {
  const ev = (x.bend.evening ?? 1) * (x.bend.trips ?? 1);
  const pick = (list: readonly Target[]): Target | null => withDice(x.c, d, () => pickTarget(x.c, centreOf(homeLot), list.filter((t) => t.lot.id !== homeLot.id)));
  // Evenings start by EVENING.last and end by EVENING.home, so that by eleven the streets are quiet.
  const latest = clockAt(EVENING.last, x.kind);
  const done = clockAt(EVENING.home, x.kind);
  const go = (kind: StopKind, list: readonly Target[], wish: number, range: readonly [number, number]): void => {
    const t = pick(list);
    const at = Math.min(wish, latest);
    if (t) timed(x, stops, home, make(kind, t.place, at, null, Math.max(STOPS.drop, Math.min(stayOf(x, d, range, at), done - at))));
  };
  if (person === 0 && d.chance(x.p.dinner.share * ev)) go('food', x.lists.food!, clockIn(d, x.p.dinner.hours, x.kind), STOPS.food);
  else if (d.chance(x.p.shop.evening * ev)) go('shop', x.lists.shop!, clockIn(d, x.p.shop.hours, x.kind), STOPS.shop);
  else if (d.chance(x.p.visit.share * ev)) go('visit', x.lists.visit!, clockIn(d, x.p.visit.hours, x.kind), STOPS.visit);
}

function workdayStops(x: Ctx, h: Household, home: Lot, person: number, kid: Kid | null, otherWorks: boolean, d: Dice, pd: Dice): Stop[] {
  const at: Place = { lot: home.id };
  const stops: Stop[] = [];
  const plain = workOf(x, h, home, person, d, pd);
  // A parent who starts long before school does leaves the child to the bus; the others drop it and get to work after.
  const runs = kid && person === 0 && (!plain || plain.start >= kid.drop - SCHOOL_RUN_SLACK);
  const job = plain && runs && kid ? { ...plain, start: Math.max(plain.start, kid.drop + STOPS.drop + allow(x, kid.place, plain.place)) } : plain;
  if (runs) stops.push(make(kid.kind, kid.place, kid.drop, null, STOPS.drop));
  if (job) workStops(x, stops, at, job, d);
  const picks = kid && ((person === 0 && job && kid.afterCare) || (person === 0 && !job) || (person === 1 && !job && !(kid.afterCare && otherWorks)));
  if (kid && picks && !(person === 1 && kid.afterCare)) {
    const when = job ? Math.max(kid.pick, job.end) : kid.pick;
    timed(x, stops, at, make(kid.kind, kid.place, when, null, STOPS.drop, 'Pick-up'));
  }
  if (job && d.chance(x.p.shop.onWay * (x.bend.trips ?? 1))) {
    const t = withDice(x.c, d, () => pickTarget(x.c, pointOf(x.c, job.place), x.lists.shop!));
    const last = stops[stops.length - 1]!;
    const free = last.until ?? last.at + last.stay;
    if (t) stops.push(make('shop', t.place, free, null, stayOf(x, d, STOPS.shop, free)));
  }
  const midday = (x.bend.midday ?? 1) * (x.bend.trips ?? 1);
  const errand = !job && d.chance(x.p.errand.share * midday);
  if (!job && (errand || d.chance(MIDDAY_SHOP * midday))) {
    const t = withDice(x.c, d, () => pickTarget(x.c, centreOf(home), errand ? x.lists.errand! : x.lists.shop!));
    const when = clockIn(d, x.p.errand.hours, x.kind);
    if (t && (stops.length === 0 || (stops[stops.length - 1]!.until ?? 0) < when)) timed(x, stops, at, make(errand ? 'errand' : 'shop', t.place, when, null, stayOf(x, d, errand ? STOPS.errand : STOPS.shop, when)));
  }
  evening(x, stops, at, home, person, d);
  return ordered(stops);
}

/** Stops whose times went backwards (a late shift and an early dinner) are dropped. */
function ordered(stops: readonly Stop[]): Stop[] {
  const out: Stop[] = [];
  let t = -Infinity;
  for (const s of stops) {
    if (s.at + 1 < t && (s.kind !== 'work' || out.length === 0)) continue;
    out.push(s);
    t = Math.max(t, s.until ?? s.at + s.stay);
  }
  while (out.length > 0 && out[out.length - 1]!.kind === 'home') out.pop();
  return out;
}

// ---------------------------------------------------------------- the weekend

function outingPlace(x: Ctx, from: Lot, d: Dice): { place: Place; kind: StopKind } | null {
  const places = x.p.weekend.places;
  const out = (x.bend.outdoors ?? 1);
  const weights: [string, number][] = Object.entries(places).map(([k, w]) => [k, (w ?? 0) * (k === 'beach' || k === 'park' || k === 'fun' ? out : 1) * (k === 'away' ? x.bend.away ?? 1 : 1)]);
  for (let tries = 0; tries < 3; tries++) {
    let left = d.next() * weights.reduce((n, [, w]) => n + w, 0);
    const k = weights.find(([, w]) => (left -= w) <= 0)?.[0] ?? 'mall';
    const got = placeOfKind(x, k, from, d);
    if (got) return got;
  }
  const mall = withDice(x.c, d, () => pickTarget(x.c, centreOf(from), x.lists.shop!));
  return mall ? { place: mall.place, kind: 'shop' } : null;
}

function placeOfKind(x: Ctx, k: string, from: Lot, d: Dice): { place: Place; kind: StopKind } | null {
  if (k === 'away') { const g = gateOf(x.c, d); return g ? { place: g, kind: 'out' } : null; }
  if (k === 'beach') {
    const lots = publicBeaches(x.c).map((b) => beachLot(x.c, b)).filter((l): l is Lot => !!l?.access);
    return lots.length > 0 ? { place: { lot: d.pick(lots).id }, kind: 'out' } : null;
  }
  const list = k === 'home' ? x.lists.visit!.filter((t) => t.lot.id !== from.id) : x.lists[k] ?? [];
  const t = withDice(x.c, d, () => pickTarget(x.c, centreOf(from), list));
  return t ? { place: t.place, kind: k === 'home' ? 'visit' : k === 'fun' ? 'fun' : k === 'mall' || k === 'shops' ? 'shop' : 'out' } : null;
}

function weekendStops(x: Ctx, home: Lot, d: Dice): Stop[] {
  const w = x.p.weekend;
  const at: Place = { lot: home.id };
  const stops: Stop[] = [];
  if (!d.chance(w.out * WEEKEND_OUT * (x.bend.trips ?? 1))) return stops;
  let left = d.next();
  let slot = w.when.findIndex((s) => (left -= s) <= 0);
  if (slot < 0) slot = w.when.length - 1;
  for (let n = 0; n < 2 && slot < w.hours.length; n++) {
    const go = outingPlace(x, home, d);
    // Outings spread flat over their hours and an hour either side: the weekend's drawn day is short, and nobody keeps a timetable.
    const hours = w.hours[slot]!;
    const when = Math.max(NIGHT_END + 1, clockAt(d.range(hours[0] - WEEKEND_SLACK, hours[1] + WEEKEND_SLACK), x.kind));
    if (go) {
      timed(x, stops, at, make(go.kind, go.place, when, null, stayOf(x, d, STOPS.out, when), go.kind === 'out' ? 'Day out' : undefined));
      if (d.chance(w.meal)) {
        const food = withDice(x.c, d, () => pickTarget(x.c, pointOf(x.c, go.place), x.lists.food!));
        const free = when + stops[stops.length - 1]!.stay;
        if (food) stops.push(make('food', food.place, free, null, stayOf(x, d, STOPS.food, free), 'Meal out'));
      }
    }
    if (!d.chance(w.again * WEEKEND_OUT)) break;
    slot += 1;
  }
  return ordered(stops);
}

// ---------------------------------------------------------------- the day's chains

function chainOf(id: number, h: Household, person: number, kind: DayKind, stops: Stop[], car: number | null, d: Dice): Chain {
  return { id, household: h.id, person, home: { lot: h.lot }, kind, seed: d.next(), value: VALUE_PER_SECOND * d.range(VALUE_SPREAD[0], VALUE_SPREAD[1]), car, stops, late: [], now: -1 };
}

/** Every household's day of this kind, in household order. */
export function planChains(c: City, kind: DayKind): Chain[] {
  const fleet = fleetOf(c);
  const x: Ctx = { c, p: routineOf(c), bend: bendOf(c), lists: listsFor(c), kind };
  const out: Chain[] = [];
  for (const [lotId, homes] of fleet.byLot) {
    const home = c.lots[lotId];
    if (!home?.access) continue;
    for (const h of homes) out.push(...householdDay(x, h, home, out.length + 1));
  }
  return out;
}

function householdDay(x: Ctx, h: Household, home: Lot, id: number): Chain[] {
  const cars = (fleetOf(x.c).carsOf.get(h.id) ?? []).map((car) => car.uid);
  if (x.kind === 'weekend') {
    const d = diceOf(x.c, h, KIN.day, 0, x.kind);
    const stops = weekendStops(x, home, d);
    return stops.length > 0 ? [chainOf(id, h, 0, x.kind, stops, cars[0] ?? null, d)] : [];
  }
  const d0 = diceOf(x.c, h, KIN.day, 0, x.kind);
  const kid = kidOf(x, h, home, diceOf(x.c, h, KIN.places, 9, x.kind), d0);
  const days = Array.from({ length: h.adults }, (_, person) => {
    const d = person === 0 ? d0 : diceOf(x.c, h, KIN.day, person, x.kind);
    return { d, stops: workdayStops(x, h, home, person, kid, h.adults === 2, d, diceOf(x.c, h, KIN.places, person, x.kind)) };
  });
  const first = days.findIndex((p) => p.stops.length > 0);
  return days.flatMap((p, person) => {
    if (p.stops.length === 0) return [];
    const car = person === first ? cars[0] ?? null : cars.length > 1 ? cars[1]! : null;
    return [chainOf(id + person, h, person, x.kind, p.stops, car, p.d)];
  });
}

/** When the first hop leaves home. */
export const leaveOf = (c: City, ch: Chain): number => {
  const s = ch.stops[0]!;
  const earliest = ch.kind === 'weekend' ? NIGHT_END + 0.5 : -Infinity;
  return Math.max(earliest, s.at - freeSeconds(c, ch.home, s.place) * LEAVE_PAD);
};

