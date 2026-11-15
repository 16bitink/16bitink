import { clamp, type Pt } from '../vec';
import type { Tank, TankInput } from './types';

/**
 * A train on its rails (chapter 4, level 40's Rail-Gun Train: `BossDef.rail`).
 * The boss's road is its line: it moves only along it, forwards or back,
 * facing along the track. Where the line ends (a buffer stop) it stops dead,
 * so a charge down the line into the buffers dazes it as a wall dazes the
 * fortress (objectives/bossRage.ts).
 */
export interface Rail {
  readonly pts: readonly Pt[];
  /** Distance along the line at each point. */
  readonly cum: readonly number[];
  readonly total: number;
  /** Where the train is along the line, px. */
  s: number;
}

/** How hard a train gets up to speed, px/s², and how far ahead and behind it looks to face along a bend. */
const RAIL = { accel: 260, look: 60 } as const;

export function makeRail(pts: readonly Pt[]): Rail {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { pts, cum, total: cum[cum.length - 1]!, s: 0 };
}

/** The point at distance `s` along the line (clamped to its ends). */
export function railPoint(r: Rail, s: number): Pt {
  const d = clamp(s, 0, r.total);
  let i = 1;
  while (i < r.pts.length - 1 && r.cum[i]! < d) i++;
  const a = r.pts[i - 1]!;
  const b = r.pts[i]!;
  const len = r.cum[i]! - r.cum[i - 1]! || 1;
  const k = (d - r.cum[i - 1]!) / len;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** The line's direction at `s` (smoothed over a bend). */
export function railAngle(r: Rail, s: number): number {
  const a = railPoint(r, s - RAIL.look);
  const b = railPoint(r, s + RAIL.look);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/** The distance along the line of the point on it nearest to p. */
export function railNearest(r: Rail, p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1]!;
    const b = r.pts[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const k = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
    const d = (a.x + dx * k - p.x) ** 2 + (a.y + dy * k - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = r.cum[i - 1]! + Math.sqrt(len2) * k;
    }
  }
  return best;
}

/** A point a little way along the line from the train towards `p` (where it is heading on the line). */
export function railTowards(r: Rail, p: Pt): Pt {
  const goal = railNearest(r, p);
  const step = Math.sign(goal - r.s) * Math.min(Math.abs(goal - r.s), RAIL.look * 2);
  return railPoint(r, r.s + (step === 0 ? 1 : step));
}

/** Drives a train along its rails: the input's direction picks forwards or back along the line. */
export function driveRail(t: Tank, input: TankInput, dt: number): void {
  const r = t.rail!;
  const along = railAngle(r, r.s);
  const mv = input.move;
  let want = 0;
  if (mv?.kind === 'point' && mv.mag > 0) want = (Math.cos(mv.angle - along) >= 0 ? 1 : -1) * mv.mag * t.stats.speed;
  else if (mv?.kind === 'tank') want = clamp(mv.throttle, -1, 1) * t.stats.speed;
  const acc = RAIL.accel * dt * (Math.abs(want) > 200 ? 3 : 1);
  t.speed = t.speed < want ? Math.min(want, t.speed + acc) : Math.max(want, t.speed - acc * 1.6);
  const s = r.s + t.speed * dt;
  r.s = clamp(s, 0, r.total);
  // The buffers: the line ends here.
  if (r.s !== s) t.speed = 0;
  const p = railPoint(r, r.s);
  t.rolled += Math.hypot(p.x - t.x, p.y - t.y);
  t.x = p.x;
  t.y = p.y;
  t.heading = railAngle(r, r.s);
  t.slide = null;
}
