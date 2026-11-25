import type { CityView, Pt } from '../sim/types';
import { byPain, fullLots, goalParts, junctionOf, mainJunction, mid, nearestLot } from './places';

/** The year's goal in plain words, and where on the map it is decided. Pure. */
export interface GoalInfo { readonly text: string; readonly how: string; readonly at: Pt | null; readonly r: number }

const HOW: Readonly<Record<string, string>> = {
  wait: 'How long each car waits there. Build a better junction, or lead cars round it.',
  worstWait: 'The slowest junction that is busy. Fix the reddest tag first.',
  double: 'Cars that stop in the lane. Give them spaces, and hire inspectors.',
  fined: 'Fines written in a day. More spaces, fewer fines.',
  riders: 'People on your buses and trains. Join many homes to many jobs.',
  lost: 'Trips that were given up. Shorter queues, more ways through.',
  share: 'How many go without a car. More lines, more vehicles, dearer parking.',
  onTime: 'Trips that arrive when people expect. Cut the longest queues.',
  approval: 'What people think of you. Raise the lowest of the four bars.',
  support: 'How many like the zone charge. It grows as they feel the result.',
  found: 'Drivers who find a space. Build car parks or kerb bays near, or price them.',
  foundIn: 'Drivers who find a space in that district. Build spaces near, or price them.',
  cars: 'How many homes may have a car. Auction fewer licences each year.',
  licencePrice: 'What a licence sells for. Offer more, or make cars less needed.',
  speedKept: 'How often the watched roads keep their speed. Let the gates charge more.',
  minis: 'Private minibuses left. Tap a line: license it or buy it out.',
  condition: 'How good the roads are on average. Repair the worst first.',
  freeway: 'Pieces of freeway turned into boulevards. Tap a piece.',
};
const BAR_HOW: Readonly<Record<string, string>> = { trips: 'Trips goes up when people arrive in time.', parking: 'Parking goes up when people find a space.', cost: 'Cost goes up when prices feel fair.', streets: 'Streets goes up with fewer works and less noise.' };

export function goalInfo(city: CityView): GoalInfo {
  const { head, arg } = goalParts(city);
  const place = where(city, head, arg);
  return { text: city.goal.text, how: head === 'bar' ? BAR_HOW[arg] ?? '' : HOW[head] ?? '', ...place };
}

function where(city: CityView, head: string, arg: string): { readonly at: Pt | null; readonly r: number } {
  if (head === 'wait') { const j = mainJunction(city); return j ? { at: { x: j.x, y: j.y }, r: j.radius + 10 } : { at: null, r: 0 }; }
  if (head === 'worstWait' || head === 'onTime' || head === 'lost') { const s = byPain(city)[0]; const j = s ? junctionOf(city, s.j.id) : undefined; return j ? { at: { x: j.x, y: j.y }, r: j.radius + 10 } : { at: null, r: 0 }; }
  if (head === 'found') { const l = fullLots(city).find((x) => x.kind === arg) ?? city.lots.find((x) => x.kind === arg && x.level > 0); return l ? { at: mid(l), r: l.w * 24 } : { at: null, r: 0 }; }
  if (head === 'foundIn') { const l = fullLots(city).find((x) => x.district === arg) ?? city.lots.find((x) => x.district === arg && x.level > 0); return l ? { at: mid(l), r: l.w * 24 } : { at: null, r: 0 }; }
  if (head === 'bar') { const c = city.complaints.find((x) => x.bar === arg); return { at: c?.at ?? null, r: 50 }; }
  if (head === 'double') { const l = fullLots(city)[0] ?? nearestLot(city, { x: 0, y: 0 }, ['market']); return l ? { at: mid(l), r: l.w * 24 } : { at: null, r: 0 }; }
  return { at: null, r: 0 };
}
