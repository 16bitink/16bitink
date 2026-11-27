/** Ways through a junction: turns, lane rules, conflict tables, signal phases. */
import { angleDiff, curve, dist } from './geom';
import { phaseArms } from './netCore';
import { ROADS } from './constants';
import { TURN_T, Track, limitSpin, type Conflict } from './track';
import { CONFLICT_DIST, TURN } from './tune';
import { buildRing } from './ringBuild';
import { pathOf, poseAlong } from './drivePath';
import { A_LAT_PLAYED, R_MIN, REVERSE_PLAYED } from './kinematics';
import { turnRound } from './parkPaths';
import { addTrack, type LinkRt, type NodeRt, type OutOpt, type World } from './world';

const SHARP = 2.1;
const SIDE = 0.5;
const WORKS_SLOW = 0.5;
/** Left turns cut the corner, so two opposite ones pass each other. */
const LEFT_PULL = 0.21;

export const exitHeading = (l: LinkRt): number => l.lanes[0]!.h0;

function makeOpts(n: NodeRt, l: LinkRt): OutOpt[] {
  const make = (to: LinkRt, uTurn: boolean): OutOpt => ({
    key: `${l.link.id}>${to.link.id}`, from: l, to, turn: uTurn ? -Math.PI : angleDiff(l.lanes[0]!.h1, exitHeading(to)), uTurn,
    lo: 0, hi: l.carLanes - 1, conn: l.lanes.map(() => null), delay: 0, exitArm: -1,
  });
  const ahead = n.outs.filter((o) => o.road.id !== l.road.id);
  const back = n.outs.filter((o) => o.road.id === l.road.id);
  let opts = ahead.map((o) => make(o, false));
  if (n.j.ramp) opts = opts.filter((o) => Math.abs(o.turn) < SHARP);
  if (opts.length === 0 || n.kind === 'ring') opts.push(...back.map((o) => make(o, true)));
  return opts.sort((p, q) => p.turn - q.turn || p.to.link.id - q.to.link.id);
}

/** Which lanes drivers use for each turn. */
function laneRules(l: LinkRt, opts: readonly OutOpt[], n: NodeRt): void {
  const lanes = l.carLanes;
  if (lanes === 1 || opts.length === 1) return;
  const straight = opts.some((o) => Math.abs(o.turn) <= SIDE);
  const anyLeft = opts.some((o) => o.turn < -SIDE), anyRight = opts.some((o) => o.turn > SIDE);
  for (const o of opts) {
    if (n.j.ramp) {
      if (o.to.road.flyover) o.lo = lanes - 1;
      continue;
    }
    if (o.turn < -SIDE) {
      o.lo = 0;
      o.hi = straight ? Math.max(0, Math.ceil(lanes / 3) - 1) : anyRight ? Math.ceil(lanes / 2) - 1 : lanes - 1;
    } else if (o.turn > SIDE) {
      o.hi = lanes - 1;
      o.lo = straight ? lanes - 1 : anyLeft ? Math.floor(lanes / 2) : 0;
    } else {
      o.lo = anyLeft && lanes > 2 ? 1 : 0;
      o.hi = lanes - 1;
    }
  }
}

/** The lane a turn from lane i comes out in. */
function outLane(o: OutOpt, i: number): number {
  const n = o.from.lanes.length, m = o.to.carLanes;
  if (o.to.road.flyover) return 0;
  if (o.from.road.flyover) return m - 1;
  if (o.from.road.busLane && i >= o.from.carLanes) return o.to.lanes.length - 1;
  if (o.turn > SIDE) return Math.max(0, m - Math.max(1, Math.min(n, o.from.carLanes) - i));
  return Math.min(i, m - 1);
}

function turnSpeed(o: OutOpt, len: number, works: boolean): number {
  const through = Math.min(o.from.link.freeSpeed, o.to.link.freeSpeed);
  const turn = Math.abs(o.turn);
  const v = turn < TURN.straight ? through : Math.max(TURN.min, Math.min(through, Math.sqrt(TURN.lateral * (len / turn))));
  return works ? v * WORKS_SLOW : v;
}

/** Px between a turn-round track's points: far under a sim step's walk at walking pace, so the drawn glide (heading vs chord) follows the arcs. */
const ROUND_STEP = 0.05;

/**
 * Turning round at a dead end as a real car does (docs/inkroad-build.md "Car motion rules"): a forward U on R_MIN
 * arcs where the lanes lie far enough apart, else a three-point turn at walking pace. The track's heading is the
 * body's, so its reverse leg is drawn backing up.
 */
function roundTrack(o: OutOpt, a: Track, b: Track, lane: number): Track {
  const p0 = a.end(), p1 = b.start();
  const { segs, three } = turnRound({ x: p0.x, y: p0.y, a: a.h1 }, { x: p1.x, y: p1.y, a: b.h0 });
  const path = pathOf(segs);
  const at = { x: 0, y: 0, a: 0, dir: 1 as 1 | -1 };
  const n = Math.max(2, Math.ceil(path.len / ROUND_STEP));
  const pts = Array.from({ length: n + 1 }, (_, i) => { poseAlong(path, (path.len * i) / n, at); return { x: at.x, y: at.y }; });
  const t = new Track(`C${o.key}:${lane}`, TURN_T, pts, three ? REVERSE_PLAYED * TURN_PACE_SHARE : MANOEUVRE_PACE, { z: (u) => a.zs[a.n]! * (1 - u) + b.zs[0]! * u, step: ROUND_STEP });
  for (let i = 0; i <= t.n; i++) {
    // Point i of the resampled track lies i/n of the way along the path (its chords cut the cusps: never t.len).
    poseAlong(path, (path.len * i) / t.n, at);
    t.hs[i] = i === 0 ? at.a : t.hs[i - 1]! + angleDiff(t.hs[i - 1]!, at.a);
  }
  t.turnRound = three ? 'three' : 'u';
  t.cusps = cuspsOf(segs, t.len / Math.max(path.len, 1e-6));
  return t;
}

/** Px along a path where its gear changes, scaled to the track's length. */
function cuspsOf(segs: readonly { readonly len: number; readonly dir: number }[], scale: number): number[] {
  const out: number[] = [];
  let at = 0;
  segs.forEach((g, k) => { at += g.len; if (k + 1 < segs.length && segs[k + 1]!.dir !== g.dir) out.push(at * scale); });
  return out;
}

/** Under walking pace, so a brisk driver (vf up to 1.08) still backs up at walking pace. */
const TURN_PACE_SHARE = 0.9;

/** Forward pace on a manoeuvre: the most a car may take a R_MIN bend at (src/sim/parkMove.ts MANOEUVRE_SPEED). */
const MANOEUVRE_PACE = Math.sqrt(A_LAT_PLAYED * R_MIN);

function connect(w: World, n: NodeRt, o: OutOpt, lane: number): Track {
  const a = o.from.lanes[lane]!, b = o.to.lanes[outLane(o, lane)]!;
  if (o.uTurn) {
    const t = roundTrack(o, a, b, lane);
    t.node = n.i; t.from = a; t.to = b; t.left = true;
    o.conn[lane] = t;
    n.turns.push(t);
    return addTrack(w, t);
  }
  const p0 = a.end(), p1 = b.start();
  const pull = o.turn < -SIDE && n.kind !== 'free' ? dist(p0, p1) * LEFT_PULL : 0;
  const pts = curve(p0, a.h1, p1, b.h0, Math.max(4, Math.ceil(dist(p0, p1) / 3)), pull);
  const t = new Track(`C${o.key}:${lane}`, TURN_T, pts, 0, { h0: a.h1, h1: b.h0, z: (u) => a.zs[a.n]! * (1 - u) + b.zs[0]! * u });
  t.vmax = n.kind === 'free' && Math.abs(o.turn) < SHARP
    ? Math.min(o.from.link.freeSpeed, o.to.link.freeSpeed) : turnSpeed(o, t.len, n.j.works > 0);
  limitSpin(t);
  t.node = n.i;
  t.from = a;
  t.to = b;
  t.left = o.turn < -SIDE;
  t.free = n.kind === 'free';
  o.conn[lane] = t;
  n.turns.push(t);
  return addTrack(w, t);
}

/** Free nodes connect only the lanes meant for a turn; others connect all, so nobody is ever stuck. */
function connectAll(w: World, n: NodeRt): void {
  for (const l of n.ins) {
    for (const o of l.opts) {
      for (let i = 0; i < l.lanes.length; i++) {
        const bus = i >= l.carLanes;
        if (n.kind === 'free' && (i < o.lo || (i > o.hi && !bus))) continue;
        connect(w, n, o, i);
      }
    }
  }
}

function priorities(n: NodeRt): void {
  const rank = (l: LinkRt): number => ROADS[l.road.type].lanes;
  const ranks = n.ins.map(rank);
  const equal = ranks.every((r) => r === ranks[0]);
  for (const l of n.ins) {
    for (const o of l.opts) {
      for (const t of o.conn) {
        if (!t) continue;
        if (n.kind === 'signal') t.prio = t.left ? 0 : 1;
        else {
          t.prio = equal ? 0 : rank(l) * 2 + (t.left ? 0 : 1);
          t.oneByOne = equal;
          t.giveWay = equal || rank(l) < Math.max(...ranks);
        }
      }
    }
  }
}

type Pair = readonly [number, number, number, number]; // turn i, turn k, end on k, end on i
const cache = new Map<string, readonly Pair[]>();
const CACHE_MAX = 600;

const sig = (t: Track): string => `${t.xs[0]!.toFixed(1)},${t.ys[0]!.toFixed(1)},${t.hs[0]!.toFixed(2)},${t.xs[t.n]!.toFixed(1)},${t.ys[t.n]!.toFixed(1)},${t.hs[t.n]!.toFixed(2)}`;

/** Last place on each track that is within CONFLICT_DIST of the other, or null. */
function crossing(p: Track, q: Track): readonly [number, number] | null {
  let endP = -1, endQ = -1;
  const lim = CONFLICT_DIST * CONFLICT_DIST;
  for (let i = 0; i <= p.n; i++) {
    for (let k = 0; k <= q.n; k++) {
      const d = (p.xs[i]! - q.xs[k]!) ** 2 + (p.ys[i]! - q.ys[k]!) ** 2;
      if (d < lim) { if (i > endP) endP = i; if (k > endQ) endQ = k; }
    }
  }
  return endP < 0 ? null : [endP / p.inv, endQ / q.inv];
}

function findPairs(turns: readonly Track[]): Pair[] {
  const out: Pair[] = [];
  for (let i = 0; i < turns.length; i++) {
    for (let k = i + 1; k < turns.length; k++) {
      const p = turns[i]!, q = turns[k]!;
      if (p.from === q.from) continue;
      const hit = crossing(p, q);
      if (hit) out.push([i, k, hit[1], hit[0]]);
    }
  }
  return out;
}

function conflicts(n: NodeRt): void {
  const key = n.turns.map(sig).join('|');
  let pairs = cache.get(key);
  if (!pairs) {
    if (cache.size > CACHE_MAX) cache.clear();
    pairs = findPairs(n.turns);
    cache.set(key, pairs);
  }
  for (const [i, k, endK, endI] of pairs) {
    const p = n.turns[i]!, q = n.turns[k]!;
    (p.conflicts as Conflict[]).push({ other: q, end: endK });
    (q.conflicts as Conflict[]).push({ other: p, end: endI });
  }
}

/** Turns that come out in the same lane of a free node zip together. */
export function zip(turns: readonly Track[]): void {
  for (const t of turns) t.merge = turns.filter((q) => q !== t && q.to === t.to && q.from !== t.from);
}

const TURN_DELAY = { left: 1.2, right: 0.5, straight: 0.2, uTurn: 4 } as const;

export function buildNode(w: World, n: NodeRt): void {
  for (const l of n.ins) {
    l.opts = makeOpts(n, l);
    laneRules(l, l.opts, n);
    for (const o of l.opts) {
      o.delay = n.kind === 'free' && !o.uTurn ? 0 : o.uTurn ? TURN_DELAY.uTurn : o.turn < -SIDE ? TURN_DELAY.left : o.turn > SIDE ? TURN_DELAY.right : TURN_DELAY.straight;
    }
  }
  if (n.kind === 'gate') { for (const l of n.ins) l.opts = []; return; }
  if (n.kind === 'ring') { buildRing(w, n); return; }
  connectAll(w, n);
  if (n.kind === 'free') { zip(n.turns); return; }
  priorities(n);
  conflicts(n);
  if (n.kind === 'signal') {
    const arms = n.j.arms.map((a) => w.roadById.get(a)!);
    n.phases = phaseArms(n.j.id, arms).map((ids) => n.ins.filter((l) => ids.includes(l.road.id)));
  }
}
