/**
 * Motion lab scenarios: the city group (see docs/inkroad-motion-lab.md and the worked examples in scenarios.ts).
 * Add each scenario to CITY, and where it still breaks rules, its ratchet in KNOWN_CITY (counts per rule, failing expectations).
 */
import type { Scenario } from './lab';
import type { KnownSets } from './known';
import { brakesUnder, clean, expect, leavesBy, lotDoor, parkOuts, parkIns, parksIn, samplesOf } from './checks';
import { TAXI_DROP, TAXI_PICK } from '../../src/city/kerbside';
import type { Expectation, RunResult, Sample } from './lab';
import { STEP } from '../../src/sim/constants';
import { REVERSE_PLAYED } from '../../src/sim/kinematics';
import { TeleportWatch } from '../teleport-helpers';
import { lotRect } from '../../src/city/geometry';

const STREET_EW = {
  size: [14, 9] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const }, { cells: [[11, 4], [11, 8]] as const }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }, { id: 'SW', cell: [3, 8] as const }, { id: 'SE', cell: [11, 8] as const }],
  lots: [{ name: 'Shop', kind: 'shops' as const, cell: [9, 1] as const, w: 2, h: 2 }],
};

const cityOf = (r: import('./lab').RunResult) => (r.city as unknown as { c: import('../../src/city/state').City }).c;

/** How far (px) a sample's centre is inside a rectangle (0 outside). */
const depthIn = (s: Sample, b: { x: number; y: number; w: number; h: number }): number =>
  Math.max(0, Math.min(s.x - b.x, b.x + b.w - s.x, s.y - b.y, b.y + b.h - s.y));

/**
 * A car that goes inside a box (multi-storey, underground): drawn up to its mouth and not drawn again until it comes
 * out of the same mouth. The car is never drawn parked, is hidden for the stay, and is drawn at most `reach` px inside the box.
 */
function insideTheBox(r: RunResult, who: string, box: { x: number; y: number; w: number; h: number }, reach: number): Expectation[] {
  const list = samplesOf(r, who);
  let gap = -1;
  for (let i = 1; i < list.length; i++) if (gap < 0 || list[i]!.frame - list[i - 1]!.frame > list[gap]!.frame - list[gap - 1]!.frame) gap = i;
  const before = list[gap - 1], after = list[gap];
  const hidden = before && after ? after.t - before.t : 0;
  const mouth = before && after ? Math.hypot(after.x - before.x, after.y - before.y) : Infinity;
  const deepest = Math.max(0, ...list.map((s) => depthIn(s, box)));
  const parked = list.filter((s) => s.state === 'parked').length;
  return [
    expect(`${who} is not drawn for the stay`, hidden >= 8 && parked === 0, `hidden ${hidden.toFixed(1)} s, ${parked} parked frames drawn`),
    expect(`${who} comes out where it went in`, mouth <= (before?.len ?? 24), `out ${mouth.toFixed(0)} px from where it vanished`),
    expect(`${who} is never drawn deeper than ${reach} px inside the box`, deepest <= reach, `${deepest.toFixed(0)} px inside`),
  ];
}

const boxCarPark = (id: string, kind: 'multi' | 'under', title: string, expected: string, reach: number): Scenario => ({
  id, title, expect: expected,
  ...STREET_EW,
  carParks: [{ kind, at: [5, 1] }],
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Shop', spot: { park: 0 }, stay: 10 }],
  flows: [{ from: 'E', to: 'W', every: 7, start: 3 }],
  seconds: 36,
  expectations: (r) => {
    const c = cityOf(r);
    return [parksIn(r, 'A', 'park:'), ...insideTheBox(r, 'A', lotRect(c.parks[0]!), reach), leavesBy(r, 'A', 36), clean(r, 'A')];
  },
});

export const MULTI: Scenario = boxCarPark('park.carpark.multi-entrance', 'multi', 'Multi-storey car park: in at the entrance, out of the same mouth', 'A drives into a multi-storey entrance and disappears inside the box (no slots drawn), comes out of the same mouth later', 24);
export const UNDER: Scenario = boxCarPark('park.carpark.underground', 'under', 'Underground car park: down the ramp mouth', 'As the multi-storey: an underground ramp mouth, no car drawn over the box', 12);

/** The car was drawn on the road and in a manoeuvre before it stood parked: the frame it first stands is within a car length of the frame before. */
function drivenIn(r: RunResult, who: string): Expectation {
  const list = samplesOf(r, who);
  const i = list.findIndex((s) => s.state === 'parked');
  const was = list[i - 1];
  const moved = list.slice(0, Math.max(0, i)).some((s) => s.state === 'moving');
  const jump = i > 0 && was ? Math.hypot(list[i]!.x - was.x, list[i]!.y - was.y) : Infinity;
  return expect(`${who} drives in before it stands`, i > 0 && moved && jump <= list[i]!.len, i < 0 ? 'never stood' : `drove ${moved}, ${jump.toFixed(0)} px from the frame before`);
}

/** Homes along the north side of the street; each has its own driveway and spaces. */
export const NIGHT_HOME: Scenario = {
  id: 'park.night.home',
  title: 'Cars come home and park in their own spaces',
  expect: 'Household cars come home at night and park in their own spaces; no car is put in place without driving',
  ...STREET_EW,
  lots: [{ name: 'Home1', kind: 'home', cell: [5, 2], w: 2, h: 2 }, { name: 'Home2', kind: 'home', cell: [8, 2], w: 2, h: 2 }],
  actors: [
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Home1', spot: { lot: 'Home1' }, stay: 30 },
    { kind: 'arrive', id: 'B', at: 9, from: 'W', home: 'E', lot: 'Home2', spot: { lot: 'Home2' }, stay: 30 },
  ],
  flows: [{ from: 'E', to: 'W', every: 7, start: 3 }],
  seconds: 60,
  expectations: (r) => [parksIn(r, 'A', 'lot:'), parksIn(r, 'B', 'lot:'), drivenIn(r, 'A'), drivenIn(r, 'B'), clean(r, 'A'), clean(r, 'B')],
};

/** Plays the city on for `seconds` with the teleport detector (test/teleport-helpers.ts), which names every car that jumps, appears or vanishes. */
function afterwards(r: RunResult, seconds: number): { found: readonly { cause: string; clock: number; uid: number; detail: string }[]; causes: string; seen: number } {
  const w = new TeleportWatch(r.city);
  const traffic = cityOf(r).traffic.cars;
  const seen = new Set<number>();
  for (let t = 0; t < seconds; t += STEP) {
    w.step();
    for (let i = 0; i < traffic.count; i++) if (traffic.alive[i]) seen.add(traffic.uid[i]!);
  }
  const causes = Object.entries(w.counts()).map(([why, n]) => `${n} ${why}`).join(', ');
  return { found: w.found, causes: causes || 'none', seen: seen.size };
}

/**
 * The road under two parked cars goes (the lab's own roads belong to the highway ministry and cannot be removed, so the
 * bays are taken away: `kerb off` makes the same place vanish with cars standing in it, and the city moves them on).
 * The scenario plays 6 s as usual; then the bays go and the city plays on 24 s under the teleport detector.
 */
export const ROAD_REMOVED: Scenario = {
  id: 'city.road-removed',
  title: 'The kerb the cars stand at is taken away',
  expect: 'A road with parked cars is removed: the cars drive away or are moved with a drawn move, never teleport',
  ...STREET_EW,
  kerbs: [[6, 4]],
  actors: [
    { kind: 'parked', id: 'A', spot: { kerb: [6, 4] }, slot: 2, lot: 'Shop' },
    { kind: 'parked', id: 'B', spot: { kerb: [6, 4] }, slot: 5, lot: 'Shop' },
  ],
  flows: [{ from: 'W', to: 'E', every: 4, start: 1 }],
  seconds: 6,
  expectations: (r) => {
    const c = cityOf(r);
    const before = (r.city.parking ?? []).filter((p) => p.key.startsWith('kerb:')).reduce((n, p) => n + p.cars.length, 0);
    const q = r.city.apply({ t: 'kerb', road: c.net.roads.find((x) => x.kerb)!.id, on: false });
    const after = afterwards(r, 24);
    return [
      expect('two cars stood in the bays', before === 2, `${before} in kerb bays`),
      expect('the bays were taken away', q.ok, q.ok ? 'ok' : q.why ?? 'refused'),
      expect('cars drove while the detector watched', after.seen >= 1, `${after.seen} cars on the road`),
      expect('no car teleports', after.found.length === 0, after.causes),
    ];
  },
};

/**
 * A new year starts. The scenario plays 8 s (A parked at the kerb, traffic on the road); then the year ends the way
 * test/teleports.test.ts ends it (phase yearEnd, then `next` to the first day of year 2) and 30 s of the new day are
 * played under the teleport detector: nothing may jump, appear or vanish away from a gate or a drawn move.
 */
export const YEAR_START: Scenario = {
  id: 'city.year-start',
  title: 'A new year starts with cars on the road and at the kerb',
  expect: 'A new year starts (or a save is loaded): no car jumps, appears or vanishes away from a gate or a drawn move',
  ...STREET_EW,
  kerbs: [[6, 4]],
  actors: [
    { kind: 'parked', id: 'A', spot: { kerb: [6, 4] }, slot: 2, lot: 'Shop' },
    { kind: 'through', id: 'B', at: 1, from: 'W', to: 'E' },
  ],
  flows: [{ from: 'E', to: 'W', every: 2, start: 1 }],
  seconds: 8,
  expectations: (r) => {
    const c = cityOf(r);
    const year = r.city.year;
    const parked = (r.city.parking ?? []).reduce((n, p) => n + p.cars.length, 0);
    c.phase = 'yearEnd';
    for (let i = 0; i < 6 && (r.city.year === year || r.city.phase !== 'day'); i++) r.city.apply({ t: 'next' });
    const after = afterwards(r, 30);
    return [
      expect('a car stood at the kerb as the year ended', parked >= 1, `${parked} parked`),
      expect('the new year began its day', r.city.year === year + 1 && r.city.phase === 'day', `year ${r.city.year}, phase ${r.city.phase}`),
      expect('cars drove while the detector watched', after.seen >= 3, `${after.seen} cars on the road in the new day`),
      expect('no car teleports', after.found.length === 0, after.causes),
    ];
  },
};


/** Seconds `who` was drawn standing (parked or at rest in the lane) and the first frame it stood. */
const stoodFor = (r: RunResult, who: string): { secs: number; first: number } => {
  const list = samplesOf(r, who).filter((s) => s.state === 'parked' || Math.abs(s.v) < 1);
  return { secs: list.length / 60, first: list[0]?.t ?? -1 };
};
/** The actor reversed (gear R) at some frame in [from, to]. */
const reversedIn = (r: RunResult, who: string, from: number, to: number): boolean => samplesOf(r, who).some((s) => s.gear === 'R' && s.t >= from && s.t <= to);
/** The fastest it reversed between two times, px/s (0 if it never did). */
const fastestReverse = (r: RunResult, who: string, from: number, to: number): number => Math.max(0, ...samplesOf(r, who).filter((s) => s.gear === 'R' && s.t >= from && s.t <= to).map((s) => Math.abs(s.v)));
/** It reversed between two times, never faster than walking pace (the reversing limit, REVERSE_PLAYED). */
const reversedSlowly = (r: RunResult, who: string, from: number, to: number): boolean => reversedIn(r, who, from, to) && fastestReverse(r, who, from, to) <= REVERSE_PLAYED + WALK_EPS;
/** Px/s of slack on the reversing limit, as the motion rules allow (test/motion-helpers.ts SPEED_EPS). */
const WALK_EPS = 0.5;

/** A taxi called to drop its rider: it stops at the lot's kerb with a forward S, waits TAXI_DROP, and pulls out into a gap. */
export const TAXI_DROP_SCENARIO: Scenario = {
  id: 'park.taxi.drop',
  title: 'A taxi drops its rider at the kerb',
  expect: 'A taxi stops at the kerb with a forward S, drops off for 3 s, pulls out into a gap',
  ...STREET_EW,
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'W', lot: 'Shop', stay: 60, mode: 'taxi' }],
  flows: [{ from: 'W', to: 'E', every: 5, start: 1, until: 30 }, { from: 'E', to: 'W', every: 9, start: 4, until: 30 }],
  seconds: 40,
  expectations: (r) => {
    const st = stoodFor(r, 'A');
    const out = r.events.find((l) => l.who === 'A' && (l.e.t === 'parkGo' || (l.e.t === 'park' && l.e.dir === 'out')));
    return [
      expect('the taxi stood at the kerb for the drop (2.5 s or more)', st.secs >= TAXI_DROP - 0.5 && st.first > 0, `${st.secs.toFixed(1)} s, from ${st.first.toFixed(1)} s`),
      expect('it came in with a forward S, not reversing', st.first > 0 && !reversedIn(r, 'A', 0, st.first), st.first > 0 ? `stood at ${st.first.toFixed(1)} s` : 'never stood'),
      expect('it set out again, 4 s after the drop at most', !!out && out.t <= st.first + TAXI_DROP + 4, out ? `${out.t.toFixed(1)} s, stood from ${st.first.toFixed(1)} s` : 'never'),
      expect('it pulled out forward', !!out && !reversedIn(r, 'A', out.t, out.t + 6), out ? `out at ${out.t.toFixed(1)} s` : 'never'),
      brakesUnder(r, 'bg', 400),
      leavesBy(r, 'A', 40), clean(r, 'A'),
    ];
  },
};

/** A rider ready to go home by taxi: the taxi comes from the nearest gate, waits TAXI_PICK at the kerb, takes the rider home. */
export const TAXI_PICK_SCENARIO: Scenario = {
  id: 'park.taxi.pick',
  title: 'A taxi comes to fetch a rider',
  expect: "A taxi comes to fetch a rider, waits 4 s at the kerb, leaves for the rider's destination",
  ...STREET_EW,
  actors: [{ kind: 'rider', id: 'A', at: 0.5, lot: 'Shop', home: 'E' }],
  flows: [{ from: 'W', to: 'E', every: 5, start: 1, until: 30 }, { from: 'E', to: 'W', every: 9, start: 4, until: 30 }],
  seconds: 50,
  expectations: (r) => {
    const st = stoodFor(r, 'A');
    const out = r.events.find((l) => l.who === 'A' && (l.e.t === 'parkGo' || (l.e.t === 'park' && l.e.dir === 'out')));
    return [
      expect('the taxi came and stood at the kerb', st.first > 0, st.first > 0 ? `stood at ${st.first.toFixed(1)} s` : 'never stood'),
      expect('it waited for the rider (3.5 s or more)', st.secs >= TAXI_PICK - 0.5, `${st.secs.toFixed(1)} s`),
      expect('it came in with a forward S, not reversing', st.first > 0 && !reversedIn(r, 'A', 0, st.first), ''),
      expect('it set out with the rider, 4 s after the wait at most', !!out && out.t <= st.first + TAXI_PICK + 4, out ? `${out.t.toFixed(1)} s, stood from ${st.first.toFixed(1)} s` : 'never'),
      // The taxi stands facing away from its rider's way and the map has no way round (side streets end at gates):
      // a three-point turn at walking pace is the real move there; a reverse at road speed is not.
      expect('it pulled out forward or turned round with a three-point turn at walking pace', !!out && (!reversedIn(r, 'A', out.t, out.t + 6) || reversedSlowly(r, 'A', out.t, out.t + 6)), out ? `fastest reverse ${fastestReverse(r, 'A', out.t, out.t + 6).toFixed(1)} px/s` : 'never set out'),
      brakesUnder(r, 'bg', 400),
      leavesBy(r, 'A', 50), clean(r, 'A'),
    ];
  },
};

/** The petrol station: a `fuel` block north of the street with its pumps in the forecourt. */
const PETROL = { ...STREET_EW, lots: [{ name: 'Pump', kind: 'fuel' as const, cell: [5, 1] as const, w: 3, h: 2 }] };

/** Everyone who stood at the pumps or in the lane by the station, by actor: the parked frames of each. */
const framesParked = (r: RunResult, who: string): Sample[] => samplesOf(r, who).filter((s) => s.state === 'parked');

export const PETROL_QUEUE: Scenario = {
  id: 'park.petrol.queue',
  title: 'Four cars at a petrol station, two pumps free',
  expect: 'Three cars arrive at a petrol station: one per pump, the rest queue in the lane end to end, no overlap, each leaves forward',
  ...PETROL,
  // Two of the four pumps are busy till 14 s: A and B take the other two, C finds them all in use and waits in the lane.
  actors: [
    { kind: 'parked', id: 'P', spot: { lot: 'Pump' }, slot: 0, lot: 'Pump' },
    { kind: 'parked', id: 'Q', spot: { lot: 'Pump' }, slot: 1, lot: 'Pump' },
    { kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Pump', fuel: true, stay: 6 },
    { kind: 'arrive', id: 'B', at: 2, from: 'W', home: 'E', lot: 'Pump', fuel: true, stay: 6 },
    { kind: 'arrive', id: 'C', at: 3.5, from: 'W', home: 'E', lot: 'Pump', fuel: true, stay: 6 },
    { kind: 'arrive', id: 'D', at: 5, from: 'W', home: 'E', lot: 'Pump', fuel: true, stay: 6 },
  ],
  seconds: 70,
  expectations: (r) => {
    const at = (who: string) => parkIns(r, who)[0];
    const c = cityOf(r);
    const waited = c.day.pumps.size > 0;
    return [
      expect('A and B took a pump each', !!at('A') && !!at('B') && at('A')!.key.startsWith('lot:') && at('B')!.key.startsWith('lot:') && at('A')!.slot !== at('B')!.slot, `A ${at('A')?.key} slot ${at('A')?.slot ?? '-'}, B ${at('B')?.key} slot ${at('B')?.slot ?? '-'}`),
      expect('C and D found every pump in use and queued in the lane', !!at('C') && !!at('D') && at('C')!.key.startsWith('double:') && at('D')!.key.startsWith('double:'), `C ${at('C')?.key ?? 'never stood'} at ${at('C')?.t.toFixed(1) ?? '-'} s, D ${at('D')?.key ?? 'never stood'} at ${at('D')?.t.toFixed(1) ?? '-'} s (the pump queue ${waited ? 'was opened' : 'never opened'})`),
      expect('C stood in the lane before A left', !!at('C') && !!parkOuts(r, 'A')[0] && at('C')!.t < parkOuts(r, 'A')[0]!.t + 20, ''),
      expect('nothing overlaps at the station', r.violations.filter((v) => v.rule.startsWith('bodies overlap')).length === 0, `${r.violations.filter((v) => v.rule.startsWith('bodies overlap')).length} overlaps`),
      ...['A', 'B', 'C', 'D'].flatMap((w) => [expect(`${w} pulls out forward`, !!parkOuts(r, w)[0] && !samplesOf(r, w).some((s) => s.t >= parkOuts(r, w)[0]!.t && s.gear === 'R' && s.state === 'moving'), parkOuts(r, w)[0] ? `out ${parkOuts(r, w)[0]!.t.toFixed(1)} s` : 'never set out'), leavesBy(r, w, 70), clean(r, w)]),
    ];
  },
};
void framesParked;

/** Sand along the north edge: sea in rows 0-1, a public beach on rows 2-3, the street on row 4. */
const SAND_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((y) => (y < 2 ? '~' : y < 4 ? 'b' : '.').repeat(14));

export const BEACH_SAND: Scenario = {
  id: 'park.beach.sand',
  title: 'A public beach: from the street onto the sand',
  expect: 'A turns off at the beach lot access onto the sand, parks in a sand slot, leaves through the same access',
  ...STREET_EW,
  map: SAND_MAP,
  lots: [],
  beaches: [{ name: 'Beach', cell: [4, 2], w: 6, h: 2 }],
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'W', lot: 'Beach', spot: { sand: 'Beach' }, stay: 8 }],
  flows: [{ from: 'E', to: 'W', every: 6, start: 3 }],
  seconds: 40,
  expectations: (r) => {
    const c = cityOf(r);
    const beach = c.lots.find((l) => l.name === 'Beach');
    const rect = beach ? lotRect(beach) : undefined;
    const ins = parkIns(r, 'A')[0];
    const stood = samplesOf(r, 'A').filter((s) => s.state === 'parked').pop();
    const door = lotDoor(r, 'Beach');
    const out = parkOuts(r, 'A')[0];
    const inDoor = samplesOf(r, 'A').filter((s) => s.state !== 'parked' && s.t < (ins?.t ?? 0) + 6 && Math.hypot(s.x - door.x, s.y - door.y) < 30).length > 0;
    const outDoor = samplesOf(r, 'A').filter((s) => out && s.t >= out.t && Math.hypot(s.x - door.x, s.y - door.y) < 30).length > 0;
    return [
      expect('the beach is open to the public', !!beach, beach ? `lot ${beach.id}, access road ${beach.access?.road ?? '-'}` : 'no beach lot'),
      parksIn(r, 'A', 'sand:'),
      expect('A stands on the sand', !!stood && !!rect && stood.x > rect.x && stood.x < rect.x + rect.w && stood.y > rect.y && stood.y < rect.y + rect.h, stood && rect ? `at ${stood.x.toFixed(0)},${stood.y.toFixed(0)}, sand ${rect.x}..${rect.x + rect.w} x ${rect.y}..${rect.y + rect.h}` : 'never parked'),
      expect('A turned in at the beach access', inDoor, `access at ${door.x.toFixed(0)},${door.y.toFixed(0)}`),
      expect('A left through the same access', outDoor, ''),
      leavesBy(r, 'A', 40), clean(r, 'A'),
    ];
  },
};

export const CITY: readonly Scenario[] = [MULTI, UNDER, NIGHT_HOME, ROAD_REMOVED, YEAR_START, TAXI_DROP_SCENARIO, TAXI_PICK_SCENARIO, PETROL_QUEUE, BEACH_SAND];

export const KNOWN_CITY: KnownSets = {
  defaults: {
    'park.carpark.multi-entrance': { counts: {'too fast on a curve (moving)': 18, 'too fast on a curve (manoeuvre)': 41, 'jumps (manoeuvre)': 41, 'cuts across without a gap (manoeuvre)': 1, 'crosses a kerb (manoeuvre)': 2, 'reverse too fast (manoeuvre)': 17}, failing: ['A breaks no motion rule'] },
    'park.carpark.underground': { counts: {'too fast on a curve (moving)': 18, 'too fast on a curve (manoeuvre)': 41, 'jumps (manoeuvre)': 41, 'cuts across without a gap (manoeuvre)': 1, 'crosses a kerb (manoeuvre)': 2, 'reverse too fast (manoeuvre)': 17}, failing: ['A is never drawn deeper than 12 px inside the box', 'A breaks no motion rule'] },
    'park.night.home': { counts: {'too fast on a curve (moving)': 17, 'jumps (manoeuvre)': 64, 'crosses a kerb (manoeuvre)': 8, 'too tight (manoeuvre)': 2, 'too fast on a curve (manoeuvre)': 4, 'reverse too fast (manoeuvre)': 4, 'bodies overlap (moving)': 2}, failing: ['A breaks no motion rule', 'B breaks no motion rule'] },
    'city.road-removed': { counts: {}, failing: ['no car teleports'] },
    'city.year-start': { counts: {'bodies overlap (moving)': 1}, failing: [] },
    'park.beach.sand': { counts: {'jumps (manoeuvre)': 16, 'crosses a kerb (manoeuvre)': 2, 'too tight (manoeuvre)': 1, 'reverse too fast (manoeuvre)': 56, 'bodies overlap (moving)': 1, 'too fast on a curve (manoeuvre)': 10}, failing: ['A breaks no motion rule'] },
    'park.petrol.queue': { counts: {'too fast on a curve (manoeuvre)': 38, 'jumps (manoeuvre)': 169, 'crosses a kerb (manoeuvre)': 12, 'reverse too fast (manoeuvre)': 21, 'bodies overlap (manoeuvre)': 13, 'too tight (manoeuvre)': 2, 'bodies overlap (moving)': 2}, failing: ['C and D found every pump in use and queued in the lane', 'nothing overlaps at the station', 'A breaks no motion rule', 'B breaks no motion rule', 'C breaks no motion rule', 'D breaks no motion rule'] },
    'park.taxi.drop': { counts: {'jumps (manoeuvre)': 81, 'too fast on a curve (manoeuvre)': 16, 'reverse too fast (manoeuvre)': 16, 'crosses a kerb (manoeuvre)': 4, 'too tight (manoeuvre)': 2, 'bodies overlap (manoeuvre)': 4, 'cuts across without a gap (manoeuvre)': 4}, failing: ['it pulled out forward', 'A breaks no motion rule'] },
    'park.taxi.pick': { counts: {'too fast on a curve (moving)': 4, 'cuts across without a gap (manoeuvre)': 1, 'bodies overlap (manoeuvre)': 2, 'jumps (manoeuvre)': 79, 'too fast on a curve (manoeuvre)': 18, 'reverse too fast (manoeuvre)': 22, 'too tight (manoeuvre)': 2, 'crosses a kerb (manoeuvre)': 4}, failing: ['it pulled out forward or turned round with a three-point turn at walking pace', 'A breaks no motion rule'] },
  },
  on: {
    'park.carpark.multi-entrance': { counts: {'too fast on a curve (moving)': 18, 'crosses a kerb (manoeuvre)': 2}, failing: ['A is not drawn for the stay', 'A leaves and is gone by 36 s', 'A breaks no motion rule'] },
    'park.carpark.underground': { counts: {'too fast on a curve (moving)': 18, 'crosses a kerb (manoeuvre)': 2}, failing: ['A is not drawn for the stay', 'A is never drawn deeper than 12 px inside the box', 'A leaves and is gone by 36 s', 'A breaks no motion rule'] },
    'park.night.home': { counts: {'too fast on a curve (moving)': 18, 'crosses a kerb (manoeuvre)': 2, 'bodies overlap (moving)': 1, 'cuts across without a gap (manoeuvre)': 3, 'bodies overlap (manoeuvre)': 3}, failing: ['B drives in before it stands', 'A breaks no motion rule', 'B breaks no motion rule'] },
    'city.road-removed': { counts: {}, failing: ['no car teleports'] },
    'city.year-start': { counts: {'bodies overlap (moving)': 1}, failing: [] },
    'park.beach.sand': { counts: {'crosses a kerb (manoeuvre)': 3}, failing: ['A stands on the sand', 'A left through the same access', 'A leaves and is gone by 40 s', 'A breaks no motion rule'] },
    'park.petrol.queue': { counts: {'crosses a kerb (manoeuvre)': 8, 'bodies overlap (manoeuvre)': 5, 'cuts across without a gap (manoeuvre)': 1, 'jumps (manoeuvre)': 7}, failing: ['A and B took a pump each', 'C and D found every pump in use and queued in the lane', 'nothing overlaps at the station', 'A breaks no motion rule', 'C leaves and is gone by 70 s', 'C breaks no motion rule', 'D leaves and is gone by 70 s', 'D breaks no motion rule'] },
    'park.taxi.drop': { counts: {'cuts across without a gap (manoeuvre)': 1, 'bodies overlap (manoeuvre)': 1, 'crosses a kerb (manoeuvre)': 3}, failing: ['it set out again, 4 s after the drop at most', 'it pulled out forward', 'A leaves and is gone by 40 s', 'A breaks no motion rule'] },
    'park.taxi.pick': { counts: {'too fast on a curve (moving)': 3, 'cuts across without a gap (manoeuvre)': 4, 'bodies overlap (manoeuvre)': 3, 'crosses a kerb (manoeuvre)': 4}, failing: ['A breaks no motion rule'] },
  },
};
