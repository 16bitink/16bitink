import type { Id, Pt } from '../sim/types';
import type { Leg, Sore } from './day';
import { add, foundTally, lotTally } from './day';
import { clamp } from './geometry';
import { pointOf } from './places';
import type { City } from './state';
import { lotById } from './state';
import { LOST_WEIGHT, OWN_SPACE_WEIGHT, PARK_SCORE, PAY_SCORE, PRICED_OUT, STAYED_SCORE, STAYED_WEIGHT, TRIP_CURVE, TRIP_FELT } from './tune';

/** Turning one trip into points for the four bars. */
export function curve(points: readonly (readonly [number, number])[], x: number): number {
  const first = points[0]!;
  if (x <= first[0]) return first[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return points[points.length - 1]![1];
}

const homeOf = (leg: Leg) => leg.tour.chain?.home ?? leg.tour.home ?? leg.tour.from;
const homeLot = (leg: Leg): Id | null => { const h = homeOf(leg); return 'lot' in h ? h.lot : null; };
/** Who it was, when somebody who lives here. */
const whoOf = (leg: Pick<Leg, 'tour'>): { household?: Id } => (leg.tour.chain ? { household: leg.tour.chain.household } : {});
const destLot = (leg: Leg): Id | null => ('lot' in leg.tour.to ? leg.tour.to.lot : null);

export function sore(c: City, s: Sore): void { c.day.stats.sores.push(s); }
const soreOf = (c: City, leg: Pick<Leg, 'tour'>, s: Sore): void => sore(c, { ...s, ...whoOf(leg) });

/** Through traffic and lorries matter, but they don't vote. */
const VISITOR_WEIGHT = 0.35;
const weightOf = (leg: Leg): number => ('gate' in leg.tour.from ? VISITOR_WEIGHT : 1);
/** A trip's weight in the Trips bar: who made it, and what for. */
const feltOf = (leg: Leg): number => weightOf(leg) * TRIP_FELT[leg.tour.purpose];

/** Nobody believes a complaint about a longer trip than this (minutes). */
const LONGEST_TALE = 45;
/** A trip that arrived after `seconds`. */
export function scoreTrip(c: City, leg: Leg, seconds: number): void {
  // A taxi to or from its base is nobody's trip (kerbside.ts): never judged, also when the night or a jam ends it.
  if (leg.tour.deadhead) return;
  const s = c.day.stats;
  const ratio = seconds / Math.max(1, leg.free);
  const rel = ratio / c.expect.trip;
  const points = curve(TRIP_CURVE, rel);
  const w = weightOf(leg);
  s.count += 1;
  if (rel <= 1.15) s.onTime += 1;
  add(s.trips, points, feltOf(leg));
  add(s.ratio, clamp(ratio, 0.5, 4), w);
  add(s.seconds, seconds, w);
  for (const lot of [homeLot(leg), destLot(leg)]) if (lot !== null) add(lotTally(s, lot).trips, points);
  if (rel > 1.5) soreOf(c, leg, { bar: 'trips', kind: 'late', at: pointOf(c, leg.tour.from), weight: rel - 1, lot: homeLot(leg), n: Math.min(LONGEST_TALE, Math.round(seconds)) });
}

/** A car that gave up, or a trip that never began. */
export function scoreLost(c: City, leg: Leg, at: Pt, kind: 'gaveUp' | 'stayed'): void {
  if (leg.tour.deadhead) return;
  const s = c.day.stats;
  s.count += 1;
  if (kind === 'gaveUp') s.gaveUp += 1; else s.stayed += 1;
  const points = kind === 'gaveUp' ? 0 : STAYED_SCORE;
  add(s.trips, points, feltOf(leg) * (kind === 'gaveUp' ? LOST_WEIGHT : STAYED_WEIGHT));
  for (const lot of [homeLot(leg), destLot(leg)]) if (lot !== null) add(lotTally(s, lot).trips, points);
  soreOf(c, leg, { bar: 'trips', kind, at, weight: kind === 'gaveUp' ? 2.5 : 0.8, lot: homeLot(leg), n: 0 });
}

/** Left where there is no space: on the beach sand, along a small street, or in the lane. */
const roughPoints = (leg: Leg): number => (leg.spot?.kind === 'sand' ? PARK_SCORE.sand : leg.spot?.kind === 'street' ? PARK_SCORE.street : PARK_SCORE.illegal);

/** How parking went: cells walked, places tried, or left where it shouldn't be. */
export function scoreParking(c: City, leg: Leg, how: 'ok' | 'illegal' | 'none', cells: number): void {
  const s = c.day.stats;
  const tries = leg.tried.length;
  const walk = Math.max(0, cells - PARK_SCORE.freeCells) * PARK_SCORE.perCell;
  const points = how === 'none' ? PARK_SCORE.none : how === 'illegal' ? roughPoints(leg) : clamp(PARK_SCORE.first - walk - tries * PARK_SCORE.perTry, 0, 100);
  const place = leg.target;
  const lot = 'lot' in place ? lotById(c, place.lot) : undefined;
  const own = how === 'ok' && leg.spot?.kind === 'home';
  add(s.parking, points, weightOf(leg) * (own ? OWN_SPACE_WEIGHT : 1));
  if (!lot) return;
  add(lotTally(s, lot.id).parking, points);
  for (const key of [`kind:${lot.kind}`, `district:${lot.district}`]) add(foundTally(s, key), how === 'ok' && tries <= 1 ? 1 : 0);
  if (points < 50) soreOf(c, leg, { bar: 'parking', kind: how === 'ok' ? (tries > 0 ? 'search' : 'walk') : how, at: pointOf(c, place), weight: (60 - points) / 25, lot: lot.id, n: Math.round(cells) });
}

const payPoints = (c: City, coins: number): number =>
  clamp(PAY_SCORE.free - Math.max(0, coins - c.expect.pay * PAY_SCORE.normal) * PAY_SCORE.perCoin, 0, 100);

/** What a trip cost, against what people are used to paying. */
export function scorePay(c: City, leg: Leg, coins: number): void {
  const s = c.day.stats;
  const points = payPoints(c, coins);
  add(s.cost, points, weightOf(leg));
  add(s.pay, coins, weightOf(leg));
  if (points < 45) soreOf(c, leg, { bar: 'cost', kind: 'pay', at: pointOf(c, leg.tour.to), weight: (60 - points) / 30, lot: destLot(leg), n: Math.round(coins) });
}

/** They looked at the price and did something else. */
export function scorePricedOut(c: City, leg: Pick<Leg, 'tour'>, coins: number): void {
  add(c.day.stats.cost, payPoints(c, coins), ('gate' in leg.tour.from ? VISITOR_WEIGHT : 1) * PRICED_OUT);
}

export function scoreFine(c: City, leg: Leg, at: Pt, amount: number): void {
  const s = c.day.stats;
  s.fined += 1;
  s.fines += amount;
  add(s.cost, clamp(PAY_SCORE.free - PAY_SCORE.fineHit - amount * 2, 0, 100), weightOf(leg) * 1.5);
  soreOf(c, leg, { bar: 'cost', kind: 'fine', at, weight: 1 + amount / 8, lot: destLot(leg), n: amount });
}

export function scoreHomeCharge(c: City, leg: Leg, coins: number): void {
  const s = c.day.stats;
  s.homeCharges += 1;
  add(s.cost, clamp(PAY_SCORE.free - PAY_SCORE.homeCharge - coins * PAY_SCORE.perCoin, 0, 100));
  soreOf(c, leg, { bar: 'cost', kind: 'home', at: pointOf(c, leg.tour.from), weight: 0.8, lot: homeLot(leg), n: coins });
}
