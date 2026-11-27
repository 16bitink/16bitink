/**
 * One situation played twice (docs/inkroad-vehicle-model.md "Comparison"): today's motion is a motion-lab scenario
 * run through the real city (test/motion/lab.ts runScenario), and the new model drives the same car the same way:
 * the same lanes (the sim's own tracks, rebuilt from the city's network), the same slots and stay, but junction
 * turns rebuilt as clothoid turns, lane changes as quintic shifts, U-turns and every move into and out of a place
 * planned with Reeds–Shepp against the ground and the parked bodies, and the whole played through the bicycle model
 * and its tracker. Only the chosen car is driven by the new model; traffic stays as today (step 2 joins them).
 */
import type { City } from '../../src/city/state';
import { buildWorld } from '../../src/sim/world';
import { LANE_T, TURN_T, type Track } from '../../src/sim/track';
import type { VehicleKind } from '../../src/sim/types';
import type { Body } from '../../src/sim/vehicleSize';
import { middleOf, paramsOf, rearOf, type VehicleParams } from '../../src/sim/vehicle/params';
import { pathOf, samplePolyline, unwrapTo, type Pose, type Pt5 } from '../../src/sim/vehicle/path';
import { planManoeuvre, type Offer } from '../../src/sim/vehicle/planner';
import type { Run } from '../../src/sim/vehicle/reedsShepp';
import { junctionTurn, laneShift, shiftLength } from '../../src/sim/vehicle/turns';
import { playPlan, type DriveState, type PlanItem } from '../../src/sim/vehicle/tracker';
import { runScenario, type RunResult, type Sample } from '../motion/lab';
import { ALL_SCENARIOS } from '../motion/all';
import { groundOf, type Ground } from './ground';

export interface Situation { readonly id: string; readonly title: string; readonly scenario: string; readonly who: string }

/** The situations of the brief, each on a motion-lab scenario (test/motion/scenarios*.ts). */
export const SITUATIONS: readonly Situation[] = [
  { id: 'driveway-near', title: 'Driveway entry from the near lane, and out', scenario: 'park.driveway.near-lane', who: 'A' },
  { id: 'driveway-far', title: 'Driveway entry from the far lane, and out', scenario: 'park.driveway.far-lane', who: 'A' },
  { id: 'driveway-leave-far', title: 'Leaving a driveway towards the far direction', scenario: 'park.driveway.leave-far', who: 'A' },
  { id: 'way-behind', title: 'Way on behind it, narrow street (turning round)', scenario: 'park.kerb.way-behind', who: 'A' },
  { id: 'uturn-crossroads', title: 'U-turn at a crossroads', scenario: 'drive.uturn.crossroads', who: 'A' },
  { id: 'uturn-deadend', title: 'Turning round at a dead end (T)', scenario: 'drive.uturn.deadend', who: 'A' },
  { id: 'uturn-avenue', title: 'Turning round on an avenue', scenario: 'drive.uturn.avenue', who: 'A' },
  { id: 'uturn-roundabout', title: 'U-turn at a roundabout', scenario: 'drive.uturn.roundabout', who: 'A' },
  { id: 'kerb-parallel', title: 'Kerb parallel parking, in and out', scenario: 'park.kerb.parallel-traffic', who: 'A' },
  { id: 'forecourt', title: 'Forecourt space square to the kerb', scenario: 'park.forecourt.near-lane', who: 'A' },
  { id: 'carpark-bay', title: 'Car-park bay', scenario: 'park.carpark.gate-aisle', who: 'A' },
  { id: 'turn-left', title: 'Junction left turn (across the oncoming lane)', scenario: 'drive.cross.left', who: 'A' },
  { id: 'turn-right', title: 'Junction right turn', scenario: 'drive.cross.right', who: 'A' },
  { id: 'lane-change', title: 'A lane change', scenario: 'drive.lanes.change', who: 'A' },
];

export interface NewFrame {
  readonly t: number;
  /** The body's middle and heading (as drawn), the rear axle, signed speed, wheel angle. */
  readonly x: number; readonly y: number; readonly a: number;
  readonly rx: number; readonly ry: number;
  readonly v: number; readonly delta: number;
  readonly phase: DriveState['phase'];
  readonly label: string;
}

export interface Scene {
  readonly situation: Situation;
  readonly run: RunResult;
  readonly city: City;
  readonly params: VehicleParams;
  /** Today's drawn frames of the car (index = lab frame - 1; undefined where it is not drawn). */
  readonly old: readonly (Sample | undefined)[];
  /** Every drawn sample of the car today, ghosts included (a car drawn twice in a frame). */
  readonly oldAll: readonly Sample[];
  readonly frames: readonly NewFrame[];
  /** Scenario time of the new model's first frame. */
  readonly t0: number;
  readonly plan: readonly PlanItem[];
  readonly notes: readonly string[];
  /** Each planned manoeuvre (RS move in, out, a U) and the seconds the new model took over it. */
  readonly moves: readonly { readonly kind: string; readonly word: string; readonly seconds: number; readonly miss: number; readonly skew: number }[];
  /** Microseconds per car per frame the new model took (plan play only; planning excluded). */
  readonly usPerFrame: number;
  readonly planMs: number;
}

const DT = 1 / 60;
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const kindOf = (len: number): VehicleKind => (len > 22 ? 'truck' : len > 17 ? 'van' : 'car');
const cityOf = (r: RunResult): City => (r.city as unknown as { c: City }).c;

/** A trace sample's track: kind, key and s (`[track 0 L6:0 s 17.3 ...]`). */
function trackOf(s: Sample): { kind: number; key: string; s: number } | null {
  const m = /track (\d) (\S+) s (-?[\d.]+)/.exec(s.info);
  return m ? { kind: Number(m[1]), key: m[2]!, s: Number(m[3]) } : null;
}

interface Group { readonly state: Sample['state']; readonly samples: readonly Sample[] }

/** The car's samples in runs of one state. */
function groupsOf(samples: readonly Sample[]): Group[] {
  const out: { state: Sample['state']; samples: Sample[] }[] = [];
  for (const s of samples) {
    const last = out[out.length - 1];
    if (last && last.state === s.state) last.samples.push(s);
    else out.push({ state: s.state, samples: [s] });
  }
  return out;
}

interface Entry { readonly kind: number; readonly key: string; readonly first: number; readonly last: number }

/** The tracks a moving run went along, in order, with the first and last s seen on each. */
function entriesOf(g: Group): Entry[] {
  const out: { kind: number; key: string; first: number; last: number }[] = [];
  for (const s of g.samples) {
    const t = trackOf(s);
    if (!t) continue;
    const last = out[out.length - 1];
    if (last && last.key === t.key) last.last = t.s;
    else out.push({ kind: t.kind, key: t.key, first: t.s, last: t.s });
  }
  return out;
}

const laneAt = (t: Track, s: number): Pose => {
  const i = Math.max(0, Math.min(t.n, Math.round(s * t.inv)));
  const j = Math.min(t.n, i + 1), k = Math.max(0, j - 1);
  const x = t.xs[k]! + (t.xs[j]! - t.xs[k]!) * (s * t.inv - k);
  const y = t.ys[k]! + (t.ys[j]! - t.ys[k]!) * (s * t.inv - k);
  return { x, y, th: Math.atan2(t.ys[j]! - t.ys[k]!, t.xs[j]! - t.xs[k]!) };
};

/** A lane's polyline from s0 to s1. */
function laneLine(t: Track, s0: number, s1: number): { x: number; y: number }[] {
  const pts = [laneAt(t, s0)];
  for (let i = Math.ceil(s0 * t.inv); i < s1 * t.inv; i++) if (i / t.inv > s0) pts.push({ x: t.xs[i]!, y: t.ys[i]!, th: 0 });
  pts.push(laneAt(t, s1));
  return pts;
}

interface Span { readonly track: Track; s0: number; s1: number }

/** What joins two lanes: a turn, a lane change, a U, or the sim's own polyline (ring pieces, bends). */
type Join = { kind: 'turn' } | { kind: 'shift'; at: number } | { kind: 'u' } | { kind: 'poly'; tracks: Track[] };

interface Mark { readonly kind: string; readonly word: string; readonly from: Pose; readonly to: Pose }
interface Ctx { readonly p: VehicleParams; readonly ground: Ground; readonly bodies: readonly Body[]; readonly notes: string[]; readonly marks: Mark[] }

/** Builds a moving run: spans of lanes and the joins between them, with lanes trimmed for turns and shifts. */
function spansOf(entries: readonly Entry[], byKey: ReadonlyMap<string, Track>): { spans: Span[]; joins: Join[] } {
  const spans: Span[] = [];
  const joins: Join[] = [];
  let between: Track[] = [];
  for (const e of entries) {
    const t = byKey.get(e.key);
    if (!t) continue;
    if (t.kind !== LANE_T) { between.push(t); continue; }
    const prev = spans[spans.length - 1];
    if (prev) joins.push(joinOf(prev, t, between, e));
    spans.push({ track: t, s0: prev ? 0 : e.first, s1: e.last });
    if (prev) prev.s1 = joins[joins.length - 1]!.kind === 'shift' ? prev.s1 : prev.track.len;
    between = [];
  }
  return { spans, joins };
}

function joinOf(prev: Span, next: Track, between: readonly Track[], e: Entry): Join {
  if (between.length === 0) return { kind: 'shift', at: e.first };
  // Round a roundabout: the ring's own pieces, smoothed (a U there is the way round, not a turn on the spot).
  if (between.some((t) => t.kind !== TURN_T)) return { kind: 'poly', tracks: [...between] };
  const turn = Math.abs(wrap(laneAt(next, 0).th - laneAt(prev.track, prev.track.len).th));
  if (turn > 2.6 || between.some((t) => t.turnRound !== null)) return { kind: 'u' };
  if (between.length === 1 && between[0]!.kind === TURN_T && turn > 0.1) return { kind: 'turn' };
  return { kind: 'poly', tracks: [...between] };
}

/** Lane offers along a span: a pose every `step` px from `from`, `n` each way (clamped to the lane), costed by distance. */
function laneOffers(t: Track, from: number, back: number, ahead: number, lo = 1, hi = t.len - 1, step = 4): { s: number; offer: Offer }[] {
  const out: { s: number; offer: Offer }[] = [];
  for (let k = -back; k <= ahead; k++) {
    const s = Math.max(lo, Math.min(hi, from + k * step));
    if (out.some((o) => Math.abs(o.s - s) < 1e-6)) continue;
    out.push({ s, offer: { pose: laneAt(t, s), cost: Math.abs(k) * step * 0.25 } });
  }
  return out;
}

/** The runs of a moving run, start to end (lanes, joins). */
function driveRuns(spans: Span[], joins: readonly Join[], c: Ctx): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < spans.length; i++) {
    const sp = spans[i]!, j = joins[i];
    const next = spans[i + 1];
    const join = j && next ? joinRuns(sp, next, j, c) : [];
    if (sp.s1 > sp.s0 + 0.01) runs.push({ dir: 1, pts: samplePolyline(laneLine(sp.track, sp.s0, sp.s1), sp.track.vmax) });
    runs.push(...join);
  }
  return runs;
}

/** The runs joining two spans (it may trim the end of `a` and the start of `b`). */
function joinRuns(a: Span, b: Span, j: Join, c: Ctx): Run[] {
  const v = Math.min(a.track.vmax, b.track.vmax);
  if (j.kind === 'turn') {
    const t = junctionTurn(laneAt(a.track, a.s1), laneAt(b.track, b.s0), c.p.rPlan, v);
    if (!t) return [{ dir: 1, pts: samplePolyline([laneAt(a.track, a.s1), laneAt(b.track, b.s0)], v) }];
    a.s1 = Math.max(a.s0, a.s1 - t.trimIn);
    b.s0 = Math.min(b.s1, b.s0 + t.trimOut);
    return [{ dir: 1, pts: t.pts }];
  }
  if (j.kind === 'shift') return shiftRuns(a, b, j.at, v, c);
  if (j.kind === 'u') return uRuns(a, b, c);
  const p0 = laneAt(a.track, a.s1), p1 = laneAt(b.track, b.s0);
  if (Math.abs(wrap(p1.th - p0.th)) < 0.1) return straightOn(p0, p1, v);
  const line = j.tracks.flatMap((t) => Array.from(t.xs, (x, i) => ({ x, y: t.ys[i]! })));
  return [{ dir: 1, pts: samplePolyline(smooth([p0, ...line, p1]), v) }];
}

/** Straight on through a junction: a line, or a quintic shift where the lanes don't line up. */
function straightOn(p0: Pose, p1: Pose, v: number): Run[] {
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const side = -(p1.x - p0.x) * Math.sin(p0.th) + (p1.y - p0.y) * Math.cos(p0.th);
  if (Math.abs(side) < 0.3) return [{ dir: 1, pts: samplePolyline([p0, p1], v) }];
  return [{ dir: 1, pts: laneShift(p0, len, side, v) }];
}

/** Resampled every 2 px and averaged (three passes), ends kept: the sim's ring pieces meet at small kinks. */
function smooth(line: readonly { x: number; y: number }[]): { x: number; y: number }[] {
  let pts = samplePolyline(line, 0).filter((_, i) => i % 4 === 0).map((q) => ({ x: q.x, y: q.y }));
  const last = line[line.length - 1]!;
  pts.push({ x: last.x, y: last.y });
  for (let pass = 0; pass < 3; pass++) pts = pts.map((q, i) => (i === 0 || i === pts.length - 1 ? q : { x: (pts[i - 1]!.x + 2 * q.x + pts[i + 1]!.x) / 4, y: (pts[i - 1]!.y + 2 * q.y + pts[i + 1]!.y) / 4 }));
  return pts;
}

/** Played seconds a lane change takes where the lanes are long enough (real drivers take 3–5 s). */
const SHIFT_S = 2.5;

/** A lane change: a quintic shift centred where the sim switched lanes, over SHIFT_S of travel where it fits (never tighter than rPlan). */
function shiftRuns(a: Span, b: Span, at: number, v: number, c: Ctx): Run[] {
  const p0 = laneAt(a.track, a.s1);
  const q = laneAt(b.track, at);
  const side = -(q.x - p0.x) * Math.sin(p0.th) + (q.y - p0.y) * Math.cos(p0.th);
  const room = 0.9 * (a.s1 - a.s0 + b.s1 - at);
  const len = Math.max(shiftLength(side, c.p.rPlan), Math.min(v * SHIFT_S, room));
  const start = Math.max(a.s0, a.s1 - len / 2);
  a.s1 = start;
  const from = laneAt(a.track, start);
  const pts = laneShift(from, len, side, v);
  const end = pts[pts.length - 1]!;
  b.s0 = Math.max(0, projectTrack(b.track, end));
  b.s1 = Math.max(b.s1, b.s0);
  return [{ dir: 1, pts }];
}

/** Length along a track nearest a point (on its segments). */
function projectTrack(t: Track, p: { x: number; y: number }): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < t.n; i++) {
    const ax = t.xs[i]!, ay = t.ys[i]!, dx = t.xs[i + 1]! - ax, dy = t.ys[i + 1]! - ay;
    const u = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / Math.max(1e-9, dx * dx + dy * dy)));
    const d = (ax + dx * u - p.x) ** 2 + (ay + dy * u - p.y) ** 2;
    if (d < bd) { bd = d; best = (i + u) / t.inv; }
  }
  return best;
}

/** A U: RS from the lane in to the lane out, on the ground, as a forward U where it fits or with gear changes. */
function uRuns(a: Span, b: Span, c: Ctx): Run[] {
  const starts = laneOffers(a.track, a.s1, 10, 0, a.s0 + 1);
  const goals = laneOffers(b.track, b.s0, 0, 10, 1, b.s1 - 1);
  const m = planManoeuvre(starts.map((s) => s.offer), goals.map((g) => g.offer), c.p, { drivable: c.ground.drivable, bodies: c.bodies });
  if (!m) { c.notes.push('U: no RS path at all'); return []; }
  if (!m.fits) c.notes.push(`U: no RS path fits (${m.rs.ctypes.join('')}: ${m.why}); drawn anyway`);
  a.s1 = starts[m.from]!.s;
  b.s0 = goals[m.to]!.s;
  c.marks.push({ kind: 'U', word: m.rs.ctypes.join(''), from: starts[m.from]!.offer.pose, to: goals[m.to]!.offer.pose });
  c.notes.push(`U-turn: RS ${m.rs.ctypes.join('')} ${m.rs.lengths.map((l) => (l * m.radius).toFixed(0)).join(' ')} px`);
  return [...m.runs];
}

/** Bodies standing (parked) at a lab frame, other than the car. */
function standing(r: RunResult, frame: number, who: string): Body[] {
  return (r.trace[frame - 1] ?? []).filter((s) => s.who !== who && s.state === 'parked').map((s) => ({ x: s.x, y: s.y, a: s.a, len: s.len, wid: s.wid }));
}

/** Today a car is sometimes drawn twice in a frame (a manoeuvre's ghost beside the moving car): one per frame, the moving one first. */
function onePerFrame(samples: readonly Sample[]): Sample[] {
  const rank = { moving: 0, manoeuvre: 1, parked: 2 } as const;
  const by = new Map<number, Sample>();
  for (const s of samples) { const o = by.get(s.frame); if (!o || rank[s.state] < rank[o.state]) by.set(s.frame, s); }
  return [...by.values()].sort((a, b) => a.frame - b.frame);
}

/** One body per place anything stood parked during the run. */
function parkedEver(r: RunResult): Body[] {
  const seen = new Map<string, Body>();
  for (const row of r.trace) for (const s of row ?? []) if (s.state === 'parked') seen.set(`${s.x.toFixed(0)},${s.y.toFixed(0)}`, { x: s.x, y: s.y, a: s.a, len: s.len, wid: s.wid });
  return [...seen.values()];
}

/** The rear-axle pose of a parked sample. */
const parkedRear = (p: VehicleParams, s: Sample): Pose => ({ ...rearOf(p, s.x, s.y, s.a), th: s.a });

/** Builds the new model's plan for the car from today's run. */
export function buildScene(sit: Situation): Scene {
  const scenario = ALL_SCENARIOS.find((s) => s.id === sit.scenario);
  if (!scenario) throw new Error(`no scenario ${sit.scenario}`);
  const run = runScenario(scenario);
  const city = cityOf(run);
  const started = performance.now();
  const samples = run.trace.flatMap((row) => (row ?? []).filter((s) => s.who === sit.who));
  if (samples.length === 0) throw new Error(`${sit.who} never drawn in ${sit.scenario}`);
  const mine = onePerFrame(samples);
  const p = paramsOf(kindOf(samples[0]!.len));
  const world = buildWorld(city.net);
  const ground = groundOf(city, parkedEver(run));
  const notes: string[] = [];
  const marks: Mark[] = [];
  const { plan, start } = planOf(groupsOf(mine), world.byKey, p, ground, run, sit.who, notes, marks);
  const planMs = performance.now() - started;
  const t0 = mine[0]!.t;
  const played = performance.now();
  const states = playPlan(start, plan, p, DT, scenario.seconds * 3);
  const usPerFrame = ((performance.now() - played) * 1000) / Math.max(1, states.length);
  const frames = states.map((d, i) => frameOf(d, p, t0 + (i + 1) * DT, plan));
  const old: (Sample | undefined)[] = [];
  for (const s of mine) old[s.frame - 1] = s;
  return { situation: sit, run, city, params: p, old, oldAll: samples, frames, t0, plan, notes, usPerFrame, planMs, moves: timed(marks, frames) };
}

/** Seconds over each move: from the frame nearest its start pose to the frame nearest its end pose after it. */
function timed(marks: readonly Mark[], frames: readonly NewFrame[]): Scene['moves'] {
  let from = 0;
  return marks.map((m) => {
    const i0 = nearest(frames, m.from, from, true), i1 = nearest(frames, m.to, i0, false);
    from = i1;
    const f = frames[i1]!;
    // How far from its goal it stood or passed (px), and how skew (rad).
    return { kind: m.kind, word: m.word, seconds: (i1 - i0) / 60, miss: Math.hypot(f.rx - m.to.x, f.ry - m.to.y), skew: Math.abs(wrap(f.a - m.to.th)) };
  });
}

/** The frame nearest a pose from `from` on; `last`: of a run of equally near frames (standing there), the last. */
function nearest(frames: readonly NewFrame[], q: Pose, from: number, last: boolean): number {
  let best = from, bd = Infinity;
  for (let i = from; i < frames.length; i++) {
    const d = Math.hypot(frames[i]!.rx - q.x, frames[i]!.ry - q.y);
    if (d < bd - 1e-6 || (last && d <= bd + 1e-6)) { bd = Math.min(bd, d); best = i; }
    if (bd < 0.8 && (d > 3 || (!last && frames[i]!.phase === 'wait'))) break;
  }
  return best;
}

function frameOf(d: DriveState, p: VehicleParams, t: number, plan: readonly PlanItem[]): NewFrame {
  const m = middleOf(p, d.car.x, d.car.y, d.car.th);
  return { t, x: m.x, y: m.y, a: d.car.th, rx: d.car.x, ry: d.car.y, v: d.car.dir * d.car.u, delta: d.car.delta, phase: d.phase, label: plan[d.item]?.label ?? '' };
}

interface Built { readonly plan: PlanItem[]; readonly start: { x: number; y: number; th: number; u: number; dir: 1 | -1; delta: number; a: number } }

/** Walks the groups: moving runs become drives, a manoeuvre into a parked group an RS move in, out of one an RS move out. */
function planOf(groups: readonly Group[], byKey: ReadonlyMap<string, Track>, p: VehicleParams, ground: Ground, r: RunResult, who: string, notes: string[], marks: Mark[]): Built {
  const plan: PlanItem[] = [];
  let start: Built['start'] | null = null;
  let parkedAt: Pose | null = null;
  let pending: Run[] = [];
  const firstParked = groups[0]?.state === 'parked';
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    if (g.state === 'parked') {
      parkedAt = parkedRear(p, g.samples[0]!);
      if (!start) start = { ...parkedAt, u: 0, dir: 1, delta: 0, a: 0 };
      const next = groups.slice(gi + 1).find((x) => x.state !== 'parked');
      const stay = (next?.samples[0]!.t ?? g.samples[g.samples.length - 1]!.t) - g.samples[0]!.t;
      if (pending.length) plan.push({ kind: 'path', path: pathOf(pending), label: 'in' });
      pending = [];
      if (next) plan.push({ kind: 'wait', seconds: firstParked && gi === 0 ? stay : stay, label: 'parked' });
      continue;
    }
    if (g.state !== 'moving') continue;
    const entries = entriesOf(g);
    const { spans, joins } = spansOf(entries, byKey);
    if (spans.length === 0) continue;
    const ctx: Ctx = { p, ground, bodies: standing(r, g.samples[0]!.frame, who), notes, marks };
    const outOf = parkedAt;
    if (outOf) pending.push(...moveOut(outOf, spans[0]!, ctx));
    const into = groups.slice(gi + 1).find((x) => x.state === 'parked');
    const inRuns = into && groups.slice(gi + 1, groups.indexOf(into)).every((x) => x.state === 'manoeuvre') ? moveIn(spans[spans.length - 1]!, parkedRear(p, into.samples[0]!), { ...ctx, bodies: standing(r, into.samples[0]!.frame, who) }) : [];
    if (!start) {
      const f = spans[0]!;
      start = { ...laneAt(f.track, f.s0), u: Math.abs(g.samples[0]!.v), dir: 1, delta: 0, a: 0 };
    }
    pending.push(...driveRuns(spans, joins, ctx), ...inRuns);
    parkedAt = null;
  }
  // The last run leaves by a gate at speed (today's car is gone there, not stopped).
  if (pending.length) plan.push({ kind: 'path', path: pathOf(pending), label: 'drive', open: true });
  const last = plan.length - 1;
  return { plan: plan.map((it, i) => (it.kind === 'path' && i > 0 ? { ...it, label: 'out', open: i === last } : it)), start: start ?? { x: 0, y: 0, th: 0, u: 0, dir: 1, delta: 0, a: 0 } };
}

/** The length along a lane where a pose sits on it (within 1.5 px and 3°), or null. */
function onLane(t: Track, q: Pose): number | null {
  const s = projectTrack(t, q);
  const l = laneAt(t, s);
  return Math.hypot(l.x - q.x, l.y - q.y) < 1.5 && Math.abs(wrap(l.th - q.th)) < 0.05 ? s : null;
}

/** RS from the lane (around where today's car turned in) to the slot; trims the lane to the chosen start. */
function moveIn(last: Span, slot: Pose, c: Ctx): Run[] {
  const on = onLane(last.track, slot);
  if (on !== null) { last.s1 = on; c.notes.push('in: the place is on the lane (a stop in the lane, no manoeuvre)'); return []; }
  const offers = laneOffers(last.track, last.s1, 12, 4, last.s0 + 1);
  const goals = settleGoals({ ...slot, th: unwrapTo(laneAt(last.track, last.s1).th, slot.th) });
  const m = planManoeuvre(offers.map((o) => o.offer), goals, c.p, { drivable: c.ground.drivable, bodies: c.bodies });
  if (!m) { c.notes.push('in: no RS path'); return []; }
  last.s1 = offers[m.from]!.s;
  const g = goals[m.to]!;
  c.marks.push({ kind: 'in', word: m.rs.ctypes.join(''), from: offers[m.from]!.offer.pose, to: g.excuse! });
  c.notes.push(`in: RS ${m.rs.ctypes.join('')} ${m.rs.lengths.map((l) => (l * m.radius).toFixed(0)).join(' ')} px${g.endDir ? ` + ${SETTLE} px straight` : ''}${m.fits ? '' : ' (does not fit: ' + m.why + '; drawn anyway)'}`);
  return g.endDir ? [...m.runs, { dir: g.endDir, pts: settleRun(g.pose, g.excuse!, g.endDir, m.runs) }] : [...m.runs];
}

/** Px of straight a car ends a move into a slot with (wheels straight, so it stands square). */
const SETTLE = 5;

/** Goals for a move into a slot: SETTLE px short of it, coming forward or in reverse, then straight in; or the slot itself. */
function settleGoals(slot: Pose): Offer[] {
  const c = Math.cos(slot.th), s = Math.sin(slot.th);
  const at = (d: number): Pose => ({ x: slot.x + d * c, y: slot.y + d * s, th: slot.th });
  return [
    { pose: at(-SETTLE), cost: 0, excuse: slot, endDir: 1 },
    { pose: at(SETTLE), cost: 0, excuse: slot, endDir: -1 },
    { pose: slot, cost: 3 * SETTLE, excuse: slot },
  ];
}

/** The settling straight from the pre-goal into the slot, at the gear's manoeuvre pace (the last run's cap). */
function settleRun(from: Pose, to: Pose, dir: 1 | -1, runs: readonly Run[]): Pt5[] {
  const last = runs[runs.length - 1]?.pts;
  const vcap = last?.[last.length - 1]?.vcap ?? 5;
  return samplePolyline([from, to], vcap, dir).map((q) => ({ ...q, th: from.th }));
}

/** RS from the slot to the lane (around where today's car joined it); trims the lane to the chosen goal. */
function moveOut(slot: Pose, first: Span, c: Ctx): Run[] {
  const on = onLane(first.track, slot);
  if (on !== null) { first.s0 = on; c.notes.push('out: the place is on the lane (drives straight off)'); return []; }
  const offers = laneOffers(first.track, first.s0, 3, 24, 1, first.s1 - 1);
  const m = planManoeuvre([{ pose: slot, cost: 0, excuse: slot }], offers.map((o) => o.offer), c.p, { drivable: c.ground.drivable, bodies: c.bodies });
  if (!m) { c.notes.push('out: no RS path'); return []; }
  first.s0 = offers[m.to]!.s;
  c.marks.push({ kind: 'out', word: m.rs.ctypes.join(''), from: slot, to: offers[m.to]!.offer.pose });
  c.notes.push(`out: RS ${m.rs.ctypes.join('')} ${m.rs.lengths.map((l) => (l * m.radius).toFixed(0)).join(' ')} px${m.fits ? '' : ' (does not fit: ' + m.why + '; drawn anyway)'}`);
  return [...m.runs];
}

/** Bodies parked at the frame nearest scenario time t (for the overlap check of the new model). */
export function parkedAtTime(sc: Scene, t: number): Body[] {
  const frame = Math.max(1, Math.min(sc.run.frames, Math.round(t * 60)));
  return standing(sc.run, frame, sc.situation.who);
}

export type { Pt5 };
