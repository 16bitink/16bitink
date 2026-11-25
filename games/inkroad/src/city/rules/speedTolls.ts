import type { Id, Period, Road, RoadType, SpecialView } from '../../sim/types';
import { roadSwitchQuote } from './switches';
import { isPeak, periodAt } from '../clock';
import { no, priced, needTool, type Handler } from '../commands/shared';
import { clamp, midOf } from '../geometry';
import { commitNetwork } from '../network';
import type { City } from '../state';
import { roadById } from '../state';
import { TOLL_GATE } from '../tune';
import { patchRoad } from './ground';
import { FRESH_DAY, ruleDay, ruleState, setRule, setRuleDay } from './state';

/**
 * Twin Isles: a gate that keeps its road at a speed. All such gates share one
 * wire and one price: it climbs while a watched road crawls and falls while
 * all of them run free. Yesterday's price opens the same hours today.
 */
export const WIRE = { every: 6, ease: 0.2, maxRange: { min: 2, max: 10 }, limitStep: 1, hint: 0.5 } as const;
/** A gate counts for the day's score in a peak, on a road that cars use. */
const BUSY_FLOW = 5;
/** Shown speeds at a free road, and the band a gate keeps: 45 to 65 on big roads, less on streets. */
const SIGNS: Readonly<Record<RoadType, { readonly free: number; readonly low: number; readonly high: number }>> = {
  street: { free: 50, low: 28, high: 38 }, avenue: { free: 70, low: 40, high: 55 }, boulevard: { free: 80, low: 45, high: 65 }, highway: { free: 90, low: 45, high: 65 },
};
const PERIODS: readonly Period[] = ['dawn', 'am', 'mid', 'pm', 'night'];

export const speedTollsOpen = (c: City): boolean => c.def.rules.speedTolls !== undefined && c.year >= c.def.rules.speedTolls.from;
const gates = (c: City): readonly Road[] => c.net.roads.filter((r) => r.toll && r.speedToll);
export const bandOf = (r: Pick<Road, 'type'>): { readonly low: number; readonly high: number } => SIGNS[r.type];
const speedOf = (c: City, r: Road): number => ruleDay(c).speeds.get(r.id) ?? c.traffic.roadStats(r.id).speedRatio * SIGNS[r.type].free;

/** The price the gates charge now, or null when no gate follows the speed. */
export const wirePrice = (c: City): number | null => (speedTollsOpen(c) && gates(c).length > 0 ? ruleDay(c).price : null);

export function dawnTolls(c: City): void { c.ruleDay = { ...FRESH_DAY, holes: 0 }; }

/** Once a second. True when the price changed (the roads must hear about it). */
export function tickTolls(c: City): boolean {
  if (!speedTollsOpen(c)) return false;
  const list = gates(c);
  if (list.length === 0) return false;
  watch(c, list);
  const d = ruleDay(c);
  const now = periodAt(c.clock);
  if (d.period !== now) {
    const price = Math.min(ruleState(c).toll.memo[now], ruleState(c).toll.max);
    setRuleDay(c, { period: now, price, wait: WIRE.every, last: { ...d.last, [now]: price } });
    return price !== d.price;
  }
  if (d.wait > 1) { setRuleDay(c, { wait: d.wait - 1 }); return false; }
  return adjust(c, list, now);
}

function watch(c: City, list: readonly Road[]): void {
  const d = ruleDay(c);
  const speeds = new Map<Id, number>();
  let inBand = 0;
  let seen = 0;
  for (const r of list) {
    const free = SIGNS[r.type];
    const live = c.traffic.roadStats(r.id).speedRatio * free.free;
    const was = d.speeds.get(r.id) ?? live;
    const v = was + (live - was) * WIRE.ease;
    speeds.set(r.id, v);
    if (!isPeak(c.clock) || c.traffic.roadStats(r.id).flow < BUSY_FLOW) continue;
    seen += 1;
    if (v >= free.low) inBand += 1;
  }
  setRuleDay(c, { speeds, inBand: d.inBand + inBand, samples: d.samples + seen });
}

function adjust(c: City, list: readonly Road[], now: Period): boolean {
  const d = ruleDay(c);
  const slow = list.some((r) => (d.speeds.get(r.id) ?? Infinity) < bandOf(r).low);
  const fast = list.every((r) => (d.speeds.get(r.id) ?? 0) > bandOf(r).high);
  const price = clamp(d.price + (slow ? 1 : fast ? -1 : 0), 0, ruleState(c).toll.max);
  setRuleDay(c, { price, wait: WIRE.every, last: { ...d.last, [now]: price } });
  return price !== d.price;
}

export function nightTolls(c: City): void {
  if (!speedTollsOpen(c)) return;
  const d = ruleDay(c);
  const t = ruleState(c).toll;
  const memo = Object.fromEntries(PERIODS.map((p) => [p, d.last[p] ?? t.memo[p]])) as Record<Period, number>;
  setRule(c, { toll: { ...t, memo, kept: d.samples > 0 ? d.inBand / d.samples : 0 } });
}

export const speedToll: Handler<'speedToll'> = {
  quote(c, cmd) {
    const r = roadById(c, cmd.road);
    const closed = needTool(c, 'toll');
    if (closed || !speedTollsOpen(c)) return no(closed ?? 'Not in this year\'s toolbox yet');
    const why = roadSwitchQuote(r);
    if (why || !r) return no(why ?? 'Pick a road');
    if (!!r.speedToll === cmd.on) return no(cmd.on ? 'It watches the speed already' : 'It is a plain gate already');
    return priced(c, cmd.on && !r.toll ? TOLL_GATE : 0, { line: r.line });
  },
  run(c, cmd) {
    const r = roadById(c, cmd.road)!;
    commitNetwork(c, patchRoad(c.net, r.id, cmd.on ? { speedToll: true, toll: true } : { speedToll: false }));
    return midOf(r);
  },
};

export const tollLimit: Handler<'tollLimit'> = {
  quote(c, cmd) {
    if (!speedTollsOpen(c)) return no('Not in this year\'s toolbox yet');
    if (c.phase !== 'review') return no('Prices change at the night review');
    const { min, max } = WIRE.maxRange;
    return Number.isInteger(cmd.max) && cmd.max >= min && cmd.max <= max ? priced(c, 0) : no(`Between ${min} and ${max}`);
  },
  run(c, cmd) {
    setRule(c, { toll: { ...ruleState(c).toll, max: cmd.max } });
    return { x: 0, y: 0 };
  },
};

export function tollView(c: City): SpecialView['speedTolls'] {
  if (!speedTollsOpen(c)) return undefined;
  const t = ruleState(c).toll;
  return {
    price: ruleDay(c).price, max: t.max, maxRange: WIRE.maxRange, kept: t.kept,
    gates: gates(c).map((r) => ({ road: r.id, speed: Math.round(speedOf(c, r)), ...bandOf(r) })),
  };
}

