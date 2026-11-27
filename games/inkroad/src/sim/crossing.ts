/**
 * Turning across the far side of a road (into a driveway on the left, or out of one to the far lane): the driver
 * waits for a gap in the lanes running the other way, then holds them while the body is in them (the owner,
 * November 27: cars move like real cars). Pure over the Sim; the city schedules the hold.
 */
import { poseAt, type Track } from './track';
import { kindIndex } from './tune';
import type { Sim } from './sim';
import { startLinks } from './routes';
import { laneS, type LinkRt } from './world';
import { spaceAt } from './place';
import { POSE } from './store';
import { pose } from './motion';
import type { Access } from './trafficTypes';
import { MOTION_SWITCHES } from './switches';

/** Longest a driver waits for a gap before taking a smaller one (the far lanes are then held where they are). */
export const GAP_WAIT_MAX = 8;
const SLOWEST = 1;
/** How far up the lanes behind the junction a driver looks (px, about 5 s of street traffic). */
const UPSTREAM_PX = 320;
const GAP_ACCEPT_UPSTREAM = (): boolean => MOTION_SWITCHES.GAP_ACCEPT;

/** The lanes at `at` whose traffic runs against `heading` (every car lane of the other direction). */
function farLanes(sim: Sim, at: Access, heading: number): { t: Track; s: number }[] {
  if ('gate' in at) return [];
  const out: { t: Track; s: number }[] = [];
  for (const { l } of startLinks(sim.world, at)) {
    const s = laneS(l, at.s);
    poseAt(l.lanes[0]!, s, POSE);
    if (Math.cos(POSE.h - heading) >= 0) continue;
    for (let k = 0; k < l.carLanes; k++) out.push({ t: l.lanes[k]!, s });
  }
  return out;
}

/** When each car in these lanes reaches the crossing point, and when it is past it (seconds from now). */
function arrivals(sim: Sim, lanes: readonly { t: Track; s: number }[]): { at: number; gone: number }[] {
  const c = sim.cars;
  const out: { at: number; gone: number }[] = [];
  const add = (q: number, d: number): void => {
    const v = Math.max(SLOWEST, c.v[q]!);
    out.push({ at: Math.max(0, (d - c.half[q]!) / v), gone: Math.max(0, (d + c.half[q]!) / v + c.half[q]! / v) });
  };
  for (const { t, s } of lanes) {
    for (let q = t.head; q >= 0; q = c.behind[q]!) {
      if (c.s[q]! - c.half[q]! > s + c.half[q]!) continue;
      add(q, s - c.s[q]!);
    }
    // A driver sees past the junction behind: cars on the links that lead into this lane (and may turn onto it).
    if (GAP_ACCEPT_UPSTREAM()) for (const o of sim.world.links[t.link]?.preds ?? []) {
      if (o.from.fromNode === o.to.node) continue;
      for (let k = 0; k < o.from.carLanes; k++) {
        const up = o.from.lanes[k]!;
        for (let q = up.head; q >= 0; q = c.behind[q]!) {
          const mine = c.opt[q];
          if (mine && mine !== o) continue;
          const d = up.len - c.s[q]! + s;
          if (d > UPSTREAM_PX) continue;
          add(q, d);
        }
      }
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Seconds until the far lanes at `at` have a clear gap of `gap` seconds (0: now), at most GAP_WAIT_MAX. */
export function gapAcross(sim: Sim, at: Access, heading: number, gap: number): number {
  let t = 0;
  for (const a of arrivals(sim, farLanes(sim, at, heading))) {
    if (a.at >= t + gap) break;
    t = Math.max(t, a.gone);
    if (t >= GAP_WAIT_MAX) return GAP_WAIT_MAX;
  }
  return t;
}

/** Holds the far lanes at `at` for `seconds` with hidden stand-ins (as a double-parked car's). Returns how many. */
export function holdAcross(sim: Sim, at: Access, heading: number, seconds: number): number {
  const c = sim.cars;
  let n = 0;
  for (const { t, s } of farLanes(sim, at, heading)) {
    const i = c.take(kindIndex('car'));
    if (i < 0) break;
    if (s < c.half[i]! || s > t.len - c.half[i]! || !spaceAt(sim, t, s, c.half[i]!, 0)) { c.drop(i); continue; }
    c.state[i] = 4;
    c.until[i] = sim.time + seconds;
    c.born[i] = sim.time;
    c.insert(i, t, s);
    c.link[i] = t.link;
    pose(sim, i);
    n++;
  }
  return n;
}

export type { LinkRt };
