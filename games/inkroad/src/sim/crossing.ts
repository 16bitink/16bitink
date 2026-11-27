/**
 * Turning across the far side of a road (into a driveway on the left, or out of one to the far lane): the driver
 * waits for a gap in the lanes running the other way, then holds them while the body is in them (the owner,
 * November 27: cars move like real cars). Pure over the Sim; the city schedules the hold.
 */
import { poseAt, type Track } from './track';
import { IDM, kindIndex } from './tune';
import type { Sim } from './sim';
import { startLinks } from './routes';
import { laneS, type LinkRt } from './world';
import { POSE } from './store';
import { pose } from './motion';
import type { Access } from './trafficTypes';

/** Longest a driver waits for a gap before taking a smaller one (the far lanes are then held where they are). */
export const GAP_WAIT_MAX = 8;
const SLOWEST = 1;
/** A driver behind a car pulling out sees it and brakes after REACT s, comfortably (px/s², the sim's planned braking). */
const REACT = 1, COMFY = 8;
/** A car `d` px short of the stretch at v px/s reaches it within `seconds`, or could not stop short of it comfortably. */
const tooClose = (d: number, v: number, seconds: number): boolean => d / Math.max(SLOWEST, v) < seconds || d < v * REACT + (v * v) / (2 * COMFY);
/** How far up the lanes behind the junction a driver looks (px, about 5 s of street traffic). */
const UPSTREAM_PX = 320;

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
    for (const o of sim.world.links[t.link]?.preds ?? []) {
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

/** No body within the stand-in's length of s on lane t (a car merely approaching does not count). */
function roomAt(sim: Sim, t: Track, s: number, h: number): boolean {
  const c = sim.cars;
  for (let q = t.head; q >= 0; q = c.behind[q]!) {
    const gap = Math.abs(c.s[q]! - s) - c.half[q]! - h;
    if (gap < 1) return false;
    // A car coming that could not stop for it any more (at the sim's hardest braking) is let through.
    if (c.s[q]! < s && gap < (c.v[q]! * c.v[q]!) / (2 * IDM.brake) + 1) return false;
  }
  return true;
}

/** Holds the far lanes at `at` for `seconds` with hidden stand-ins (as a double-parked car's). Returns how many. */
export function holdAcross(sim: Sim, at: Access, heading: number, seconds: number): number {
  const c = sim.cars;
  let n = 0;
  for (const { t, s } of farLanes(sim, at, heading)) {
    const i = c.take(kindIndex('car'));
    if (i < 0) break;
    // Physically free is enough: the drivers coming were checked for their gap, and brake for it now.
    if (s < c.half[i]! || s > t.len - c.half[i]! || !roomAt(sim, t, s, c.half[i]!)) { c.drop(i); continue; }
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

/**
 * A car about to pull into its own lanes at `at` (heading `heading`): are they clear of every body from `back` px
 * behind the point to `ahead` px past it, with no car arriving there within `seconds` (the time its move holds them)?
 */
export function laneClear(sim: Sim, at: Access, heading: number, back: number, ahead: number, seconds: number): boolean {
  if ('gate' in at) return true;
  const c = sim.cars;
  for (const { l } of startLinks(sim.world, at)) {
    const s = laneS(l, at.s);
    poseAt(l.lanes[0]!, s, POSE);
    if (Math.cos(POSE.h - heading) < 0) continue;
    for (let k = 0; k < l.carLanes; k++) {
      const t = l.lanes[k]!;
      for (let q = t.head; q >= 0; q = c.behind[q]!) {
        if (c.state[q] === 4 && Math.abs(c.s[q]! - s) < 1) continue;
        const front = c.s[q]! + c.half[q]!, rear = c.s[q]! - c.half[q]!;
        if (front > s - back && rear < s + ahead) return false;
        if (front <= s - back && tooClose(s - back - front, c.v[q]!, seconds)) return false;
      }
      // And the cars coming up to it round the junction behind.
      for (const o of sim.world.links[t.link]?.preds ?? []) {
        if (o.from.fromNode === o.to.node) continue;
        for (let m = 0; m < o.from.carLanes; m++) {
          const up = o.from.lanes[m]!;
          for (let q = up.head; q >= 0; q = c.behind[q]!) if (tooClose(up.len - c.s[q]! - c.half[q]! + s - back, c.v[q]!, seconds)) return false;
        }
      }
    }
  }
  return true;
}
