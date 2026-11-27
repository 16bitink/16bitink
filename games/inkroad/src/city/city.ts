import { DAY, MONTHS_PER_SEASON, STEP } from '../sim/constants';
import { createNetwork } from '../sim/network';
import { createTraffic } from '../sim/traffic';
import type {
  Bar, CityDef, CityEvent, CityView, Command, FuelView, Id, JunctionStats, Lot, Movement, Quote, RoadStats, YearGoal,
} from '../sim/types';
import { reportDay } from './approval';
import { dayKindAt, hourAt, lengthOf, localClock, periodAt } from './clock';
import { fuelView } from './hops';
import { carSlotOf, driverView, householdView, residentsOf } from './views';
import { apply, quote } from './commands';
import { priceLimits } from './commands/desk';
import { emptyDay } from './day';
import { yearGoal } from './goals';
import { moodOf, population } from './growth';
import { lastMonth } from './money';
import { lotFullness } from './parking';
import { createDice, mixSeed } from './rng';
import { specialView } from './rules';
import { beachCase, beachPlan, beachViews } from './rules/beach';
import { endDay, startDay, stepDay } from './run';
import { restoreFields, saveCity, saveProblem, type CitySave } from './save';
import { upgradeSave } from './saveUpgrade';
import { NO_VOTE } from './zone';
import { forecast, settleSeason } from './settle';
import { plannedRoads } from './standing';
import type { City, DayReport } from './state';
import { emptyLedger, emptyMeasures, openControls, openParks, openPolicies, openTools, yearDef } from './state';
import { TECHS } from './techs';
import { START_APPROVAL, START_EXPECT, START_PRICES } from './tune';
import { traceRoad } from './voices';
import { beginYear, freshTraffic } from './years';

const START_BARS: Readonly<Record<Bar, number>> = { trips: 58, parking: 70, cost: 80, streets: 78 };
const START_PAY = 0.2;
const VARIANTS = 7919;
const EPS = 1e-6;
/** Below this many cars today, the last day's numbers are still the better picture. */
const FRESH_CARS = 3;

const baseLots = (def: CityDef, seed: number): readonly Lot[] => def.lots.map((l, id) => ({
  id, name: l.name, kind: l.kind, gx: l.gx, gy: l.gy, w: l.w, h: l.h, level: l.opensYear === 1 ? l.level ?? 1 : 0,
  opensYear: l.opensYear, maxLevel: l.maxLevel ?? 4, access: null, district: l.district, variant: mixSeed(seed, id) % VARIANTS,
  ...(l.garden ? { garden: true } : {}),
}));

function newCity(def: CityDef, seed: number): City {
  const net0 = createNetwork(def.map, def.roads.filter((r) => (r.opensYear ?? 1) === 1), def.gates);
  const c: City = {
    def, seed, dice: createDice(mixSeed(seed, 1)), net: net0, traffic: createTraffic(net0, seed), year: 1, season: 0, month: 0, phase: 'yearStart', clock: 0, carry: 0,
    nextId: 1, lots: baseLots(def, seed), parks: [], lines: [], projects: [], money: def.startMoney, approval: START_APPROVAL,
    bars: START_BARS, opening: { bars: START_BARS, approval: START_APPROVAL }, lastBars: { ...START_BARS, approval: START_APPROVAL }, yearApprovals: [], yearHabits: [], letters: [], plates: [],
    prices: START_PRICES, priceBase: START_PRICES, policies: { inspectors: 0, permits: false, truckHours: false, nightWorks: false, taxis: 0 },
    ledger: emptyLedger(), books: [], purse: { parking: 0, fines: 0, tolls: 0, fares: 0, zone: 0 },
    techs: [], techChoices: [], commissions: [], floated: [], bailouts: 0, expect: { trip: START_EXPECT, pay: START_PAY }, ownership: def.rules.carOwnership,
    moods: new Map(), memory: new Map(), vote: NO_VOTE, weather: { speed: 1, crashes: 0 }, day: emptyDay(), services: new Map(),
    measures: emptyMeasures(), report: null, complaints: [], events: [], replacedWhy: undefined,
  };
  beginYear(c);
  return c;
}

function loadCity(def: CityDef, saved: unknown): City | null {
  const save = upgradeSave(saved);
  const problem = saveProblem(def, save);
  if (problem) { console.warn(`InkRoad: save not used (${problem})`); return null; }
  const s = save as CitySave;
  const fields = restoreFields(def, s, baseLots(def, s.seed));
  const c: City = { ...fields, traffic: createTraffic(fields.net, s.seed) };
  freshTraffic(c);
  if (c.phase === 'day') startDay(c);
  return c;
}

/** Petrol stations change every step: the same array while nothing in it does. */
const fuels = new WeakMap<City, readonly FuelView[]>();
function fuelOf(c: City): readonly FuelView[] {
  const now = fuelView(c);
  const was = fuels.get(c);
  if (was && was.length === now.length && was.every((f, i) => JSON.stringify(f) === JSON.stringify(now[i]))) return was;
  fuels.set(c, now);
  return now;
}

const shown = new WeakMap<readonly Lot[], readonly Lot[]>();
/** A public beach is a place people go, not a block: the view reads it from `beaches`. The same array while nothing changes. */
function builtLots(lots: readonly Lot[]): readonly Lot[] {
  const have = shown.get(lots);
  if (have) return have;
  const made = lots.some((l) => l.kind === 'beach') ? lots.filter((l) => l.kind !== 'beach') : lots;
  shown.set(lots, made);
  return made;
}

class CityGame implements CityView {
  constructor(private readonly c: City) {}
  get def() { return this.c.def; }
  get year() { return this.c.year; }
  get season() { return this.c.season; }
  get month() { return this.c.season * MONTHS_PER_SEASON + this.c.month; }
  get phase() { return this.c.phase; }
  get clock() { return localClock(this.c.clock); }
  get hour() { return hourAt(this.c.clock, this.c.phase); }
  get period() { return this.c.phase === 'review' || this.c.phase === 'yearEnd' ? 'night' as const : periodAt(this.c.clock); }
  get dayKind() { return dayKindAt(this.c.clock); }
  get dayLength() { return lengthOf(dayKindAt(this.c.clock)); }
  get fuel() { return fuelOf(this.c); }
  get parking() { return this.c.parking ?? []; }
  get routineLine() { return this.c.def.routine?.line ?? ''; }
  get version() { return this.c.net.version; }
  get roads() { return this.c.net.roads; }
  get links() { return this.c.net.links; }
  get junctions() { return this.c.net.junctions; }
  get lots() { return builtLots(this.c.lots); }
  get carParks() { return this.c.parks; }
  get lines() { return this.c.lines; }
  get projects() { return this.c.projects; }
  get cars() { return this.c.traffic.cars; }
  get money() { return this.c.money; }
  get approval() { return this.c.approval; }
  get bars() { return this.c.bars; }
  get lastBars() { return this.c.lastBars; }
  get letters() { return this.c.letters; }
  get plates() { return this.c.plates; }
  get prices() { return this.c.prices; }
  get priceLimits() { return priceLimits(this.c); }
  get policies() { return this.c.policies; }
  get ledger() { return this.c.ledger; }
  get lastLedger() { return lastMonth(this.c); }
  get books() { return this.c.books; }
  get complaints() { return this.c.complaints; }
  get tools() { return openTools(this.c); }
  get newTools() { return yearDef(this.c).tools; }
  get controls() { return openControls(this.c); }
  get parkKinds() { return openParks(this.c); }
  get openPolicies() { return openPolicies(this.c); }
  get masterPlan() { return [...beachPlan(this.c), ...(yearDef(this.c).plan ?? [])]; }
  get beaches() { return beachViews(this.c); }
  get beach() { return beachCase(this.c); }
  get plannedRoads() { return plannedRoads(this.c.def, this.c.year); }
  get techs() { return this.c.techs; }
  get techChoices() { return TECHS.filter((t) => this.c.techChoices.includes(t.id)); }
  get commissions() { return this.c.commissions; }
  get goal(): YearGoal { return yearGoal(this.c); }
  get population() { return population(this.c); }
  get forecast() { return { nextMonth: forecast(this.c) }; }
  get vote() { const v = this.c.vote; return openTools(this.c).includes('zone') ? { support: Math.round(v.support), seasons: v.seasons, running: v.running, kept: v.kept } : undefined; }
  get special() { return specialView(this.c); }
  get replacedWhy() { return this.c.replacedWhy; }

  quote(cmd: Command): Quote { return quote(this.c, cmd); }
  apply(cmd: Command): Quote { return apply(this.c, cmd); }

  advance(seconds: number): void {
    const c = this.c;
    if (c.phase !== 'day' || !(seconds > 0)) return;
    c.carry += Math.min(seconds, DAY);
    while (c.carry >= STEP - EPS && c.phase === 'day') {
      c.carry -= STEP;
      if (stepDay(c)) { endDay(c); settleSeason(c); }
    }
  }

  drainEvents(): CityEvent[] {
    const out = this.c.events;
    this.c.events = [];
    const now = this.c.clock;
    // A move told before this step (in the warm-up before dawn) is that far along already.
    return out.map((e) => ((e.t === 'park' || e.t === 'parkGo') && e.when !== undefined && now - e.when > STEP / 2 ? { ...e, age: now - e.when } : e));
  }

  movements(node: Id): readonly Movement[] {
    const live = this.c.phase === 'day' ? this.c.traffic.movements(node) : [];
    const cars = live.reduce((n, m) => n + m.cars, 0);
    return cars >= FRESH_CARS ? live : this.c.measures.movements.get(node) ?? live;
  }

  roadStats(road: Id): RoadStats {
    const live = this.c.traffic.roadStats(road);
    return this.c.phase === 'day' ? live : this.c.measures.roads.get(road) ?? live;
  }

  junctionStats(node: Id): JunctionStats {
    const live = this.c.traffic.junctionStats(node);
    return this.c.phase === 'day' && live.cars >= FRESH_CARS ? live : this.c.measures.junctions.get(node) ?? live;
  }

  trace(road: Id) { return traceRoad(this.c, road); }
  driver(i: number) { return driverView(this.c, i); }
  residents(lot: Id) { return residentsOf(this.c, lot); }
  household(id: Id) { return householdView(this.c, id); }
  carOf(household: Id) { return carSlotOf(this.c, household); }
  lotMood(lot: Id) {
    const m = moodOf(this.c, lot);
    const l = this.c.lots[lot];
    return { trips: 1 - m.trips / 100, parking: l ? lotFullness(this.c, l) : 0 };
  }
  save(): CitySave { return saveCity(this.c); }
  /** The day so far in numbers: the lab's bots think with it. */
  soFar(): DayReport { return reportDay(this.c); }
}

/** Today's bars before any easing, as they stand now. */
export function peek(city: CityView): DayReport {
  if (!(city instanceof CityGame)) throw new Error('Not a city of this engine');
  return city.soFar();
}

/** A city to play. A bad or old save is refused (logged) and a new city starts. */
export function createCity(def: CityDef, seed: number, save?: unknown): CityView {
  const loaded = save === undefined || save === null ? null : loadCity(def, save);
  return new CityGame(loaded ?? newCity(def, seed));
}
