/** What lies ahead of a car: the next piece of its way and the nearest thing on it. */
import type { CarStore } from './store';
import { ARC_T, EXIT_T, LANE_T, type Track } from './track';
import { IDM } from './tune';
import { capAhead } from './trackCaps';
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

/** Result of `look`: gap to the leader's bumper and its speed; `hard` = must never be driven into. */
export const LEAD = { gap: Infinity, v: 0, hard: Infinity };

/**
 * Px the drawn bodies leave less than the sim's (docs/inkroad-vehicle-model.md "Phase A"): a drawn body is longer
 * than the sim's and a drawn leader may lag its point, so the gap a driver keeps is to what is drawn. The follower's
 * own overshoot (its drawn car past its point) counts only toward the gap it plans with, never toward the hard room:
 * stopping its sim point dead would only let the drawn car run further past it.
 */
const bodySlack = (c: CarStore, i: number, q: number): number => c.body[i]! - c.half[i]! + c.body[q]! - c.half[q]! + Math.max(0, c.lag[q]!);
const ownSlack = (c: CarStore, i: number): number => Math.max(0, -c.lag[i]!);

const gapTo = (c: CarStore, i: number, base: number, q: number): number => base + c.s[q]! - c.half[i]! - c.half[q]! - bodySlack(c, i, q);

/** A leader at `gap` px (`own`: px of the follower's own drawn overshoot, for the planned gap only). */
function take(gap: number, v: number, hard: boolean, own = 0): void {
  if (gap - own < LEAD.gap) { LEAD.gap = gap - own; LEAD.v = v; }
  if (hard && gap < LEAD.hard) LEAD.hard = gap;
}

/** Find the car in front of i along its way. `open` = it may drive past the end of its lane. */
export function look(sim: Sim, i: number, open: boolean): void {
  const c = sim.cars;
  const t = c.track[i]!;
  LEAD.gap = LEAD.hard = Infinity;
  LEAD.v = 0;
  const a = c.ahead[i]!;
  if (a >= 0) take(c.s[a]! - c.s[i]! - c.half[a]! - c.half[i]! - bodySlack(c, i, a), c.v[a]!, true, ownSlack(c, i));
  let base = t.len - c.s[i]!;
  const reach = Math.max(IDM.lookMin, c.v[i]! * IDM.lookTime);
  if (t.merge.length > 0 && a < 0) zipWith(sim, i, t, base);
  if (a >= 0 || !open) return;
  let at = t;
  for (let hop = 0; hop < 7 && base < reach; hop++) {
    const next = nextTrack(sim, i, at);
    if (!next) return;
    if (at.lastOut >= 0) splitLeader(c, i, at, next, base);
    if (next.tail >= 0) {
      const q = next.tail;
      take(gapTo(c, i, base, q), c.v[q]!, true, ownSlack(c, i));
      if (next.merge.length > 0) zipWith(sim, i, next, base + next.len);
      return;
    }
    base += next.len;
    if (next.merge.length > 0) zipWith(sim, i, next, base);
    if (next.kind === LANE_T) { if (next.tail < 0) return; }
    at = next;
  }
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

/** Px short of a lane's end a car plans to be able to stop. */
const LINE_ROOM = 6;

/** Speed the way ahead allows, so a car slows before a tight turn, or a line just beyond a short link. */
export function speedAhead(sim: Sim, i: number, v0: number): number {
  const c = sim.cars;
  const t = c.track[i]!;
  let d = t.len - c.s[i]!;
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
      const node = sim.world.links[next.link]!.node;
      if (node.kind !== 'free' && node.kind !== 'gate') lim = Math.min(lim, Math.sqrt(2 * IDM.brake * 0.6 * Math.max(0, d - LINE_ROOM)));
      break;
    }
    at = next;
  }
  return lim;
}

export const isExit = (t: Track): boolean => t.kind === EXIT_T;
