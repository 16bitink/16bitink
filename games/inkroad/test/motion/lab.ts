/**
 * The motion lab's scenario harness (docs/inkroad-motion-lab.md). A scenario is a tiny city (map, roads, blocks, kerb
 * bays, car parks) and a script of actors: cars that arrive and park, cars already parked that leave at a time, cars
 * passing through, and background traffic at a fixed headway. It runs the REAL city and traffic code (`createCity`,
 * the city's own legs, parking and manoeuvre code, `traffic.step`); only the day's demand is replaced by the script.
 * Every drawn car is sampled at 6 frames a sim step through the renderer's own pure code (`MotionWatch`), so the
 * trace and the violations are what a player would see. Deterministic: a fixed seed, fixed headways.
 */
import { CELL, STEP, VEHICLES } from '../../src/sim/constants';
import { createCity } from '../../src/city/city';
import { roadAt } from '../../src/sim/netQuery';
import type { BeachDef, CarParkKind, CityDef, CityEvent, CityView, Command, Control, LotKind, RoadDef, RoadType, YearDef } from '../../src/sim/types';
import type { Chain, Leg, Place, Spot, Tour } from '../../src/city/day';
import type { City } from '../../src/city/state';
import type { Choice } from '../../src/city/modes';
import type { Access } from '../../src/sim/trafficTypes';
import { drive, newLeg } from '../../src/city/legs';
import { aimAt } from '../../src/city/manoeuvre';
import { callTaxi } from '../../src/city/kerbside';
import { accessOf } from '../../src/city/places';
import { stand, clearStanding, parkingView } from '../../src/city/stand';
import { freeSlots, hasRoom, sAlong } from '../../src/city/slots';
import { MOTION_SWITCHES, setSwitches, type MotionSwitches } from '../../src/sim/switches';
import { MotionWatch, FRAMES, type DrawnCar, type Finding } from '../motion-helpers';
import { extraChecks, type Violation } from './checks';

export type Cell = readonly [number, number];
export type Vehicle = 'car' | 'van' | 'truck';
/** A parking place by what it is: the kerb bays or bare kerb of the road through a cell, a block's own spaces, a car park (in build order). */
export type SpotRef = { readonly kerb: Cell } | { readonly street: Cell } | { readonly lot: string } | { readonly park: number }
  /** The sand of a public beach (by the beach's name). */
  | { readonly sand: string };

/** Drives in from a gate at `at` s, parks in `spot` (or wherever the city sends it for `lot`), stays `stay` s, leaves for gate `home` (default: where it came from). */
export interface ArriveActor { readonly kind: 'arrive'; readonly id: string; readonly at: number; readonly from: string; readonly lot: string; readonly spot?: SpotRef; readonly stay: number; readonly home?: string; readonly vehicle?: Vehicle;
  /** The driver knows every other place is full, bare kerbs and sand too: only `spot` is tried, then the city's last resort (double parking: a lorry always, others if they dare). */
  readonly onlyThere?: boolean;
  /** `taxi`: a taxi drops its rider at the lot's kerb (stays ~3 s, drives off). */
  readonly mode?: 'car' | 'taxi';
  /** The trip is a stop at a petrol station (`lot` is the station): a tour chain with a fuel stop, so a car finding every pump busy queues in the lane (queueAtPump). */
  readonly fuel?: boolean }
/** A rider leaves `lot` for gate `home` by taxi, set off at `at` s (goHome's callTaxi): the taxi comes from the nearest gate, waits at the lot's kerb ~4 s, takes the rider home. The taxi is named `id`. */
export interface RiderActor { readonly kind: 'rider'; readonly id: string; readonly at: number; readonly lot: string; readonly home: string }
/** A broken-down vehicle holds the lane through `cell` for `hold` s from `at` s (traffic.block; a car stuck behind it gives up after GIVE_UP = 60 s). */
export interface BlockerActor { readonly kind: 'blocker'; readonly id: string; readonly at: number; readonly cell: Cell; readonly hold: number; readonly state?: 2 | 3 | 4 }
/** Stands in `spot` from the start (slot `slot`); leaves at `leaveAt` s for gate `to`, or never. */
export interface ParkedActor { readonly kind: 'parked'; readonly id: string; readonly spot: SpotRef; readonly slot?: number; readonly lot: string; readonly leaveAt?: number; readonly to?: string; readonly vehicle?: Vehicle }
/** Drives from gate to gate. */
export interface ThroughActor { readonly kind: 'through'; readonly id: string; readonly at: number; readonly from: string;
  /** A gate id, or a cell: the junction there (a dead end, a bend) or else the road through it. A car sent to a dead end must turn round. */
  readonly to: string | Cell; readonly vehicle?: Vehicle }
export type Actor = ArriveActor | ParkedActor | ThroughActor | RiderActor | BlockerActor;
/** Background traffic: one car every `every` s from `start` (default 0) until `until` (default the end), named `bg`. */
export interface Flow { readonly from: string; readonly to: string | Cell; readonly every: number; readonly start?: number; readonly until?: number; readonly vehicle?: Vehicle }

export interface Scenario {
  readonly id: string;
  readonly title: string;
  /** One line: what must happen (the catalogue's words). */
  readonly expect: string;
  readonly size: Cell;
  /** Terrain rows (`.` ground, `~` water, `b` beach sand, `#`, `p`) instead of all ground: water for bridges, sand for beaches. Must be size[1] rows of size[0]. */
  readonly map?: readonly string[];
  /** Beaches (rects of `b` cells in `map`) the Council has made PUBLIC before the day starts (boot sends {t:'beach', advice:'public'}), so the sand spot exists. */
  readonly beaches?: readonly { readonly name: string; readonly cell: Cell; readonly w: number; readonly h: number }[];
  /** Called in boot, after kerbs and car parks, before dawn: flyovers (`flyover`, then finish their works), bus lines (`line`, `lineVehicles`). Use `must(v, cmd)` to be told when a command is refused. */
  readonly setup?: (v: CityView) => void;
  readonly roads: readonly { readonly cells: readonly Cell[]; readonly type?: RoadType; readonly oneWay?: boolean }[];
  readonly gates: readonly { readonly id: string; readonly cell: Cell }[];
  readonly lots?: readonly { readonly name: string; readonly kind: LotKind; readonly cell: Cell; readonly w: number; readonly h: number }[];
  readonly controls?: readonly { readonly cell: Cell; readonly control: Control }[];
  /** Roads (by a cell on them) that get paid kerb bays; the other streets keep a bare kerb (unmarked street parking). */
  readonly kerbs?: readonly Cell[];
  readonly carParks?: readonly { readonly kind: CarParkKind; readonly at: Cell }[];
  /** Places filled to the last space with parked cars (`p`) before the start. */
  readonly fill?: readonly SpotRef[];
  readonly actors: readonly Actor[];
  readonly flows?: readonly Flow[];
  /** Seconds of sim to play (from the scenario's 0). */
  readonly seconds: number;
  /** Its own checks, run after the generic ones. */
  readonly expectations?: (r: RunResult) => readonly Expectation[];
}

export interface Expectation { readonly name: string; readonly ok: boolean; readonly detail: string }

/** One car in one frame. `who`: the actor's id, `bg` (background flow), `fill` (a `fill` car) or `?` (none of ours). */
export interface Sample {
  readonly frame: number; readonly t: number; readonly who: string; readonly uid: number;
  readonly x: number; readonly y: number; readonly a: number; readonly v: number;
  /** Height drawn (0 on the ground, up on a flyover deck, down in an underpass). */
  readonly z: number;
  readonly gear: 'D' | 'R' | 'P';
  readonly state: 'moving' | 'manoeuvre' | 'parked';
  readonly info: string;
  readonly len: number; readonly wid: number;
}

/** A city event the actors took part in, at scenario time. */
export interface Logged { readonly t: number; readonly who: string; readonly e: CityEvent }

export interface RunResult {
  readonly scenario: Scenario;
  readonly switches: MotionSwitches;
  readonly city: CityView;
  readonly frames: number;
  /** Samples by frame (index = frame - 1). */
  readonly trace: readonly (readonly Sample[])[];
  readonly violations: readonly Violation[];
  readonly counts: Readonly<Record<string, number>>;
  readonly events: readonly Logged[];
  readonly expectations: readonly Expectation[];
  /** Scenario time at which each actor first entered the road, and arrived at a gate. */
  readonly entered: ReadonlyMap<string, number>;
  readonly gone: ReadonlyMap<string, number>;
  readonly ms: number;
}

const ALL_TOOLS = ['street', 'avenue', 'boulevard', 'highway', 'remove', 'junction', 'flyover', 'underpass', 'kerb', 'parking', 'toll', 'bus', 'buslane', 'tram', 'metro', 'boat', 'oneway', 'square', 'zone'] as const;
const LAB_YEAR = (year: number): YearDef => ({
  year, name: 'Motion lab', intro: [], tools: [...ALL_TOOLS], grant: 0, goal: { kind: 'wait', target: 99, text: '' }, events: [], cannotLose: true,
});
/** The seed every scenario runs with. */
export const LAB_SEED = 11;
const ACTOR_UID = 0x1000_0000;
const FILL_UID = 0x1800_0000;
const TOUR_ID = 7_000_000;
const BG_TOUR_ID = 8_000_000;
/** tour.seed picks the vehicle (src/city/vehicleKinds.ts: under 0.12 a van) and the tint. */
const SEED_OF: Readonly<Record<Vehicle, number>> = { car: 0.5, van: 0.05, truck: 0.5 };

export function defOf(s: Scenario): CityDef {
  const [w, h] = s.size;
  return {
    id: `lab-${s.id}`, name: s.title, number: 1, blurb: '', map: s.map ?? Array.from({ length: h }, () => '.'.repeat(w)), style: 'gulf', startMoney: 1e7, startControl: 'yield',
    roads: s.roads.map((r): RoadDef => ({ cells: r.cells, type: r.type ?? 'street', fixed: !r.oneWay })), // the one-way command refuses fixed roads
    controls: (s.controls ?? []).map((k) => ({ cell: k.cell, control: k.control })),
    lots: (s.lots ?? []).map((l) => ({ name: l.name, kind: l.kind, gx: l.cell[0], gy: l.cell[1], w: l.w, h: l.h, opensYear: 1, district: 'Lab' })),
    gates: s.gates.map((g) => ({ id: g.id, name: g.id, cell: g.cell, weight: 1 })),
    years: Array.from({ length: 10 }, (_, i) => LAB_YEAR(i + 1)),
    rules: { carOwnership: 0, landPrice: 1, widen: true },
    beaches: (s.beaches ?? []).map((b): BeachDef => ({ id: b.name, name: b.name, gx: b.cell[0], gy: b.cell[1], w: b.w, h: b.h, decideYear: 1, plots: [], share: 0, pull: 1 })),
  };
}

const inner = (v: CityView): City => (v as unknown as { c: City }).c;

/** Plays whole days (nobody about) until every project (a flyover's works) is finished. */
export function finishWorks(v: CityView): void {
  for (let guard = 0; v.projects.length > 0 && guard < 200; guard++) {
    if (v.phase === 'day') { inner(v).day.plan = []; v.advance(10); } else v.apply({ t: 'next' });
  }
  if (v.projects.length > 0) throw new Error('scenario setup: works never finished');
}

export function must(v: CityView, cmd: Command): void {
  const q = v.apply(cmd);
  if (!q.ok) throw new Error(`scenario setup refused ${JSON.stringify(cmd)}: ${q.why}`);
}

/** The city, its roads built, kerbs and car parks placed, at the start of a day with nobody about. */
export function boot(s: Scenario): CityView {
  const v = createCity(defOf(s), LAB_SEED);
  const c = inner(v);
  for (const r of s.roads) if (r.oneWay) must(v, { t: 'oneWay', road: roadOn(c, insideCell(r.cells)).id, dir: 1 });
  for (const k of s.kerbs ?? []) must(v, { t: 'kerb', road: roadOn(c, k).id, on: true });
  for (const p of s.carParks ?? []) must(v, { t: 'carPark', kind: p.kind, at: { gx: p.at[0], gy: p.at[1] } });
  for (const b of s.beaches ?? []) must(v, { t: 'beach', id: b.name, advice: 'public' });
  s.setup?.(v);
  while (v.phase !== 'day') v.apply({ t: 'next' });
  quiet(c);
  return v;
}

/** Nobody about: the day's own plan, its happenings, and whoever the warm-up put on the road or in a space are gone. */
function quiet(c: City): void {
  c.day.plan = [];
  c.day.next = 0;
  c.day.agenda = [];
  c.day.stays = [];
  c.day.waiting = [];
  c.day.crossings = [];
  c.day.legs = [];
  clearStanding(c);
  const t = c.traffic.cars;
  // Service vehicles (a bus line's buses) are the line's own, not the warm-up's: they stay.
  for (let i = 0; i < t.count; i++) if (t.alive[i] && !['bus', 'tram'].includes(VEHICLES[t.kind[i]!] ?? '')) c.traffic.remove(t.uid[i]!);
  c.traffic.drainArrivals();
  c.traffic.drainGaveUp();
  c.parking = parkingView(c);
  c.events = [];
}

/** A cell on a road's first run, one step in from its first end (a junction cell belongs to several roads). */
function insideCell(cells: readonly Cell[]): Cell {
  const [a, b] = [cells[0]!, cells[1]!];
  return [a[0] + Math.sign(b[0] - a[0]), a[1] + Math.sign(b[1] - a[1])];
}

function roadOn(c: City, cell: Cell) {
  const r = roadAt(c.net, { gx: cell[0], gy: cell[1] });
  if (!r) throw new Error(`no road at ${cell.join(',')}`);
  return r;
}

const gateId = (c: City, id: string): number => {
  const j = c.net.junctions.find((n) => n.gate === id);
  if (!j) throw new Error(`no gate ${id}`);
  return j.id;
};
const lotId = (c: City, name: string): number => {
  const l = c.lots.find((x) => x.name === name);
  if (!l) throw new Error(`no block ${name}`);
  return l.id;
};

export function spotOf(c: City, ref: SpotRef): Spot {
  const key = 'kerb' in ref ? `kerb:${roadOn(c, ref.kerb).id}` : 'street' in ref ? `street:${roadOn(c, ref.street).id}`
    : 'lot' in ref ? `lot:${lotId(c, ref.lot)}` : 'sand' in ref ? `sand:${ref.sand}` : `park:${c.parks[ref.park]?.id ?? -1}`;
  const s = c.day.spots.get(key);
  if (!s) throw new Error(`no parking place ${key} (have ${[...c.day.spots.keys()].join(' ')})`);
  return s;
}

const car = (spot: Spot | null, mode: 'car' | 'taxi' = 'car'): Choice => ({ mode, minutes: 0, seconds: 0, coins: 0, spot, lines: [] });

/** The script, played between sim steps: who sets off now. */
class Director {
  readonly tours = new Map<number, string>();
  readonly uids = new Map<number, string>();
  private readonly due: { at: number; go: () => void }[] = [];
  private bg = 0;
  readonly t0: number;

  constructor(private readonly c: City, private readonly s: Scenario) {
    this.t0 = c.clock;
    for (const ref of s.fill ?? []) this.fill(spotOf(c, ref));
    s.actors.forEach((a, i) => this.plan(a, i));
    for (const f of s.flows ?? []) {
      for (let t = f.start ?? 0; t < Math.min(f.until ?? s.seconds, s.seconds); t += f.every) this.due.push({ at: t, go: () => this.through(`bg`, f.from, f.to, f.vehicle ?? 'car', BG_TOUR_ID + this.bg++) });
    }
    this.due.sort((a, b) => a.at - b.at);
  }

  get now(): number { return this.c.clock - this.t0; }

  private filled = 0;
  private fill(spot: Spot): void {
    for (const k of freeSlots(this.c, spot, null, 'car')) {
      if (!hasRoom(this.c, spot, null, 'car')) return;
      this.uids.set(FILL_UID + this.filled, 'fill');
      stand(this.c, spot, { uid: FILL_UID + this.filled, tint: this.filled++ % 8, kind: 'car' }, true, undefined, k);
    }
  }

  private tour(id: number, from: Place, to: Place, vehicle: Vehicle, stay: number, through = false): Tour {
    return { id, from, to, purpose: through ? 'through' : vehicle === 'truck' ? 'truck' : 'shop', leave: this.c.clock, until: null, stay, owns: false, value: 1, seed: SEED_OF[vehicle] };
  }

  private plan(a: Actor, i: number): void {
    const c = this.c;
    const id = TOUR_ID + i;
    this.tours.set(id, a.id);
    if (a.kind === 'parked') {
      const spot = spotOf(c, a.spot);
      const uid = ACTOR_UID + i;
      this.uids.set(uid, a.id);
      const vehicle = a.vehicle ?? 'car';
      const e = stand(c, spot, { uid, tint: i % 8, kind: vehicle }, true, undefined, a.slot);
      if (a.leaveAt === undefined) return;
      const t = this.tour(id, { gate: gateId(c, a.to ?? this.s.gates[0]!.id) }, { lot: lotId(c, a.lot) }, vehicle, 0);
      const leg = newLeg(c, t, true, car(spot));
      leg.parked = e;
      c.day.stays.push({ leg, until: this.t0 + a.leaveAt, spot, from: null, parked: e });
      return;
    }
    if (a.kind === 'through') { this.due.push({ at: a.at, go: () => this.through(a.id, a.from, a.to, a.vehicle ?? 'car', id) }); return; }
    if (a.kind === 'blocker') { this.due.push({ at: a.at, go: () => this.block(a) }); return; }
    if (a.kind === 'rider') { this.due.push({ at: a.at, go: () => this.ride(a, id) }); return; }
    this.due.push({ at: a.at, go: () => {
      // The tour runs home -> block (its way back is to `home`); the car itself sets off from `from`.
      const t0 = this.tour(id, { gate: gateId(c, a.home ?? a.from) }, { lot: lotId(c, a.lot) }, a.vehicle ?? 'car', a.stay);
      const t = a.fuel ? this.fuelTour(t0) : t0;
      const spot = a.spot ? spotOf(c, a.spot) : a.fuel ? spotOf(c, { lot: a.lot }) : null;
      const leg = newLeg(c, t, true, car(spot, a.mode ?? 'car'));
      if (a.onlyThere && spot) leg.tried = [...c.day.spots.keys()].filter((k) => k !== spot.key);
      drive(c, leg, { gate: gateId(c, a.from) }, spot && leg.mode === 'car' ? aimAt(c, leg, spot) : accessOf(c, t.to));
    } });
  }

  /** The tour as one stop of a household's day: a fuel stop at the station. */
  private fuelTour(t: Tour): Tour {
    const stop = { kind: 'fuel' as const, label: 'Petrol', place: t.to, at: this.c.clock, until: null, stay: t.stay, purpose: 'shop' as const };
    const chain: Chain = { id: t.id, household: 0, person: 0, home: t.from, kind: 'work', seed: t.seed, value: t.value, car: null, stops: [stop], late: [0], now: 0 };
    return { ...t, chain, stop: 0 };
  }

  /** The rider's ride home by taxi: the city's own goHome path (callTaxi): the taxi comes from the nearest gate. */
  private ride(a: RiderActor, id: number): void {
    const c = this.c;
    const t = this.tour(id, { gate: gateId(c, a.home) }, { lot: lotId(c, a.lot) }, 'car', 0);
    const leg = newLeg(c, t, false, car(null, 'taxi'));
    if (!callTaxi(c, leg)) throw new Error('scenario: no taxi could be called');
  }

  private block(a: BlockerActor): void {
    const c = this.c;
    const r = roadOn(c, a.cell);
    const at: Access = { road: r.id, s: sAlong(r, { x: (a.cell[0] + 0.5) * CELL, y: (a.cell[1] + 0.5) * CELL }) };
    if (c.traffic.block(at, a.hold, a.state ?? 3) <= 0) throw new Error(`scenario: nothing blocked at ${a.cell.join(',')}`);
  }

  /** A gate id, or a cell: the junction there, else the road through it. */
  private placeAt(to: string | Cell): Access {
    const c = this.c;
    if (typeof to === 'string') return { gate: gateId(c, to) };
    const j = c.net.junctions.find((n) => n.cell.gx === to[0] && n.cell.gy === to[1]);
    if (j) return { gate: j.id };
    const r = roadOn(c, to);
    return { road: r.id, s: sAlong(r, { x: (to[0] + 0.5) * CELL, y: (to[1] + 0.5) * CELL }) };
  }

  private through(who: string, from: string, to: string | Cell, vehicle: Vehicle, id: number): void {
    const c = this.c;
    this.tours.set(id, who !== 'bg' ? who : 'bg');
    const dest = this.placeAt(to);
    const end: Place = 'gate' in dest ? { gate: dest.gate } : { gate: gateId(c, this.s.gates[0]!.id) };
    const t = this.tour(id, { gate: gateId(c, from) }, end, vehicle, 0, true);
    drive(c, newLeg(c, t, true, car(null)), accessOf(c, t.from), dest);
  }

  /** Before each sim step: start whoever is due. */
  before(): void {
    while (this.due[0] && this.due[0].at <= this.now + 1e-6) this.due.shift()!.go();
  }

  /** After each step: name the traffic uids of our legs (a leg keeps its tour; a parked car keeps its traffic uid). */
  learn(evs: readonly CityEvent[]): void {
    // Service vehicles nobody scripted (a bus line's buses, trams) are `bus`.
    const cars = this.c.traffic.cars;
    for (let i = 0; i < cars.count; i++) if (cars.alive[i] && !this.uids.has(cars.uid[i]!) && ['bus', 'tram'].includes(VEHICLES[cars.kind[i]!] ?? '')) this.uids.set(cars.uid[i]!, 'bus');
    const legs: readonly Leg[] = this.c.day.legs;
    for (const leg of legs) {
      const who = this.tours.get(leg.tour.id) ?? (leg.then ? this.tours.get(leg.then.tour.id) : undefined);
      if (who && leg.uid >= 0 && !this.uids.has(leg.uid)) this.uids.set(leg.uid, who);
    }
    for (const e of evs) if (e.t === 'parkGo' && e.uid !== undefined && this.uids.has(e.car)) this.uids.set(e.uid, this.uids.get(e.car)!);
  }

  whoIs(uid: number): string { return this.uids.get(uid) ?? '?'; }
}

/** Plays a scenario with the given switches (the rest as they are now) and checks it. */
export function runScenario(s: Scenario, switches: Partial<MotionSwitches> = {}): RunResult {
  const started = Date.now();
  const was = setSwitches(switches);
  try {
    return play(s, started);
  } finally {
    setSwitches(was);
  }
}

function play(s: Scenario, started: number): RunResult {
  const v = boot(s);
  const c = inner(v);
  const dir = new Director(c, s);
  const trace: Sample[][] = [];
  const events: Logged[] = [];
  const sample = (frame: number, clock: number, drawn: readonly DrawnCar[], parked: readonly DrawnCar[]): void => {
    const t = clock - dir.t0;
    const row: Sample[] = [];
    for (const b of drawn) {
      row.push({ frame, t, who: dir.whoIs(b.uid), uid: b.uid, x: b.x, y: b.y, a: b.a, v: b.v, z: b.z, gear: b.v < -0.01 ? 'R' : 'D', state: b.man ? 'manoeuvre' : 'moving', info: b.info ?? '', len: b.len, wid: b.wid });
    }
    for (const b of parked) row.push({ frame, t, who: dir.whoIs(b.uid), uid: b.uid, x: b.x, y: b.y, a: b.a, v: 0, z: b.z, gear: 'P', state: 'parked', info: '', len: b.len, wid: b.wid });
    trace[frame - 1] = row;
  };
  const watch = new MotionWatch(v, { before: () => dir.before(), onFrame: sample });
  const steps = Math.round(s.seconds / STEP);
  const entered = new Map<string, number>();
  const gone = new Map<string, number>();
  for (let k = 0; k < steps && v.phase === 'day'; k++) {
    watch.step();
    const evs = watch.lastEvents;
    dir.learn(evs);
    for (const e of evs) {
      const uid = e.t === 'park' || e.t === 'parkGo' ? e.car : -1;
      const who = uid >= 0 ? dir.whoIs(uid) : '';
      if (who && who !== '?') events.push({ t: dir.now, who, e });
    }
  }
  timesFromTrace(c, trace, entered, gone, s.seconds);
  const named = watch.found.map((f): Violation => violation(f, dir, trace));
  const extra = extraChecks(c, trace);
  const violations = [...named, ...extra].sort((a, b) => a.frame - b.frame);
  const counts: Record<string, number> = {};
  for (const x of violations) counts[x.rule] = (counts[x.rule] ?? 0) + 1;
  const partial: RunResult = { scenario: s, switches: { ...MOTION_SWITCHES }, city: v, frames: watch.frames, trace, violations, counts, events, expectations: [], entered, gone, ms: 0 };
  const expectations = s.expectations ? s.expectations(partial) : [];
  return { ...partial, expectations, ms: Date.now() - started };
}

/** Px from a gate's node within which a car comes onto or leaves the map. */
const GATE_R = 70;
/** First drawn frame of each actor on the road; the frame it left by a gate (its last, near a gate, before the end). */
function timesFromTrace(c: City, trace: readonly (readonly Sample[])[], entered: Map<string, number>, gone: Map<string, number>, seconds: number): void {
  const gates = c.net.junctions.filter((j) => j.gate !== undefined);
  const last = new Map<string, Sample>();
  for (const row of trace) for (const s of row ?? []) {
    if (s.who === '?' || s.who === 'bg' || s.who === 'fill') continue;
    if (!entered.has(s.who) && s.state === 'moving') entered.set(s.who, s.t);
    last.set(s.who, s);
  }
  const end = seconds; // the scenario's end, not the last frame's first car: that frame is empty once every car has left
  for (const [who, s] of last) if (s.state === 'moving' && s.t < end - STEP && gates.some((g) => Math.hypot(g.x - s.x, g.y - s.y) < GATE_R)) gone.set(who, s.t);
}

function violation(f: Finding, dir: Director, trace: readonly (readonly Sample[])[]): Violation {
  const frame = f.frame ?? 0;
  const t = trace[frame - 1]?.[0]?.t ?? (f.clock - dir.t0);
  return { rule: f.who === 'manoeuvre' ? `${f.rule} (manoeuvre)` : `${f.rule} (moving)`, who: dir.whoIs(f.uid), uid: f.uid, t, frame, value: f.value, limit: f.limit, x: f.x ?? 0, y: f.y ?? 0, a: f.a ?? 0, detail: f.detail };
}

export { FRAMES };
