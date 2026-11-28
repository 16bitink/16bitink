/** What lies ahead of a car: the next piece of its way and the nearest thing on it. */
import type { CarStore } from './store';
import { ARC_T, EXIT_T, LANE_T, type Track } from './track';
import { IDM } from './tune';
import { capAhead } from './trackCaps';
import { sweepGap } from './sweepLead';
import type { Sim } from './sim';

/** The piece after this one for car i, or null when it ends or isn't known. */
export function nextTrack(sim: Sim, i: number, t: Track): Track | null {
  const c = sim.cars;
  if (t.kind === LANE_T) {
    const o = c.opt[i];
    return o ? o.conn[t.lane] ?? null : null;
  }
  if (t.kind === ARC_T) {
    const exit = c.exitBy[i];
    const arms = sim.world.nodes[t.node]!.ring!.arms;
    const next = (t.arm + 1) % arms.length;
    if (exit && exit.arm === next) return exit;
    return t.to;
  }
  return t.to;
}

/** Result of `look`: gap to the leader's bumper and its speed; `hard` = must never be driven into, at speed hardV. */
export const LEAD = { gap: Infinity, v: 0, hard: Infinity, hardV: 0 };

/**
 * Px the bodies leave less than the sim's lengths (the drawn body is longer than the sim's `half`), plus the sweep a
 * car turning round on the road still makes behind its point (its lag): the gap a driver keeps is to the real body.
 */
const bodySlack = (c: CarStore, i: number, q: number): number => c.body[i]! - c.half[i]! + c.body[q]! - c.half[q]! + Math.max(0, c.lag[q]!);

/**
 * Px a follower leaves behind a car that is parking or pulling out (the owner, phase B: queues behind a manoeuvring
 * car look real): it stands back far enough for the car to back into a kerb space or swing out of one behind its point.
 */
export const PARK_ROOM = 24;
/** A leader this close to its stop on this lane (px) is about to park: its blinker is on. */
const PARK_NEAR = 80;
const parkRoom = (c: CarStore, a: number, t: Track): number =>
  c.state[a] === 4 || (c.destLink[a] === t.link && c.destNode[a]! < 0 && c.service[a]! < 0 && c.destAt[a]! - c.s[a]! < PARK_NEAR) ? PARK_ROOM : 0;

const gapTo = (c: CarStore, i: number, base: number, q: number): number => base + c.s[q]! - c.half[i]! - c.half[q]! - bodySlack(c, i, q);

/**
 * A leader at `gap` px. `extra` px more
 * are kept back from it (a car about to park): planned in full, but held hard only as far as the follower can still
 * stop for them comfortably (a car can't stop dead because the one ahead put its blinker on).
 */
function take(gap: number, v: number, hard: boolean, extra = 0, vSelf = 0): void {
  if (gap - extra < LEAD.gap) { LEAD.gap = gap - extra; LEAD.v = v; }
  if (extra > 0) gap -= Math.min(extra, Math.max(0, gap - (vSelf * vSelf) / (2 * IDM.brake)));
  if (hard && gap < LEAD.hard) { LEAD.hard = gap; LEAD.hardV = v; }
}

/** Px of gentle braking (m/s² 1.5 at game pace) a driver plans its look with, and px it looks past that stop. */
const LOOK_BRAKE = 7.3, LOOK_PAST = 24;

/**
 * How far ahead a driver looks: its headway's worth, and never less than it needs to stop gently from where its foot
 * is now (a car pulling away hard must see the queue it is pulling into before it can no longer stop for it).
 */
function lookReach(c: CarStore, i: number): number {
  const v = c.v[i]!, a = Math.max(0, c.fa[i]!);
  const lift = (a + LOOK_BRAKE) / IDM.jerk;
  return Math.max(IDM.lookMin, v * IDM.lookTime, (v + a * lift) * lift + ((v + a * lift) ** 2) / (2 * LOOK_BRAKE) + LOOK_PAST);
}

/** Find what is in front of i along its way: the car ahead, or the body of a move played off the lanes (src/sim/sweepLead.ts). */
export function look(sim: Sim, i: number, open: boolean): void {
  lookLanes(sim, i, open);
  // Moves' bodies are looked for over the headway's reach (the body checks are the step's dearest part).
  const reach = Math.min(LEAD.gap, Math.max(IDM.lookMin, sim.cars.v[i]! * IDM.lookTime));
  const d = sweepGap(sim, i, reach);
  if (d < Infinity) take(d, 0, true);
}

/** Find the car in front of i along its way. `open` = it may drive past the end of its lane. */
function lookLanes(sim: Sim, i: number, open: boolean): void {
  const c = sim.cars;
  const t = c.track[i]!;
  LEAD.gap = LEAD.hard = Infinity;
  LEAD.v = LEAD.hardV = 0;
  const a = c.ahead[i]!;
  if (a >= 0) take(c.s[a]! - c.s[i]! - c.half[a]! - c.half[i]! - bodySlack(c, i, a), c.v[a]!, true, parkRoom(c, a, t), c.v[i]!);
  let base = t.len - c.s[i]!;
  const reach = lookReach(c, i);
  if (t.merge.length > 0 && a < 0) zipWith(sim, i, t, base);
  if (a >= 0 || !open) return;
  let at = t;
  for (let hop = 0; hop < 7 && base < reach; hop++) {
    // Past a lane the car isn't on yet, its way is only known where that lane has a single one (a joint, a lone turn).
    const next = at !== t && at.kind === LANE_T ? onlyWay(sim, at) : nextTrack(sim, i, at);
    if (!next) return;
    if (at.lastOut >= 0) splitLeader(c, i, at, next, base);
    if (next.tail >= 0) {
      const q = next.tail;
      take(gapTo(c, i, base, q), c.v[q]!, true, parkRoom(c, q, next), c.v[i]!);
      if (next.merge.length > 0) zipWith(sim, i, next, base + next.len);
      return;
    }
    base += next.len;
    if (next.merge.length > 0) zipWith(sim, i, next, base);
    at = next;
  }
}

/** The one track out of lane t whatever the route (null: it has none, or several). */
function onlyWay(sim: Sim, t: Track): Track | null {
  let way: Track | null = null;
  for (const o of sim.world.links[t.link]?.opts ?? []) {
    const n = o.conn[t.lane];
    if (!n || n === way) continue;
    if (way) return null;
    way = n;
  }
  return way;
}

/** The car that just left this track another way may still have its tail in front of us. */
function splitLeader(c: CarStore, i: number, at: Track, next: Track, base: number): void {
  const q = at.lastOut;
  if (!c.alive[q] || c.uid[q] !== at.lastOutUid || q === i) return;
  const on = c.track[q];
  if (!on || on === next || on.kind === LANE_T || c.s[q]! > c.half[q]! + 6) return;
  if (on.from !== at && on !== at.to && !(at.kind === ARC_T && on.kind === EXIT_T)) return;
  take(gapTo(c, i, base, q), c.v[q]!, false);
}

/** Zip: follow whoever on the other streams is next nearer the point where they join. */
function zipWith(sim: Sim, i: number, t: Track, d: number): void {
  const c = sim.cars;
  for (const p of t.merge) {
    let best = -1, bestD = -1;
    for (let q = p.head; q >= 0; q = c.behind[q]!) {
      const dq = p.len - c.s[q]!;
      if (dq > d || (dq === d && q > i)) break;
      best = q;
      bestD = dq;
    }
    if (p.free && p.from) {
      for (let q = p.from.head; q >= 0; q = c.behind[q]!) {
        const dq = p.len + p.from.len - c.s[q]!;
        if (dq > d || (dq === d && q > i)) break;
        if (c.opt[q]?.conn[p.from.lane] !== p) break;
        best = q;
        bestD = dq;
      }
    }
    if (best >= 0) take(Math.max(0.8, d - bestD - c.half[i]! - c.half[best]!), c.v[best]!, false);
  }
}

/** The lowest speed cap of the turns out of lane `lane` of a link (Infinity: none). */
function slowestTurn(opts: readonly { readonly conn: readonly (Track | null | undefined)[] }[], lane: number): number {
  let v = Infinity;
  for (const o of opts) { const t = o.conn[lane]; if (t && t.kind !== LANE_T) v = Math.min(v, t.vmax, capAhead(t, 0, IDM.brake * 0.6)); }
  return v;
}

/** Px short of a lane's end a car plans to be able to stop. */
const LINE_ROOM = 6;

/** Speed the way ahead allows, so a car slows before a tight turn, or a line just beyond a short link. */
export function speedAhead(sim: Sim, i: number, v0: number): number {
  const c = sim.cars;
  const t = c.track[i]!;
  let d = Math.max(0, t.len - c.s[i]!); // a car past its lane's end (it could not stop for it) is at the next track
  let lim = v0;
  let at: Track = t;
  // As far ahead as the car needs to brake from its speed to a crawl.
  const reach = Math.max(110, (c.v[i]! * c.v[i]!) / (2 * IDM.brake * 0.6) + 20);
  for (let hop = 0; hop < 4; hop++) {
    const next = nextTrack(sim, i, at);
    if (!next || d > reach) break;
    const vn = Math.min(next.vmax * (next.kind === LANE_T ? c.vf[i]! : 1), capAhead(next, 0, IDM.brake * 0.6));
    if (vn < lim) lim = Math.min(lim, Math.sqrt(vn * vn + 2 * IDM.brake * 0.6 * d));
    d += next.len;
    // The next lane may end at a line it has to stop at (its way there isn't asked for yet): it can always stop there.
    if (next.kind === LANE_T) {
      const l = sim.world.links[next.link]!;
      if (l.node.kind !== 'free' && l.node.kind !== 'gate') lim = Math.min(lim, Math.sqrt(2 * IDM.brake * 0.6 * Math.max(0, d - LINE_ROOM)));
      // Its way on from there isn't chosen yet either: a short lane is entered slow enough for its slowest turn.
      else if (d < reach) lim = Math.min(lim, Math.sqrt(slowestTurn(l.opts, next.lane) ** 2 + 2 * IDM.brake * 0.6 * d));
      break;
    }
    at = next;
  }
  return lim;
}

export const isExit = (t: Track): boolean => t.kind === EXIT_T;
