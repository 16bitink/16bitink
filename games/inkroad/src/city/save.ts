import { createNetwork } from '../sim/network';
import type { Network } from '../sim/trafficTypes';
import type { Bar, CityDef, JunctionStats, Letter, Ledger, Lot, Movement, Policies, Prices, RoadStats } from '../sim/types';
import { emptyDay } from './day';
import { createDice } from './rng';
import { readRules } from './rules/state';
import type { ActiveCommission, City, DayReport, Measures, Mood } from './state';
import { emptyLedger } from './state';

/** JSON-safe snapshots. A save made at a year's start restores exactly; one made in a day restarts that day. */
export const SAVE_VERSION = 1;

/** `at`: a plot that moved, shrank or was dropped: gx, gy, w, h, opening year. */
interface LotSave { readonly level: Lot['level']; readonly at?: readonly number[] }

function saveLot(def: CityDef, l: Lot): LotSave {
  const d = def.lots[l.id];
  const same = d && d.gx === l.gx && d.gy === l.gy && d.w === l.w && d.h === l.h && d.opensYear === l.opensYear;
  return same ? { level: l.level } : { level: l.level, at: [l.gx, l.gy, l.w, l.h, l.opensYear] };
}

function restoreLot(def: CityDef, base: Lot, s: LotSave | undefined): Lot {
  const l = { ...base, level: s?.level ?? base.level };
  if (!Array.isArray(s?.at) || s.at.length !== 5 || !s.at.every((n) => Number.isInteger(n) && n >= 0 && n < MAX_CELL)) return l;
  const [gx, gy, w, h, opensYear] = s.at as [number, number, number, number, number];
  const cols = def.map[0]?.length ?? 0;
  return w > 0 && h > 0 && gx + w < cols && gy + h < def.map.length ? { ...l, gx, gy, w, h, opensYear } : l;
}
const MAX_CELL = 128;
export interface CitySave {
  readonly v: number; readonly city: string; readonly seed: number; readonly dice: number;
  readonly year: number; readonly season: City['season']; readonly phase: City['phase'];
  readonly net: Pick<Network, 'version' | 'roads' | 'links' | 'junctions' | 'nextId'>;
  readonly nextId: number; readonly lots: readonly LotSave[]; readonly extraLots: readonly Lot[];
  readonly parks: City['parks']; readonly lines: City['lines']; readonly projects: City['projects'];
  readonly money: number; readonly approval: number; readonly bars: City['bars']; readonly lastBars: City['lastBars'];
  readonly yearApprovals: readonly number[]; readonly yearHabits: City['yearHabits']; readonly letters: readonly Letter[]; readonly plates: readonly number[];
  readonly prices: Prices; readonly priceBase: Prices; readonly policies: Policies;
  readonly ledger: Ledger; readonly lastLedger: Ledger; readonly purse: City['purse'];
  readonly techs: readonly string[]; readonly techChoices: readonly string[]; readonly commissions: readonly ActiveCommission[];
  readonly floated: City['floated']; readonly bailouts: number; readonly expect: City['expect']; readonly ownership: number;
  readonly moods: readonly (readonly [number, Mood])[]; readonly memory: readonly (readonly [string, number])[];
  readonly vote: City['vote']; readonly report: DayReport | null; readonly complaints: City['complaints']; readonly replacedWhy?: City['replacedWhy'];
  readonly rule?: City['rule'];
  readonly measures: { readonly junctions: readonly (readonly [number, JunctionStats])[]; readonly roads: readonly (readonly [number, RoadStats])[]; readonly movements: readonly (readonly [number, readonly Movement[]])[] };
}

const sumDay = (l: Ledger): Ledger => ({ ...l, income: { ...l.income, parking: 0, fines: 0, tolls: 0, fares: 0, zone: 0 } });
const dayIncome = (l: Ledger): number => l.income.parking + l.income.fines + l.income.tolls + l.income.fares + l.income.zone;

export function saveCity(c: City): CitySave {
  const inDay = c.phase === 'day';
  const { version, roads, links, junctions, nextId } = c.net;
  return {
    v: SAVE_VERSION, city: c.def.id, seed: c.seed, dice: c.dice.state(), year: c.year, season: c.season, phase: c.phase,
    net: { version, roads, links, junctions, ...(nextId !== undefined ? { nextId } : {}) },
    nextId: c.nextId, lots: c.lots.slice(0, c.def.lots.length).map((l) => saveLot(c.def, l)), extraLots: c.lots.slice(c.def.lots.length),
    parks: c.parks, lines: c.lines, projects: c.projects,
    // A day saved half way starts again at dawn, so what it earned is taken back.
    money: inDay ? c.money - dayIncome(c.ledger) : c.money, ledger: inDay ? sumDay(c.ledger) : c.ledger,
    approval: c.approval, bars: c.bars, lastBars: c.lastBars, yearApprovals: c.yearApprovals, yearHabits: c.yearHabits, letters: c.letters, plates: c.plates,
    prices: c.prices, priceBase: c.priceBase, policies: c.policies, lastLedger: c.lastLedger, purse: c.purse,
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
const LISTS = ['lots', 'extraLots', 'parks', 'lines', 'projects', 'yearApprovals', 'yearHabits', 'letters', 'plates', 'techs', 'techChoices', 'commissions', 'floated', 'moods', 'memory', 'complaints'];
const OBJECTS = ['net', 'bars', 'lastBars', 'prices', 'priceBase', 'policies', 'ledger', 'lastLedger', 'purse', 'expect', 'vote', 'measures'];

/** The first thing wrong with a save, or null. Never throws. */
export function saveProblem(def: CityDef, x: unknown): string | null {
  if (!isObj(x)) return 'not a save';
  if (x.v !== SAVE_VERSION) return 'another version';
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

/** The network as saved, on the city's own ground. */
export function restoreNetwork(def: CityDef, s: CitySave): Network {
  const fresh = createNetwork(def.map, [], def.gates);
  return { ...fresh, ...s.net };
}

/** A save's fields, ready to become a City (traffic and driveways are made by the caller). */
export function restoreFields(def: CityDef, s: CitySave, baseLots: readonly Lot[]): Omit<City, 'traffic'> {
  const measures: Measures = { junctions: new Map(s.measures.junctions), roads: new Map(s.measures.roads), movements: new Map(s.measures.movements) };
  return {
    def, seed: s.seed, dice: createDice(s.dice), net: restoreNetwork(def, s), year: s.year, season: s.season, phase: s.phase, clock: 0, carry: 0, nextId: s.nextId,
    lots: [...baseLots.map((l, i) => restoreLot(def, l, s.lots[i])), ...s.extraLots], parks: s.parks, lines: s.lines, projects: s.projects,
    money: s.money, approval: s.approval, bars: s.bars, lastBars: s.lastBars, yearApprovals: s.yearApprovals, yearHabits: s.yearHabits, letters: s.letters, plates: s.plates,
    prices: s.prices, priceBase: s.priceBase, policies: s.policies, ledger: s.ledger ?? emptyLedger(), lastLedger: s.lastLedger, purse: s.purse,
    techs: s.techs, techChoices: s.techChoices, commissions: s.commissions, floated: s.floated, bailouts: s.bailouts, expect: s.expect, ownership: s.ownership,
    moods: new Map(s.moods), memory: new Map(s.memory), vote: s.vote, weather: { speed: 1, crashes: 0 }, day: emptyDay(), services: new Map(),
    measures, report: s.report, complaints: s.complaints, events: [], replacedWhy: s.replacedWhy,
    ...(s.rule ? { rule: readRules(s.rule) } : {}),
  };
}
