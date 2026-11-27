import type { Lot } from '../sim/types';
import type { Chain, Place, Purpose, Stop, StopKind, Tour } from './day';
import { leaveOf, planChains } from './chains';
import { NIGHT_END, SEASON_END } from './clock';
import { fleetOf } from './households';
import { builtArea, cellsToBlock, centreOf, distPt } from './geometry';
import { CELL, DAY } from '../sim/constants';
import { habitOf } from './flows';
import { gateNodes, pointOf } from './places';
import { beachDraws } from './rules/beachDay';
import { throughShare } from './rules/freeway';
import type { City } from './state';
import { createDice, mixSeed } from './rng';
import { has } from './state';
import { AM, DRAWS_IN, GATE, GRAVITY, HOME_TOURS, JOBS, LEVEL_PULL, LORRIES, MID, NIGHT_LORRIES, HOME_BY, OUT_OF_TOWN, PM, PURPOSE, SHOPPING, STAY, VALUE_PER_SECOND, WEEKEND_GATES, WEEKEND_STAY } from './tune';

type Pull = Readonly<Partial<Record<Lot['kind'], number>>>;
export interface Target { readonly place: Place; readonly lot: Lot; readonly weight: number }

const pullOf = (l: Lot, pull: Pull): number => (pull[l.kind] ?? 0) * builtArea(l) * (LEVEL_PULL[l.level] ?? 0);

export const targetsFor = (c: City, pull: Pull): readonly Target[] =>
  c.lots.filter((l) => l.level > 0 && l.access).map((lot) => ({ place: { lot: lot.id }, lot, weight: pullOf(lot, pull) })).filter((t) => t.weight > 0);

/** Choose a destination: bigger pulls more, farther pulls less. */
export function pickTarget(c: City, from: { x: number; y: number }, list: readonly Target[]): Target | null {
  const weights = list.map((t) => t.weight * Math.exp(-distPt(from, centreOf(t.lot)) / (GRAVITY * CELL)));
  const total = weights.reduce((n, w) => n + w, 0);
  if (total <= 0) return null;
  let left = c.dice.next() * total;
  for (let i = 0; i < list.length; i++) { left -= weights[i]!; if (left <= 0) return list[i]!; }
  return list[list.length - 1] ?? null;
}

/** A whole number that averages to n. */
const roundUp = (c: City, n: number): number => Math.floor(n) + (c.dice.chance(n - Math.floor(n)) ? 1 : 0);
/** A bell-ish hour in a window. */
const bell = (c: City, w: { readonly from: number; readonly to: number }): number => w.from + (w.to - w.from) * (0.85 * c.dice.next() + 0.15 * c.dice.next());
const flat = (c: City, w: { readonly from: number; readonly to: number }): number => c.dice.range(w.from, w.to);

/** Who makes a trip: the same somebody makes nearly the same trip every day. Null on the very first day (tuned by hand). */
type Who = readonly number[] | null;
/** The first year is the same for everyone: it is the one that teaches. */
const GUIDED = { seed: 3 } as const;
const FICKLE = 5; // one in five does something else each day
const person = (c: City, kind: number, place: number, i: number): Who =>
  (c.year === 1 && c.season === 0 ? null : [kind, place, i, i % FICKLE === FICKLE - 1 ? c.year * 4 + c.season : -1]);

/** Let somebody decide with their own dice, so that a day's demand only changes when the city does. */
function asPerson<T>(c: City, who: Who, decide: () => T): T {
  if (who === null) return decide();
  const own = c.dice;
  c.dice = createDice(mixSeed(c.year === 1 ? GUIDED.seed : c.seed, ...who));
  const out = decide();
  c.dice = own;
  return out;
}

export interface Draw { readonly from: Place; readonly to: Place; readonly purpose: Purpose; readonly leave: number; readonly until?: number; readonly stay?: number; readonly owns?: boolean; readonly who?: Who }

const VALUE_SPREAD = [0.6, 1.5] as const;
function makeTour(c: City, id: number, d: Draw): Tour {
  return {
    id, from: d.from, to: d.to, purpose: d.purpose, leave: d.leave, until: d.until ?? null, stay: d.stay ?? 0, owns: d.owns ?? c.dice.chance(c.ownership),
    value: VALUE_PER_SECOND * c.dice.range(VALUE_SPREAD[0], VALUE_SPREAD[1]), seed: c.dice.next(),
  };
}

/** Work and school hours: staggered hours spread the morning out. */
function commuteHours(c: City): { readonly leave: number; readonly until: number } {
  if (has(c, 'stagger')) return { leave: flat(c, { from: AM.from, to: AM.to + 10 }), until: flat(c, { from: PM.from - 5, to: PM.to + 4 }) };
  return { leave: AM.from + (AM.to - AM.from) * c.dice.next() ** AM.early, until: bell(c, PM) };
}

/** Where a worker of this block looks for a job: where the neighbours work, or anywhere. */
export function jobsFor(c: City, l: Lot, all: readonly Target[]): readonly Target[] {
  const habit = habitOf(c, l);
  if (!habit || !c.dice.chance(habit.share)) return all;
  const usual = all.filter((t) => habit.jobs.has(t.lot.name));
  return usual.length > 0 ? usual : all;
}

function homeTour(c: City, l: Lot, lists: { readonly work: readonly Target[]; readonly school: readonly Target[]; readonly shop: readonly Target[]; readonly visit: readonly Target[] }): Draw | null {
  const from: Place = { lot: l.id };
  const at = centreOf(l);
  const roll = c.dice.next();
  if (roll < PURPOSE.work) {
    const gate = c.dice.chance(OUT_OF_TOWN) ? pickGate(c) : null;
    return gate ? { from, to: gate, purpose: 'work', ...commuteHours(c) } : commute(c, from, pickTarget(c, at, jobsFor(c, l, lists.work)), 'work');
  }
  if (roll < PURPOSE.work + PURPOSE.school) {
    if (has(c, 'schoolbus') && c.dice.chance(0.6)) return null;
    return commute(c, from, pickTarget(c, at, lists.school), 'school');
  }
  if (roll < PURPOSE.work + PURPOSE.school + PURPOSE.shop) return shopping(c, from, pickTarget(c, at, lists.shop));
  const target = pickTarget(c, at, lists.visit.filter((t) => t.lot.id !== l.id));
  if (!target) return null;
  const evening = c.dice.chance(0.4);
  return { from, to: target.place, purpose: 'visit', leave: evening ? flat(c, { from: 60, to: 72 }) : flat(c, MID), stay: c.dice.range(STAY.visit[0], STAY.visit[1]) };
}

/** A gate, the bigger ones more often. */
function pickGate(c: City): Place | null {
  const nodes = gateNodes(c);
  const open = c.def.gates.filter((g) => (g.opensYear ?? 1) <= c.year && nodes.has(g.id));
  let left = c.dice.next() * open.reduce((n, g) => n + g.weight, 0);
  for (const g of open) { left -= g.weight; if (left <= 0) return { gate: nodes.get(g.id)! }; }
  return null;
}

function commute(c: City, from: Place, t: Target | null, purpose: 'work' | 'school'): Draw | null {
  return t ? { from, to: t.place, purpose, ...commuteHours(c) } : null;
}

const SHOP_WINDOWS = [{ from: 26, to: 40 }, MID, { from: 60, to: 74 }] as const;
function shopping(c: City, from: Place, t: Target | null): Draw | null {
  if (!t) return null;
  const roll = c.dice.next();
  const w = roll < 0.22 ? SHOP_WINDOWS[0] : roll < 0.72 ? SHOP_WINDOWS[1] : SHOP_WINDOWS[2];
  return { from, to: t.place, purpose: 'shop', leave: flat(c, w), stay: c.dice.range(STAY.shop[0], STAY.shop[1]) };
}

/** What the big places bring in from out of town. */
const outsiders = (c: City): number =>
  c.lots.reduce((n, l) => n + (l.level > 0 ? (DRAWS_IN[l.kind as keyof typeof DRAWS_IN] ?? 0) * builtArea(l) * (LEVEL_PULL[l.level] ?? 1) : 0), 0);

function gateDraws(c: City, scale: GateScale = ALL_GATES): Draw[] {
  const nodes = gateNodes(c);
  const gates = c.def.gates.filter((g) => (g.opensYear ?? 1) <= c.year && nodes.has(g.id)).map((g) => ({ ...g, place: { gate: nodes.get(g.id)! } as Place }));
  const grow = 1 + GATE.growth * (c.year - 1);
  const work = targetsFor(c, JOBS);
  const shop = targetsFor(c, SHOPPING);
  const heavy = targetsFor(c, { port: 3, market: 1, mall: 1.5, shops: 0.4 });
  const out: Draw[] = [];
  /** So many of them today, each deciding with their own dice. */
  const each = (kind: number, gate: number, count: number, decide: () => Draw | null): void => {
    const n = asPerson(c, person(c, kind, gate, -1), () => roundUp(c, count));
    for (let i = 0; i < n; i++) {
      const who = person(c, kind, gate, i);
      const d = asPerson(c, who, decide);
      if (d) out.push({ ...d, who, owns: true });
    }
  };
  const weight = gates.reduce((n, g) => n + g.weight, 0);
  const drawn = outsiders(c);
  const freight = lorries(c);
  gates.forEach((g, k) => {
    const at = pointOf(c, g.place);
    const share = g.weight / Math.max(1, weight);
    each(WHO.commuter, k, (GATE.commuters * g.weight * grow + drawn * share) * scale.commuters, () => {
      const isWork = c.dice.chance(0.6);
      const t = pickTarget(c, at, isWork ? work : shop);
      return isWork ? commute(c, g.place, t, 'work') : shopping(c, g.place, t);
    });
    const others = gates.filter((o) => o !== g);
    each(WHO.through, k, others.length ? GATE.through * g.weight * grow * scale.through : 0, () =>
      ({ from: g.place, to: c.dice.pick(others).place, purpose: 'through', leave: flat(c, { from: -14, to: 104 }) }));
    each(WHO.lorry, k, (GATE.trucks * g.weight * grow + freight * share) * scale.lorries, () => lorry(c, g.place, pickTarget(c, at, heavy)));
  });
  return out;
}

function lorry(c: City, from: Place, t: Target | null): Draw | null {
  if (c.policies.truckHours && c.dice.chance(NIGHT_LORRIES)) return null;
  const leave = flat(c, c.policies.truckHours ? QUIET_HOURS : { from: -6, to: 70 });
  return t ? { from, to: t.place, purpose: 'truck', leave, stay: 12 } : null;
}

/** Extra trips for a football night, a festival, a sale or the Fair. */
export interface Crowd { readonly place: Place; readonly tours: number; readonly from: number; readonly to: number }
function crowdDraws(c: City, crowd: Crowd): Draw[] {
  const homes = c.lots.filter((l) => l.kind === 'home' && l.level > 0 && l.access);
  const nodes = gateNodes(c);
  const gates = c.def.gates.filter((g) => (g.opensYear ?? 1) <= c.year && nodes.has(g.id));
  const out: Draw[] = [];
  for (let i = 0; i < crowd.tours; i++) {
    const outside = gates.length > 0 && c.dice.chance(0.4);
    const from: Place = outside ? { gate: nodes.get(c.dice.pick(gates).id)! } : { lot: c.dice.pick(homes).id };
    out.push({ from, to: crowd.place, purpose: 'event', leave: flat(c, crowd), stay: c.dice.range(STAY.event[0], STAY.event[1]), ...(outside ? { owns: true } : {}) });
  }
  return out;
}

/** Kinds of people, for their dice. */
const WHO = { home: 1, commuter: 2, through: 3, lorry: 4, crowd: 5 } as const;
const QUIET_HOURS = { from: 45, to: 62 } as const;

/** Lorries the port, the mall and the markets bring in, on top of what always came. */
const lorries = (c: City): number =>
  c.lots.reduce((n, l) => n + (l.level > 0 && l.opensYear > 1 ? (LORRIES[l.kind as keyof typeof LORRIES] ?? 0) * builtArea(l) * (LEVEL_PULL[l.level] ?? 1) : 0), 0);

const WHO_TOUR = 9;
const SEASON_RATE = [1, 0.95, 1.05, 1] as const;

/** The first year's first day is the same for everyone: the old there-and-back tours, tuned by hand for the guide. */
const isGuided = (c: City): boolean => c.year === 1 && c.season === 0;

function homeDraws(c: City, schoolRate: number): Draw[] {
  const lists = {
    work: targetsFor(c, JOBS), school: targetsFor(c, { school: 1 }), shop: targetsFor(c, SHOPPING),
    visit: targetsFor(c, { home: 1, park: 2, hospital: 1, square: 2, landmark: 2 }),
  };
  const draws: Draw[] = [];
  for (const l of c.lots) {
    if (l.kind !== 'home' || l.level === 0 || !l.access) continue;
    const n = asPerson(c, person(c, WHO.home, l.id, -1), () => roundUp(c, builtArea(l) * (HOME_TOURS[l.level] ?? 0) * (SEASON_RATE[c.season] ?? 1)));
    for (let i = 0; i < n; i++) {
      const who = person(c, WHO.home, l.id, i);
      const d = asPerson(c, who, () => homeTour(c, l, lists));
      if (d) draws.push({ ...d, who });
      if (d?.purpose === 'school' && c.dice.chance(schoolRate)) draws.push(d);
    }
  }
  return draws;
}

const toTours = (c: City, draws: readonly Draw[], first: number): Tour[] =>
  draws.map((d, i) => asPerson(c, d.who ? [...d.who, WHO_TOUR] : null, () => makeTour(c, first + i, d)));


/** Everyone's workday, in order of leaving home: households' days, and whoever comes in by a gate. */
export function planDay(c: City, crowds: readonly Crowd[], schoolRate: number): readonly Tour[] {
  const guided = isGuided(c);
  const chains = guided ? [] : planChains(c, 'work');
  const home = guided ? homeDraws(c, schoolRate) : [];
  const draws = [...home, ...gateDraws(c), ...crowds.flatMap((x) => crowdDraws(c, x)), ...beachDraws(c)];
  const tours = toTours(c, draws, 0);
  c.day.chains = byHousehold(chains);
  c.day.workChains = c.day.chains;
  return [...chainTours(c, chains, tours.length), ...adopt(c, tours, chains)].sort((a, b) => a.leave - b.leave || a.id - b.id);
}

/** The weekend: households' outings, a few people by the gates, hardly a lorry. Timed after the workday. */
export function planWeekend(c: City): readonly Tour[] {
  const chains = planChains(c, 'weekend');
  // The workday's gate traffic squeezed into the weekend's shorter day keeps its rate per second, then thins out.
  const squeeze = WEEKEND_SPAN / (DAY - AM.from);
  const scale = { commuters: WEEKEND_GATES.commuters * squeeze, through: WEEKEND_GATES.through * squeeze, lorries: WEEKEND_GATES.lorries * squeeze };
  const gates = gateDraws(c, scale).map((d) => weekendTimes(d));
  const tours = toTours(c, gates, WEEKEND_IDS);
  c.day.chains = byHousehold(chains);
  return [...chainTours(c, chains, WEEKEND_IDS + tours.length), ...tours].sort((a, b) => a.leave - b.leave || a.id - b.id);
}

interface GateScale { readonly commuters: number; readonly through: number; readonly lorries: number }
const ALL_GATES: GateScale = { commuters: 1, through: 1, lorries: 1 };
const WEEKEND_IDS = 1_000_000;
/** A workday's gate times, squeezed into the weekend's drawn day. */
const WEEKEND_SPAN = SEASON_END - HOME_BY - NIGHT_END - 1;
function weekendTimes(d: Draw): Draw {
  const span = WEEKEND_SPAN;
  const at = (t: number): number => NIGHT_END + 1 + ((t - AM.from) / (DAY - AM.from)) * span;
  return { ...d, leave: at(d.leave), ...(d.until !== undefined ? { until: at(d.until) } : {}), ...(d.stay !== undefined ? { stay: d.stay * WEEKEND_STAY } : {}) };
}

function byHousehold(chains: readonly Chain[]): Map<number, Chain[]> {
  const out = new Map<number, Chain[]>();
  for (const ch of chains) out.set(ch.household, [...(out.get(ch.household) ?? []), ch]);
  return out;
}

const chainTours = (c: City, chains: readonly Chain[], first: number): Tour[] => chains.map((ch, i) => {
  const s = ch.stops[0]!;
  return { id: first + i, from: ch.home, to: s.place, purpose: s.purpose, leave: leaveOf(c, ch), until: s.until, stay: s.stay, owns: ch.car !== null, value: ch.value, seed: ch.seed, chain: ch, stop: 0 };
});

const VAN_SHARE = 0.12;
/**
 * Trips from home that are not a household's own day (a crowd for the match, a swim, the guided first day):
 * they take a car of somebody living there that nobody else drives today, when there is one.
 */
function adopt(c: City, tours: readonly Tour[], chains: readonly Chain[]): Tour[] {
  const fleet = fleetOf(c);
  const claimed = new Set(chains.flatMap((ch) => (ch.car === null ? [] : [ch.car])));
  return tours.map((t) => {
    if (!('lot' in t.from) || !t.owns || t.purpose === 'truck' || t.purpose === 'through') return t;
    const van = t.seed < VAN_SHARE;
    const homes = fleet.byLot.get(t.from.lot) ?? [];
    const car = homes.flatMap((h) => fleet.carsOf.get(h.id) ?? []).find((x) => !claimed.has(x.uid) && (x.kind === 'van') === van);
    if (!car) return t;
    claimed.add(car.uid);
    const stop: Stop = { kind: STOP_OF[t.purpose] ?? 'visit', label: LABEL_OF[t.purpose] ?? 'Visit', place: t.to, at: t.leave, until: t.until, stay: t.stay, purpose: t.purpose };
    const chain: Chain = { id: -t.id - 1, household: car.household, person: 0, home: t.from, kind: 'work', seed: t.seed, value: t.value, car: car.uid, stops: [stop], late: [], now: -1 };
    const list = c.day.chains.get(car.household) ?? [];
    c.day.chains.set(car.household, [...list, chain]);
    return { ...t, chain, stop: 0 };
  });
}
const STOP_OF: Readonly<Partial<Record<Purpose, StopKind>>> = { work: 'work', school: 'school', shop: 'shop', visit: 'visit', event: 'out' };
const LABEL_OF: Readonly<Partial<Record<Purpose, string>>> = { work: 'Work', school: 'School run', shop: 'Shopping', visit: 'Visit', event: 'Day out' };

/** Open homes within a few cells of a point, for noise and cut-through. */
export const homesNear = (c: City, at: { readonly x: number; readonly y: number }, cells: number): readonly Lot[] =>
  c.lots.filter((l) => l.kind === 'home' && l.level > 0 && cellsToBlock(l, at) <= cells);
