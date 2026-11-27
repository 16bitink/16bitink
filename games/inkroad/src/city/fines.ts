import type { Pt } from '../sim/types';
import { hourAt } from './clock';
import type { Leg, Spot } from './day';
import { bank } from './money';
import { scoreFine } from './score';
import { emit, has, type City } from './state';
import { CATCH_RATE, COST, FINE_HOURS } from './tune';

/** Fines, and the places cars are left where they may not be: the lane, a small street. */

/** Chance an inspector sees a badly parked car. */
export const catchChance = (c: City): number => 1 - Math.exp(-CATCH_RATE * c.policies.inspectors * (has(c, 'scancars') ? 2 : 1));
const FINE_FEAR = 0.35;
export const daring = (c: City): number => COST.doublePark * (has(c, 'drones') ? 0.65 : 1) * Math.exp(-catchChance(c) * c.prices.fine * FINE_FEAR);

/** Cars left in a lane: one place per road, made when the first one stops there. */
export function doubleSpot(c: City, road: number): Spot {
  const key = `double:${road}`;
  const have = c.day.spots.get(key);
  if (have) return have;
  const r = c.net.roads.find((x) => x.id === road);
  const at = r ? r.line[Math.floor(r.line.length / 2)]! : { x: 0, y: 0 };
  const made: Spot = { key, kind: 'double', id: road, spaces: 0, used: 0, access: { road, s: 0 }, at, sum: 0, samples: 0, cars: [], ver: 0 };
  c.day.spots.set(key, made);
  return made;
}

/** Left on a small street: inspectors fine it by day. */
export function streetFine(c: City, leg: Leg, at: Pt): void {
  const hour = hourAt(c.clock, 'day');
  if (hour < FINE_HOURS[0] || hour >= FINE_HOURS[1] || c.prices.fine <= 0 || !c.dice.chance(catchChance(c))) return;
  bank(c, 'fines', c.prices.fine, at);
  scoreFine(c, leg, at, c.prices.fine);
  emit(c, { t: 'fine', at, amount: c.prices.fine });
}
