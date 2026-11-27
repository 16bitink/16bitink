import { DAY } from '../src/sim/constants';
import type {
  Bar, CityDef, CityEvent, CityView, Command, Complaint, Commission, Ledger, Period, Phase, Prices, Quote, TechDef, ToolId, YearDef,
} from '../src/sim/types';

/** A stand-in CityView for the UI dev page and flow checks: no traffic, just phases, money and numbers that react to commands. */
const TOOLS_BY_YEAR: ToolId[][] = [['street', 'junction', 'remove'], ['kerb', 'parking'], [], ['avenue']];
const ZERO_L: Ledger = {
  income: { parking: 0, fines: 0, tolls: 0, fares: 0, zone: 0, grant: 0, auction: 0, float: 0, budget: 0 },
  costs: { building: 0, land: 0, upkeep: 0, transit: 0, staff: 0, interest: 0 },
};
const TECHS: TechDef[] = [
  { id: 'smart_signals', name: 'Smart signals', text: 'Signals adjust themselves. 10 to 20 percent less waiting.', icon: 'smart_signals' },
  { id: 'scan_car', name: 'Scan car', text: 'Meerkats scan plates from a moving car.', icon: 'scan_car' },
  { id: 'parking_app', name: 'Parking app', text: 'Drivers see free spaces before they set off.', icon: 'parking_app' },
];

export function fakeYear(year: number): YearDef {
  return {
    year, name: ['The Roundabout', 'No Space at the Market', 'The Fine Print', 'Office Hours'][year - 1] ?? `Year ${year}`,
    intro: [{ who: 'zaza', text: 'Welcome, Director! The roundabout is already sulking.' }, { who: 'pim', text: 'We have 300 coins and a lot of opinions.' }, { who: 'sulo', text: 'I am late. The traffic. Carry on.' }],
    tools: TOOLS_BY_YEAR[year - 1] ?? [], plan: ['Year 3: the office district opens', 'Year 4: the first buses'], grant: 60,
    goal: { kind: 'wait', target: 20, text: 'Mean wait at the roundabout under 20 s' },
    events: [], cannotLose: year === 1,
    coach: year === 1 ? [{ text: 'Tap a road tool, then drag from one junction to the next.', at: 'tool', tool: 'street', until: 'toolPicked:street' }, { text: 'This roundabout is the red one. Tap it.', at: 'worstJunction', until: 'selected' }] : undefined,
  };
}

export const FAKE_DEF: CityDef = {
  id: 'saffron', name: 'Saffron Bay', number: 1, blurb: '', map: [], style: 'gulf', startMoney: 400, startControl: 'roundabout', roads: [], lots: [], gates: [],
  years: Array.from({ length: 10 }, (_, i) => fakeYear(i + 1)), rules: { carOwnership: 0.5, landPrice: 1, widen: true },
};

const COMPLAINTS: Complaint[] = [
  { who: 'Hamda the hedgehog', animal: 'hedgehog', text: 'I have been at this roundabout since lunch.', bar: 'trips', at: { x: 400, y: 300 }, weight: 9 },
  { who: 'Omar the owl', animal: 'owl', text: 'No space at the market. Again.', bar: 'parking', at: { x: 700, y: 220 }, weight: 6 },
  { who: 'Noor the gazelle', animal: 'gazelle', text: 'A fine for what, exactly?', bar: 'cost', at: { x: 220, y: 500 }, weight: 4 },
];
const COMMISSION: Commission = {
  id: 'c1', title: 'Calm the market', text: 'The Council wants the market road quiet.', upfront: 40, reward: 120, goal: 'Mean wait at the market under 20 s', progress: 0.4,
  endsYear: 1, endsSeason: 3, state: 'offered',
};

/** A tiny state machine that walks the phases like the real city does. */
export class FakeCity {
  year = 1; season: 0 | 1 | 2 | 3 = 0; phase: Phase = 'yearStart'; clock = 0; version = 1;
  money = 420; approval = 62; plates: number[] = []; techs: string[] = []; letters: CityView['letters'] = [];
  prices: Prices = { park: 2, parkPeak: 4, fine: 20, toll: 2, tollPeak: 4, fare: 1, zone: 0 };
  policies = { inspectors: 1, permits: false, truckHours: false, nightWorks: false, taxis: 0 };
  commissions: Commission[] = [COMMISSION];
  events: CityEvent[] = [];
  replacedWhy: CityView['replacedWhy'];
  readonly def = FAKE_DEF;
  readonly bars: Record<Bar, number> = { trips: 44, parking: 58, cost: 71, streets: 66 };
  readonly lastBars = { trips: 50, parking: 55, cost: 71, streets: 70, approval: 58 };
  readonly cars = { count: 120, alive: new Uint8Array(0), x: new Float32Array(0), y: new Float32Array(0), heading: new Float32Array(0), z: new Float32Array(0), speed: new Float32Array(0), kind: new Uint8Array(0), tint: new Uint8Array(0), anger: new Float32Array(0), blinker: new Int8Array(0), state: new Uint8Array(0), uid: new Uint32Array(0) };
  readonly roads = [{ id: 1, type: 'street', a: 1, b: 2, cells: [], line: [], level: 0, links: [], oneWay: false, bridge: false, busLane: false, kerb: false, toll: false, truckBan: false, works: 0, nightWorks: false, fixed: false }] as unknown as CityView['roads'];
  junctions = [{ id: 1, cell: { gx: 5, gy: 5 }, x: 200, y: 200, control: 'signal', arms: [1, 2, 3, 4], radius: 30, split: [0.5, 0.5], works: 0 }, { id: 2, cell: { gx: 9, gy: 5 }, x: 360, y: 200, control: 'roundabout', arms: [1, 2], radius: 30, split: [1], works: 0 }] as unknown as CityView['junctions'];
  readonly lots = [{ id: 1, name: 'Pearl Market', kind: 'market', gx: 3, gy: 3, w: 2, h: 2, level: 1, opensYear: 1, maxLevel: 3, access: { road: 1, s: 0 }, district: 'Old Quay', variant: 0 }] as unknown as CityView['lots'];
  readonly carParks = [{ id: 1, kind: 'lot', gx: 4, gy: 4, w: 2, h: 1, spaces: 40, used: 31, access: { road: 1, s: 0 }, occupancy: 0.78 }] as unknown as CityView['carParks'];
  readonly lines = [{ id: 1, mode: 'bus', name: 'Line 1', colour: 0, stops: [{ gx: 1, gy: 1 }, { gx: 4, gy: 1 }], path: [], vehicles: 2, riders: 340, crowding: 0.7, works: 0 }] as unknown as CityView['lines'];
  readonly links = [] as unknown as CityView['links'];

  constructor(snap: unknown) {
    if (snap && typeof snap === 'object' && typeof (snap as { year?: unknown }).year === 'number') this.year = (snap as { year: number }).year;
    this.plates = Array.from({ length: this.year - 1 }, () => 2);
  }

  readonly dayKind = 'work' as const;
  readonly dayLength = DAY;
  readonly fuel = [];
  readonly routineLine = 'Early mornings, hot noons, late dinners.';
  get hour(): number { return 6 + (this.clock / DAY) * 18; }
  get period(): Period { const h = this.hour; return h < 8 ? 'dawn' : h < 11 ? 'am' : h < 16 ? 'mid' : h < 20 ? 'pm' : 'night'; }
  get tools(): ToolId[] { return TOOLS_BY_YEAR.slice(0, this.year).flat(); }
  get newTools(): ToolId[] { return TOOLS_BY_YEAR[this.year - 1] ?? []; }
  get ledger(): Ledger { return { income: { ...ZERO_L.income, parking: 84, fines: 31, budget: 60 }, costs: { ...ZERO_L.costs, building: 40, upkeep: 12, staff: 20 } }; }
  get lastLedger(): Ledger { return ZERO_L; }
  get goal(): CityView['goal'] { return { text: this.def.years[this.year - 1]!.goal.text, value: 24, target: 20, met: this.year % 2 === 0, unit: 's' }; }
  get techChoices(): TechDef[] { return this.phase === 'yearEnd' ? TECHS : []; }
  get complaints(): Complaint[] { return COMPLAINTS; }
  get population(): number { return 1200; }
  get controls(): CityView['controls'] { return this.year > 1 ? ['yield', 'roundabout', 'signal'] : ['yield', 'roundabout']; }
  get parkKinds(): CityView['parkKinds'] { return ['lot', 'multi']; }
  get openPolicies(): CityView['openPolicies'] { return this.year > 1 ? ['inspectors', 'permits'] : []; }
  get projects(): CityView['projects'] { return this.year > 0 ? [{ id: 1, node: 1, fromRoad: 1, toRoad: 2, level: 1, line: [{ x: 200, y: 200 }], left: 2 }] : []; }
  get vote(): CityView['vote'] { return { support: 46, seasons: 2, running: false, kept: null }; }
  get masterPlan(): string[] { return ['Year 3: the office district opens', 'Year 4: the first buses']; }
  get forecast(): { nextSeason: number } { return { nextSeason: 36 }; }
  readonly priceLimits = Object.fromEntries((['park', 'parkPeak', 'fine', 'toll', 'tollPeak', 'fare', 'zone'] as const).map((k) => [k, { min: 0, max: 30, step: k === 'fine' ? 5 : 1, open: !['toll', 'tollPeak', 'zone'].includes(k) }])) as CityView['priceLimits'];

  quote(cmd: Command): Quote {
    if (cmd.t === 'control') return { ok: cmd.control !== 'smart', why: 'Needs the smart signals technology', cost: cmd.control === 'signal' ? 60 : cmd.control === 'roundabout' ? 30 : 0, land: 0, works: 0 };
    if (cmd.t === 'upgrade') return { ok: this.money > 9, cost: 9, land: 0, works: 1 };
    if (cmd.t === 'float') return { ok: cmd.stream === 'parking' && this.year > 1, cost: 400, land: 0, works: 0 };
    return { ok: true, cost: 0, land: 0, works: 0 };
  }

  apply(cmd: Command): Quote {
    const q = this.quote(cmd);
    if (!q.ok) return q;
    if (cmd.t === 'next') this.next();
    else if (cmd.t === 'prices') this.prices = { ...this.prices, ...cmd.prices };
    else if (cmd.t === 'policies') this.policies = { ...this.policies, ...cmd.policies };
    else if (cmd.t === 'tech') this.techs = [...this.techs, cmd.id];
    else if (cmd.t === 'commission') this.commissions = this.commissions.map((c) => (c.id === cmd.id ? { ...c, state: cmd.take ? 'taken' : 'failed' } : c));
    else if (cmd.t === 'split') this.junctions = this.junctions.map((j, i) => (i === 0 ? { ...j, split: [...cmd.split] } : j));
    this.money -= q.cost;
    this.version++;
    return q;
  }

  private next(): void {
    if (this.phase === 'yearStart') this.phase = 'day';
    else if (this.phase === 'review') this.endSeason();
    else if (this.phase === 'yearEnd') this.nextYear();
  }

  private endSeason(): void {
    if (this.season === 3) { this.plates[this.year - 1] = 2; this.phase = 'yearEnd'; return; }
    this.season = (this.season + 1) as 0 | 1 | 2 | 3;
    this.clock = 0;
    this.phase = 'day';
  }

  private nextYear(): void {
    if (this.year >= 10) { this.phase = 'cityDone'; return; }
    this.year++; this.season = 0; this.clock = 0; this.phase = 'yearStart';
  }

  advance(seconds: number): void {
    if (this.phase !== 'day') return;
    this.clock += seconds;
    if (this.clock < DAY) return;
    this.clock = DAY;
    this.phase = 'review';
    if (this.year === 2 && this.season === 1) {
      this.letters = [{ year: 2, season: 1, approval: 38, worst: 'trips', text: 'The residents are cross. Please be less cross-making.' }];
      this.events.push({ t: 'letter', letter: this.letters[0]! });
    }
    if (this.year === 3 && this.season === 1) {
      this.phase = 'replaced';
      this.replacedWhy = { text: 'Three letters, two traffic jams and one very loud hedgehog.', spots: [{ at: { x: 200, y: 200 }, text: 'Pearl Roundabout: 94 s wait' }, { at: { x: 700, y: 220 }, text: 'Market car park: always full' }, { at: { x: 220, y: 500 }, text: 'Dune Road: closed for works' }] };
    }
  }

  drainEvents(): CityEvent[] { const e = this.events; this.events = []; return e; }
  movements(): ReturnType<CityView['movements']> { return [{ node: 1, fromRoad: 1, toRoad: 2, cars: 120, wait: 64, share: 0.6, arrow: [], flyover: false }, { node: 1, fromRoad: 2, toRoad: 1, cars: 80, wait: 22, share: 0.3, arrow: [], flyover: false }]; }
  roadStats(): ReturnType<CityView['roadStats']> { return { flow: 38, speedRatio: 0.45, queue: 6 }; }
  junctionStats(id: number): ReturnType<CityView['junctionStats']> { return id === 1 ? { wait: 64, cars: 220, grade: 'E' } : { wait: 12, cars: 90, grade: 'B' }; }
  trace(): ReturnType<CityView['trace']> { return { from: [{ name: 'Old Quay', share: 0.5 }, { name: 'East Gate', share: 0.3 }], to: [{ name: 'Pearl Market', share: 0.7 }] }; }
  driver(): ReturnType<CityView['driver']> { return { who: 'Hamda the hedgehog', animal: 'hedgehog', text: 'Third time round the block. I can see the shop.', household: 1, day: [], now: 'On the way to Pearl Market', late: 0 }; }
  residents(): ReturnType<CityView['residents']> { return []; }
  household(): ReturnType<CityView['household']> { return null; }
  carOf(): number { return -1; }
  lotMood(): { trips: number; parking: number } { return { trips: 0.3, parking: 0.7 }; }
  save(): unknown { return { year: this.year }; }
}

/**
 * A believable `CityView.parking` worked out from a real city's lots, roads, car parks and beaches,
 * for looking at the renderer before the engine reports it: homes and forecourts, kerbs, a small street,
 * a car park, sand at the first public (or any) beach and one double-parked car.
 */
export function fakeParking(city: Pick<CityView, 'roads' | 'lots' | 'carParks' | 'beaches'>): NonNullable<CityView['parking']> {
  const kinds = ['car', 'car', 'car', 'van', 'taxi', 'truck'] as const;
  let uid = 1;
  const cars = (n: number, withS?: { len: number; side: -1 | 1 }): NonNullable<CityView['parking']>[number]['cars'] =>
    Array.from({ length: n }, (_, i) => {
      const id = uid++;
      return { uid: id, tint: (id * 5) % 12, kind: kinds[id % kinds.length]!, ...(withS ? { s: ((i + 0.5) / n) * withS.len, side: withS.side } : {}) };
    });
  const out: NonNullable<CityView['parking']>[number][] = [];
  for (const l of city.lots) {
    if (l.kind === 'home') out.push({ key: `lot:${l.id}`, kind: 'home', lot: l.id, spaces: 4, cars: cars(2 + (l.id % 3)) });
    else if (['market', 'shops', 'mall', 'office'].includes(l.kind)) out.push({ key: `lot:${l.id}`, kind: 'private', lot: l.id, spaces: 6, cars: cars(3 + (l.id % 3)) });
  }
  city.roads.forEach((r, i) => {
    if (r.level !== 0 || r.line.length < 2) return;
    const len = r.line.reduce((m, p, k) => (k ? m + Math.hypot(p.x - r.line[k - 1]!.x, p.y - r.line[k - 1]!.y) : 0), 0);
    if (len < 100) return;
    const kind = r.type === 'street' ? 'street' : 'kerb';
    const n = Math.min(8, Math.floor(len / 40));
    out.push({ key: `${kind}:${r.id}`, kind, road: r.id, spaces: n * 2, cars: [...cars(n, { len, side: 1 }), ...cars(n >> 1, { len, side: -1 })] });
    if (i === 3) out.push({ key: `double:${r.id}`, kind: 'double', road: r.id, spaces: 1, cars: [{ uid: uid++, tint: 3, kind: 'van', s: len / 2, side: 1 }] });
  });
  for (const p of city.carParks) if (p.kind === 'lot' || p.kind === 'ride') out.push({ key: `park:${p.id}`, kind: 'park', park: p.id, spaces: p.spaces, cars: cars(Math.min(14, p.spaces)) });
  for (const b of city.beaches ?? []) out.push({ key: `sand:${b.id}`, kind: 'sand', beach: b.id, spaces: 8, cars: cars(7) });
  return out;
}
