/**
 * Motion lab scenarios: the driving group (see docs/inkroad-motion-lab.md and the worked examples in scenarios.ts).
 * Add each scenario to DRIVING, and where it still breaks rules, its ratchet in KNOWN_DRIVING (counts per rule, failing expectations).
 */
import { finishWorks, must, type Scenario } from './lab';
import type { KnownSets } from './known';
import { brakesUnder, clean, closest, expect, passesBy, samplesOf } from './checks';
import { CROSS_GAP } from '../../src/city/manoeuvre';
import type { City } from '../../src/city/state';
import { commitNetwork } from '../../src/city/network';
import { setRoad } from '../../src/sim/network';
import { halfWidth } from '../../src/sim/roadGeom';

const cityOf = (r: Parameters<typeof clean>[0]): City => (r.city as unknown as { c: City }).c;

/** One-cell crossroads: streets along row 5 and column 5, gates at all four ends. */
const CROSS = {
  size: [11, 11] as const,
  roads: [{ cells: [[5, 0], [5, 10]] as const }, { cells: [[0, 5], [10, 5]] as const }],
  gates: [{ id: 'N', cell: [5, 0] as const }, { id: 'S', cell: [5, 10] as const }, { id: 'W', cell: [0, 5] as const }, { id: 'E', cell: [10, 5] as const }],
};

/** The crossroads' middle junction. */
const middle = (r: Parameters<typeof clean>[0]) => cityOf(r).net.junctions.find((x) => x.arms.length === 4)!;

/** Seconds a car spent within `d` px of a point, and the slowest it went there. */
const nearTimes = (r: Parameters<typeof clean>[0], who: string, p: { x: number; y: number }, d: number) => {
  const near = samplesOf(r, who).filter((s) => s.state === 'moving' && Math.hypot(s.x - p.x, s.y - p.y) < d);
  return { first: near[0]?.t ?? -1, last: near[near.length - 1]?.t ?? -1, minV: near.reduce((m, s) => Math.min(m, s.v), Infinity) };
};

/** When each car (by uid) came closest to a point, with who it is; only cars that came within `d`. */
const passes = (r: Parameters<typeof clean>[0], p: { x: number; y: number }, d: number) => {
  const best = new Map<number, { t: number; d: number; who: string; a: number }>();
  for (const row of r.trace) for (const s of row ?? []) {
    if (s.state !== 'moving') continue;
    const dist = Math.hypot(s.x - p.x, s.y - p.y);
    const b = best.get(s.uid);
    if (dist < d && (!b || dist < b.d)) best.set(s.uid, { t: s.t, d: dist, who: s.who, a: s.a });
  }
  return [...best.values()];
};

/** Another car's body shares the box with `who`: the first frame, or none. */
const sharedBox = (r: Parameters<typeof clean>[0], who: string, j: { x: number; y: number; radius: number }): string => {
  for (const row of r.trace) {
    const rowS = row ?? [];
    const mine = rowS.find((s) => s.who === who && s.state === 'moving' && Math.hypot(s.x - j.x, s.y - j.y) < j.radius);
    if (!mine) continue;
    const other = rowS.find((s) => s.who !== who && s.state === 'moving' && Math.hypot(s.x - j.x, s.y - j.y) < j.radius);
    if (other) return `${other.who} in the box with ${who} at ${mine.t.toFixed(1)} s`;
  }
  return 'none';
};

export const CROSS_LEFT: Scenario = {
  id: 'drive.cross.left',
  title: 'Left turn across oncoming traffic',
  expect: 'A turns left across oncoming traffic: waits for a 3 s gap, holds the lane while crossing, ends in the right lane',
  ...CROSS,
  // A comes from the south and turns left (to the west); a stream of oncoming cars (north to south) is still coming when A arrives.
  actors: [{ kind: 'through', id: 'A', at: 3.5, from: 'S', to: 'W' }],
  flows: [{ from: 'N', to: 'S', every: 2, start: 0, until: 11 }, { from: 'N', to: 'S', every: 8, start: 17 }],
  seconds: 34,
  expectations: (r) => {
    const j = middle(r);
    const a = passes(r, j, j.radius)[0] === undefined ? undefined : passes(r, j, j.radius).find((x) => x.who === 'A');
    const oncoming = passes(r, j, j.radius * 1.5).filter((x) => x.who === 'bg' && Math.abs(x.a - Math.PI / 2) < 0.6);
    const entry = nearTimes(r, 'A', j, j.radius).first;
    // Oncoming cars still on their way when A gets to the junction: the situation really happened.
    const busy = oncoming.some((x) => x.t > nearTimes(r, 'A', j, j.radius * 3).first - 0.5);
    const tight = oncoming.filter((x) => entry >= 0 && x.t > entry && x.t - entry < CROSS_GAP);
    return [
      expect('A turned left through the box', a !== undefined, `at ${a?.t.toFixed(1) ?? '-'} s`),
      expect('oncoming cars were still coming when A arrived', busy, `${oncoming.length} oncoming, A at the box ${entry.toFixed(1)} s`),
      expect('A starts across only with a 3 s gap', tight.length === 0, tight.length ? `an oncoming car ${(tight[0]!.t - entry).toFixed(1)} s behind A's start` : 'gap kept'),
      expect('A is never in the box with an oncoming car', sharedBox(r, 'A', j) === 'none', sharedBox(r, 'A', j)),
      passesBy(r, 'A', 34), brakesUnder(r, 'A', 400), clean(r, 'A'),
    ];
  },
};

export const CROSS_STRAIGHT: Scenario = {
  id: 'drive.cross.straight',
  title: 'Straight over a crossroads with cross traffic',
  expect: 'A goes straight over a crossroads with cross traffic: no overlap, no cut-off',
  ...CROSS,
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 1.2, from: 'N', to: 'S' }],
  flows: [{ from: 'N', to: 'S', every: 3, start: 3, until: 16 }, { from: 'S', to: 'N', every: 2.5, start: 1, until: 16 }, { from: 'E', to: 'W', every: 6, start: 3, until: 16 }, { from: 'E', to: 'W', every: 7, start: 17 }],
  seconds: 26,
  expectations: (r) => {
    const j = middle(r);
    const a = passes(r, j, j.radius * 1.5).find((x) => x.who === 'A');
    // Cross traffic (heading north or south, a ~ +-90 deg) through the box within 1.5 s of A.
    const crossing = passes(r, j, j.radius * 1.5).filter((x) => x.who !== 'A' && Math.abs(Math.sin(x.a)) > 0.7 && a && Math.abs(x.t - a.t) < 4);
    return [
      expect('A drove over the crossroads', a !== undefined, `at ${a?.t.toFixed(1) ?? '-'} s`),
      expect('cross traffic met A at the box (within 4 s)', crossing.length > 0, `${crossing.length} cross cars`),
      passesBy(r, 'A', 26), passesBy(r, 'B', 26), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'B'),
      expect('no car shares the box with A', sharedBox(r, 'A', j) === 'none', sharedBox(r, 'A', j)),
    ];
  },
};
void closest;

/** Bumper gap of the closest following pair (same heading, same lane, both moving), px; Infinity if none followed. */
const tightestFollow = (r: Parameters<typeof clean>[0], pick: (who: string) => boolean = () => true) => {
  let best = { gap: Infinity, t: 0, who: '' };
  for (const row of r.trace) {
    const cars = (row ?? []).filter((s) => s.state === 'moving' && pick(s.who));
    for (const f of cars) for (const l of cars) {
      if (f === l || Math.cos(f.a - l.a) < 0.97) continue;
      const dx = l.x - f.x, dy = l.y - f.y;
      const along = dx * Math.cos(f.a) + dy * Math.sin(f.a);
      const across = -dx * Math.sin(f.a) + dy * Math.cos(f.a);
      if (along <= 0 || Math.abs(across) > 9) continue;
      const gap = along - (f.len + l.len) / 2;
      if (gap < best.gap) best = { gap, t: f.t, who: `${f.who} behind ${l.who}` };
    }
  }
  return best;
};

/** Frames-with-a-car-stopped (under 3 px/s) inside a rectangle, summed per second, for `who` matching. */
const stoppedIn = (r: Parameters<typeof clean>[0], inside: (s: { x: number; y: number }) => boolean, pick: (who: string) => boolean = () => true): number => {
  let frames = 0;
  for (const row of r.trace) for (const s of row ?? []) if (s.state === 'moving' && pick(s.who) && Math.abs(s.v) < 3 && inside(s)) frames++;
  return frames / 60;
};

/** Both gap-queue facts for the lorry-in-the-lane queue. */
const STREET_EW = {
  size: [14, 9] as const,
  roads: [{ cells: [[0, 4], [13, 4]] as const }, { cells: [[3, 4], [3, 8]] as const, type: 'avenue' as const }, { cells: [[11, 4], [11, 8]] as const, type: 'avenue' as const }],
  gates: [{ id: 'W', cell: [0, 4] as const }, { id: 'E', cell: [13, 4] as const }, { id: 'SW', cell: [3, 8] as const }, { id: 'SE', cell: [11, 8] as const }],
};

export const FOLLOW_QUEUE: Scenario = {
  id: 'drive.follow.queue',
  title: 'Following and queuing behind a stopped lorry',
  expect: 'Cars follow at a safe gap and queue behind a stopped one; none overlaps, none brakes over 400 px/s²',
  ...STREET_EW,
  lots: [{ name: 'Square', kind: 'square', cell: [5, 1], w: 3, h: 2 }],
  kerbs: [[6, 4]],
  fill: [{ kerb: [6, 4] }],
  // The lorry double-parks in the eastbound lane (the kerb is full) for 12 s; cars from the west close up behind it.
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Square', spot: { kerb: [6, 4] }, stay: 12, vehicle: 'truck', onlyThere: true }],
  flows: [{ from: 'W', to: 'E', every: 1.6, start: 2, until: 14 }, { from: 'W', to: 'E', every: 8, start: 20 }],
  seconds: 40,
  expectations: (r) => {
    const tight = tightestFollow(r);
    const waited = stoppedIn(r, () => true, (w) => w === 'bg');
    return [
      expect('cars stood in a queue (waited over 3 s in all)', waited > 3, `${waited.toFixed(1)} s stopped`),
      expect('followers keep a gap of 2 px or more', tight.gap >= 2, `${tight.gap.toFixed(1)} px ${tight.who} at ${tight.t.toFixed(1)} s`),
      brakesUnder(r, 'bg', 400), clean(r, 'bg'),
    ];
  },
};

export const YIELD_GO: Scenario = {
  id: 'drive.yield.go',
  title: 'Yield onto a busy main road',
  expect: 'At a yield junction A stops for a car on the main road, then goes; no overlap in the box',
  ...CROSS,
  // Row 5 is the avenue (it has priority); A comes from the south side street and goes straight across it.
  roads: [{ cells: [[5, 0], [5, 10]] }, { cells: [[0, 5], [10, 5]], type: 'avenue' }],
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'S', to: 'N' }],
  flows: [{ from: 'W', to: 'E', every: 2.2, start: 0, until: 10 }, { from: 'E', to: 'W', every: 3, start: 1, until: 10 }, { from: 'W', to: 'E', every: 2, start: 17 }],
  seconds: 30,
  expectations: (r) => {
    const j = middle(r);
    const a = nearTimes(r, 'A', j, j.radius * 4);
    const inBox = nearTimes(r, 'A', j, j.radius);
    const busy = passes(r, j, j.radius * 1.5).filter((x) => x.who === 'bg' && x.t > a.first && x.t < inBox.first);
    return [
      expect('A stopped before the junction', a.minV < 5, `slowest ${a.minV.toFixed(0)} px/s`),
      expect('main-road cars passed while A waited', busy.length > 0, `${busy.length} cars`),
      expect('A went across afterwards', inBox.first > a.first + 1, `box at ${inBox.first.toFixed(1)} s, first near ${a.first.toFixed(1)} s`),
      expect('no car shares the box with A', sharedBox(r, 'A', j) === 'none', sharedBox(r, 'A', j)),
      passesBy(r, 'A', 30), clean(r, 'A'),
    ];
  },
};

export const SIGNAL_CYCLE: Scenario = {
  id: 'drive.signal.cycle',
  title: 'A signalled crossroads: queues on red, go on green',
  expect: 'At signals cars stop on red and go on green; the queue clears without overlaps',
  ...CROSS,
  controls: [{ cell: [5, 5], control: 'signal' }],
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 1, from: 'N', to: 'S' }],
  flows: [{ from: 'W', to: 'E', every: 1.4, start: 2, until: 16 }, { from: 'N', to: 'S', every: 1.8, start: 2, until: 16 }, { from: 'W', to: 'E', every: 8, start: 20 }],
  seconds: 44,
  expectations: (r) => {
    const j = middle(r);
    const stopped = stoppedIn(r, (p) => Math.hypot(p.x - j.x, p.y - j.y) < j.radius * 5);
    const tight = tightestFollow(r);
    // Cross-street cars (headings 90 deg apart) never inside the box together.
    let clash = 'none';
    for (const row of r.trace) {
      const inside = (row ?? []).filter((s) => s.state === 'moving' && s.v > 8 && Math.hypot(s.x - j.x, s.y - j.y) < j.radius * 0.7);
      const x = inside.find((p) => inside.some((q) => Math.abs(Math.sin(p.a - q.a)) > 0.9));
      if (x) { clash = `crossing cars in the box at ${x.t.toFixed(1)} s`; break; }
    }
    return [
      expect('cars stood at the lights (3 s or more in all)', stopped > 3, `${stopped.toFixed(1)} s stopped`),
      expect('cross streets never share the box moving', clash === 'none', clash),
      expect('the queue keeps a gap of 2 px or more', tight.gap >= 2, `${tight.gap.toFixed(1)} px ${tight.who}`),
      passesBy(r, 'A', 44), passesBy(r, 'B', 44), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'B'), clean(r, 'bg'),
    ];
  },
};

/** Lane index of a sample from its track text (`track 0 L13:1 ...`: link 13, lane 1), or null. */
const laneOf = (info: string): { link: number; lane: number } | null => {
  const m = /L(\d+):(\d+)/.exec(info);
  return m ? { link: Number(m[1]), lane: Number(m[2]) } : null;
};

/** Lane changes by `pick` cars: the same link, a different lane, in consecutive moving frames of one car. */
const laneChanges = (r: Parameters<typeof clean>[0], pick: (who: string) => boolean = () => true): { t: number; who: string }[] => {
  const prev = new Map<number, { link: number; lane: number }>();
  const out: { t: number; who: string }[] = [];
  for (const row of r.trace) for (const s of row ?? []) {
    if (s.state !== 'moving' || !pick(s.who)) continue;
    const l = laneOf(s.info);
    const p = prev.get(s.uid);
    if (l && p && p.link === l.link && p.lane !== l.lane) out.push({ t: s.t, who: s.who });
    if (l) prev.set(s.uid, l);
  }
  return out;
};

export const LANES_CHANGE: Scenario = {
  id: 'drive.lanes.change',
  title: 'Lane changes on an avenue round a stopped lorry',
  expect: 'On an avenue cars change lanes with a smooth S (no slip), never into a car beside them',
  ...STREET_EW,
  roads: [{ cells: [[0, 4], [13, 4]], type: 'avenue' }, { cells: [[3, 4], [3, 8]], type: 'avenue' }, { cells: [[11, 4], [11, 8]], type: 'avenue' }],
  lots: [{ name: 'Square', kind: 'square', cell: [5, 1], w: 3, h: 2 }],
  kerbs: [[6, 4]],
  fill: [{ kerb: [6, 4] }],
  actors: [{ kind: 'arrive', id: 'A', at: 0.5, from: 'W', home: 'E', lot: 'Square', spot: { kerb: [6, 4] }, stay: 12, vehicle: 'truck', onlyThere: true }],
  flows: [{ from: 'W', to: 'E', every: 1.5, start: 2, until: 14 }, { from: 'E', to: 'W', every: 2.5, start: 1, until: 14 }, { from: 'W', to: 'E', every: 2, start: 30 }],
  seconds: 44,
  expectations: (r) => {
    const ch = laneChanges(r, (w) => w === 'bg');
    return [
      expect('cars changed lanes', ch.length > 0, `${ch.length} changes${ch[0] ? `, first at ${ch[0].t.toFixed(1)} s` : ''}`),
      brakesUnder(r, 'bg', 400), clean(r, 'bg'),
    ];
  },
};

const TEE = {
  size: [11, 11] as const,
  roads: [{ cells: [[0, 5], [10, 5]] as const }, { cells: [[5, 5], [5, 10]] as const }],
  gates: [{ id: 'W', cell: [0, 5] as const }, { id: 'E', cell: [10, 5] as const }, { id: 'S', cell: [5, 10] as const }],
};

const tee = (id: string, at: number, from: string, to: string) => ({ kind: 'through' as const, id, at, from, to });

export const T_ALL: Scenario = {
  id: 'drive.t.all',
  title: 'Every turn at a T junction',
  expect: 'At a T junction every turn (right, left, straight on the bar) keeps to the right and R_MIN',
  ...TEE,
  // A: west to south (right), B: south to west (right), C: south to east (left), D: east to south (left), E: west to east, F: east to west (straight on the bar).
  actors: [tee('A', 1, 'W', 'S'), tee('B', 5, 'S', 'W'), tee('C', 9, 'S', 'E'), tee('D', 13, 'E', 'S'), tee('E', 17, 'W', 'E'), tee('F', 21, 'E', 'W')],
  flows: [{ from: 'W', to: 'E', every: 3, start: 25 }],
  seconds: 44,
  expectations: (r) => ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((w) => [passesBy(r, w, 44), clean(r, w)]),
};

export const GATE_INOUT: Scenario = {
  id: 'drive.gate.inout',
  title: 'Cars come in and go out only at the gates',
  expect: 'Cars enter at a map gate and leave at another without appearing or vanishing away from the gate',
  ...CROSS,
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 2, from: 'S', to: 'N' }, { kind: 'through', id: 'C', at: 3, from: 'E', to: 'S' }],
  flows: [{ from: 'N', to: 'W', every: 2, start: 0, until: 10 }, { from: 'E', to: 'W', every: 3, start: 1, until: 10 }, { from: 'S', to: 'E', every: 2, start: 14 }],
  seconds: 30,
  expectations: (r) => {
    const c = cityOf(r);
    const gates = c.net.junctions.filter((j) => j.gate !== undefined);
    const nearGate = (x: number, y: number) => gates.some((g) => Math.hypot(g.x - x, g.y - y) < 40);
    const first = new Map<number, { x: number; y: number; t: number; who: string }>();
    const last = new Map<number, { x: number; y: number; t: number; who: string }>();
    for (const row of r.trace) for (const s of row ?? []) {
      if (s.state !== 'moving' || s.who === 'fill') continue;
      if (!first.has(s.uid)) first.set(s.uid, s);
      last.set(s.uid, s);
    }
    const end = r.trace[r.trace.length - 1]?.[0]?.t ?? 0;
    const appeared = [...first.values()].filter((s) => !nearGate(s.x, s.y));
    const vanished = [...last.values()].filter((s) => s.t < end - 0.5 && !nearGate(s.x, s.y));
    const named = (l: { x: number; y: number; t: number; who: string }[]) => l.slice(0, 2).map((s) => `${s.who} at ${s.x.toFixed(0)},${s.y.toFixed(0)} ${s.t.toFixed(1)} s`).join('; ') || 'none';
    return [
      expect('every car appears at a gate', appeared.length === 0, named(appeared)),
      expect('every car vanishes at a gate', vanished.length === 0, named(vanished)),
      expect('cars came and went', first.size >= 10, `${first.size} cars`),
      passesBy(r, 'A', 30), passesBy(r, 'B', 30), passesBy(r, 'C', 30), clean(r, 'A'), clean(r, 'B'), clean(r, 'C'),
    ];
  },
};

/** A one-way street east along row 2 with a two-way street (row 6) to come back by; cross streets join them. */
export const ONE_WAY: Scenario = {
  id: 'drive.oneway',
  title: 'A one-way street: both lanes, one direction',
  expect: 'On a one-way street cars use both lanes in the one direction; none drives against it',
  size: [14, 9],
  roads: [{ cells: [[0, 2], [13, 2]], oneWay: true }, { cells: [[3, 2], [3, 6]] }, { cells: [[10, 2], [10, 6]] }, { cells: [[0, 6], [13, 6]] }],
  gates: [{ id: 'W', cell: [0, 2] }, { id: 'E', cell: [13, 2] }, { id: 'W2', cell: [0, 6] }, { id: 'E2', cell: [13, 6] }],
  // A and B go east along the one-way street side by side in time; C wants to go west and has to use the two-way street (gate W is only an entry: a car cannot leave by it).
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 1.6, from: 'W', to: 'E' }, { kind: 'through', id: 'C', at: 1, from: 'E2', to: 'W2' }],
  flows: [{ from: 'W', to: 'E', every: 1.3, start: 3, until: 12 }, { from: 'E2', to: 'W2', every: 8, start: 16 }],
  seconds: 34,
  expectations: (r) => {
    const road = cityOf(r).net.roads.find((x) => !!(x as { oneWay?: unknown }).oneWay);
    const onStreet = (s: { y: number }) => Math.abs(s.y - 2 * 40) < 14;
    const west = r.trace.flatMap((row) => (row ?? []).filter((s) => s.state === 'moving' && onStreet(s) && s.v > 5 && Math.cos(s.a) < -0.5));
    const lanes = new Set(r.trace.flatMap((row) => (row ?? []).filter((s) => s.state === 'moving' && s.who !== 'C' && onStreet(s) && s.x > 90 && s.x < 390).map((s) => Math.round(s.y / 6))));
    const cWent = samplesOf(r, 'C').some((s) => s.state === 'moving' && s.y > 3 * 40);
    return [
      expect('the street is one-way', !!road, road ? `road ${road.id}` : 'no one-way road'),
      expect('nobody drives west on it', west.length === 0, west.length ? `${west[0]!.who} at ${west[0]!.x.toFixed(0)},${west[0]!.y.toFixed(0)} ${west[0]!.t.toFixed(1)} s` : 'none'),
      expect('cars used both lanes', lanes.size >= 2, `${lanes.size} lateral positions`),
      expect('C went round by the two-way street', cWent, ''),
      passesBy(r, 'A', 34), passesBy(r, 'B', 34), passesBy(r, 'C', 34), clean(r, 'A'), clean(r, 'B'), clean(r, 'C'), clean(r, 'bg'),
    ];
  },
};

/** A 45 degree street: a straight run west, a diagonal drop, a straight run east, with side streets to turn on and off by. */
export const DIAGONAL: Scenario = {
  id: 'drive.diagonal',
  title: 'A 45 degree street and its bends',
  expect: 'A drives a 45° street and turns from it onto a straight one and back: heading follows the road, R_MIN at the bends, kerbs never crossed',
  size: [16, 11],
  roads: [{ cells: [[0, 2], [4, 2], [8, 6], [15, 6]] }, { cells: [[2, 2], [2, 8]] }, { cells: [[12, 6], [12, 10]] }],
  gates: [{ id: 'W', cell: [0, 2] }, { id: 'E', cell: [15, 6] }, { id: 'SW', cell: [2, 8] }, { id: 'S', cell: [12, 10] }],
  actors: [
    { kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 1.5, from: 'E', to: 'W' },
    { kind: 'through', id: 'C', at: 6, from: 'SW', to: 'E' }, { kind: 'through', id: 'D', at: 8, from: 'E', to: 'SW' },
    { kind: 'through', id: 'E', at: 12, from: 'W', to: 'S' }, { kind: 'through', id: 'F', at: 14, from: 'S', to: 'W' },
  ],
  flows: [{ from: 'W', to: 'E', every: 4, start: 18 }],
  seconds: 44,
  expectations: (r) => {
    const onDiagonal = (s: { x: number; y: number }) => s.x > 4 * 40 + 20 && s.x < 8 * 40 - 20 && s.y > 2 * 40 + 20 && s.y < 6 * 40 - 20;
    const slope = ['A', 'B'].every((w) => samplesOf(r, w).some((s) => s.state === 'moving' && onDiagonal(s)));
    return [
      expect('A and B drove the diagonal run', slope, ''),
      ...['A', 'B', 'C', 'D', 'E', 'F'].flatMap((w) => [passesBy(r, w, 44), clean(r, w)]),
    ];
  },
};

/** Heights (z) of `who`'s moving frames: how high it got, and the biggest jump between two frames. */
const heights = (r: Parameters<typeof clean>[0], who: string): { max: number; min: number; jump: number } => {
  const list = samplesOf(r, who).filter((s) => s.state === 'moving');
  let jump = 0;
  for (let i = 1; i < list.length; i++) if (list[i]!.frame - list[i - 1]!.frame === 1) jump = Math.max(jump, Math.abs(list[i]!.z - list[i - 1]!.z));
  return { max: Math.max(0, ...list.map((s) => s.z)), min: Math.min(0, ...list.map((s) => s.z)), jump };
};

/** Biggest turn of heading between two consecutive frames of `who`, rad (a smooth ramp turns a little each frame). */
const sharpestTurn = (r: Parameters<typeof clean>[0], who: string): number => {
  const list = samplesOf(r, who).filter((s) => s.state === 'moving');
  let worst = 0;
  for (let i = 1; i < list.length; i++) if (list[i]!.frame - list[i - 1]!.frame === 1) worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(list[i]!.a - list[i - 1]!.a), Math.cos(list[i]!.a - list[i - 1]!.a))));
  return worst;
};

export const FLYOVER_RAMPS: Scenario = {
  id: 'drive.flyover.ramps',
  title: 'A flyover over a crossroads: up the ramp, over, down',
  expect: 'Cars take a flyover ramp up and down: smooth heading, no jump in z, no overlap with cars below',
  ...CROSS,
  // West to east goes over the crossroads; north-south traffic keeps to the ground underneath it.
  setup: (v) => {
    const j = v.junctions.find((x) => x.arms.length === 4)!;
    const road = (id: number) => v.roads.find((q) => q.id === id)!;
    const west = j.arms.find((id) => road(id).cells.some((q) => q.gx < 5 && q.gy === 5))!;
    const east = j.arms.find((id) => road(id).cells.some((q) => q.gx > 5 && q.gy === 5))!;
    must(v, { t: 'flyover', node: j.id, fromRoad: west, toRoad: east, level: 1 });
    finishWorks(v);
  },
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 3, from: 'W', to: 'E' }, { kind: 'through', id: 'C', at: 4, from: 'E', to: 'W' }],
  flows: [{ from: 'N', to: 'S', every: 2, start: 0, until: 14 }, { from: 'S', to: 'N', every: 3, start: 1, until: 14 }, { from: 'W', to: 'E', every: 6, start: 18 }],
  seconds: 32,
  expectations: (r) => {
    const h = heights(r, 'A');
    const flat = ['A', 'B'].map((w) => heights(r, w));
    const j = middle(r);
    // Ground cars under the deck while A is on it: the flyover's purpose.
    const over = samplesOf(r, 'A').filter((s) => s.state === 'moving' && s.z > 5 && Math.hypot(s.x - j.x, s.y - j.y) < j.radius * 1.5);
    const under = over.length > 0 && r.trace.some((row) => (row ?? []).some((s) => s.who === 'bg' && s.z === 0 && Math.hypot(s.x - j.x, s.y - j.y) < j.radius && over.some((o) => o.frame === s.frame)));
    return [
      expect('the flyover was built', cityOf(r).net.roads.some((x) => x.flyover), `${cityOf(r).net.roads.filter((x) => x.flyover).length} flyover roads`),
      expect('A rose onto the deck', h.max > 5, `highest ${h.max.toFixed(1)}`),
      expect('A went over the crossing with a ground car under it', under, `${over.length} frames over the box`),
      expect('no jump in height between frames (1 or less)', flat.every((x) => x.jump <= 1), `A ${flat[0]!.jump.toFixed(2)}, B ${flat[1]!.jump.toFixed(2)}`),
      expect('heading turns smoothly (0.08 rad a frame at most)', sharpestTurn(r, 'A') <= 0.08, `${sharpestTurn(r, 'A').toFixed(3)} rad a frame`),
      passesBy(r, 'A', 32), passesBy(r, 'B', 32), passesBy(r, 'C', 32), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'B'), clean(r, 'bg'),
    ];
  },
};

/** Water in columns 5-8 of a 14 x 9 map; the street along row 4 crosses it on a bridge. */
const WATER_MAP = Array.from({ length: 9 }, () => '.....~~~~.....');

export const BRIDGE: Scenario = {
  id: 'drive.bridge',
  title: 'A bridge over water',
  expect: 'Cars cross a bridge over water on their lane, no slip',
  size: [14, 9],
  map: WATER_MAP,
  roads: [{ cells: [[0, 4], [13, 4]] }, { cells: [[2, 4], [2, 7]] }, { cells: [[11, 4], [11, 7]] }],
  gates: [{ id: 'W', cell: [0, 4] }, { id: 'E', cell: [13, 4] }, { id: 'S1', cell: [2, 7] }, { id: 'S2', cell: [11, 7] }],
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 1.5, from: 'E', to: 'W' }, { kind: 'through', id: 'C', at: 3, from: 'W', to: 'E', vehicle: 'truck' }],
  flows: [{ from: 'W', to: 'E', every: 3, start: 5, until: 15 }, { from: 'E', to: 'W', every: 4, start: 5, until: 15 }],
  seconds: 30,
  expectations: (r) => {
    const bridge = cityOf(r).net.roads.find((x) => x.bridge);
    const onBridge = (s: { x: number }) => s.x > 5.5 * 40 && s.x < 8.5 * 40;
    const across = (who: string) => samplesOf(r, who).filter((s) => s.state === 'moving' && onBridge(s));
    // Eastbound drives in the lane south of the middle (y 165), westbound north (y 155).
    const off = (who: string, lane: number) => Math.max(0, ...across(who).map((s) => Math.abs(s.y - lane)));
    const slips = r.violations.filter((v) => v.rule.startsWith('slip'));
    return [
      expect('the street crosses the water on a bridge', !!bridge, bridge ? `road ${bridge.id}` : 'no bridge road'),
      expect('A drove across it', across('A').length > 30, `${across('A').length} frames`),
      expect('B drove across it the other way', across('B').length > 30, `${across('B').length} frames`),
      expect('A and C keep to the eastbound lane (within 4 px)', Math.max(off('A', 165), off('C', 165)) <= 4, `${off('A', 165).toFixed(1)} and ${off('C', 165).toFixed(1)} px off`),
      expect('B keeps to the westbound lane (within 4 px)', off('B', 155) <= 4, `${off('B', 155).toFixed(1)} px off`),
      expect('nobody slips', slips.length === 0, `${slips.length} slip frames`),
      passesBy(r, 'A', 30), passesBy(r, 'B', 30), passesBy(r, 'C', 30), clean(r, 'A'), clean(r, 'B'), clean(r, 'C'), clean(r, 'bg'),
    ];
  },
};

export const BUS_STOP: Scenario = {
  id: 'drive.bus.stop',
  title: 'A bus line: pull in at the stop, pull out again',
  expect: 'A bus pulls into its stop and out again with forward S moves; cars behind wait or pass, no overlap',
  ...STREET_EW,
  // One bus line along the street with a stop at each end of the shop frontage; cars follow it from the west.
  setup: (v) => {
    must(v, { t: 'line', mode: 'bus', stops: [{ gx: 4, gy: 4 }, { gx: 9, gy: 4 }] });
    const l = v.lines[0]!;
    must(v, { t: 'lineVehicles', line: l.id, vehicles: 1 });
  },
  actors: [{ kind: 'through', id: 'A', at: 3, from: 'W', to: 'E' }],
  flows: [{ from: 'W', to: 'E', every: 4, start: 6, until: 30 }],
  seconds: 40,
  expectations: (r) => {
    const bus = samplesOf(r, 'bus');
    const stops = cityOf(r).lines[0]?.stops ?? [];
    const px = (x: number) => (x + 0.5) * 40;
    const stoppedAt = stops.map((st) => bus.filter((s) => Math.abs(s.x - px(st.gx)) < 25 && Math.abs(s.v) < 3));
    return [
      expect('a bus line runs', !!cityOf(r).lines[0], `${cityOf(r).lines.length} lines`),
      expect('the bus was on the road', bus.length > 60, `${bus.length} frames`),
      expect('the bus stopped at both stops (within 25 px, under 3 px/s) and drove between them', stoppedAt.every((l) => l.length > 5) && stoppedAt.every((l) => l.length < 1200), `${stoppedAt.map((l) => l.length).join(' and ')} frames at the stops`),
      expect('the bus never reverses', !bus.some((s) => s.gear === 'R'), `${bus.filter((s) => s.gear === 'R').length} frames in R`),
      expect('it is one bus all the time: never vanishes or is replaced on the road', new Set(bus.map((x) => x.uid)).size === 1, `${new Set(bus.map((x) => x.uid)).size} bus ids (the line has 1 vehicle)`),
      expect('A, behind the bus at times, got past it', samplesOf(r, 'A').length > 0, ''),
      passesBy(r, 'A', 40), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'bus'), clean(r, 'bg'),
    ];
  },
};

export const DEAD_END: Scenario = {
  id: 'drive.deadend.turn',
  title: 'A dead end: turn round and come back out',
  expect: 'At a dead end A turns round with a three-point turn (or a U where it fits), never on the spot',
  size: [14, 9],
  // The side street at column 3 runs south to a dead end (no gate) at row 8; a car sent to its end has to turn round.
  roads: [{ cells: [[0, 4], [13, 4]] }, { cells: [[3, 4], [3, 8]] }],
  gates: [{ id: 'W', cell: [0, 4] }, { id: 'E', cell: [13, 4] }],
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: [3, 8] }, { kind: 'through', id: 'B', at: 14, from: 'E', to: [3, 8], vehicle: 'van' }],
  flows: [{ from: 'W', to: 'E', every: 7, start: 3, until: 40 }],
  seconds: 40,
  expectations: (r) => {
    const end = cityOf(r).net.junctions.find((j) => j.arms.length === 1 && j.gate === undefined);
    const near = (who: string) => samplesOf(r, who).filter((s) => end && Math.hypot(s.x - end.x, s.y - end.y) < 60);
    const turned = (who: string) => {
      const list = samplesOf(r, who).filter((s) => s.state === 'moving' || s.state === 'manoeuvre');
      // Went south down the street, and later north up it again: the same car, both headings.
      return list.some((s) => Math.sin(s.a) > 0.9 && s.y > 5 * 40) && list.some((s) => Math.sin(s.a) < -0.9 && s.y > 5 * 40);
    };
    const reverseFrames = (who: string) => samplesOf(r, who).filter((s) => s.gear === 'R').length;
    const spin = (who: string) => {
      let worst = 0;
      const list = near(who);
      for (let i = 1; i < list.length; i++) if (list[i]!.frame - list[i - 1]!.frame === 1 && Math.abs(list[i]!.v) < 1) worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(list[i]!.a - list[i - 1]!.a), Math.cos(list[i]!.a - list[i - 1]!.a))));
      return worst;
    };
    return [
      expect('the street ends in a dead end', !!end, end ? `at ${end.x.toFixed(0)},${end.y.toFixed(0)}` : 'no dead end'),
      expect('A drove down to the dead end', near('A').length > 0, `${near('A').length} frames within 60 px`),
      expect('A turned round and came back up the street', turned('A'), ''),
      expect('A turned with a three-point turn or a U (some reversing or an arc, over 1 s)', turned('A') && (reverseFrames('A') > 20 || near('A').length > 60), `${reverseFrames('A')} frames in R`),
      expect('A never turns on the spot (no heading change while standing)', spin('A') < 0.02, `${spin('A').toFixed(3)} rad in one frame at under 1 px/s`),
      expect('B (a van) turned round too', turned('B'), ''),
      passesBy(r, 'A', 40), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'B'), clean(r, 'bg'),
    ];
  },
};

export const JAM_GIVEUP: Scenario = {
  id: 'drive.jam.giveup',
  title: 'Stuck behind a broken-down van: give up and pull over',
  expect: 'A car stuck in a jam gives up and pulls over to the shoulder with a forward S, then drives off when it can',
  ...STREET_EW,
  // A broken-down vehicle holds the eastbound lane at (6, 4) for 90 s; A joins the queue behind it and gives up after 60 s.
  actors: [{ kind: 'blocker', id: 'X', at: 0, cell: [6, 4], hold: 90, state: 3 }, { kind: 'through', id: 'A', at: 2, from: 'W', to: 'E' }],
  flows: [{ from: 'W', to: 'E', every: 12, start: 8, until: 40 }],
  seconds: 110,
  expectations: (r) => {
    const a = samplesOf(r, 'A');
    const still = a.filter((s) => Math.abs(s.v) < 1 && s.t > 3);
    const first = still[0]?.t ?? -1;
    const gaveUp = r.events.find((l) => l.who === 'A' && (l.e.t === 'park' || l.e.t === 'parkGo'));
    const lane = a.find((s) => s.t > 1 && s.state === 'moving');
    const stands = a.filter((s) => s.state === 'parked');
    const mid = lane?.y ?? 165;
    const reverse = gaveUp ? a.filter((s) => s.t >= gaveUp.t - 1 && s.t < gaveUp.t + 6 && s.gear === 'R').length : 0;
    return [
      expect('the lane was blocked and A queued behind it', first > 0 && first < 30, `A first stood still at ${first.toFixed(1)} s`),
      expect('A waited about a minute before it gave up (50 s or more)', !!gaveUp && gaveUp.t - first >= 50, gaveUp ? `gave up at ${gaveUp.t.toFixed(1)} s` : 'never gave up'),
      expect('A pulled over to the shoulder (stood off its lane)', stands.length > 0 && stands.some((s) => Math.abs(s.y - mid) > 6), stands.length ? `stood at y ${stands[0]!.y.toFixed(0)} (lane ${mid.toFixed(0)})` : 'never stood off the lane'),
      expect('it pulled over with a forward S, no reversing', !!gaveUp && reverse === 0, `${reverse} frames in R`),
      expect('A drove off afterwards and left the map', r.gone.get('A') !== undefined, `gone ${r.gone.get('A')?.toFixed(1) ?? '-'} s`),
      brakesUnder(r, 'A', 400), clean(r, 'A'),
    ];
  },
};

/** Two streets along rows 3 and 7, joined at columns 3 and 10; the row-3 piece between them is dug up for works. */
const WORKS_LOOP = {
  size: [14, 11] as const,
  roads: [{ cells: [[0, 3], [13, 3]] as const }, { cells: [[3, 3], [3, 7]] as const }, { cells: [[10, 3], [10, 7]] as const }, { cells: [[3, 7], [10, 7]] as const }],
  gates: [{ id: 'W', cell: [0, 3] as const }, { id: 'E', cell: [13, 3] as const }],
};

export const WORKS_CLOSED: Scenario = {
  id: 'drive.works.closed',
  title: 'Road works close a road: through cars go round',
  expect: 'A road under works between two junctions takes no cars; through cars go round by the side streets and still arrive',
  ...WORKS_LOOP,
  // The lab's roads are the Council's own (fixed), so the works are put on directly, as a burst pipe would.
  setup: (v) => {
    const c = (v as unknown as { c: City }).c;
    const dug = c.net.roads.find((q) => q.cells.some((x) => x.gx === 6 && x.gy === 3))!;
    commitNetwork(c, setRoad(c.net, dug.id, { works: 1 }));
  },
  actors: [{ kind: 'through', id: 'A', at: 1, from: 'W', to: 'E' }, { kind: 'through', id: 'B', at: 2, from: 'E', to: 'W' }],
  flows: [{ from: 'W', to: 'E', every: 5, start: 4, until: 30 }],
  seconds: 45,
  expectations: (r) => {
    const dug = cityOf(r).net.roads.find((q) => q.works > 0 && q.cells.some((x) => x.gx === 6 && x.gy === 3));
    const ends = cityOf(r).net.junctions.filter((j) => dug && (j.id === dug.a || j.id === dug.b));
    // A car on the dug road: within its paved width, between the two junction boxes at its ends (it runs along row 3).
    const [lo, hi] = [Math.min(...ends.map((j) => j.x + j.radius)), Math.max(...ends.map((j) => j.x - j.radius))];
    const onDug = (s: { x: number; y: number }) => !!dug && Math.abs(s.y - dug.line[0]!.y) < halfWidth(dug) && s.x > lo && s.x < hi;
    const on = r.trace.flatMap((row) => (row ?? []).filter((s) => s.state !== 'parked' && onDug(s)));
    // Going round means driving the row-7 street (y about 300 px).
    const round = (who: string) => samplesOf(r, who).some((s) => s.y > 6.5 * 40);
    return [
      expect('the road is under works', !!dug && ends.length === 2, dug ? `road ${dug.id}, ${dug.works} season` : 'no works'),
      expect('no car on the closed road', on.length === 0, on.length ? `${on[0]!.who} at ${on[0]!.t.toFixed(1)} s (${on.length} frames)` : 'none'),
      expect('A and B went round by the row-7 street', round('A') && round('B'), `A ${round('A')}, B ${round('B')}`),
      passesBy(r, 'A', 45), passesBy(r, 'B', 45), brakesUnder(r, 'A', 400), clean(r, 'A'), clean(r, 'B'),
    ];
  },
};

export const DRIVING: readonly Scenario[] = [CROSS_LEFT, CROSS_STRAIGHT, FOLLOW_QUEUE, YIELD_GO, SIGNAL_CYCLE, LANES_CHANGE, T_ALL, GATE_INOUT, DIAGONAL, ONE_WAY, FLYOVER_RAMPS, BRIDGE, BUS_STOP, DEAD_END, JAM_GIVEUP, WORKS_CLOSED];

export const KNOWN_DRIVING: KnownSets = {
  defaults: {
    'drive.cross.left': { counts: {}, failing: [] },
    'drive.cross.straight': { counts: {}, failing: [] },
    'drive.follow.queue': { counts: {'bodies overlap (moving)': 4, 'jumps (manoeuvre)': 81, 'bodies overlap (manoeuvre)': 13, 'too fast on a curve (manoeuvre)': 16, 'reverse too fast (manoeuvre)': 16, 'crosses a kerb (manoeuvre)': 4, 'too tight (manoeuvre)': 2, 'cuts across without a gap (manoeuvre)': 3}, failing: ['followers keep a gap of 2 px or more', 'bg breaks no motion rule'] },
    'drive.yield.go': { counts: {}, failing: [] },
    'drive.signal.cycle': { counts: {}, failing: ['the queue keeps a gap of 2 px or more'] },
    'drive.lanes.change': { counts: {'bodies overlap (moving)': 6, 'jumps (manoeuvre)': 81, 'bodies overlap (manoeuvre)': 13, 'too fast on a curve (manoeuvre)': 16, 'reverse too fast (manoeuvre)': 16, 'crosses a kerb (manoeuvre)': 6, 'too tight (manoeuvre)': 2, 'cuts across without a gap (manoeuvre)': 6}, failing: ['bg breaks no motion rule'] },
    'drive.t.all': { counts: {'bodies overlap (moving)': 2}, failing: ['A breaks no motion rule', 'C breaks no motion rule'] },
    'drive.gate.inout': { counts: {'bodies overlap (moving)': 7}, failing: [] },
    'drive.diagonal': { counts: {'bodies overlap (moving)': 1, 'too fast on a curve (moving)': 55}, failing: ['B breaks no motion rule'] },
    'drive.oneway': { counts: {}, failing: [] },
    'drive.flyover.ramps': { counts: {}, failing: ['A rose onto the deck', 'A went over the crossing with a ground car under it'] },
    'drive.bridge': { counts: {}, failing: [] },
    'drive.bus.stop': { counts: {}, failing: ['the bus stopped at both stops (within 25 px, under 3 px/s) and drove between them'] },
    'drive.deadend.turn': { counts: {'pulls away too hard (moving)': 1, 'jerks (moving)': 3, 'brakes too hard (moving)': 1, 'reverse too fast (manoeuvre)': 74, 'jumps (manoeuvre)': 41, 'too tight (manoeuvre)': 1, 'too fast on a curve (manoeuvre)': 15, 'crosses a kerb (manoeuvre)': 2}, failing: ['A never turns on the spot (no heading change while standing)', 'B (a van) turned round too', 'A breaks no motion rule', 'B breaks no motion rule', 'bg breaks no motion rule'] },
    'drive.jam.giveup': { counts: {'cuts across without a gap (manoeuvre)': 2, 'bodies overlap (manoeuvre)': 7, 'bodies overlap (moving)': 3, 'jumps (manoeuvre)': 68, 'too fast on a curve (manoeuvre)': 44, 'reverse too fast (manoeuvre)': 26, 'turns in place (manoeuvre)': 2, 'crosses a kerb (manoeuvre)': 4}, failing: ['A pulled over to the shoulder (stood off its lane)', 'A breaks no motion rule'] },
    'drive.works.closed': { counts: {'bodies overlap (moving)': 4}, failing: ['B breaks no motion rule'] },
  },
  on: {
    'drive.cross.left': { counts: {}, failing: ['A turned left through the box', 'A is through by 34 s'] },
    'drive.cross.straight': { counts: {}, failing: [] },
    'drive.follow.queue': { counts: {'bodies overlap (moving)': 2, 'bodies overlap (manoeuvre)': 8, 'cuts across without a gap (manoeuvre)': 8}, failing: ['followers keep a gap of 2 px or more', 'bg breaks no motion rule'] },
    'drive.yield.go': { counts: {}, failing: [] },
    'drive.signal.cycle': { counts: {}, failing: ['the queue keeps a gap of 2 px or more'] },
    'drive.lanes.change': { counts: {'bodies overlap (moving)': 2, 'cuts across without a gap (manoeuvre)': 4, 'bodies overlap (manoeuvre)': 2}, failing: ['bg breaks no motion rule'] },
    'drive.t.all': { counts: {'bodies overlap (moving)': 2}, failing: ['A breaks no motion rule', 'C breaks no motion rule'] },
    'drive.gate.inout': { counts: {'bodies overlap (moving)': 7}, failing: [] },
    'drive.diagonal': { counts: {'bodies overlap (moving)': 2, 'too fast on a curve (moving)': 55}, failing: ['B breaks no motion rule', 'D is through by 44 s', 'F is through by 44 s'] },
    'drive.oneway': { counts: {}, failing: [] },
    'drive.flyover.ramps': { counts: {}, failing: ['A rose onto the deck', 'A went over the crossing with a ground car under it'] },
    'drive.bridge': { counts: {}, failing: [] },
    'drive.bus.stop': { counts: {}, failing: ['the bus stopped at both stops (within 25 px, under 3 px/s) and drove between them'] },
    'drive.deadend.turn': { counts: {'pulls away too hard (moving)': 1, 'jerks (moving)': 3, 'brakes too hard (moving)': 1, 'cuts across without a gap (manoeuvre)': 1, 'bodies overlap (manoeuvre)': 3, 'jumps (manoeuvre)': 1}, failing: ['A never turns on the spot (no heading change while standing)', 'B (a van) turned round too', 'A is through by 40 s', 'A breaks no motion rule', 'bg breaks no motion rule'] },
    'drive.jam.giveup': { counts: {'cuts across without a gap (manoeuvre)': 7, 'bodies overlap (manoeuvre)': 6, 'crosses a kerb (manoeuvre)': 4, 'jumps (manoeuvre)': 13}, failing: ['A drove off afterwards and left the map', 'A breaks no motion rule'] },
    'drive.works.closed': { counts: {'bodies overlap (moving)': 3}, failing: ['B breaks no motion rule'] },
  },
};
