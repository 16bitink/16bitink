import { createNetwork } from '../sim/network';
import type { Network } from '../sim/trafficTypes';
import type { Bar, CityDef, JunctionStats, Letter, Ledger, Lot, Movement, Policies, Prices, RoadStats } from '../sim/types';
import { emptyDay } from './day';
import { unearned } from './money';
import { createDice } from './rng';
import { readRules } from './rules/state';
import type { ActiveCommission, City, DayReport, Measures, Mood } from './state';
import { emptyLedger } from './state';

/**
 * JSON-safe snapshots. A save made at a year's start restores exactly; one made in a day restarts that day, keeping
 * the paydays it has had. Version 2: months (paydays) instead of seasons for the books and the works.
 */
export const SAVE_VERSION = 2;

/** `at`: a plot that moved, shrank or was dropped: gx, gy, w, h, opening year. */
interface LotSave { readonly level: Lot['level']; readonly at?: readonly number[] }

function saveLot(def: CityDef, l: Lot): LotSave {
  const d = def.lots[l.id];
  const same = d && d.gx === l.gx && d.gy === l.gy && d.w === l.w && d.h === l.h && d.opensYear === l.opensYear;
  return same ? { level: l.level } : { level: l.level, at: [l.gx, l.gy, l.w, l.h, l.opensYear] };
}

/** A garden lot keeps its garden only while it is still 4 deep: a shrunk one is a plain lot. */
const withGarden = (l: Lot): Lot => {
  if (!l.garden || l.h === 4) return l;
  const { garden: _g, ...plain } = l;
  return plain;
};

function restoreLot(def: CityDef, base: Lot, s: LotSave | undefined): Lot {
  const l = { ...base, level: s?.level ?? base.level };
  if (!Array.isArray(s?.at) || s.at.length !== 5 || !s.at.every((n) => Number.isInteger(n) && n >= 0 && n < MAX_CELL)) return l;
  const [gx, gy, w, h, opensYear] = s.at as [number, number, number, number, number];
  const cols = def.map[0]?.length ?? 0;
  return w > 0 && h > 0 && gx + w < cols && gy + h < def.map.length ? withGarden({ ...l, gx, gy, w, h, opensYear }) : l;
}
const MAX_CELL = 128;
export interface CitySave {
  readonly v: number; readonly city: string; readonly seed: number; readonly dice: number;
  readonly year: number; readonly season: City['season']; readonly month: City['month']; readonly phase: City['phase'];
  readonly net: Pick<Network, 'version' | 'roads' | 'links' | 'junctions' | 'nextId'>;
  readonly nextId: number; readonly lots: readonly LotSave[]; readonly extraLots: readonly Lot[];
  readonly parks: City['parks']; readonly lines: City['lines']; readonly projects: City['projects'];
  readonly money: number; readonly approval: number; readonly bars: City['bars']; readonly lastBars: City['lastBars'];
  readonly yearApprovals: readonly number[]; readonly yearHabits: City['yearHabits']; readonly letters: readonly Letter[]; readonly plates: readonly number[];
  readonly prices: Prices; readonly priceBase: Prices; readonly policies: Policies;
  readonly ledger: Ledger; readonly books: readonly Ledger[]; readonly purse: City['purse'];
  readonly techs: readonly string[]; readonly techChoices: readonly string[]; readonly commissions: readonly ActiveCommission[];
  readonly floated: City['floated']; readonly bailouts: number; readonly expect: City['expect']; readonly ownership: number;
  readonly moods: readonly (readonly [number, Mood])[]; readonly memory: readonly (readonly [string, number])[];
  readonly vote: City['vote']; readonly report: DayReport | null; readonly complaints: City['complaints']; readonly replacedWhy?: City['replacedWhy'];
  readonly rule?: City['rule'];
  readonly measures: { readonly junctions: readonly (readonly [number, JunctionStats])[]; readonly roads: readonly (readonly [number, RoadStats])[]; readonly movements: readonly (readonly [number, readonly Movement[]])[] };
}

export function saveCity(c: City): CitySave {
  const inDay = c.phase === 'day';
  const { version, roads, links, junctions, nextId } = c.net;
  return {
    v: SAVE_VERSION, city: c.def.id, seed: c.seed, dice: c.dice.state(), year: c.year, season: c.season, month: c.month, phase: c.phase,
    net: { version, roads, links, junctions, ...(nextId !== undefined ? { nextId } : {}) },
    nextId: c.nextId, lots: c.lots.slice(0, c.def.lots.length).map((l) => saveLot(c.def, l)), extraLots: c.lots.slice(c.def.lots.length),
    parks: c.parks, lines: c.lines, projects: c.projects,
    // A day saved half way starts again at dawn, so what drivers paid is taken back, and approval goes back to the dawn's.
    money: inDay ? c.money - c.day.moneyMade : c.money, ledger: inDay ? unearned(c.ledger) : c.ledger,
    approval: inDay ? c.opening.approval : c.approval, bars: inDay ? c.opening.bars : c.bars, lastBars: c.lastBars, yearApprovals: c.yearApprovals, yearHabits: c.yearHabits, letters: c.letters, plates: c.plates,
    prices: c.prices, priceBase: c.priceBase, policies: c.policies, books: c.books, purse: c.purse,
    techs: c.techs, techChoices: c.techChoices, commissions: c.commissions, floated: c.floated, bailouts: c.bailouts,
    expect: c.expect, ownership: c.ownership, moods: [...c.moods], memory: [...c.memory], vote: c.vote, report: c.report, complaints: c.complaints,
    ...(c.replacedWhy ? { replacedWhy: c.replacedWhy } : {}),
    ...(c.rule ? { rule: c.rule } : {}),
    measures: { junctions: [...c.measures.junctions], roads: [...c.measures.roads], movements: [...c.measures.movements] },
  };
}

type Obj = Readonly<Record<string, unknown>>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const BARS: readonly Bar[] = ['trips', 'parking', 'cost', 'streets'];
const PHASES = ['yearStart', 'day', 'review', 'yearEnd', 'replaced', 'cityDone'];
const LISTS = ['lots', 'extraLots', 'parks', 'lines', 'projects', 'yearApprovals', 'yearHabits', 'letters', 'plates', 'techs', 'techChoices', 'commissions', 'floated', 'moods', 'memory', 'complaints', 'books'];
const OBJECTS = ['net', 'bars', 'lastBars', 'prices', 'priceBase', 'policies', 'ledger', 'purse', 'expect', 'vote', 'measures'];

/** The first thing wrong with a save (brought up to this version), or null. Never throws. */
export function saveProblem(def: CityDef, x: unknown): string | null {
  if (!isObj(x)) return 'not a save';
  if (x.v !== SAVE_VERSION) return 'another version';
  if (![0, 1, 2].includes(x.month as number)) return 'bad month';
  if (x.city !== def.id) return 'another city';
  if (!isNum(x.seed) || !isNum(x.dice) || !isNum(x.money) || !isNum(x.approval) || !isNum(x.nextId) || !isNum(x.ownership)) return 'bad numbers';
  if (!Number.isInteger(x.year) || (x.year as number) < 1 || (x.year as number) > def.years.length) return 'bad year';
  if (![0, 1, 2, 3].includes(x.season as number) || !PHASES.includes(x.phase as string)) return 'bad season';
  const list = LISTS.find((k) => !Array.isArray(x[k]));
  if (list) return `bad ${list}`;
  const obj = OBJECTS.find((k) => !isObj(x[k]));
  if (obj) return `bad ${obj}`;
  if (BARS.some((b) => !isNum((x.bars as Obj)[b]))) return 'bad bars';
  if ((x.lots as readonly unknown[]).length !== def.lots.length) return 'another map';
  const net = x.net as Obj;
  if (!['roads', 'links', 'junctions'].every((k) => Array.isArray(net[k]) && (net[k] as unknown[]).length < 4000)) return 'bad roads';
  const m = x.measures as Obj;
  return ['junctions', 'roads', 'movements'].every((k) => Array.isArray(m[k])) ? null : 'bad measures';
}

/**
 * A page of the books with every line: saves from before roads stopped costing a month have 'upkeep' (roads and
 * car parks together) and no 'repairs'; it is shown as car parks, the only running cost of the kind left.
 */
function booksOf(l: Ledger | undefined): Ledger {
  const empty = emptyLedger();
  if (!l) return empty;
  const { upkeep, ...costs } = l.costs as Ledger['costs'] & { readonly upkeep?: number };
  return { income: { ...empty.income, ...l.income }, costs: { ...empty.costs, ...costs, parks: (costs.parks ?? 0) + (upkeep ?? 0) } };
}

/** The network as saved, on the city's own ground. */
export function restoreNetwork(def: CityDef, s: CitySave): Network {
  const fresh = createNetwork(def.map, [], def.gates);
  return { ...fresh, ...s.net };
}

/** A save's fields, ready to become a City (traffic and driveways are made by the caller). */
export function restoreFields(def: CityDef, s: CitySave, baseLots: readonly Lot[]): Omit<City, 'traffic'> {
  const measures: Measures = { junctions: new Map(s.measures.junctions), roads: new Map(s.measures.roads), movements: new Map(s.measures.movements) };
  return {
    def, seed: s.seed, dice: createDice(s.dice), net: restoreNetwork(def, s), year: s.year, season: s.season, month: s.month, phase: s.phase, clock: 0, carry: 0, nextId: s.nextId,
    lots: [...baseLots.map((l, i) => restoreLot(def, l, s.lots[i])), ...s.extraLots], parks: s.parks, lines: s.lines, projects: s.projects,
    money: s.money, approval: s.approval, bars: s.bars, opening: { bars: s.bars, approval: s.approval }, lastBars: s.lastBars, yearApprovals: s.yearApprovals, yearHabits: s.yearHabits, letters: s.letters, plates: s.plates,
    prices: s.prices, priceBase: s.priceBase, policies: s.policies, ledger: booksOf(s.ledger), books: s.books.map(booksOf), purse: s.purse,
    techs: s.techs, techChoices: s.techChoices, commissions: s.commissions, floated: s.floated, bailouts: s.bailouts, expect: s.expect, ownership: s.ownership,
    moods: new Map(s.moods), memory: new Map(s.memory), vote: s.vote, weather: { speed: 1, crashes: 0 }, day: emptyDay(), services: new Map(),
    measures, report: s.report, complaints: s.complaints, events: [], replacedWhy: s.replacedWhy,
    ...(s.rule ? { rule: readRules(s.rule) } : {}),
  };
}
