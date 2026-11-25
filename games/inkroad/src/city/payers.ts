import { PERIODS } from '../sim/constants';
import { isPeak } from './clock';
import type { Tour } from './day';
import { cellsToBlock } from './geometry';
import { accessOf } from './places';
import { wirePrice } from './rules/speedTolls';
import { lotById, type City } from './state';
import { PARK_RADIUS, PREWARM, SHARE, SPREAD } from './tune';

/**
 * What a price does to the day's plan: some of those who would pay share a car with a neighbour,
 * and where the peak is dearer, some travel before it, or after.
 */

/** The share of the spaces for this block that cost money. */
function paidShare(c: City, lot: number): number {
  const l = lotById(c, lot);
  if (!l) return 0;
  let paid = 0;
  let free = 0;
  for (const s of c.day.spots.values()) {
    if (s.kind === 'private' && s.id === l.id) free += s.spaces;
    if ((s.kind === 'kerb' || s.kind === 'park') && cellsToBlock(l, s.at) <= PARK_RADIUS) paid += s.spaces;
  }
  return paid + free === 0 ? 0 : paid / (paid + free);
}

/** Toll gates on the way. */
function gatesOn(c: City, t: Tour): number {
  if (!c.net.roads.some((r) => r.toll)) return 0;
  const a = accessOf(c, t.from);
  const b = accessOf(c, t.to);
  if (!a || !b) return 0;
  const via = c.traffic.estimate(a, b, t.value).viaRoads ?? [];
  return via.filter((id) => c.net.roads.find((r) => r.id === id)?.toll).length;
}

interface Bill { readonly now: number; readonly extra: number }
/** Coins this trip costs in its own hour, and how much of that is the peak's. */
function billOf(c: City, t: Tour): Bill {
  const peak = isPeak(t.leave);
  const { park, parkPeak, toll, tollPeak, zone } = c.prices;
  const paid = 'lot' in t.to && parkPeak > 0 ? paidShare(c, t.to.lot) : 0;
  const gates = gatesOn(c, t);
  const wire = wirePrice(c);
  const gate = zone > 0 ? zone : wire ?? (peak ? tollPeak : toll);
  const extra = paid * Math.max(0, parkPeak - park) + (zone > 0 || wire !== null ? 0 : gates * Math.max(0, tollPeak - toll));
  return { now: paid * (peak ? parkPeak : park) + gates * gate, extra };
}

const PRIME = 7919;
/** The same person decides the same way every day. */
const luck = (t: Tour, k: number): number => (t.seed * PRIME * k) % 1;
const between = (r: readonly [number, number], u: number): number => r[0] + (r[1] - r[0]) * u;

/** Out of the morning peak: a quarter go early, the rest late. */
function morning(t: Tour): number {
  const by = between(SPREAD.by, luck(t, 2));
  return luck(t, 3) < SPREAD.early ? Math.max(1 - PREWARM, PERIODS.am - by) : PERIODS.mid + by;
}

/** And home before the evening one. */
function moved(t: Tour): Tour {
  const leave = isPeak(t.leave) ? (t.leave < PERIODS.mid ? morning(t) : PERIODS.pm - between(SPREAD.by, luck(t, 2))) : t.leave;
  const until = t.until !== null && isPeak(t.until) ? Math.max(leave + SPREAD.stay, PERIODS.pm - between(SPREAD.home, luck(t, 4))) : t.until;
  return { ...t, leave, until };
}

const charges = (c: City): boolean => c.parks.length > 0 || c.net.roads.some((r) => r.kerb || r.toll);
const DRIVES: ReadonlySet<Tour['purpose']> = new Set<Tour['purpose']>(['work', 'school', 'shop', 'visit', 'event']);

/** The day's plan, with the payers sharing cars and spreading out of the peak. */
export function answerPrices(c: City, plan: readonly Tour[]): readonly Tour[] {
  if (!charges(c)) return plan;
  const out: Tour[] = [];
  const shared: { tour: Tour; coins: number }[] = [];
  for (const t of plan) {
    if (!t.owns || !DRIVES.has(t.purpose)) { out.push(t); continue; }
    const bill = billOf(c, t);
    if (luck(t, 5) < Math.min(SHARE.max, bill.now * SHARE.perCoin)) { shared.push({ tour: t, coins: bill.now }); continue; }
    const flexible = t.until !== null || t.purpose === 'shop';
    const hits = isPeak(t.leave) || (t.until !== null && isPeak(t.until));
    out.push(flexible && hits && luck(t, 1) < Math.min(SPREAD.max, bill.extra * SPREAD.perCoin) ? moved(t) : t);
  }
  c.day.shared = shared;
  return out.sort((a, b) => a.leave - b.leave || a.id - b.id);
}
